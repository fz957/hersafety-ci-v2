exports.up = async (knex) => {
  // Rendre organization_id nullable dans toutes les tables
  const tables = ['users', 'alerts', 'contacts', 'tracks', 'testimonies', 'testimony_comments', 'reports', 'articles', 'photos', 'videos', 'emergency_history'];

  for (const table of tables) {
    try {
      const tableExists = await knex.schema.hasTable(table);
      if (!tableExists) {
        console.log(`- ${table}: table does not exist, skipping`);
        continue;
      }

      const hasColumn = await knex.schema.hasColumn(table, 'organization_id');
      if (!hasColumn) {
        console.log(`- ${table}: organization_id column does not exist, skipping`);
        continue;
      }

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
