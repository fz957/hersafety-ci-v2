const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== Chercher localisation utilisatrices ===\n');
    
    // Vérifier les colonnes de la table users
    const userColumns = await knex.raw(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('Colonnes dans users:');
    const locationCols = userColumns.rows
      .filter(c => c.column_name.toLowerCase().includes('location') || 
                    c.column_name.toLowerCase().includes('address') ||
                    c.column_name.toLowerCase().includes('city') ||
                    c.column_name.toLowerCase().includes('place') ||
                    c.column_name.toLowerCase().includes('home'));
    
    if (locationCols.length > 0) {
      console.log('Colonnes de localisation trouvées:');
      locationCols.forEach(c => console.log(`  ✓ ${c.column_name}`));
    } else {
      console.log('❌ Pas de colonne de localisation/adresse trouvée');
    }
    
    // Voir toutes les colonnes
    console.log('\nToutes les colonnes:');
    userColumns.rows.forEach(c => {
      console.log(`  - ${c.column_name}`);
    });
    
    // Vérifier s'il y a une table tracks ou locations
    const tables = await knex.raw(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\nTables disponibles:');
    tables.rows.forEach(t => {
      if (t.table_name.toLowerCase().includes('location') ||
          t.table_name.toLowerCase().includes('address') ||
          t.table_name.toLowerCase().includes('track') ||
          t.table_name.toLowerCase().includes('home')) {
        console.log(`  ✓ ${t.table_name}`);
      }
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
