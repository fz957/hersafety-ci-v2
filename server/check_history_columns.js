const knex = require('./src/db/knex');

(async () => {
  try {
    // Colonnes de emergency_history
    const columns = await knex.raw(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'emergency_history'
      ORDER BY ordinal_position
    `);
    
    console.log('=== Colonnes de emergency_history ===\n');
    columns.rows.forEach(c => {
      console.log(`  - ${c.column_name}`);
    });
    
    // Voir quelques données
    console.log('\n=== Exemples de données ===\n');
    const data = await knex('emergency_history')
      .select('*')
      .limit(3);
    
    data.forEach(d => {
      console.log(`User: ${d.user_id?.substring(0, 8)}`);
      Object.keys(d).forEach(k => {
        if (d[k] !== null && k !== 'user_id') {
          console.log(`  ${k}: ${String(d[k]).substring(0, 50)}`);
        }
      });
      console.log('');
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
