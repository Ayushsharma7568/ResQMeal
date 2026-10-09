// Volunteer Pickup & Delivery Workflow Test Script
// Tests full workflow: UNASSIGNED -> ASSIGNED -> PICKED_UP -> DELIVERED -> RECEIVED -> COMPLETED
// Tests RBAC, atomic accept guards, status progression, and completion of claim & listing.

const BASE = 'http://127.0.0.1:5000/api';

const C = {
  g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m',
  c: '\x1b[36m', x: '\x1b[0m', b: '\x1b[1m', d: '\x1b[2m'
};

let pass = 0, fail = 0;
let providerToken = '';
let seekerToken = '';
let volunteer1Token = '';
let volunteer2Token = '';
let uninvolvedToken = '';

let listingId = '';
let pendingClaimId = '';
let approvedClaimId = '';
let deliveryId = '';

const ts = Date.now();

function header(t) {
  console.log('\n' + '═'.repeat(60));
  console.log(C.b + C.c, `  ${t}`, C.x);
  console.log('═'.repeat(60));
}

function ok(name, passed, detail = '') {
  passed ? pass++ : fail++;
  console.log(passed ? C.g : C.r, `  ${passed ? '✅' : '❌'} ${name}`, C.x);
  if (detail) console.log(C.d, `     ${detail}`, C.x);
}

