// Food Listing API Test Script
// Tests CRUD, authorization, validation, filtering, and pagination
const BASE = 'http://127.0.0.1:5000/api';

const C = {
  g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m',
  c: '\x1b[36m', x: '\x1b[0m', b: '\x1b[1m', d: '\x1b[2m'
};

let pass = 0, fail = 0;
let providerToken = '';
let seekerToken = '';
let listingId = '';
let listingId2 = '';

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

// ─── Helper: valid listing payload ──────────
function validListing(overrides = {}) {
  return {
    title: 'Fresh Lunch Surplus',
    description: 'Leftover lunch from our restaurant — still warm and fresh.',
    priceType: 'FREE',
    pickupAddress: '123 MG Road, Indiranagar',
    pickupCity: 'Bangalore',
    pickupState: 'Karnataka',
    pickupPincode: '560038',
    pickupLat: 12.9716,
    pickupLng: 77.5946,
    pickupInstructions: 'Ask at the back entrance near the kitchen.',
    availableFrom: new Date(Date.now() + 60 * 60 * 1000).toISOString(),       // 1 hour from now
    pickupDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),  // 4 hours from now
    foodItems: [
      {
        name: 'Dal Makhani',
        category: 'COOKED_FOOD',
        quantity: 5,
        unit: 'kg',
        foodType: 'VEG',
        preparedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        allergens: ['dairy'],
        dietaryInfo: ['gluten-free'],
        description: 'Creamy lentil dish'
      },
      {
        name: 'Butter Chicken',
        category: 'COOKED_FOOD',
        quantity: 3,
        unit: 'kg',
        foodType: 'NON_VEG',
        preparedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        allergens: ['dairy'],
        description: 'Tandoori chicken in tomato-cream sauce'
      }
    ],
    ...overrides
  };
}

