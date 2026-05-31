const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== VÉRIFICATION FINALE DES DONNÉES ===\n');
    
    const users = await knex('users')
      .where('role', 'user')
      .select('id', 'full_name', 'is_active')
      .orderBy('created_at', 'desc');
    
    console.log('📊 UTILISATRICES:');
    console.log(`Total: ${users.length}\n`);
    
    for (const user of users) {
      // Compter alertes
      const alertCount = await knex('alerts')
        .where({ user_id: user.id })
        .count('* as total')
        .first();
      
      // Dernière localisation
      const lastAlert = await knex('alerts')
        .where({ user_id: user.id })
        .select('location_label')
        .orderBy('created_at', 'desc')
        .first();
      
      const status = user.is_active ? '✓ Actif' : '✗ Inactif';
      const location = lastAlert?.location_label || '—';
      
      console.log(`${user.full_name}`);
      console.log(`  Statut: ${status}`);
      console.log(`  Alertes: ${alertCount.total}`);
      console.log(`  Localisation: ${location}`);
      console.log('');
    }
    
    console.log('✅ Données prêtes pour le dashboard!');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
