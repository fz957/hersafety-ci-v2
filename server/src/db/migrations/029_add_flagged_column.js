exports.up = async (knex) => {
  // Ajouter colonne flagged à articles
  await knex.schema.table('articles', (table) => {
    table.boolean('flagged').defaultTo(false);
  });

  // Ajouter colonne flagged à photos
  await knex.schema.table('photos', (table) => {
    table.boolean('flagged').defaultTo(false);
  });

  // Ajouter colonne flagged à vidéos
  await knex.schema.table('videos', (table) => {
    table.boolean('flagged').defaultTo(false);
  });

  // Ajouter colonne flagged à testimonies
  await knex.schema.table('testimonies', (table) => {
    table.boolean('flagged').defaultTo(false);
  });

  console.log('✓ Added flagged column to all content tables');
};

exports.down = async (knex) => {
  await knex.schema.table('articles', (table) => {
    table.dropColumn('flagged');
  });

  await knex.schema.table('photos', (table) => {
    table.dropColumn('flagged');
  });

  await knex.schema.table('videos', (table) => {
    table.dropColumn('flagged');
  });

  await knex.schema.table('testimonies', (table) => {
    table.dropColumn('flagged');
  });
};
