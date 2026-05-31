const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== Utiliser les VRAIS noms de emergency_history ===\n');
    
    // Pour chaque alerte, trouver le meilleur location_name de l'historique
    const alerts = await knex('alerts')
      .select('alerts.id', 'alerts.user_id', 'alerts.location_lat', 'alerts.location_lng');
    
    console.log(`${alerts.length} alertes à traiter\n`);
    
    for (const alert of alerts) {
      // Chercher TOUS les location_name de cet utilisateur
      const historyNames = await knex('emergency_history')
        .where('user_id', alert.user_id)
        .select('location_name')
        .distinct('location_name');
      
      // Filtrer les noms génériques
      const realNames = historyNames
        .map(h => h.location_name)
        .filter(n => n && n !== 'Position actuelle' && !n.includes('Test'));
      
      // Si on trouve un nom réel, l'utiliser
      if (realNames.length > 0) {
        const bestName = realNames[0]; // Prendre le premier vrai nom trouvé
        await knex('alerts')
          .where('id', alert.id)
          .update({ location_label: bestName });
        
        // Afficher les updates (limiter pour les logs)
        if (alert.location_lat) {
          const user = await knex('users').where('id', alert.user_id).first();
          console.log(`Alert ${alert.id}: ${user.full_name} → ${bestName}`);
        }
      }
    }
    
    console.log('\n✅ Alertes avec les VRAIS noms de l\'historique!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
