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
    // Login
    const loginRes = await makeRequest('/api/auth/login', 'POST', {
      email: 'testuser123@example.com',
      password: 'Test123456!'
    });
    const cookie = loginRes.headers['set-cookie'][0];

    // Test POST /api/tracks
    console.log('🧪 Testing POST /api/tracks...');
    const trackRes = await makeRequest('/api/tracks', 'POST', {
      checkin_interval_min: 1
    }, cookie);

    console.log(`Status: ${trackRes.status}`);
    if (trackRes.status === 201) {
      console.log('✅ SUCCESS! POST /api/tracks works!');
      console.log(`Track ID: ${trackRes.body.data?.id}`);
    } else {
      console.log('❌ FAILED');
      console.log('Error:', trackRes.body.error);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
};

test();
