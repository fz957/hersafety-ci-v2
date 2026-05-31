const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== ALERTES - Localisations réelles ===\n');
    
    // Voir les vraies localisations des alertes
    const alerts = await knex('alerts')
      .select('id', 'user_id', 'location_label', 'location_lat', 'location_lng', 'status')
      .orderBy('created_at', 'desc')
      .limit(10);
    
    alerts.forEach(a => {
      console.log(`Alerte ${a.id.substring(0, 8)}`);
      console.log(`  Label: ${a.location_label}`);
      console.log(`  GPS: ${a.location_lat}, ${a.location_lng}`);
      console.log(`  Status: ${a.status}\n`);
    });
    
    console.log('=== CHECK-INS - Positions GPS ===\n');
    
    // Voir les vraies positions GPS des check-ins
    const checkins = await knex('checkins')
      .select('user_id', 'location_lat', 'location_lng', 'checked_at')
      .orderBy('checked_at', 'desc')
      .limit(10);
    
    checkins.forEach(c => {
      console.log(`Check-in User: ${c.user_id.substring(0, 8)}`);
      console.log(`  GPS: ${c.location_lat}, ${c.location_lng}`);
      console.log(`  Time: ${new Date(c.checked_at).toLocaleString('fr-FR')}\n`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
