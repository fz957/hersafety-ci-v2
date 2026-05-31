const axios = require('axios');
const knex = require('./src/db/knex');

(async () => {
  try {
    // Get the superadmin user
    const superadmin = await knex('users').where('role', 'superadmin').first();
    const adminUser = await knex('users').where('role', 'admin').first();
    
    console.log('=== Test API Sans Auth ===');
    
    // Test API call to get alerts/recent (should fail without auth)
    try {
      const res = await axios.get('http://localhost:5001/api/admin/alerts/recent');
      console.log('Erreur: Requête non-auth devrait échouer');
    } catch (err) {
      console.log(`✓ GET /api/admin/alerts/recent sans auth: ${err.response.status} (expected 401/403)`);
    }
    
    // Get JWT token manually - create one using the admin user
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        id: adminUser.id, 
        email: adminUser.email,
        organizationId: adminUser.organization_id,
        role: adminUser.role 
      },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '24h' }
    );
    
    console.log('\n=== Test API Avec Auth ===');
    console.log(`Token créé pour: ${adminUser.email} (${adminUser.role})`);
    
    // Test with token
    const headers = { Authorization: `Bearer ${token}` };
    
    try {
      const res = await axios.get('http://localhost:5001/api/admin/stats', { headers });
      console.log(`✓ GET /api/admin/stats:`);
      console.log(`  - Alertes aujourd'hui: ${res.data.data.alerts_today}`);
      console.log(`  - Utilisatrices actives: ${res.data.data.active_users}`);
      console.log(`  - Rapports vérifiés: ${res.data.data.verified_reports}`);
    } catch (err) {
      console.log(`✗ Error: ${err.response?.data?.error || err.message}`);
    }
    
    try {
      const res = await axios.get('http://localhost:5001/api/admin/alerts/recent', { headers });
      console.log(`✓ GET /api/admin/alerts/recent:`);
      console.log(`  - ${res.data.data.length} alertes "en cours" (status=active)`);
      if (res.data.data.length > 0) {
        console.log(`  - Première alerte: ${res.data.data[0].full_name} - ${res.data.data[0].status}`);
      }
    } catch (err) {
      console.log(`✗ Error: ${err.response?.data?.error || err.message}`);
    }
    
    try {
      const res = await axios.get('http://localhost:5001/api/admin/alerts/history', { headers });
      console.log(`✓ GET /api/admin/alerts/history:`);
      console.log(`  - ${res.data.data.length} alertes (historique, tous statuts)`);
      if (res.data.data.length > 0) {
        console.log(`  - Première alerte: ${res.data.data[0].full_name} - ${res.data.data[0].status}`);
      }
    } catch (err) {
      console.log(`✗ Error: ${err.response?.data?.error || err.message}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
