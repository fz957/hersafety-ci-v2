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

    const setCookie = loginRes.headers['set-cookie'];
    const tokenCookie = setCookie.find(c => c.startsWith('token='));
    const token = tokenCookie.split(';')[0].replace('token=', '');

    console.log('Token:', token.substring(0, 50) + '...');

    // Decode token manually (JWT structure: header.payload.signature)
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = parts[1];
      // Add padding if necessary
      const padded = payload + '='.repeat(4 - payload.length % 4);
      const decoded = JSON.parse(Buffer.from(padded, 'base64').toString());

      console.log('\nToken payload:');
      console.log(JSON.stringify(decoded, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
};

test();
