const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== VRAIES coordonnées GPS des alertes existantes ===\n');
    
    // Grouper par utilisateur et coordonnées
    const alerts = await knex('alerts')
      .select('user_id', 'location_lat', 'location_lng', 'location_label')
      .whereNotNull('location_lat')
      .whereNotNull('location_lng');
    
    // Grouper par user
    const byUser = {};
    alerts.forEach(a => {
      if (!byUser[a.user_id]) byUser[a.user_id] = [];
      byUser[a.user_id].push(a);
    });
    
    // Afficher par utilisateur
    for (const userId in byUser) {
      const userAlerts = byUser[userId];
      
      // Récupérer le nom de l'utilisateur
      const user = await knex('users').where('id', userId).first();
      
      console.log(`${user?.full_name || userId.substring(0, 8)}:`);
      console.log(`  ${userAlerts.length} alertes`);
      
      // Voir les coordonnées uniques
      const uniqueCoords = {};
      userAlerts.forEach(a => {
        const key = `${a.location_lat},${a.location_lng}`;
        if (!uniqueCoords[key]) uniqueCoords[key] = 0;
        uniqueCoords[key]++;
      });
      
      for (const coord in uniqueCoords) {
        console.log(`    ${coord} × ${uniqueCoords[coord]}`);
      }
      console.log('');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
