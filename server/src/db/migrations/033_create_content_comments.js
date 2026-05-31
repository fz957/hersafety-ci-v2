/**
 * Migration 033 — Comments on articles, photos, videos
 */

exports.up = async function (knex) {
  await knex.schema.createTable('content_comments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.enum('content_type', ['article', 'photo', 'video']).notNullable();
    t.uuid('content_id').notNullable();
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('comment_text').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true });

    // Indexes
    t.index(['content_type', 'content_id']);
    t.index(['user_id']);
    t.index('created_at');
  });

  // Table pour les likes sur les commentaires (article/photo/video)
  await knex.schema.createTable('content_comment_likes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('comment_id').notNullable().references('id').inTable('content_comments').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Empêcher un même user de liker 2x le même commentaire
    t.unique(['comment_id', 'user_id']);
    t.index(['user_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('content_comment_likes');
  await knex.schema.dropTableIfExists('content_comments');
};
