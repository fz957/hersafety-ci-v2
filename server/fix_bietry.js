const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== Correction: Marcory → Bietry ===\n');
    
    // Trouver les coordonnées de Bietry
    const bietryCoords = {
      lat: 5.27558014,
      lng: -3.97618589
    };
    
    // Mettre à jour les alertes de zreik fatme
    const result = await knex('alerts')
      .where('user_id', (q) => {
        q.select('id').from('users').where('full_name', 'zreik fatme');
      })
      .update({
        location_lat: bietryCoords.lat,
        location_lng: bietryCoords.lng,
        location_label: 'Bietry, Abidjan'
      });
    
    console.log(`✓ ${result} alertes de zreik fatme mises à jour`);
    console.log(`  Localisation: Bietry, Abidjan`);
    console.log(`  Coordonnées: ${bietryCoords.lat}, ${bietryCoords.lng}\n`);
    
    // Vérifier
    const alerts = await knex('alerts')
      .join('users', 'alerts.user_id', '=', 'users.id')
      .where('users.full_name', 'zreik fatme')
      .select('users.full_name', 'alerts.location_label')
      .distinct('alerts.location_label');
    
    console.log('=== Vérification ===');
    alerts.forEach(a => {
      console.log(`${a.full_name}: ${a.location_label}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
