const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== Vérifier structure des alertes ===\n');
    
    // Voir les colonnes de location dans alerts
    const columns = await knex.raw(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'alerts' AND column_name LIKE '%location%'
      ORDER BY ordinal_position
    `);
    
    console.log('Colonnes de location:');
    columns.rows.forEach(c => {
      console.log(`  - ${c.column_name}`);
    });
    
    // Voir quelques alertes avec leurs données
    console.log('\nPremières 5 alertes:');
    const alerts = await knex('alerts')
      .select('id', 'location_label', 'location_lat', 'location_lng')
      .limit(5);
    
    alerts.forEach(a => {
      console.log(`\nID: ${a.id.substring(0, 8)}`);
      console.log(`  - label: ${a.location_label}`);
      console.log(`  - lat: ${a.location_lat}`);
      console.log(`  - lng: ${a.location_lng}`);
    });
    
    // Vérifier les alertes pour chaque utilisateur
    console.log('\n=== Par utilisateur ===');
    const users = await knex('users').where('role', 'user').select('id', 'full_name');
    
    for (const user of users.slice(0, 5)) {
      const userAlerts = await knex('alerts')
        .where('user_id', user.id)
        .select('location_label', 'location_lat', 'location_lng')
        .limit(1);
      
      if (userAlerts.length > 0) {
        console.log(`\n${user.full_name}:`);
        console.log(`  location_label: ${userAlerts[0].location_label}`);
        console.log(`  GPS: ${userAlerts[0].location_lat}, ${userAlerts[0].location_lng}`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
