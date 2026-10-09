/**
 * ════════════════════════════════════════════════════════════════
 *  Don't Waste It — Comprehensive End-to-End API Test Suite
 * ════════════════════════════════════════════════════════════════
 *  Covers: Auth, Listing CRUD, AI Parse, Claims, Deliveries,
 *          Admin Analytics, Notifications, and Health endpoints.
 *
 *  Usage:  node test-e2e.js
 *  Requires: Backend running on http://127.0.0.1:5000
 * ════════════════════════════════════════════════════════════════
 */

const API = 'http://127.0.0.1:5000/api';
const ts = Date.now();

// ── Helpers ─────────────────────────────────────────────────────
const C = {
  g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', c: '\x1b[36m',
  b: '\x1b[1m', d: '\x1b[2m', m: '\x1b[35m', x: '\x1b[0m'
};

let pass = 0, fail = 0;
const failures = [];

function header(t) {
  console.log('\n' + '═'.repeat(64));
  console.log(C.b + C.c + `  ${t}` + C.x);
  console.log('═'.repeat(64));
}

function ok(name, passed, detail = '') {
  if (passed) { pass++; console.log(C.g + `  ✅ PASS: ${name}` + C.x); }
  else { fail++; console.log(C.r + `  ❌ FAIL: ${name}` + C.x); failures.push({ name, detail }); }
  if (detail) console.log(C.d + `     ${detail}` + C.x);
}

async function req(method, path, body = null, token = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${API}${path}`, opts);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { status: res.status, data };
  } catch (err) {
    return { status: 0, data: { error: err.message } };
  }
}

// ── State shared across test phases ─────────────────────────────
const state = {
  providerToken: '', providerUser: null,
  seekerToken: '', seekerUser: null,
  volunteerToken: '', volunteerUser: null,
  adminToken: '',
  listingId: '', claimId: '', deliveryId: ''
};

const providerEmail = `provider_${ts}@test.com`;
const seekerEmail = `seeker_${ts}@test.com`;
const volunteerEmail = `volunteer_${ts}@test.com`;

// ════════════════════════════════════════════════════════════════
//  PHASE 1: HEALTH & METRICS
// ════════════════════════════════════════════════════════════════
async function phase1_health() {
  header('PHASE 1 — Health & Monitoring Endpoints');

  {
    const { status, data } = await req('GET', '/health');
    ok('GET /api/health returns 200', status === 200);
    ok('Health reports MongoDB connected', data.database === 'MongoDB connected');
    ok('Health includes uptime', typeof data.uptimeSeconds === 'number');
  }

  {
    const res = await fetch(`${API}/metrics`);
    const text = await res.text();
    ok('GET /api/metrics returns 200', res.status === 200);
    ok('Metrics contains prometheus format', text.includes('dontwasteit_requests_total'));
  }
}

// ════════════════════════════════════════════════════════════════
//  PHASE 2: AUTH — Registration, Login, RBAC
// ════════════════════════════════════════════════════════════════
async function phase2_auth() {
  header('PHASE 2 — Authentication & Role-Based Access');

  // 2.1 Validation errors
  {
    const { status } = await req('POST', '/auth/register', {});
    ok('Register with empty body → 400', status === 400);
  }
  {
    const { status } = await req('POST', '/auth/register', {
      email: 'bad', password: 'x', name: 'T', role: 'FAKE'
    });
    ok('Register with invalid fields → 400', status === 400);
  }
  {
    const { status } = await req('POST', '/auth/register', {
      email: `admin_${ts}@test.com`, password: 'Pass123!', name: 'Hacker', role: 'ADMIN'
    });
    ok('Register as ADMIN blocked', status === 400 || status === 403);
  }

  // 2.2 Register all three roles
  {
    const { status, data } = await req('POST', '/auth/register', {
      email: providerEmail, password: 'Provider1', name: 'E2E Provider',
      phone: '9000000001', role: 'FOOD_PROVIDER'
    });
    ok('Register FOOD_PROVIDER → 201', status === 201);
    ok('Returns JWT token', !!data.data?.token);
    ok('Password not leaked', !data.data?.user?.password);
    state.providerToken = data.data?.token || '';
    state.providerUser = data.data?.user;
  }
  {
    const { status, data } = await req('POST', '/auth/register', {
      email: seekerEmail, password: 'Seeker1', name: 'E2E Seeker NGO',
      phone: '9000000002', role: 'FOOD_SEEKER'
    });
    ok('Register FOOD_SEEKER → 201', status === 201);
    state.seekerToken = data.data?.token || '';
    state.seekerUser = data.data?.user;
  }
  {
    const { status, data } = await req('POST', '/auth/register', {
      email: volunteerEmail, password: 'Volunteer1', name: 'E2E Volunteer',
      phone: '9000000003', role: 'VOLUNTEER'
    });
    ok('Register VOLUNTEER → 201', status === 201);
    state.volunteerToken = data.data?.token || '';
    state.volunteerUser = data.data?.user;
  }

  // 2.3 Duplicate registration
  {
    const { status } = await req('POST', '/auth/register', {
      email: providerEmail, password: 'Provider1', name: 'Dup', role: 'FOOD_PROVIDER'
    });
    ok('Duplicate email → 409', status === 409);
  }

  // 2.4 Login
  {
    const { status, data } = await req('POST', '/auth/login', {
      email: providerEmail, password: 'Provider1'
    });
    ok('Login valid credentials → 200', status === 200);
    ok('Login returns token', !!data.data?.token);
    state.providerToken = data.data?.token || state.providerToken;
  }
  {
    const { status } = await req('POST', '/auth/login', {
      email: providerEmail, password: 'WrongPass1'
    });
    ok('Login wrong password → 401', status === 401);
  }

  // 2.5 GET /me
  {
    const { status } = await req('GET', '/auth/me');
    ok('GET /me without token → 401', status === 401);
  }
  {
    const { status, data } = await req('GET', '/auth/me', null, state.providerToken);
    ok('GET /me with valid token → 200', status === 200);
    ok('Returns correct role', data.data?.user?.role === 'FOOD_PROVIDER');
  }

  // 2.6 Login with seeded Admin account
  {
    const { status, data } = await req('POST', '/auth/login', {
      email: 'admin@dontwasteit.demo', password: 'Demo@123'
    });
    ok('Login seeded Admin account → 200', status === 200);
    ok('Admin role is ADMIN', data.data?.user?.role === 'ADMIN');
    state.adminToken = data.data?.token || '';
  }
}

// ════════════════════════════════════════════════════════════════
//  PHASE 3: AI SMART LISTING PARSER
// ════════════════════════════════════════════════════════════════
async function phase3_ai() {
  header('PHASE 3 — AI Smart Listing Parser');

  // 3.1 Parse raw text
  {
    const { status, data } = await req('POST', '/ai/parse-listing',
      { text: '50 rotis, 3 kg dal, 4 kg aloo sabzi prepared at 6 PM' },
      state.providerToken
    );
    ok('AI parse-listing → 200', status === 200);
    ok('Returns suggestedTitle', !!data.data?.suggestedTitle);
    ok('Returns foodItems array', Array.isArray(data.data?.foodItems));
    ok('Parsed 3 items', data.data?.foodItems?.length === 3);

    const items = data.data?.foodItems || [];
    const categories = items.map(i => i.category);
    const units = items.map(i => i.unit);
    const foodTypes = items.map(i => i.foodType);
    ok('Categories are valid enums', categories.every(c =>
      ['COOKED_FOOD', 'BAKERY', 'FRUITS_VEGETABLES', 'DAIRY', 'PACKAGED_FOOD', 'BEVERAGES', 'OTHER'].includes(c)
    ), `Got: ${categories.join(', ')}`);
    ok('Units are valid enums', units.every(u =>
      ['kg', 'g', 'litre', 'ml', 'pieces', 'plates', 'packets', 'boxes', 'servings'].includes(u)
    ), `Got: ${units.join(', ')}`);
    ok('FoodTypes are valid enums', foodTypes.every(f =>
      ['VEG', 'NON_VEG'].includes(f)
    ), `Got: ${foodTypes.join(', ')}`);
  }

  // 3.2 Unauthorized role
  {
    const { status } = await req('POST', '/ai/parse-listing',
      { text: 'test' }, state.seekerToken
    );
    ok('Seeker cannot use parse-listing → 403', status === 403);
  }

  // 3.3 Empty text
  {
    const { status } = await req('POST', '/ai/parse-listing',
      { text: '' }, state.providerToken
    );
    ok('Empty text → 400', status === 400);
  }
}

// ════════════════════════════════════════════════════════════════
//  PHASE 4: FOOD LISTING CRUD
// ════════════════════════════════════════════════════════════════
async function phase4_listings() {
  header('PHASE 4 — Food Listing CRUD (Provider Flow)');

  const now = new Date();
  const availableFrom = now.toISOString();
  const deadline = new Date(now.getTime() + 6 * 3600000).toISOString();

  // 4.1 Create listing
  const listingPayload = {
    title: 'E2E Test Surplus — Fresh Dinner Buffet',
    description: 'Automated test listing with multiple food items.',
    priceType: 'FREE',
    price: 0,
    pickupAddress: '123 Test Kitchen, MG Road',
    pickupCity: 'Bangalore',
    pickupState: 'Karnataka',
    pickupLat: 12.9716,
    pickupLng: 77.5946,
    availableFrom,
    pickupDeadline: deadline,
    foodItems: [
      { name: 'Basmati Rice', category: 'COOKED_FOOD', quantity: 5, unit: 'kg', foodType: 'VEG', allergens: [], dietaryInfo: [] },
      { name: 'Mixed Vegetable Curry', category: 'COOKED_FOOD', quantity: 3, unit: 'kg', foodType: 'VEG', allergens: [], dietaryInfo: [] }
    ]
  };

  {
    const { status, data } = await req('POST', '/listings', listingPayload, state.providerToken);
    ok('Create listing → 201', status === 201, `Status: ${status}, Message: ${data.message}`);
    ok('Returns listing object', !!data.data?.listing);
    ok('Status is AVAILABLE', data.data?.listing?.status === 'AVAILABLE');
    ok('Has 2 food items', data.data?.listing?.foodItems?.length === 2);
    state.listingId = data.data?.listing?._id || '';
  }

  // 4.2 Validation failures
  {
    const { status } = await req('POST', '/listings', {
      title: 'x', foodItems: []
    }, state.providerToken);
    ok('Listing validation: short title + empty items → 400', status === 400);
  }

  // 4.3 Seeker cannot create listings
  {
    const { status } = await req('POST', '/listings', listingPayload, state.seekerToken);
    ok('Seeker cannot create listings → 403', status === 403);
  }

  // 4.4 Get all listings (public)
  {
    const { status, data } = await req('GET', '/listings');
    ok('GET /listings (public) → 200', status === 200);
    ok('Returns listings array', Array.isArray(data.data?.listings));
    ok('Contains our test listing', data.data?.listings?.some(l => l._id === state.listingId));
  }

  // 4.5 Get single listing
  {
    const { status, data } = await req('GET', `/listings/${state.listingId}`);
    ok('GET single listing → 200', status === 200);
    ok('Returns correct title', data.data?.listing?.title?.includes('E2E Test'));
  }

  // 4.6 Get my listings (provider only)
  {
    const { status, data } = await req('GET', '/listings/my/listings', null, state.providerToken);
    ok('GET /listings/my/listings → 200', status === 200);
    ok('My listings contains test listing', data.data?.listings?.some(l => l._id === state.listingId));
  }

  // 4.7 Distance filtering
  {
    const { status, data } = await req('GET', '/listings?lat=12.9716&lng=77.5946&maxDistance=5&sortByDistance=true');
    ok('Distance-filtered listings → 200', status === 200);
    const found = data.data?.listings?.find(l => l._id === state.listingId);
    ok('Test listing appears in distance results', !!found);
    ok('Distance value is computed', found?.distance !== undefined && found?.distance !== null);
  }
}

// ════════════════════════════════════════════════════════════════
//  PHASE 5: FOOD CLAIM WORKFLOW (Seeker → Provider Approval)
// ════════════════════════════════════════════════════════════════
async function phase5_claims() {
  header('PHASE 5 — Food Claim Workflow');

  // 5.1 Seeker creates a claim
  {
    const { status, data } = await req('POST', '/claims', {
      foodListingId: state.listingId,
      notes: 'E2E Test — need food for community kitchen'
    }, state.seekerToken);
    ok('Seeker creates claim → 201', status === 201, `Status: ${status}`);
    ok('Claim status is PENDING', data.data?.claim?.status === 'PENDING');
    state.claimId = data.data?.claim?._id || '';
  }

  // 5.2 Duplicate claim blocked
  {
    const { status } = await req('POST', '/claims', {
      foodListingId: state.listingId,
      notes: 'duplicate'
    }, state.seekerToken);
    ok('Duplicate claim blocked → 400/409', status === 400 || status === 409);
  }

  // 5.3 Provider cannot create claims
  {
    const { status } = await req('POST', '/claims', {
      foodListingId: state.listingId
    }, state.providerToken);
    ok('Provider cannot claim → 403', status === 403);
  }

  // 5.4 Provider views incoming claims
  {
    const { status, data } = await req('GET', '/claims/incoming', null, state.providerToken);
    ok('Provider gets incoming claims → 200', status === 200);
    ok('Contains our test claim', data.data?.claims?.some(c => c._id === state.claimId));
  }

  // 5.5 Seeker views their claims
  {
    const { status, data } = await req('GET', '/claims/my', null, state.seekerToken);
    ok('Seeker gets own claims → 200', status === 200);
    ok('Contains our test claim', data.data?.claims?.some(c => c._id === state.claimId));
  }

  // 5.6 Provider approves the claim
  {
    const { status, data } = await req('PATCH', `/claims/${state.claimId}/approve`, {}, state.providerToken);
    ok('Provider approves claim → 200', status === 200, `Status: ${status}, Message: ${data.message}`);
    ok('Claim status updated to APPROVED', data.data?.claim?.status === 'APPROVED');
  }
}

// ════════════════════════════════════════════════════════════════
//  PHASE 6: DELIVERY / LOGISTICS WORKFLOW (Volunteer Flow)
// ════════════════════════════════════════════════════════════════
async function phase6_deliveries() {
  header('PHASE 6 — Delivery Logistics Workflow');

  // 6.1 Volunteer sees available pickup tasks
  {
    const { status, data } = await req('GET', '/deliveries/available', null, state.volunteerToken);
    ok('GET available deliveries → 200', status === 200);
    const tasks = data.data?.deliveries || [];
    ok('Available tasks returned as array', Array.isArray(tasks));
    if (tasks.length > 0) {
      state.deliveryId = tasks[0]._id;
      ok('Found pickup task for our claim', !!state.deliveryId);
    } else {
      ok('Found pickup task for our claim', false, 'No delivery tasks generated from approved claim');
    }
  }

  if (!state.deliveryId) {
    console.log(C.y + '  ⚠ Skipping delivery status updates (no delivery task found)' + C.x);
    return;
  }

  // 6.2 Volunteer accepts task
  {
    const { status, data } = await req('PATCH', `/deliveries/${state.deliveryId}/accept`, {}, state.volunteerToken);
    ok('Volunteer accepts task → 200', status === 200, `Status: ${status}, Message: ${data.message}`);
  }

  // 6.3 Volunteer views assigned tasks
  {
    const { status, data } = await req('GET', '/deliveries/my', null, state.volunteerToken);
    ok('GET my assigned tasks → 200', status === 200);
    ok('Contains our accepted task', data.data?.deliveries?.some(d => d._id === state.deliveryId));
  }

  // 6.4 Mark as picked up
  {
    const { status, data } = await req('PATCH', `/deliveries/${state.deliveryId}/picked-up`, {}, state.volunteerToken);
    ok('Mark picked up → 200', status === 200, `Status: ${status}, Message: ${data.message}`);
  }

  // 6.5 Mark as delivered
  {
    const { status, data } = await req('PATCH', `/deliveries/${state.deliveryId}/delivered`, {
      proofOfDelivery: 'Handed to kitchen manager at NGO'
    }, state.volunteerToken);
    ok('Mark delivered → 200', status === 200, `Status: ${status}, Message: ${data.message}`);
  }

  // 6.6 Seeker confirms receipt
  {
    const { status, data } = await req('PATCH', `/deliveries/${state.deliveryId}/confirm-receipt`, {}, state.seekerToken);
    ok('Seeker confirms receipt → 200', status === 200, `Status: ${status}, Message: ${data.message}`);
  }
}

// ════════════════════════════════════════════════════════════════
//  PHASE 7: NOTIFICATIONS
// ════════════════════════════════════════════════════════════════
async function phase7_notifications() {
  header('PHASE 7 — Notification System');

  {
    const { status, data } = await req('GET', '/notifications', null, state.providerToken);
    ok('GET /notifications → 200', status === 200);
    ok('Returns notifications array', Array.isArray(data.data?.notifications));
  }
  {
    const { status, data } = await req('GET', '/notifications', null, state.seekerToken);
    ok('Seeker gets notifications → 200', status === 200);
  }
}

// ════════════════════════════════════════════════════════════════
//  PHASE 8: ADMIN & AI ANALYTICS
// ════════════════════════════════════════════════════════════════
async function phase8_admin() {
  header('PHASE 8 — Admin Analytics & AI Query');

  if (!state.adminToken) {
    console.log(C.y + '  ⚠ No admin token — skipping admin tests' + C.x);
    return;
  }

  // 8.1 Admin views all listings
  {
    const { status, data } = await req('GET', '/listings?status=', null);
    ok('Admin: GET all listings → 200', status === 200);
  }

  // 8.2 AI insights
  {
    const { status, data } = await req('GET', '/ai/insights', null, state.adminToken);
    ok('GET /ai/insights → 200', status === 200);
    ok('Insights has summary', !!data.data?.summary);
    ok('Insights has topCategory', !!data.data?.topCategory);
    ok('Insights has rescueRate', data.data?.summary?.rescueRatePercent !== undefined);
  }

  // 8.3 AI admin query
  {
    const { status, data } = await req('POST', '/ai/admin-query',
      { query: 'Most rescued food category?' }, state.adminToken
    );
    ok('AI admin-query → 200', status === 200);
    ok('Returns answer string', typeof data.data?.answer === 'string' && data.data.answer.length > 0,
      `Answer: ${data.data?.answer?.substring(0, 80)}`);
    ok('Returns stats object', !!data.data?.stats);
  }

  // 8.4 AI recommendations (seeker)
  {
    const { status, data } = await req('GET', '/ai/recommendations?lat=12.9716&lng=77.5946',
      null, state.seekerToken
    );
    ok('AI recommendations → 200', status === 200);
    ok('Returns recommendations array', Array.isArray(data.data?.recommendations));
  }

  // 8.5 Non-admin blocked from admin-query
  {
    const { status } = await req('POST', '/ai/admin-query',
      { query: 'test' }, state.seekerToken
    );
    ok('Non-admin blocked from admin-query → 403', status === 403);
  }
}

// ════════════════════════════════════════════════════════════════
//  PHASE 9: CROSS-ROLE ACCESS CONTROL
// ════════════════════════════════════════════════════════════════
async function phase9_rbac() {
  header('PHASE 9 — Cross-Role Access Control');

  // Volunteer cannot create listings
  {
    const { status } = await req('POST', '/listings', {
      title: 'Hack', foodItems: [{ name: 'x', category: 'COOKED_FOOD', quantity: 1, unit: 'kg', foodType: 'VEG' }],
      pickupAddress: 'Test', availableFrom: new Date().toISOString(),
      pickupDeadline: new Date(Date.now() + 3600000).toISOString(), priceType: 'FREE'
    }, state.volunteerToken);
    ok('Volunteer cannot create listings → 403', status === 403);
  }

  // Volunteer cannot create claims
  {
    const { status } = await req('POST', '/claims', { foodListingId: state.listingId }, state.volunteerToken);
    ok('Volunteer cannot claim → 403', status === 403);
  }

  // No token → protected route
  {
    const { status } = await req('GET', '/listings/my/listings');
    ok('No token on protected route → 401', status === 401);
  }
}

// ════════════════════════════════════════════════════════════════
//  RUN ALL PHASES
// ════════════════════════════════════════════════════════════════
async function runAll() {
  console.log('\n' + C.b + C.m + '  🍲 Don\'t Waste It — E2E API Test Suite' + C.x);
  console.log(C.d + `  Started: ${new Date().toLocaleString()}` + C.x);
  console.log(C.d + `  Target:  ${API}` + C.x);

  // Wait for server readiness
  let ready = false;
  for (let i = 0; i < 15; i++) {
    try {
      const r = await fetch(`${API}/health`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) { ready = true; break; }
    } catch {}
    console.log(C.y + `  Waiting for server... (attempt ${i + 1}/15)` + C.x);
    await new Promise(r => setTimeout(r, 3000));
  }

  if (!ready) {
    console.log(C.r + '\n  ❌ Server not reachable at ' + API + '. Aborting.\n' + C.x);
    process.exit(1);
  }
  console.log(C.g + '  ✅ Server is ready!\n' + C.x);

  await phase1_health();
  await phase2_auth();
  await phase3_ai();
  await phase4_listings();
  await phase5_claims();
  await phase6_deliveries();
  await phase7_notifications();
  await phase8_admin();
  await phase9_rbac();

  // ── FINAL REPORT ────────────────────────────────────────────
  const total = pass + fail;
  console.log('\n' + '═'.repeat(64));
  console.log(C.b + C.c + '  📊 FINAL TEST REPORT' + C.x);
  console.log('═'.repeat(64));
  console.log(`\n  Total:  ${total}`);
  console.log(C.g + `  Passed: ${pass}` + C.x);
  console.log(C.r + `  Failed: ${fail}` + C.x);
  console.log(`  Rate:   ${total > 0 ? Math.round((pass / total) * 100) : 0}%\n`);

  if (failures.length > 0) {
    console.log(C.r + C.b + '  ── FAILURE DETAILS ──' + C.x);
    failures.forEach((f, i) => {
      console.log(C.r + `  ${i + 1}. ${f.name}` + C.x);
      if (f.detail) console.log(C.d + `     ${f.detail}` + C.x);
    });
    console.log('');
  }

  if (fail === 0) {
    console.log(C.g + C.b + '  🎉 ALL TESTS PASSED! The platform is fully operational.\n' + C.x);
  } else {
    console.log(C.y + `  ⚠  ${fail} test(s) failed. See details above.\n` + C.x);
  }

  console.log('═'.repeat(64) + '\n');
  process.exit(fail > 0 ? 1 : 0);
}

runAll().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