async function runTests() {

  // ── SETUP: Register a provider and a seeker ──
  header('0. SETUP — Register test users');

  {
    const { status, data } = await req('POST', '/auth/register', {
      email: `provider_${ts}@test.com`, password: 'Provider1', name: 'Test Provider', role: 'FOOD_PROVIDER'
    });
    providerToken = data.data?.token || '';
    ok('Provider registered', status === 201 && !!providerToken);
  }

  {
    const { status, data } = await req('POST', '/auth/register', {
      email: `seeker_${ts}@test.com`, password: 'Seeker1', name: 'Test Seeker', role: 'FOOD_SEEKER'
    });
    seekerToken = data.data?.token || '';
    ok('Seeker registered', status === 201 && !!seekerToken);
  }

  // ═══════════════════════════════════════════
  header('1. CREATE LISTING — Authorization');

  // 1a) No token
  {
    const { status } = await req('POST', '/listings', validListing());
    ok('No token → 401', status === 401);
  }

  // 1b) Seeker can't create
  {
    const { status, data } = await req('POST', '/listings', validListing(), seekerToken);
    ok('Seeker → 403', status === 403, data.message);
  }

  // ═══════════════════════════════════════════
  header('2. CREATE LISTING — Validation');

  // 2a) Empty body
  {
    const { status } = await req('POST', '/listings', {}, providerToken);
    ok('Empty body → 400', status === 400);
  }

  // 2b) No food items
  {
    const { status } = await req('POST', '/listings', validListing({ foodItems: [] }), providerToken);
    ok('No food items → 400', status === 400);
  }

  // 2c) Invalid category
  {
    const payload = validListing({
      foodItems: [{ name: 'Test', category: 'INVALID', quantity: 1, unit: 'kg', foodType: 'VEG' }]
    });
    const { status } = await req('POST', '/listings', payload, providerToken);
    ok('Invalid category → 400', status === 400);
  }

  // 2d) pickupDeadline before availableFrom
  {
    const payload = validListing({
      availableFrom: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      pickupDeadline: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
    });
    const { status, data } = await req('POST', '/listings', payload, providerToken);
    ok('Deadline before availableFrom → 400', status === 400, data.message);
  }

  // 2e) CUSTOM price without price value
  {
    const payload = validListing({ priceType: 'CUSTOM', price: 0 });
    const { status, data } = await req('POST', '/listings', payload, providerToken);
    ok('CUSTOM price with 0 → 400', status === 400, data.message);
  }

  // ═══════════════════════════════════════════
  header('3. CREATE LISTING — Success');

  // 3a) Create first listing (FREE, VEG + NON_VEG)
  {
    const { status, data } = await req('POST', '/listings', validListing(), providerToken);
    ok('Create listing → 201', status === 201);
    ok('Has listing ID', !!data.data?.listing?._id);
    ok('Provider populated', !!data.data?.listing?.providerId?.name);
    ok('Has 2 food items', data.data?.listing?.foodItems?.length === 2);
    ok('Status is AVAILABLE', data.data?.listing?.status === 'AVAILABLE');
    ok('Price type is FREE', data.data?.listing?.priceType === 'FREE');
    ok('Has pickup city', data.data?.listing?.pickupCity === 'Bangalore');
    listingId = data.data?.listing?._id;
  }

  // 3b) Create second listing (HALF price, bakery, Delhi)
  {
    const payload = validListing({
      title: 'Bakery Clearance',
      priceType: 'HALF',
      price: 150,
      pickupCity: 'Delhi',
      foodItems: [{
        name: 'Croissants',
        category: 'BAKERY',
        quantity: 20,
        unit: 'pieces',
        foodType: 'VEG'
      }]
    });
    const { status, data } = await req('POST', '/listings', payload, providerToken);
    ok('Create 2nd listing → 201', status === 201);
    ok('Price type HALF', data.data?.listing?.priceType === 'HALF');
    listingId2 = data.data?.listing?._id;
  }

  // 3c) Create third listing (VEG only, fruits)
  {
    const payload = validListing({
      title: 'Fresh Fruit Basket',
      priceType: 'ONE_THIRD',
      price: 100,
      pickupCity: 'Bangalore',
      foodItems: [{
        name: 'Apples & Bananas',
        category: 'FRUITS_VEGETABLES',
        quantity: 10,
        unit: 'kg',
        foodType: 'VEG'
      }]
    });
    const { status } = await req('POST', '/listings', payload, providerToken);
    ok('Create 3rd listing (fruits) → 201', status === 201);
  }

  // ═══════════════════════════════════════════
  header('4. GET LISTINGS — Public Browse');

  // 4a) Get all available
  {
    const { status, data } = await req('GET', '/listings');
    ok('GET /listings → 200', status === 200);
    ok('Has pagination', !!data.pagination);
    ok('Results ≥ 3', data.results >= 3, `Got ${data.results}`);
  }

  // 4b) Filter by category
  {
    const { status, data } = await req('GET', '/listings?category=BAKERY');
    ok('Filter category=BAKERY → results', status === 200 && data.results >= 1);
  }

  // 4c) Filter by foodType
  {
    const { status, data } = await req('GET', '/listings?foodType=NON_VEG');
    ok('Filter foodType=NON_VEG → results', status === 200 && data.results >= 1);
  }

  // 4d) Filter by priceType
  {
    const { status, data } = await req('GET', '/listings?priceType=FREE');
    ok('Filter priceType=FREE → results', status === 200 && data.results >= 1);
  }

  // 4e) Filter by city
  {
    const { status, data } = await req('GET', '/listings?city=Delhi');
    ok('Filter city=Delhi → results', status === 200 && data.results >= 1);
  }

  // 4f) Pagination
  {
    const { status, data } = await req('GET', '/listings?page=1&limit=2');
    ok('Pagination limit=2', status === 200 && data.data.listings.length <= 2,
      `Got ${data.data.listings.length} of ${data.pagination.totalResults}`);
  }

  // ═══════════════════════════════════════════
  header('5. GET SINGLE LISTING');

  // 5a) Valid ID
  {
    const { status, data } = await req('GET', `/listings/${listingId}`);
    ok('GET /listings/:id → 200', status === 200);
    ok('Correct listing returned', data.data?.listing?._id === listingId);
    ok('Provider populated', !!data.data?.listing?.providerId?.name);
  }

  // 5b) Non-existent ID
  {
    const { status } = await req('GET', '/listings/000000000000000000000000');
    ok('Non-existent ID → 404', status === 404);
  }

  // 5c) Invalid ID format
  {
    const { status } = await req('GET', '/listings/invalid-id');
    ok('Invalid ID format → 400', status === 400);
  }

  // ═══════════════════════════════════════════
  header('6. UPDATE LISTING');

  // 6a) Seeker can't update
  {
    const { status } = await req('PUT', `/listings/${listingId}`, { title: 'Hacked' }, seekerToken);
    ok('Seeker update → 403', status === 403);
  }

  // 6b) Owner updates title
  {
    const { status, data } = await req('PUT', `/listings/${listingId}`,
      { title: 'Updated Lunch Surplus' }, providerToken);
    ok('Update title → 200', status === 200);
    ok('Title changed', data.data?.listing?.title === 'Updated Lunch Surplus');
  }

  // 6c) Update food items
  {
    const { status, data } = await req('PUT', `/listings/${listingId}`, {
      foodItems: [{
        name: 'Paneer Tikka',
        category: 'COOKED_FOOD',
        quantity: 2,
        unit: 'kg',
        foodType: 'VEG'
      }]
    }, providerToken);
    ok('Update food items → 200', status === 200);
    ok('Now has 1 food item', data.data?.listing?.foodItems?.length === 1);
  }

  // 6d) Update price type
  {
    const { status, data } = await req('PUT', `/listings/${listingId}`,
      { priceType: 'CUSTOM', price: 200 }, providerToken);
    ok('Update to CUSTOM price → 200', status === 200);
    ok('Price updated', data.data?.listing?.price === 200);
  }

  // ═══════════════════════════════════════════
  header('7. MY LISTINGS — Provider\'s Own');

  {
    const { status, data } = await req('GET', '/listings/my/listings', null, providerToken);
    ok('GET /listings/my/listings → 200', status === 200);
    ok('Shows provider\'s listings', data.results >= 3, `Got ${data.results}`);
  }

  // Filter by status
  {
    const { status, data } = await req('GET', '/listings/my/listings?status=AVAILABLE', null, providerToken);
    ok('My listings filtered by AVAILABLE', status === 200 && data.results >= 2);
  }

  // ═══════════════════════════════════════════
  header('8. DELETE/CANCEL LISTING');

  // 8a) Seeker can't delete
  {
    const { status } = await req('DELETE', `/listings/${listingId2}`, null, seekerToken);
    ok('Seeker delete → 403', status === 403);
  }

  // 8b) Owner cancels
  {
    const { status, data } = await req('DELETE', `/listings/${listingId2}`, null, providerToken);
    ok('Cancel listing → 200', status === 200);
    ok('Status set to CANCELLED', data.data?.listing?.status === 'CANCELLED');
  }

  // 8c) Verify cancelled listing doesn't show in public browse
  {
    const { status, data } = await req('GET', '/listings');
    const found = data.data.listings.find(l => l._id === listingId2);
    ok('Cancelled listing not in public results', !found);
  }

  // 8d) Non-existent listing delete
  {
    const { status } = await req('DELETE', '/listings/000000000000000000000000', null, providerToken);
    ok('Delete non-existent → 404', status === 404);
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
