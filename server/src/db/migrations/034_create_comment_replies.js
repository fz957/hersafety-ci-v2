/**
 * Migration 034 — Replies to comments
 */

exports.up = async function (knex) {
  // Table pour les réponses aux commentaires
  await knex.schema.createTable('comment_replies', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('comment_id').notNullable().references('id').inTable('content_comments').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('reply_text').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true });

    // Indexes
    t.index(['comment_id']);
    t.index(['user_id']);
    t.index('created_at');
  });

  // Table pour les likes sur les réponses
  await knex.schema.createTable('comment_reply_likes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('reply_id').notNullable().references('id').inTable('comment_replies').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Empêcher un même user de liker 2x la même réponse
    t.unique(['reply_id', 'user_id']);
    t.index(['user_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('comment_reply_likes');
  await knex.schema.dropTableIfExists('comment_replies');
};
