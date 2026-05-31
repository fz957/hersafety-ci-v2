const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== Vérification: Localisation réelle de chaque alerte ===\n');
    
    const organizationId = '9b63683f-9b14-418a-96c0-4c41d40defd5';
    
    // Les 3 utilisatrices principales
    const users = await knex('users')
      .where('organization_id', organizationId)
      .where('role', 'user')
      .whereIn('full_name', ['zreik fatme', 'ff', 'chaymaa'])
      .select('id', 'full_name');
    
    for (const user of users) {
      console.log(`${user.full_name}:`);
      
      // Voir TOUTES les alertes pour cette utilisatrice
      const alerts = await knex('alerts')
        .where('user_id', user.id)
        .select('location_label', 'location_lat', 'location_lng', 'status', 'created_at')
        .orderBy('created_at', 'desc')
        .limit(5);
      
      if (alerts.length > 0) {
        alerts.forEach(a => {
          console.log(`  - ${a.location_label || '(sans lieu)'}`);
          console.log(`    GPS: ${a.location_lat}, ${a.location_lng}`);
          console.log(`    Status: ${a.status}`);
        });
      } else {
        console.log('  Aucune alerte');
      }
      console.log('');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
