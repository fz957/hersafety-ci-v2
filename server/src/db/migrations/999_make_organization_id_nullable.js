exports.up = async (knex) => {
  // Rendre organization_id nullable dans toutes les tables
  const tables = ['users', 'alerts', 'contacts', 'tracks', 'testimonies', 'reports', 'articles', 'photos', 'videos', 'emergency_history'];
  
  for (const table of tables) {
    try {
      await knex.schema.alterTable(table, (t) => {
        t.uuid('organization_id').nullable().alter();
      });
      console.log(`✓ ${table}: organization_id rendu nullable`);
    } catch (err) {
      console.log(`- ${table}: ${err.message}`);
    }
  }
};

exports.down = async (knex) => {
  // Revert non supporté - trop compliqué
};
