const http = require('http');

const makeRequest = (path, method, payload, cookie) => {
  return new Promise((resolve, reject) => {
    const data = payload ? JSON.stringify(payload) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 5001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data && { 'Content-Length': data.length }),
        ...(cookie && { 'Cookie': cookie })
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
};

const test = async () => {
  try {
    // Register new user
    console.log('📝 Registering new user...');
    const regRes = await makeRequest('/api/auth/register', 'POST', {
      full_name: 'Test User History',
      email: 'testhistory@example.com',
      password: 'Test123456!'
    });

    if (!regRes.body.success) {
      console.log('❌ Register failed:', regRes.body.error);
      return;
    }
    console.log('✓ Registered');

    // Login with new user
    console.log('\n🔐 Logging in...');
    const loginRes = await makeRequest('/api/auth/login', 'POST', {
      email: 'testhistory@example.com',
      password: 'Test123456!'
    });
    const cookie = loginRes.headers['set-cookie'][0];
    console.log('✓ Logged in');

    // Test GET /api/emergency-history
    console.log('\n🧪 Testing GET /api/emergency-history...');
    const historyRes = await makeRequest('/api/emergency-history', 'GET', null, cookie);

    console.log(`Status: ${historyRes.status}`);
    if (historyRes.status === 200) {
      console.log('✅ SUCCESS!');
      console.log(`Emergency records: ${historyRes.body.data?.emergencies?.length || 0}`);
      console.log('✅ EMERGENCY HISTORY ENDPOINT WORKS!');
    } else {
      console.log('❌ FAILED');
      console.log('Error:', historyRes.body.error);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
};

test();
