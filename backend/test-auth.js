// Auth API Test Script — tests registration, login, getMe, validation, and authorization
const BASE_URL = 'http://127.0.0.1:5000/api/auth';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

let passCount = 0;
let failCount = 0;
let savedToken = '';

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function header(title) {
  console.log('\n' + '═'.repeat(60));
  log(colors.bold + colors.cyan, `  ${title}`);
  console.log('═'.repeat(60));
}

function testResult(name, passed, detail = '') {
  if (passed) {
    passCount++;
    log(colors.green, `  ✅ PASS: ${name}`);
  } else {
    failCount++;
    log(colors.red, `  ❌ FAIL: ${name}`);
  }
  if (detail) log(colors.dim, `     ${detail}`);
}

async function req(method, path, body = null, token = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

// Unique email for this test run
const timestamp = Date.now();
const testEmail = `testuser_${timestamp}@example.com`;

async function runTests() {
  header('1. REGISTER — Validation Errors');

  // 1a) Missing all fields
  {
    const { status, data } = await req('POST', '/register', {});
    testResult('Missing fields returns 400', status === 400);
  }

  // 1b) Invalid email
  {
    const { status, data } = await req('POST', '/register', {
      email: 'not-an-email',
      password: 'Test123',
      name: 'Test',
      role: 'FOOD_PROVIDER'
    });
    testResult('Invalid email returns 400', status === 400);
  }

  // 1c) Weak password (no number)
  {
    const { status, data } = await req('POST', '/register', {
      email: testEmail,
      password: 'abcdef',
      name: 'Test',
      role: 'FOOD_PROVIDER'
    });
    testResult('Password without number returns 400', status === 400);
  }

  // 1d) Short password
  {
    const { status, data } = await req('POST', '/register', {
      email: testEmail,
      password: 'ab1',
      name: 'Test',
      role: 'FOOD_PROVIDER'
    });
    testResult('Short password returns 400', status === 400);
  }

  // 1e) Invalid role
  {
    const { status, data } = await req('POST', '/register', {
      email: testEmail,
      password: 'Test123',
      name: 'Test',
      role: 'INVALID_ROLE'
    });
    testResult('Invalid role returns 400', status === 400);
  }

  // 1f) ADMIN role blocked
  {
    const { status, data } = await req('POST', '/register', {
      email: testEmail,
      password: 'Test123',
      name: 'Test',
      role: 'ADMIN'
    });
    testResult('ADMIN role registration blocked', status === 400 || status === 403,
      `Status: ${status}, Message: ${data.message}`);
  }

  // ──────────────────────────────────────────

  header('2. REGISTER — Success');

  // 2a) Register FOOD_PROVIDER
  {
    const { status, data } = await req('POST', '/register', {
      email: testEmail,
      password: 'SecurePass1',
      name: 'Test Provider',
      phone: '+919876543210',
      role: 'FOOD_PROVIDER'
    });
    testResult('Register FOOD_PROVIDER returns 201', status === 201,
      `Email: ${data.data?.user?.email}`);
    testResult('Response includes JWT token', !!data.data?.token);
    testResult('Password NOT in response', !data.data?.user?.password);
    testResult('Role is FOOD_PROVIDER', data.data?.user?.role === 'FOOD_PROVIDER');
    savedToken = data.data?.token || '';
  }

  // 2b) Register with duplicate email
  {
    const { status, data } = await req('POST', '/register', {
      email: testEmail,
      password: 'AnotherPass1',
      name: 'Duplicate User',
      role: 'FOOD_SEEKER'
    });
    testResult('Duplicate email returns 409', status === 409,
      `Message: ${data.message}`);
  }

  // 2c) Register a VOLUNTEER (different email)
  const volunteerEmail = `volunteer_${timestamp}@example.com`;
  {
    const { status, data } = await req('POST', '/register', {
      email: volunteerEmail,
      password: 'VolPass1',
      name: 'Test Volunteer',
      role: 'VOLUNTEER'
    });
    testResult('Register VOLUNTEER returns 201', status === 201);
  }

  // 2d) Register a FOOD_SEEKER (different email)
  const seekerEmail = `seeker_${timestamp}@example.com`;
  {
    const { status, data } = await req('POST', '/register', {
      email: seekerEmail,
      password: 'SeekPass1',
      name: 'Test Seeker',
      role: 'FOOD_SEEKER'
    });
    testResult('Register FOOD_SEEKER returns 201', status === 201);
  }

  // ──────────────────────────────────────────

  header('3. LOGIN — Validation & Errors');

  // 3a) Missing password
  {
    const { status } = await req('POST', '/login', { email: testEmail });
    testResult('Missing password returns 400', status === 400);
  }

  // 3b) Wrong password
  {
    const { status, data } = await req('POST', '/login', {
      email: testEmail,
      password: 'WrongPassword1'
    });
    testResult('Wrong password returns 401', status === 401,
      `Message: ${data.message}`);
  }

  // 3c) Non-existent email
  {
    const { status } = await req('POST', '/login', {
      email: 'nobody@nowhere.com',
      password: 'Test123'
    });
    testResult('Non-existent email returns 401', status === 401);
  }

  // ──────────────────────────────────────────

  header('4. LOGIN — Success');

  {
    const { status, data } = await req('POST', '/login', {
      email: testEmail,
      password: 'SecurePass1'
    });
    testResult('Login returns 200', status === 200);
    testResult('Login returns JWT token', !!data.data?.token);
    testResult('Login returns user data', !!data.data?.user);
    testResult('Password NOT in login response', !data.data?.user?.password);
    savedToken = data.data?.token || savedToken;
    log(colors.dim, `     Token: ${savedToken.substring(0, 40)}...`);
  }

  // ──────────────────────────────────────────

  header('5. GET /me — Protected Route');

  // 5a) Without token
  {
    const { status, data } = await req('GET', '/me');
    testResult('No token returns 401', status === 401,
      `Message: ${data.message}`);
  }

  // 5b) With invalid token
  {
    const { status } = await req('GET', '/me', null, 'invalid.token.here');
    testResult('Invalid token returns 401', status === 401);
  }

  // 5c) With valid token
  {
    const { status, data } = await req('GET', '/me', null, savedToken);
    testResult('Valid token returns 200', status === 200);
    testResult('Returns correct user email', data.data?.user?.email === testEmail);
    testResult('Returns user name', data.data?.user?.name === 'Test Provider');
    testResult('Returns user role', data.data?.user?.role === 'FOOD_PROVIDER');
    testResult('Password NOT in /me response', !data.data?.user?.password);
  }

  // ──────────────────────────────────────────

  header('TEST SUMMARY');

  const total = passCount + failCount;
  console.log(`\n  Total: ${total}  |  ` +
    `${colors.green}Passed: ${passCount}${colors.reset}  |  ` +
    `${colors.red}Failed: ${failCount}${colors.reset}\n`);

  if (failCount === 0) {
    log(colors.green + colors.bold, '  🎉 ALL TESTS PASSED!');
  } else {
    log(colors.red + colors.bold, `  ⚠️  ${failCount} test(s) failed.`);
  }

  console.log('\n' + '═'.repeat(60) + '\n');
}

runTests().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
