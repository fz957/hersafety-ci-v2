const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== ADMINS EN BASE ===\n');
    
    const admins = await knex('users')
      .where({ role: 'admin' })
      .select('id', 'email', 'full_name', 'role', 'organization_id', 'is_active');

    console.log(admins);

    if (admins.length > 0) {
      const testOrgId = '9b63683f-9b14-418a-96c0-4c41d40defd5';
      const adminMatch = admins.find(a => a.organization_id === testOrgId);
      
      console.log(`\n=== VÉRIFIE ===`);
      console.log(`Org cible: ${testOrgId}`);
      console.log(`Admin existe pour cette org: ${adminMatch ? 'OUI ✓' : 'NON ✗'}`);
      
      if (adminMatch) {
        console.log(`Email: ${adminMatch.email}`);
        console.log(`Name: ${adminMatch.full_name}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
