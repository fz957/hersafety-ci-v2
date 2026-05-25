/**
 * Migration 014 — Ajouter table pour stocker les tokens Firebase Cloud Messaging
 */

exports.up = async function (knex) {
  await knex.schema.createTable('fcm_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('cascade');
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('cascade');
    t.text('token').notNullable(); // Token FCM Google
    t.string('device_type').notNullable().defaultTo('web'); // 'web', 'android', 'ios'
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('last_used_at', { useTz: true }).defaultTo(knex.fn.now());
    t.unique(['user_id', 'token']); // Éviter les doublons par utilisateur
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTable('fcm_tokens');
};
