const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== Vraies localisations de l\'historique des utilisatrices ===\n');
    
    // Vérifier les tables d'historique
    const tables = await knex.raw(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%history%'
    `);
    
    console.log('Tables historique:');
    tables.rows.forEach(t => console.log(`  - ${t.table_name}`));
    console.log('');
    
    // Vérifier emergency_history
    const history = await knex('emergency_history')
      .select('user_id', 'final_location')
      .distinct('user_id')
      .orderBy('user_id');
    
    console.log('=== Localisations finales de l\'historique d\'urgence ===\n');
    history.forEach(h => {
      if (h.final_location) {
        console.log(`User ${h.user_id.substring(0, 8)}: ${h.final_location}`);
      }
    });
    
    // Avec noms
    console.log('\n=== Avec noms des utilisatrices ===\n');
    for (const h of history) {
      if (h.final_location) {
        const user = await knex('users').where('id', h.user_id).first();
        console.log(`${user?.full_name}: ${h.final_location}`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
