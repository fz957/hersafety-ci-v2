/**
 * Migration 013 — Ajouter système de likes sur les commentaires
 */

exports.up = async function (knex) {
  await knex.schema.createTable('comment_likes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('comment_id').notNullable().references('id').inTable('testimony_comments').onDelete('cascade');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('cascade');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.unique(['comment_id', 'user_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTable('comment_likes');
};
