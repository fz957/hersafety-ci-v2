const knex = require('./src/db/knex');

(async () => {
  try {
    // Get column info
    const columns = await knex.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'alerts'
      ORDER BY ordinal_position;
    `);
    
    console.log('=== Colonnes de la table alerts ===');
    columns.rows.forEach(c => {
      console.log(`${c.column_name}: ${c.data_type}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
