const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== Utiliser les VRAIS noms d\'endroits ===\n');
    
    // Les vraies localisations de l'historique
    const realLocations = {
      'zreik fatme': {
        name: 'Le Sayour',
        lat: 5.27583679,
        lng: -3.97614469
      }
    };
    
    for (const userName in realLocations) {
      const loc = realLocations[userName];
      const user = await knex('users').where('full_name', userName).first();
      
      if (user) {
        const updated = await knex('alerts')
          .where('user_id', user.id)
          .update({
            location_label: loc.name,
            location_lat: loc.lat,
            location_lng: loc.lng
          });
        
        console.log(`${userName}:`);
        console.log(`  Location: ${loc.name}`);
        console.log(`  GPS: ${loc.lat}, ${loc.lng}`);
        console.log(`  ✓ ${updated} alertes mises à jour\n`);
      }
    }
    
    console.log('✅ Alertes avec les VRAIS noms d\'endroits!');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
