const knex = require('./src/db/knex');

(async () => {
  try {
    // 1. Trouver l'utilisateur zreik
    const zreik = await knex('users')
      .where('full_name', 'like', '%zreik%')
      .orWhere('email', 'like', '%zreik%')
      .first();
    
    if (!zreik) {
      console.log('❌ Utilisateur zreik non trouvé');
      const users = await knex('users').where('role', 'user').select('full_name', 'id', 'organization_id');
      console.log('Utilisatrices existantes:');
      users.forEach(u => console.log(`  - ${u.full_name} (${u.id})`));
      process.exit(0);
    }
    
    console.log(`✓ Utilisateur trouvé: ${zreik.full_name}`);
    console.log(`  - ID: ${zreik.id}`);
    console.log(`  - Org: ${zreik.organization_id}`);
    
    // 2. Compter les alertes pour zreik
    const alertCount = await knex('alerts')
      .where('user_id', zreik.id)
      .count('* as total')
      .first();
    
    console.log(`\n✓ Alertes pour ${zreik.full_name}: ${alertCount.total}`);
    
    // 3. Voir les alertes
    const alerts = await knex('alerts')
      .where('user_id', zreik.id)
      .select('id', 'location_label', 'created_at', 'status')
      .orderBy('created_at', 'desc')
      .limit(5);
    
    if (alerts.length > 0) {
      console.log('\nPremières alertes:');
      alerts.forEach(a => {
        console.log(`  - ${a.location_label || 'No location'} (${a.status})`);
      });
    }
    
    // 4. Vérifier toutes les alertes
    const allAlerts = await knex('alerts')
      .count('* as total')
      .first();
    
    console.log(`\n📊 Total d'alertes dans la base: ${allAlerts.total}`);
    
    // 5. Vérifier la requête API
    console.log('\n=== Simulation requête API ===');
    const users = await knex('users')
      .where({ role: 'user' })
      .select('id', 'full_name')
      .limit(5);
    
    for (const user of users) {
      const count = await knex('alerts')
        .where({ user_id: user.id })
        .count('id as total')
        .first();
      console.log(`${user.full_name}: ${count.total} alertes`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
