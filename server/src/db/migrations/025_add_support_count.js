exports.up = async (knex) => {
  // Ajouter support_count à articles
  await knex.schema.table('articles', (table) => {
    table.integer('support_count').defaultTo(0);
  });

  // Ajouter support_count à photos
  await knex.schema.table('photos', (table) => {
    table.integer('support_count').defaultTo(0);
  });

  // Ajouter support_count à vidéos
  await knex.schema.table('videos', (table) => {
    table.integer('support_count').defaultTo(0);
  });

  // Ajouter support_count à testimonies (au cas où)
  const testimoniesExists = await knex.schema.hasTable('testimonies');
  if (testimoniesExists) {
    const hasColumn = await knex.schema.hasColumn('testimonies', 'support_count');
    if (!hasColumn) {
      await knex.schema.table('testimonies', (table) => {
        table.integer('support_count').defaultTo(0);
      });
    }
  }
};

exports.down = async (knex) => {
  await knex.schema.table('articles', (table) => {
    table.dropColumn('support_count');
  });

  await knex.schema.table('photos', (table) => {
    table.dropColumn('support_count');
  });

  await knex.schema.table('videos', (table) => {
    table.dropColumn('support_count');
  });

  const testimoniesExists = await knex.schema.hasTable('testimonies');
  if (testimoniesExists) {
    const hasColumn = await knex.schema.hasColumn('testimonies', 'support_count');
    if (hasColumn) {
      await knex.schema.table('testimonies', (table) => {
        table.dropColumn('support_count');
      });
    }
  }
};
