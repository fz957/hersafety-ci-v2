const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== Prendre les VRAIS location_name de l\'historique ===\n');
    
    // Récupérer le location_name RÉEL le plus récent par utilisateur
    const history = await knex('emergency_history')
      .select('user_id', 'location_name', 'latitude', 'longitude')
      .whereNotNull('location_name')
      .orderBy('created_at', 'desc');
    
    const byUser = {};
    for (const h of history) {
      if (!byUser[h.user_id]) {
        byUser[h.user_id] = h;
      }
    }
    
    console.log('Vraies localisations de l\'historique:\n');
    
    for (const userId in byUser) {
      const h = byUser[userId];
      const user = await knex('users').where('id', userId).first();
      if (!user) continue;
      
      console.log(`${user.full_name}:`);
      console.log(`  Location: ${h.location_name}`);
      console.log(`  GPS: ${h.latitude}, ${h.longitude}`);
      
      // Mettre à jour ses alertes
      const updated = await knex('alerts')
        .where('user_id', userId)
        .update({
          location_label: h.location_name,
          location_lat: h.latitude,
          location_lng: h.longitude
        });
      
      console.log(`  ✓ ${updated} alertes mises à jour\n`);
    }
    
    console.log('✅ Alertes avec les VRAIS location_name!');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