async function req(method, path, body = null, token = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

async function runTests() {
  header('0. SETUP — Users, Listing, and Claim Approval');

  // Register Provider
  {
    const { status, data } = await req('POST', '/auth/register', {
      email: `deliv_provider_${ts}@test.com`, password: 'Provider1', name: 'Delivery Provider', role: 'FOOD_PROVIDER'
    });
    providerToken = data.data?.token || '';
    ok('Provider registered', status === 201 && !!providerToken);
  }

  // Register Seeker
  {
    const { status, data } = await req('POST', '/auth/register', {
      email: `deliv_seeker_${ts}@test.com`, password: 'SeekerPass1', name: 'Delivery Seeker', role: 'FOOD_SEEKER'
    });
    seekerToken = data.data?.token || '';
    ok('Seeker registered', status === 201 && !!seekerToken);
  }

  // Register Volunteer 1
  {
    const { status, data } = await req('POST', '/auth/register', {
      email: `deliv_vol1_${ts}@test.com`, password: 'VolPass1', name: 'Volunteer One', role: 'VOLUNTEER'
    });
    volunteer1Token = data.data?.token || '';
    ok('Volunteer 1 registered', status === 201 && !!volunteer1Token);
  }

  // Register Volunteer 2
  {
    const { status, data } = await req('POST', '/auth/register', {
      email: `deliv_vol2_${ts}@test.com`, password: 'VolPass2', name: 'Volunteer Two', role: 'VOLUNTEER'
    });
    volunteer2Token = data.data?.token || '';
    ok('Volunteer 2 registered', status === 201 && !!volunteer2Token);
  }

  // Register Uninvolved Seeker (for auth check)
  {
    const { status, data } = await req('POST', '/auth/register', {
      email: `deliv_uninvolved_${ts}@test.com`, password: 'SeekerPass2', name: 'Uninvolved Seeker', role: 'FOOD_SEEKER'
    });
    uninvolvedToken = data.data?.token || '';
    ok('Uninvolved user registered', status === 201);
  }

  // Create Listing
  {
    const { status, data } = await req('POST', '/listings', {
      title: 'Hot Meals for Delivery',
      priceType: 'FREE',
      pickupAddress: '789 Brigade Road, Bangalore',
      pickupCity: 'Bangalore',
      availableFrom: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      pickupDeadline: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      foodItems: [{ name: 'Rice Bowls', category: 'COOKED_FOOD', quantity: 15, unit: 'boxes', foodType: 'VEG' }]
    }, providerToken);
    listingId = data.data?.listing?._id || '';
    ok('Listing created', status === 201 && !!listingId);
  }

  // Seeker submits claim
  {
    const { status, data } = await req('POST', '/claims', { foodListingId: listingId }, seekerToken);
    approvedClaimId = data.data?.claim?._id || '';
    ok('Seeker submits claim', status === 201 && !!approvedClaimId);
  }

  // ═══════════════════════════════════════════
  header('1. DELIVERY TASK CREATION & VALIDATION');

  // 1a) Attempt to create delivery for non-approved claim (simulate by picking random ID)
  // Let's create a pending claim on another listing to test this guard
  let pendingListingId = '';
  {
    const { data } = await req('POST', '/listings', {
      title: 'Pending Listing',
      priceType: 'FREE',
      pickupAddress: '100 MG Road',
      availableFrom: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      pickupDeadline: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      foodItems: [{ name: 'Bread', category: 'BAKERY', quantity: 5, unit: 'packets', foodType: 'VEG' }]
    }, providerToken);
    pendingListingId = data.data?.listing?._id;
  }
  {
    const { data } = await req('POST', '/claims', { foodListingId: pendingListingId }, seekerToken);
    pendingClaimId = data.data?.claim?._id;
  }
  {
    const { status, data } = await req('POST', '/deliveries', { foodClaimId: pendingClaimId }, seekerToken);
    ok('Non-APPROVED claim → 400', status === 400, data.message);
  }

  // 1b) Provider approves the first claim → Auto-creates Delivery in UNASSIGNED status
  {
    const { status, data } = await req('PATCH', `/claims/${approvedClaimId}/approve`, null, providerToken);
    ok('Provider approves claim', status === 200 && data.data?.claim?.status === 'APPROVED');
  }

  // 1c) Attempt duplicate delivery creation for same claim → 409 Conflict
  {
    const { status, data } = await req('POST', '/deliveries', { foodClaimId: approvedClaimId }, seekerToken);
    ok('Duplicate delivery creation → 409', status === 409, data.message);
  }

  // ═══════════════════════════════════════════
  header('2. VOLUNTEER BROWSE AVAILABLE TASKS');

  // 2a) Seeker tries to view available tasks → 403
  {
    const { status } = await req('GET', '/deliveries/available', null, seekerToken);
    ok('Seeker browse available → 403', status === 403);
  }

  // 2b) Volunteer 1 views available tasks → 200
  {
    const { status, data } = await req('GET', '/deliveries/available', null, volunteer1Token);
    ok('Volunteer 1 views available tasks → 200', status === 200);
    ok('At least 1 UNASSIGNED delivery task returned', data.results >= 1);
    deliveryId = data.data?.deliveries?.[0]?._id || '';
    ok('Task status is UNASSIGNED', data.data?.deliveries?.[0]?.status === 'UNASSIGNED');
  }

  // ═══════════════════════════════════════════
  header('3. VOLUNTEER ACCEPTS TASK (ATOMIC LOCK)');

  // 3a) Volunteer 1 accepts task
  {
    const { status, data } = await req('PATCH', `/deliveries/${deliveryId}/accept`, null, volunteer1Token);
    ok('Volunteer 1 accepts task → 200', status === 200);
    ok('Task status updated to ASSIGNED', data.data?.delivery?.status === 'ASSIGNED');
    ok('Volunteer ID set to Volunteer 1', !!data.data?.delivery?.volunteerId);
  }

  // 3b) Verify Listing status updated to PICKUP_ASSIGNED
  {
    const { status, data } = await req('GET', `/listings/${listingId}`);
    ok('Listing status updated to PICKUP_ASSIGNED', status === 200 && data.data?.listing?.status === 'PICKUP_ASSIGNED');
  }

  // 3c) Volunteer 2 attempts to accept already-assigned task → 409 Conflict
  {
    const { status, data } = await req('PATCH', `/deliveries/${deliveryId}/accept`, null, volunteer2Token);
    ok('Volunteer 2 accept assigned task → 409', status === 409, data.message);
  }

  // 3d) Volunteer 1 views my assigned tasks
  {
    const { status, data } = await req('GET', '/deliveries/my', null, volunteer1Token);
    ok('Volunteer 1 views my assigned tasks → 200', status === 200);
    ok('1 assigned task found', data.results >= 1);
  }

  // ═══════════════════════════════════════════
  header('4. MARK FOOD AS PICKED UP');

  // 4a) Volunteer 2 (not assigned) tries to mark picked up → 403
  {
    const { status } = await req('PATCH', `/deliveries/${deliveryId}/picked-up`, null, volunteer2Token);
    ok('Unassigned volunteer mark picked up → 403', status === 403);
  }

  // 4b) Volunteer 1 marks food as picked up → 200
  {
    const { status, data } = await req('PATCH', `/deliveries/${deliveryId}/picked-up`, null, volunteer1Token);
    ok('Volunteer 1 marks picked up → 200', status === 200);
    ok('Task status updated to PICKED_UP', data.data?.delivery?.status === 'PICKED_UP');
  }

  // 4c) Verify Listing status updated to PICKED_UP
  {
    const { status, data } = await req('GET', `/listings/${listingId}`);
    ok('Listing status updated to PICKED_UP', status === 200 && data.data?.listing?.status === 'PICKED_UP');
  }

  // ═══════════════════════════════════════════
  header('5. MARK FOOD AS DELIVERED');

  // 5a) Volunteer 1 marks food as delivered → 200
  {
    const { status, data } = await req('PATCH', `/deliveries/${deliveryId}/delivered`, {
      proofOfDelivery: 'Handed over to community kitchen coordinator',
      notes: 'Delivered in good condition'
    }, volunteer1Token);
    ok('Volunteer 1 marks delivered → 200', status === 200);
    ok('Task status updated to DELIVERED', data.data?.delivery?.status === 'DELIVERED');
  }

  // 5b) Verify Listing status updated to DELIVERED
  {
    const { status, data } = await req('GET', `/listings/${listingId}`);
    ok('Listing status updated to DELIVERED', status === 200 && data.data?.listing?.status === 'DELIVERED');
  }

  // ═══════════════════════════════════════════
  header('6. SEEKER CONFIRMS RECEIPT (COMPLETED WORKFLOW)');

  // 6a) Volunteer tries to confirm receipt → 403
  {
    const { status } = await req('PATCH', `/deliveries/${deliveryId}/confirm-receipt`, null, volunteer1Token);
    ok('Volunteer confirm receipt → 403', status === 403);
  }

  // 6b) Seeker confirms receipt → 200
  {
    const { status, data } = await req('PATCH', `/deliveries/${deliveryId}/confirm-receipt`, null, seekerToken);
    ok('Seeker confirms receipt → 200', status === 200);
    ok('Delivery status updated to COMPLETED', data.data?.delivery?.status === 'COMPLETED');
  }

  // 6c) Verify Claim status updated to COMPLETED
  {
    const { status, data } = await req('GET', `/claims/${approvedClaimId}`, null, seekerToken);
    ok('Claim status updated to COMPLETED', status === 200 && data.data?.claim?.status === 'COMPLETED');
  }

  // 6d) Verify Listing status updated to COMPLETED
  {
    const { status, data } = await req('GET', `/listings/${listingId}`);
    ok('Listing status updated to COMPLETED', status === 200 && data.data?.listing?.status === 'COMPLETED');
  }

  // ═══════════════════════════════════════════
  header('7. SINGLE DELIVERY GET & AUTHORIZATION');

  // 7a) Uninvolved user views delivery details → 403
  {
    const { status } = await req('GET', `/deliveries/${deliveryId}`, null, uninvolvedToken);
    ok('Uninvolved user view delivery → 403', status === 403);
  }

  // 7b) Seeker views delivery details → 200
  {
    const { status, data } = await req('GET', `/deliveries/${deliveryId}`, null, seekerToken);
    ok('Seeker view delivery → 200', status === 200);
    ok('Includes populated claim and listing', !!data.data?.delivery?.foodClaimId && !!data.data?.delivery?.foodListingId);
  }

  // ═══════════════════════════════════════════
  header('TEST SUMMARY');

  const total = pass + fail;
  console.log(`\n  Total: ${total}  |  ${C.g}Passed: ${pass}${C.x}  |  ${C.r}Failed: ${fail}${C.x}\n`);
  if (fail === 0) {
    console.log(C.g + C.b, '  🎉 ALL TESTS PASSED!', C.x);
  } else {
    console.log(C.r + C.b, `  ⚠️  ${fail} test(s) failed.`, C.x);
  }
  console.log('\n' + '═'.repeat(60) + '\n');
}

runTests().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
