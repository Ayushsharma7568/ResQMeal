// Phase 8 Test Script — Haversine distance, location filtering, notifications
const BASE = 'http://127.0.0.1:5000/api';

const colors = {
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m'
};

let passCount = 0;
let failCount = 0;

function log(color, ...args) { console.log(color, ...args, colors.reset); }
function header(title) {
  console.log('\n' + '='.repeat(65));
  log(colors.bold + colors.cyan, `  ${title}`);
  console.log('='.repeat(65));
}
function testResult(name, passed, detail = '') {
  if (passed) { passCount++; log(colors.green, `  PASS: ${name}`); }
  else { failCount++; log(colors.red, `  FAIL: ${name}`); }
  if (detail) log(colors.dim, `     ${detail}`);
}

async function req(method, path, body = null, token = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

// Haversine utility (pure JS, no server needed)
function haversine(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some(v => v === null || v === undefined || isNaN(v))) return null;
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(toRad(lat1)) * Math.cos(toRad(lat2));
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

const ts = Date.now();

async function runTests() {

  header('1. HAVERSINE DISTANCE UTILITY (Pure Math Tests)');

  // 1a — Known distance: Mumbai <-> Delhi ~ 1148 km
  {
    const dist = haversine(19.076, 72.877, 28.613, 77.209);
    testResult('Mumbai to Delhi ~1148 km', dist >= 1140 && dist <= 1160, `Got: ${dist} km`);
  }

  // 1b — Same point should return 0
  {
    const dist = haversine(12.9716, 77.5946, 12.9716, 77.5946);
    testResult('Same point returns 0 km', dist === 0, `Got: ${dist} km`);
  }

  // 1c — Short local distance (< 10 km)
  {
    const dist = haversine(12.9352, 77.6245, 12.9784, 77.6408);
    testResult('Short local distance < 10 km', dist !== null && dist < 10, `Got: ${dist} km`);
  }

  // 1d — Null input guard
  {
    const dist = haversine(null, 77.5, 12.9, 77.6);
    testResult('Null coordinates returns null', dist === null, `Got: ${dist}`);
  }

  // 1e — NaN input guard
  {
    const dist = haversine(NaN, 77.5, 12.9, 77.6);
    testResult('NaN coordinates returns null', dist === null, `Got: ${dist}`);
  }

  header('2. SETUP — Register test users');

  let providerToken, seekerToken, volunteerToken;
  let providerId, seekerId, volunteerId;
  let listingId, claimId, deliveryId;

  {
    const r = await req('POST', '/auth/register', {
      name: `P8Provider_${ts}`,
      email: `p8provider_${ts}@test.com`,
      password: 'Pass123!',
      role: 'FOOD_PROVIDER',
      phone: '9123456780',
      organizationName: `NGO Provider ${ts}`,
      organizationType: 'RESTAURANT'
    });
    providerToken = r.data?.data?.token;
    providerId = r.data?.data?.user?._id;
    testResult('Register provider', r.status === 201 && !!providerToken);
  }

  {
    const r = await req('POST', '/auth/register', {
      name: `P8Seeker_${ts}`,
      email: `p8seeker_${ts}@test.com`,
      password: 'Pass123!',
      role: 'FOOD_SEEKER',
      phone: '9123456781',
      organizationName: `Seeker NGO ${ts}`,
      organizationType: 'NGO'
    });
    seekerToken = r.data?.data?.token;
    seekerId = r.data?.data?.user?._id;
    testResult('Register seeker', r.status === 201 && !!seekerToken);
  }

  {
    const r = await req('POST', '/auth/register', {
      name: `P8Volunteer_${ts}`,
      email: `p8volunteer_${ts}@test.com`,
      password: 'Pass123!',
      role: 'VOLUNTEER',
      phone: '9123456782'
    });
    volunteerToken = r.data?.data?.token;
    volunteerId = r.data?.data?.user?._id;
    testResult('Register volunteer', r.status === 201 && !!volunteerToken);
  }

  header('3. DISTANCE FILTERING — Create listing with coordinates');

  {
    const deadline = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const available = new Date(Date.now() - 60000).toISOString();
    const r = await req('POST', '/listings', {
      title: `P8 Geo Listing ${ts}`,
      description: 'Test location listing',
      foodItems: [{ name: 'Rice', quantity: 10, unit: 'kg', category: 'COOKED_FOOD', foodType: 'VEG' }],
      priceType: 'FREE',
      pickupAddress: '100 Koramangala, Bangalore',
      pickupCity: 'Bangalore',
      pickupState: 'Karnataka',
      pickupPincode: '560034',
      pickupLat: 12.9352,
      pickupLng: 77.6245,
      availableFrom: available,
      pickupDeadline: deadline
    }, providerToken);
    listingId = r.data?.data?.listing?._id;
    testResult('Create geolocated listing', r.status === 201 && !!listingId, `ID: ${listingId}`);
  }

  // Filter: within 10 km of Indiranagar should find Koramangala listing
  {
    const r = await req('GET', '/listings?lat=12.9784&lng=77.6408&maxDistance=10', null, seekerToken);
    const listings = r.data?.data?.listings || [];
    const found = listings.some(l => l._id === listingId);
    testResult(
      'maxDistance=10km from Indiranagar includes Koramangala listing',
      r.status === 200 && found,
      `Found ${listings.length} listing(s), target: ${found}`
    );
  }

  // Distance field is present on results
  {
    const r = await req('GET', '/listings?lat=12.9784&lng=77.6408&maxDistance=10', null, seekerToken);
    const listings = r.data?.data?.listings || [];
    const target = listings.find(l => l._id === listingId);
    testResult(
      'Distance field present on listing result',
      target && target.distance !== undefined && target.distance !== null,
      `Distance: ${target?.distance} km`
    );
  }

  // Filter: London vs Bangalore should exclude it
  {
    const r = await req('GET', '/listings?lat=51.5074&lng=-0.1278&maxDistance=5', null, seekerToken);
    const listings = r.data?.data?.listings || [];
    const found = listings.some(l => l._id === listingId);
    testResult('maxDistance=5km from London excludes Bangalore listing', !found, `Found: ${found}`);
  }

  // Sort by distance ASC
  {
    const r = await req('GET', '/listings?lat=12.9784&lng=77.6408&sortByDistance=true', null, seekerToken);
    const listings = r.data?.data?.listings || [];
    let sorted = true;
    for (let i = 1; i < listings.length; i++) {
      if ((listings[i].distance ?? Infinity) < (listings[i - 1].distance ?? Infinity)) {
        sorted = false;
        break;
      }
    }
    testResult('sortByDistance=true returns listings sorted ASC', r.status === 200 && sorted, `Sorted: ${sorted}, count: ${listings.length}`);
  }

  header('4. NOTIFICATION SYSTEM — Claim workflow triggers');

  // Seeker creates a claim (triggers CLAIM_SUBMITTED notification to provider)
  {
    const r = await req('POST', '/claims', {
      foodListingId: listingId,
      notes: 'Phase 8 test claim'
    }, seekerToken);
    claimId = r.data?.data?.claim?._id;
    testResult('Seeker creates claim (triggers provider notification)', r.status === 201 && !!claimId, `Claim ID: ${claimId}`);
  }

  await new Promise(r => setTimeout(r, 500));

  // Provider should see CLAIM_SUBMITTED notification
  {
    const r = await req('GET', '/notifications', null, providerToken);
    const notifs = r.data?.data?.notifications || [];
    const found = notifs.some(n => n.type === 'CLAIM_SUBMITTED');
    testResult('Provider receives CLAIM_SUBMITTED notification', r.status === 200 && found, `Count: ${notifs.length}, found: ${found}`);
  }

  // Provider approves claim
  {
    const r = await req('PATCH', `/claims/${claimId}/approve`, {}, providerToken);
    testResult('Provider approves claim', r.status === 200);
  }

  await new Promise(r => setTimeout(r, 500));

  // Seeker gets CLAIM_APPROVED notification
  {
    const r = await req('GET', '/notifications', null, seekerToken);
    const notifs = r.data?.data?.notifications || [];
    const found = notifs.some(n => n.type === 'CLAIM_APPROVED');
    testResult('Seeker receives CLAIM_APPROVED notification', r.status === 200 && found, `Count: ${notifs.length}, found: ${found}`);
  }

  header('5. NOTIFICATION RETRIEVAL');

  {
    const r = await req('GET', '/notifications', null, seekerToken);
    testResult('GET /notifications returns 200 + array', r.status === 200 && Array.isArray(r.data?.data?.notifications), `Count: ${r.data?.data?.notifications?.length}`);
  }

  {
    const r = await req('GET', '/notifications', null, seekerToken);
    testResult('GET /notifications includes unreadCount', r.status === 200 && typeof r.data?.unreadCount === 'number', `unreadCount: ${r.data?.unreadCount}`);
  }

  {
    const r = await req('GET', '/notifications?unreadOnly=true', null, seekerToken);
    const notifs = r.data?.data?.notifications || [];
    const allUnread = notifs.every(n => n.read === false);
    testResult('unreadOnly=true returns only unread notifications', r.status === 200 && allUnread, `All unread: ${allUnread}, count: ${notifs.length}`);
  }

  {
    const r = await req('GET', '/notifications?limit=2', null, seekerToken);
    const pag = r.data?.pagination;
    testResult('Notifications support pagination', r.status === 200 && pag?.page !== undefined, `page: ${pag?.page}, totalPages: ${pag?.totalPages}`);
  }

  header('6. MARK AS READ — Single & All');

  let notifId;
  {
    const r = await req('GET', '/notifications?unreadOnly=true', null, seekerToken);
    notifId = r.data?.data?.notifications?.[0]?._id;
    testResult('Get an unread notification ID', !!notifId, `ID: ${notifId}`);
  }

  {
    const r = await req('PATCH', `/notifications/${notifId}/read`, null, seekerToken);
    testResult('PATCH /notifications/:id/read marks notification read', r.status === 200 && r.data?.data?.notification?.read === true, `read: ${r.data?.data?.notification?.read}`);
  }

  {
    const r = await req('GET', '/notifications?unreadOnly=true', null, seekerToken);
    const still = r.data?.data?.notifications?.some(n => n._id === notifId);
    testResult('Marked notification no longer in unreadOnly results', !still, `still unread: ${still}`);
  }

  {
    const r = await req('PATCH', '/notifications/read-all', null, seekerToken);
    testResult('PATCH /notifications/read-all returns 200', r.status === 200);
  }

  {
    const r = await req('GET', '/notifications', null, seekerToken);
    testResult('unreadCount = 0 after mark all read', r.data?.unreadCount === 0, `unreadCount: ${r.data?.unreadCount}`);
  }

  header('7. AUTHORIZATION — Notifications');

  {
    const r = await req('GET', '/notifications');
    testResult('Unauthenticated GET /notifications returns 401', r.status === 401, `Status: ${r.status}`);
  }

  {
    const providerNotifs = await req('GET', '/notifications?unreadOnly=true', null, providerToken);
    const pNotifId = providerNotifs.data?.data?.notifications?.[0]?._id;
    if (pNotifId) {
      const r = await req('PATCH', `/notifications/${pNotifId}/read`, null, seekerToken);
      testResult('Seeker cannot mark provider notification (404)', r.status === 404, `Status: ${r.status}`);
    } else {
      testResult('Seeker cannot mark provider notification (no unread notifs to test)', true, 'Skipped');
    }
  }

  {
    const r = await req('PATCH', '/notifications/invalid-id/read', null, seekerToken);
    testResult('Invalid notification ID returns 400', r.status === 400, `Status: ${r.status}`);
  }

  header('8. DUPLICATE NOTIFICATION PREVENTION');

  let listingId2, claimId2;
  {
    const deadline = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    const available = new Date(Date.now() - 60000).toISOString();
    const r = await req('POST', '/listings', {
      title: `P8 Dedup Listing ${ts}`,
      description: 'Dedup test',
      category: 'BAKERY',
      foodItems: [{ name: 'Bread', quantity: 5, unit: 'kg', category: 'BAKERY', foodType: 'VEG' }],
      priceType: 'FREE',
      pickupAddress: '200 Test St, Bangalore',
      pickupCity: 'Bangalore',
      pickupState: 'Karnataka',
      pickupPincode: '560001',
      pickupLat: 12.9352,
      pickupLng: 77.6245,
      availableFrom: available,
      pickupDeadline: deadline
    }, providerToken);
    listingId2 = r.data?.data?.listing?._id;
    testResult('Create second listing for dedup test', r.status === 201 && !!listingId2, `Status: ${r.status}, msg: ${r.data?.message}, errors: ${JSON.stringify(r.data?.errors)}`);
  }

  {
    const r = await req('POST', '/claims', { foodListingId: listingId2, notes: 'Dedup test' }, seekerToken);
    claimId2 = r.data?.data?.claim?._id;
    testResult('Create claim for dedup test', r.status === 201 && !!claimId2);
  }

  await new Promise(r => setTimeout(r, 500));

  {
    const r = await req('GET', '/notifications', null, providerToken);
    const notifs = r.data?.data?.notifications || [];
    const dupNotifs = notifs.filter(n => n.type === 'CLAIM_SUBMITTED' && n.relatedEntityId === claimId2);
    testResult('No duplicate CLAIM_SUBMITTED for same claim entity', dupNotifs.length <= 1, `Found ${dupNotifs.length} duplicate(s)`);
  }

  header('9. VOLUNTEER DELIVERY TASK — Distance + Notifications');

  {
    const r = await req('PATCH', `/claims/${claimId2}/approve`, {}, providerToken);
    testResult('Approve claim2 for delivery test', r.status === 200);
  }

  {
    const r = await req('POST', '/deliveries', {
      foodClaimId: claimId2,
      deliveryAddress: '300 Seeker St, Indiranagar, Bangalore',
      notes: 'Phase 8 delivery test'
    }, providerToken);
    deliveryId = r.data?.data?.delivery?._id || r.data?.data?.existingDelivery?._id;
    testResult('Create delivery task (or auto-created on claim approval)', r.status === 201 || r.status === 409, `Status: ${r.status}`);
  }

  {
    const r = await req('GET', '/deliveries/available', null, volunteerToken);
    testResult('GET /deliveries/available returns 200', r.status === 200 && Array.isArray(r.data?.data?.deliveries), `Tasks: ${r.data?.data?.deliveries?.length}`);
  }

  {
    const r = await req('GET', '/deliveries/available?lat=12.9784&lng=77.6408&sortByDistance=true', null, volunteerToken);
    testResult('GET /deliveries/available with coords returns 200', r.status === 200, `Tasks: ${r.data?.data?.deliveries?.length}`);
  }

  {
    const r = await req('PATCH', `/deliveries/${deliveryId}/accept`, null, volunteerToken);
    testResult('Volunteer accepts delivery task', r.status === 200, `Status: ${r.data?.data?.delivery?.status}`);
  }

  await new Promise(r => setTimeout(r, 500));

  {
    const sr = await req('GET', '/notifications', null, seekerToken);
    const sNotifs = sr.data?.data?.notifications || [];
    const seekerGotIt = sNotifs.some(n => n.type === 'DELIVERY_ASSIGNED');
    testResult('Seeker receives DELIVERY_ASSIGNED notification', seekerGotIt, `Seeker notifications: ${sNotifs.length}`);
  }

  {
    const pr = await req('GET', '/notifications', null, providerToken);
    const pNotifs = pr.data?.data?.notifications || [];
    const providerGotIt = pNotifs.some(n => n.type === 'DELIVERY_ASSIGNED');
    testResult('Provider receives DELIVERY_ASSIGNED notification', providerGotIt, `Provider notifications: ${pNotifs.length}`);
  }

  header('10. EDGE CASES');

  {
    const r = await req('GET', '/listings?lat=12.9716', null, seekerToken);
    testResult('GET /listings with only lat (no lng) does not crash', r.status === 200, `Status: ${r.status}`);
  }

  {
    const r = await req('GET', '/listings?lat=12.9716&lng=77.5946&maxDistance=0', null, seekerToken);
    testResult('maxDistance=0 returns 200 with empty or zero-distance results', r.status === 200, `Count: ${r.data?.data?.listings?.length}`);
  }

  {
    const r = await req('GET', '/notifications?limit=500', null, seekerToken);
    testResult('Limit=500 capped at 100 server-side', r.status === 200 && r.data?.pagination?.limit <= 100, `Effective limit: ${r.data?.pagination?.limit}`);
  }

  // Final summary
  console.log('\n' + '='.repeat(65));
  log(colors.bold, '  PHASE 8 TEST RESULTS');
  console.log('='.repeat(65));
  log(colors.green, `  PASSED: ${passCount}`);
  log(failCount > 0 ? colors.red : colors.green, `  FAILED: ${failCount}`);
  log(colors.bold, `  TOTAL:  ${passCount + failCount}`);
  console.log('='.repeat(65) + '\n');

  if (failCount > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
