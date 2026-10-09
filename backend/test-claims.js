// Food Claim API Test Script
// Tests creation, approval, rejection, cancellation, auto-rejection, duplicate prevention, and RBAC guards.
const BASE = 'http://127.0.0.1:5000/api';

const C = {
  g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m',
  c: '\x1b[36m', x: '\x1b[0m', b: '\x1b[1m', d: '\x1b[2m'
};

let pass = 0, fail = 0;
let providerToken = '';
let seeker1Token = '';
let seeker2Token = '';
let listing1Id = '';
let listing2Id = '';
let claim1Id = '';
let claim2Id = '';
let claim3Id = '';

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

function validListingPayload(title, overrides = {}) {
  return {
    title,
    description: 'Surplus items available for collection',
    priceType: 'FREE',
    pickupAddress: '456 Commercial Street',
    pickupCity: 'Bangalore',
    availableFrom: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    pickupDeadline: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    foodItems: [
      {
        name: 'Rice & Curry Packets',
        category: 'COOKED_FOOD',
        quantity: 10,
        unit: 'packets',
        foodType: 'VEG'
      }
    ],
    ...overrides
  };
}

async function runTests() {
  header('0. SETUP — Register Users & Create Food Listings');

  // Register Provider
  {
    const { status, data } = await req('POST', '/auth/register', {
      email: `claim_provider_${ts}@test.com`, password: 'Provider1', name: 'Claim Test Provider', role: 'FOOD_PROVIDER'
    });
    providerToken = data.data?.token || '';
    ok('Provider registered', status === 201 && !!providerToken);
  }

  // Register Seeker 1
  {
    const { status, data } = await req('POST', '/auth/register', {
      email: `claim_seeker1_${ts}@test.com`, password: 'SeekerPass1', name: 'Seeker One', role: 'FOOD_SEEKER'
    });
    seeker1Token = data.data?.token || '';
    ok('Seeker 1 registered', status === 201 && !!seeker1Token);
  }

  // Register Seeker 2
  {
    const { status, data } = await req('POST', '/auth/register', {
      email: `claim_seeker2_${ts}@test.com`, password: 'SeekerPass2', name: 'Seeker Two', role: 'FOOD_SEEKER'
    });
    seeker2Token = data.data?.token || '';
    ok('Seeker 2 registered', status === 201 && !!seeker2Token);
  }

  // Create Listing 1
  {
    const { status, data } = await req('POST', '/listings', validListingPayload('Listing One for Claims'), providerToken);
    listing1Id = data.data?.listing?._id || '';
    ok('Listing 1 created', status === 201 && !!listing1Id);
  }

  // Create Listing 2
  {
    const { status, data } = await req('POST', '/listings', validListingPayload('Listing Two for Claims'), providerToken);
    listing2Id = data.data?.listing?._id || '';
    ok('Listing 2 created', status === 201 && !!listing2Id);
  }

  // ═══════════════════════════════════════════
  header('1. CREATE CLAIM — Authorization & Validation');

  // 1a) No token
  {
    const { status } = await req('POST', '/claims', { foodListingId: listing1Id });
    ok('No token → 401', status === 401);
  }

  // 1b) Provider cannot create claim
  {
    const { status } = await req('POST', '/claims', { foodListingId: listing1Id }, providerToken);
    ok('Provider role → 403', status === 403);
  }

  // 1c) Invalid foodListingId format
  {
    const { status } = await req('POST', '/claims', { foodListingId: 'invalid-id' }, seeker1Token);
    ok('Invalid mongo ID → 400', status === 400);
  }

  // 1d) Non-existent listing ID
  {
    const { status } = await req('POST', '/claims', { foodListingId: '000000000000000000000000' }, seeker1Token);
    ok('Non-existent listing → 404', status === 404);
  }

  // ═══════════════════════════════════════════
  header('2. CREATE CLAIM — Success & Duplicate Prevention');

  // 2a) Seeker 1 claims Listing 1
  {
    const { status, data } = await req('POST', '/claims', {
      foodListingId: listing1Id,
      notes: 'We can pick up at 4 PM for NGO community kitchen'
    }, seeker1Token);
    ok('Seeker 1 claims Listing 1 → 201', status === 201);
    ok('Status is PENDING', data.data?.claim?.status === 'PENDING');
    ok('Provider populated', !!data.data?.claim?.providerId?.name);
    claim1Id = data.data?.claim?._id || '';
  }

  // 2b) Duplicate claim by Seeker 1 on Listing 1
  {
    const { status, data } = await req('POST', '/claims', {
      foodListingId: listing1Id,
      notes: 'Trying to claim again'
    }, seeker1Token);
    ok('Duplicate claim attempt → 409', status === 409, data.message);
  }

  // 2c) Seeker 2 claims Listing 1 (Multiple pending claims allowed before approval)
  {
    const { status, data } = await req('POST', '/claims', {
      foodListingId: listing1Id,
      notes: 'Seeker 2 interest'
    }, seeker2Token);
    ok('Seeker 2 claims Listing 1 → 201', status === 201);
    claim2Id = data.data?.claim?._id || '';
  }

  // ═══════════════════════════════════════════
  header('3. GET CLAIMS — My Claims & Incoming Claims');

  // 3a) Seeker 1 gets own claims
  {
    const { status, data } = await req('GET', '/claims/my', null, seeker1Token);
    ok('Seeker 1 get my claims → 200', status === 200);
    ok('Returns 1 claim', data.results >= 1);
  }

  // 3b) Provider gets incoming claims
  {
    const { status, data } = await req('GET', '/claims/incoming', null, providerToken);
    ok('Provider get incoming claims → 200', status === 200);
    ok('Returns at least 2 pending claims', data.results >= 2);
  }

  // 3c) Get single claim (authorized)
  {
    const { status, data } = await req('GET', `/claims/${claim1Id}`, null, seeker1Token);
    ok('Seeker 1 views Claim 1 → 200', status === 200);
    ok('Correct claim returned', data.data?.claim?._id === claim1Id);
  }

  // 3d) Get single claim (unauthorized user - Seeker 2 viewing Seeker 1's claim)
  {
    const { status } = await req('GET', `/claims/${claim1Id}`, null, seeker2Token);
    ok('Seeker 2 views Seeker 1 claim → 403', status === 403);
  }

  // ═══════════════════════════════════════════
  header('4. APPROVE CLAIM — Status Change & Auto-Rejection');

  // 4a) Provider approves Claim 1 (Seeker 1's claim on Listing 1)
  {
    const { status, data } = await req('PATCH', `/claims/${claim1Id}/approve`, null, providerToken);
    ok('Provider approves Claim 1 → 200', status === 200);
    ok('Claim status updated to APPROVED', data.data?.claim?.status === 'APPROVED');
  }

  // 4b) Verify Listing 1 status changed to CLAIMED
  {
    const { status, data } = await req('GET', `/listings/${listing1Id}`);
    ok('Listing 1 status updated to CLAIMED', status === 200 && data.data?.listing?.status === 'CLAIMED');
  }

  // 4c) Verify Claim 2 (competing claim by Seeker 2) was auto-rejected
  {
    const { status, data } = await req('GET', `/claims/${claim2Id}`, null, seeker2Token);
    ok('Competing Claim 2 auto-rejected → 200', status === 200);
    ok('Status is REJECTED', data.data?.claim?.status === 'REJECTED');
    ok('Rejection reason mentions claimed by another', data.data?.claim?.rejectionReason?.includes('another seeker'));
  }

  // 4d) New claim attempt on now-CLAIMED Listing 1 → 400
  {
    const { status, data } = await req('POST', '/claims', { foodListingId: listing1Id }, seeker2Token);
    ok('Claiming CLAIMED listing → 400', status === 400, data.message);
  }

  // ═══════════════════════════════════════════
  header('5. REJECT CLAIM — Provider Rejection Flow');

  // 5a) Seeker 1 claims Listing 2
  {
    const { status, data } = await req('POST', '/claims', { foodListingId: listing2Id }, seeker1Token);
    ok('Seeker 1 claims Listing 2 → 201', status === 201);
    claim3Id = data.data?.claim?._id || '';
  }

  // 5b) Provider rejects Claim 3 with custom reason
  {
    const { status, data } = await req('PATCH', `/claims/${claim3Id}/reject`, {
      rejectionReason: 'Quantity reserved for urgent charity'
    }, providerToken);
    ok('Provider rejects Claim 3 → 200', status === 200);
    ok('Status is REJECTED', data.data?.claim?.status === 'REJECTED');
    ok('Rejection reason saved', data.data?.claim?.rejectionReason === 'Quantity reserved for urgent charity');
  }

  // 5c) Verify Listing 2 remains AVAILABLE
  {
    const { status, data } = await req('GET', `/listings/${listing2Id}`);
    ok('Listing 2 remains AVAILABLE', status === 200 && data.data?.listing?.status === 'AVAILABLE');
  }

  // ═══════════════════════════════════════════
  header('6. CANCEL CLAIM & REVERT LISTING');

  // 6a) Seeker 1 cancels approved Claim 1
  {
    const { status, data } = await req('PATCH', `/claims/${claim1Id}/cancel`, null, seeker1Token);
    ok('Seeker 1 cancels approved Claim 1 → 200', status === 200);
    ok('Status is CANCELLED', data.data?.claim?.status === 'CANCELLED');
  }

  // 6b) Verify Listing 1 status reverted back to AVAILABLE
  {
    const { status, data } = await req('GET', `/listings/${listing1Id}`);
    ok('Listing 1 status reverted to AVAILABLE', status === 200 && data.data?.listing?.status === 'AVAILABLE');
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
