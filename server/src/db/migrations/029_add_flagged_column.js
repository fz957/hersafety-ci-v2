exports.up = async (knex) => {
  // Only add if tables exist
  const articlesExists = await knex.schema.hasTable('articles');
  if (articlesExists) {
    const hasColumn = await knex.schema.hasColumn('articles', 'flagged');
    if (!hasColumn) {
      await knex.schema.table('articles', (table) => {
        table.boolean('flagged').defaultTo(false);
      });
    }
  }

  const photosExists = await knex.schema.hasTable('photos');
  if (photosExists) {
    const hasColumn = await knex.schema.hasColumn('photos', 'flagged');
    if (!hasColumn) {
      await knex.schema.table('photos', (table) => {
        table.boolean('flagged').defaultTo(false);
      });
    }
  }

  const videosExists = await knex.schema.hasTable('videos');
  if (videosExists) {
    const hasColumn = await knex.schema.hasColumn('videos', 'flagged');
    if (!hasColumn) {
      await knex.schema.table('videos', (table) => {
        table.boolean('flagged').defaultTo(false);
      });
    }
  }

  const testimoniesExists = await knex.schema.hasTable('testimonies');
  if (testimoniesExists) {
    const hasColumn = await knex.schema.hasColumn('testimonies', 'flagged');
    if (!hasColumn) {
      await knex.schema.table('testimonies', (table) => {
        table.boolean('flagged').defaultTo(false);
      });
    }
  }

  console.log('✓ Added flagged column to all content tables');
};

exports.down = async (knex) => {
  const articlesExists = await knex.schema.hasTable('articles');
  if (articlesExists) {
    const hasColumn = await knex.schema.hasColumn('articles', 'flagged');
    if (hasColumn) {
      await knex.schema.table('articles', (table) => {
        table.dropColumn('flagged');
      });
    }
  }

  const photosExists = await knex.schema.hasTable('photos');
  if (photosExists) {
    const hasColumn = await knex.schema.hasColumn('photos', 'flagged');
    if (hasColumn) {
      await knex.schema.table('photos', (table) => {
        table.dropColumn('flagged');
      });
    }
  }

  const videosExists = await knex.schema.hasTable('videos');
  if (videosExists) {
    const hasColumn = await knex.schema.hasColumn('videos', 'flagged');
    if (hasColumn) {
      await knex.schema.table('videos', (table) => {
        table.dropColumn('flagged');
      });
    }
  }

  const testimoniesExists = await knex.schema.hasTable('testimonies');
  if (testimoniesExists) {
    const hasColumn = await knex.schema.hasColumn('testimonies', 'flagged');
    if (hasColumn) {
      await knex.schema.table('testimonies', (table) => {
        table.dropColumn('flagged');
      });
    }
  }
};
