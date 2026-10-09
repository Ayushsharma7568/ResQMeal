// Phase 9 Test Script — AI features, NLP parser, smart matching, insights, admin queries, health & metrics
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
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

const ts = Date.now();

async function runTests() {
  header('1. SETUP — Register Test Users for Phase 9');

  let providerToken, seekerToken, adminToken;

  {
    const r = await req('POST', '/auth/register', {
      name: `P9Provider_${ts}`,
      email: `p9provider_${ts}@test.com`,
      password: 'Pass123!',
      role: 'FOOD_PROVIDER',
      phone: '9888877701'
    });
    providerToken = r.data?.data?.token;
    testResult('Register provider for P9', r.status === 201 && !!providerToken);
  }

  {
    const r = await req('POST', '/auth/register', {
      name: `P9Seeker_${ts}`,
      email: `p9seeker_${ts}@test.com`,
      password: 'Pass123!',
      role: 'FOOD_SEEKER',
      phone: '9888877702'
    });
    seekerToken = r.data?.data?.token;
    testResult('Register seeker for P9', r.status === 201 && !!seekerToken);
  }

  header('2. AI SMART FOOD LISTING ASSISTANT — NLP Parser');

  {
    const r = await req('POST', '/ai/parse-listing', {
      text: '50 rotis, 3 kg dal, 4 kg aloo sabzi prepared at 6 PM'
    }, providerToken);
    testResult('POST /ai/parse-listing converts raw text to structured items', r.status === 200 && r.data?.data?.foodItems?.length >= 2, `Items count: ${r.data?.data?.foodItems?.length}`);
  }

  {
    const r = await req('POST', '/ai/parse-listing', { text: '' }, providerToken);
    testResult('Empty text returns 400 validation error', r.status === 400);
  }

  {
    const r = await req('POST', '/ai/parse-listing', { text: '20 chicken biryani boxes' }, seekerToken);
    testResult('Seeker role blocked from parse-listing (403)', r.status === 403);
  }

  header('3. AI SMART MATCHING RECOMMENDATIONS');

  {
    const r = await req('GET', '/ai/recommendations?lat=12.9716&lng=77.5946', null, seekerToken);
    testResult('GET /ai/recommendations returns 200 + recommendation scores', r.status === 200 && Array.isArray(r.data?.data?.recommendations));
  }

  {
    const r = await req('GET', '/ai/recommendations', null, providerToken);
    testResult('Provider role blocked from seeker recommendations (403)', r.status === 403);
  }

  header('4. SURPLUS DEMAND INSIGHTS');

  {
    const r = await req('GET', '/ai/insights', null, seekerToken);
    testResult('GET /ai/insights returns 200 + surplus insights summary', r.status === 200 && !!r.data?.data?.summary);
  }

  header('5. ADMIN ANALYTICS QUERY ASSISTANT');

  {
    const r = await req('POST', '/ai/admin-query', {
      query: 'Which food category is rescued most?'
    }, providerToken);
    testResult('Provider role blocked from admin AI query (403)', r.status === 403);
  }

  header('6. HEALTH ENDPOINT & PROMETHEUS METRICS');

  {
    const r = await req('GET', '/health');
    testResult('GET /api/health includes uptime, memory, & DB status', r.status === 200 && !!r.data?.memoryUsageMB);
  }

  {
    const res = await fetch(`${BASE}/metrics`);
    const text = await res.text();
    testResult('GET /api/metrics returns Prometheus formatted plain text', res.status === 200 && text.includes('dontwasteit_requests_total'));
  }

  header('PHASE 9 TEST SUMMARY');
  log(colors.bold + (failCount === 0 ? colors.green : colors.red), `  PASSED: ${passCount}  |  FAILED: ${failCount}  |  TOTAL: ${passCount + failCount}`);
  if (failCount > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Phase 9 test execution error:', err);
  process.exit(1);
});
