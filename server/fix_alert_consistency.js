const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== Correction: une localisation par utilisatrice ===\n');
    
    // Pour chaque utilisatrice, trouver la coordonnée la plus fréquente
    const users = ['ff', 'zreik fatme', 'chaymaa'];
    
    for (const userName of users) {
      const user = await knex('users').where('full_name', userName).first();
      if (!user) continue;
      
      // Trouver la coordonnée la plus fréquente
      const coords = await knex('alerts')
        .where('user_id', user.id)
        .select('location_lat', 'location_lng')
        .groupBy('location_lat', 'location_lng')
        .count('* as count')
        .orderBy('count', 'desc')
        .limit(1);
      
      if (coords.length > 0) {
        const mainCoord = coords[0];
        
        // Mettre à jour TOUTES ses alertes avec cette coordonnée
        await knex('alerts')
          .where('user_id', user.id)
          .update({
            location_lat: mainCoord.location_lat,
            location_lng: mainCoord.location_lng
          });
        
        console.log(`${userName}:`);
        console.log(`  Coordonnée principale: ${mainCoord.location_lat}, ${mainCoord.location_lng}`);
        console.log(`  Alertes: ${mainCoord.count}\n`);
      }
    }
    
    console.log('✅ Données corrigées!');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
