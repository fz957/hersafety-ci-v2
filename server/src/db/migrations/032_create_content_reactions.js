/**
 * Migration 031 — Réactions pour articles, photos, vidéos
 * Crée : reactions (table générique)
 */

exports.up = async function (knex) {
  // Créer table générique pour les réactions sur articles/photos/vidéos
  const exists = await knex.schema.hasTable('reactions');
  if (exists) return;

  await knex.schema.createTable('reactions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.enum('content_type', ['article', 'photo', 'video']).notNullable();
    t.uuid('content_id').notNullable();
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('reaction').notNullable().defaultTo('support');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Assurer qu'un user ne peut liker qu'une fois par contenu
    t.unique(['content_type', 'content_id', 'user_id']);

    // Indexes
    t.index(['content_type', 'content_id']);
    t.index(['user_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('reactions');
};
