const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== Localisations en temps réel (GPS + Alertes) ===\n');
    
    const users = await knex('users')
      .where('role', 'user')
      .select('id', 'full_name')
      .limit(10);
    
    for (const user of users) {
      // Alertes count
      const alertCount = await knex('alerts')
        .where('user_id', user.id)
        .count('* as total')
        .first();
      
      // Dernière position GPS
      const lastCheckin = await knex('checkins')
        .where('user_id', user.id)
        .select('location_lat', 'location_lng', 'checked_at')
        .orderBy('checked_at', 'desc')
        .first();
      
      // Fallback alerte
      const lastAlert = await knex('alerts')
        .where('user_id', user.id)
        .select('location_label')
        .orderBy('created_at', 'desc')
        .first();
      
      let location = '—';
      if (lastCheckin?.location_lat && lastCheckin?.location_lng) {
        const lat = parseFloat(lastCheckin.location_lat);
        const lng = parseFloat(lastCheckin.location_lng);
        location = `${lat.toFixed(4)},${lng.toFixed(4)} [GPS]`;
      } else if (lastAlert?.location_label) {
        location = `${lastAlert.location_label} [Alerte]`;
      }
      
      if (alertCount.total > 0 || location !== '—') {
        console.log(`${user.full_name}:`);
        console.log(`  Alertes: ${alertCount.total}`);
        console.log(`  Localisation: ${location}`);
        console.log('');
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
