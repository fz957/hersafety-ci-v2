const knex = require('./src/db/knex');

knex.raw("SELECT column_name FROM information_schema.columns WHERE table_name = 'emergency_history' ORDER BY ordinal_position")
  .then(r => {
    console.log('Colonnes de emergency_history:');
    if (r.rows.length === 0) {
      console.log('  ❌ AUCUNE COLONNE - LA TABLE EST VIDE OU N\'EXISTE PAS');
    } else {
      r.rows.forEach(row => console.log('  ✓', row.column_name));
    }
    process.exit(0);
  })
  .catch(e => {
    console.error('Erreur:', e.message);
    process.exit(1);
  });
