exports.up = async (knex) => {
  // Créer table comments
  await knex.schema.createTable('comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Quoi c'est un commentaire sur?
    table.enum('content_type', ['testimony', 'article', 'photo', 'video']).notNullable();
    table.uuid('content_id').notNullable(); // ID du témoignage/article/photo/vidéo
    
    // Contenu
    table.string('display_name').notNullable();
    table.text('content').notNullable();
    table.integer('likes_count').defaultTo(0);
    
    // Timestamps
    table.timestamps(true, true);
    
    // Index
    table.index(['content_type', 'content_id']);
    table.index(['organization_id']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('comments');
};
