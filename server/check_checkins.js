const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== Table CHECKINS (positions GPS) ===\n');
    
    // Exemples de check-ins
    console.log('Dernières positions GPS:');
    const checkins = await knex('checkins')
      .select('*')
      .orderBy('checked_at', 'desc')
      .limit(5);
    
    checkins.forEach(c => {
      console.log(`\nCheck-in ${c.id?.substring(0, 8)}`);
      console.log(`  User: ${c.user_id?.substring(0, 8)}`);
      console.log(`  Location: ${c.location_label}`);
      console.log(`  GPS: ${c.location_lat}, ${c.location_lng}`);
      console.log(`  Time: ${new Date(c.checked_at).toLocaleString('fr-FR')}`);
    });
    
    // Dernière position par utilisateur
    console.log('\n=== Dernière position GPS par utilisatrice ===\n');
    const users = await knex('users').where('role', 'user').select('id', 'full_name').limit(10);
    
    for (const user of users) {
      const lastCheckin = await knex('checkins')
        .where('user_id', user.id)
        .select('location_lat', 'location_lng', 'checked_at')
        .orderBy('checked_at', 'desc')
        .first();
      
      if (lastCheckin && lastCheckin.location_lat) {
        console.log(`${user.full_name}:`);
        console.log(`  GPS: ${lastCheckin.location_lat}, ${lastCheckin.location_lng}`);
        console.log(`  Time: ${new Date(lastCheckin.checked_at).toLocaleString('fr-FR')}`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
