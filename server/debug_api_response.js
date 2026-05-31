const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== Ce que l\'API retourne maintenant ===\n');
    
    const organizationId = '9b63683f-9b14-418a-96c0-4c41d40defd5';
    
    // Simuler les 3 utilisatrices principales
    const users = await knex('users')
      .where('organization_id', organizationId)
      .where('role', 'user')
      .whereIn('full_name', ['zreik fatme', 'ff', 'chaymaa'])
      .select('id', 'full_name');
    
    console.log('UTILISATRICES - Ce que le dashboard affiche:\n');
    
    for (const user of users) {
      // Alertes count
      const alertCount = await knex('alerts')
        .where('user_id', user.id)
        .count('* as total')
        .first();
      
      // Dernière position GPS
      const lastCheckin = await knex('checkins')
        .where('user_id', user.id)
        .select('location_lat', 'location_lng')
        .orderBy('checked_at', 'desc')
        .first();
      
      let lastLocation = null;
      if (lastCheckin && lastCheckin.location_lat && lastCheckin.location_lng) {
        const lat = parseFloat(lastCheckin.location_lat);
        const lng = parseFloat(lastCheckin.location_lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          lastLocation = `${lat.toFixed(4)},${lng.toFixed(4)} [GPS]`;
        }
      }
      
      if (!lastLocation) {
        const lastAlert = await knex('alerts')
          .where('user_id', user.id)
          .select('location_label')
          .orderBy('created_at', 'desc')
          .first();
        lastLocation = lastAlert?.location_label ? `${lastAlert.location_label} [Alerte]` : '—';
      }
      
      console.log(`${user.full_name}:`);
      console.log(`  Alertes: ${alertCount.total}`);
      console.log(`  Localisation affichée: ${lastLocation}\n`);
    }
    
    console.log('ALERTES - Localisations affichées:\n');
    const alerts = await knex('alerts')
      .select('location_label', 'location_lat', 'location_lng')
      .orderBy('created_at', 'desc')
      .limit(5);
    
    alerts.forEach(a => {
      console.log(`${a.location_label}`);
      console.log(`  GPS: ${a.location_lat}, ${a.location_lng}\n`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
