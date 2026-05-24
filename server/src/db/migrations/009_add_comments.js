exports.up = async (knex) => {
  // Ajouter comment_count à testimonies
  await knex.schema.alterTable('testimonies', (table) => {
    table.integer('comment_count').defaultTo(0);
  });

  // Créer table testimony_comments
  await knex.schema.createTable('testimony_comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('testimony_id').notNullable().references('testimonies.id').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('users.id').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('organizations.id').onDelete('CASCADE');

    table.text('content').notNullable().checkRegex(/.{1,500}/, 'Comment must be between 1 and 500 characters');

    table.boolean('is_anonymous').defaultTo(false);
    table.string('display_name', 255).nullable();

    table.timestamps(true, true);

    // Index pour la performance
    table.index('testimony_id');
    table.index(['testimony_id', 'created_at']);
    table.index('organization_id');

    // Constraint: Un utilisateur ne peut pas commenter deux fois
    table.unique(['testimony_id', 'user_id']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('testimony_comments');
  await knex.schema.alterTable('testimonies', (table) => {
    table.dropColumn('comment_count');
  });
};
