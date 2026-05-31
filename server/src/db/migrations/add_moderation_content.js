exports.up = async (knex) => {
  // Table pour les articles
  await knex.schema.createTable('articles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('users.id').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('organizations.id').onDelete('CASCADE');
    table.string('title').notNullable();
    table.text('content').notNullable();
    table.string('category').defaultTo('autre');
    table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    table.uuid('moderated_by').references('users.id');
    table.timestamp('moderated_at');
    table.timestamps();
    table.index(['organization_id', 'status']);
  });

  // Table pour les photos
  await knex.schema.createTable('photos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('users.id').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('organizations.id').onDelete('CASCADE');
    table.string('url').notNullable();
    table.text('description');
    table.string('category').defaultTo('autre');
    table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    table.uuid('moderated_by').references('users.id');
    table.timestamp('moderated_at');
    table.timestamps();
    table.index(['organization_id', 'status']);
  });

  // Table pour les vidéos
  await knex.schema.createTable('videos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('users.id').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('organizations.id').onDelete('CASCADE');
    table.string('url').notNullable();
    table.text('description');
    table.string('category').defaultTo('autre');
    table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    table.uuid('moderated_by').references('users.id');
    table.timestamp('moderated_at');
    table.timestamps();
    table.index(['organization_id', 'status']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('videos');
  await knex.schema.dropTable('photos');
  await knex.schema.dropTable('articles');
};
