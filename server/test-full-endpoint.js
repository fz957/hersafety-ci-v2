const jwt = require('jsonwebtoken');
const http = require('http');

const SECRET = process.env.JWT_SECRET || 'test-secret-key';
const adminId = '927245e4-a649-4f03-a057-7a8078262999';
const orgId = '9b63683f-9b14-418a-96c0-4c41d40defd5';

// Créer un JWT
const token = jwt.sign(
  { userId: adminId, organizationId: orgId, role: 'admin' },
  SECRET,
  { expiresIn: '24h' }
);

console.log(`Generated JWT for admin: ${adminId}`);
console.log(`Organization: ${orgId}`);
console.log(`Token: ${token.substring(0, 30)}...\n`);

// Faire la requête
const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/admin/moderation',
  method: 'GET',
  headers: {
    'Cookie': `token=${token}`,
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`\nResponse:`);
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
      
      if (parsed.data) {
        const count = (parsed.data.testimonies?.length || 0) + 
                      (parsed.data.articles?.length || 0) +
                      (parsed.data.photos?.length || 0) +
                      (parsed.data.videos?.length || 0);
        console.log(`\n✅ Total items received: ${count}`);
      }
    } catch (e) {
      console.log(data);
    }
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
  process.exit(1);
});

req.end();
