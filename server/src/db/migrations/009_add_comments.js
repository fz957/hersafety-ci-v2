exports.up = async (knex) => {
  // Check if testimonies table exists
  const testimoniesTableExists = await knex.schema.hasTable('testimonies');
  if (!testimoniesTableExists) {
    console.log('- testimonies table does not exist, skipping migration');
    return;
  }

  // Check if comment_count column already exists
  const hasCommentCount = await knex.schema.hasColumn('testimonies', 'comment_count');
  if (!hasCommentCount) {
    // Ajouter comment_count à testimonies
    await knex.schema.alterTable('testimonies', (table) => {
      table.integer('comment_count').defaultTo(0);
    });
  }

  // Créer table testimony_comments if it doesn't exist
  const testimony_commentsExists = await knex.schema.hasTable('testimony_comments');
  if (!testimony_commentsExists) {
    await knex.schema.createTable('testimony_comments', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('testimony_id').notNullable().references('testimonies.id').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('users.id').onDelete('CASCADE');
      table.uuid('organization_id').notNullable().references('organizations.id').onDelete('CASCADE');

      table.text('content').notNullable(); // Validation en app layer

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
  }
};

exports.down = async (knex) => {
  const testimony_commentsExists = await knex.schema.hasTable('testimony_comments');
  if (testimony_commentsExists) {
    await knex.schema.dropTable('testimony_comments');
  }

  const testimoniesTableExists = await knex.schema.hasTable('testimonies');
  const hasCommentCount = await knex.schema.hasColumn('testimonies', 'comment_count');
  if (testimoniesTableExists && hasCommentCount) {
    await knex.schema.alterTable('testimonies', (table) => {
      table.dropColumn('comment_count');
    });
  }
};
