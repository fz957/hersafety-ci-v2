exports.up = async (knex) => {
  // Ajouter support_count à articles (si la table existe)
  const articlesExists = await knex.schema.hasTable('articles');
  if (articlesExists) {
    const hasColumn = await knex.schema.hasColumn('articles', 'support_count');
    if (!hasColumn) {
      await knex.schema.table('articles', (table) => {
        table.integer('support_count').defaultTo(0);
      });
    }
  }

  // Ajouter support_count à photos (si la table existe)
  const photosExists = await knex.schema.hasTable('photos');
  if (photosExists) {
    const hasColumn = await knex.schema.hasColumn('photos', 'support_count');
    if (!hasColumn) {
      await knex.schema.table('photos', (table) => {
        table.integer('support_count').defaultTo(0);
      });
    }
  }

  // Ajouter support_count à vidéos (si la table existe)
  const videosExists = await knex.schema.hasTable('videos');
  if (videosExists) {
    const hasColumn = await knex.schema.hasColumn('videos', 'support_count');
    if (!hasColumn) {
      await knex.schema.table('videos', (table) => {
        table.integer('support_count').defaultTo(0);
      });
    }
  }

  // Ajouter support_count à testimonies (si la table existe)
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
