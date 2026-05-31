const knex = require('./src/db/knex');

(async () => {
  try {
    // Vérifier la structure des utilisatrices
    const users = await knex('users')
      .where('role', 'user')
      .select('id', 'full_name', 'is_active', 'created_at')
      .limit(3);
    
    console.log('=== Utilisatrices ===');
    if (users.length > 0) {
      users.forEach(u => {
        console.log(`${u.full_name} (${u.is_active ? 'active' : 'inactive'})`);
      });
    }
    
    // Pour une utilisatrice, récupérer ses alertes
    if (users.length > 0) {
      const userId = users[0].id;
      const alerts = await knex('alerts')
        .where('user_id', userId)
        .select('id', 'location_label', 'created_at', 'status')
        .orderBy('created_at', 'desc')
        .limit(3);
      
      console.log(`\nAlertes de ${users[0].full_name}:`);
      if (alerts.length > 0) {
        alerts.forEach(a => {
          console.log(`  - ${a.location_label || 'Sans localisation'} (${a.status})`);
        });
      } else {
        console.log('  Aucune alerte');
      }
    }
    
    // Structure de la table users
    const columns = await knex.raw(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== Colonnes table users ===');
    columns.rows.forEach(c => {
      console.log(`  - ${c.column_name}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
