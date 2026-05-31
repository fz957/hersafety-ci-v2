/**
 * Migration 021 — Ajouter préférence notifications email
 */

exports.up = async function (knex) {
  await knex.schema.table('users', (t) => {
    t.boolean('email_notifications_enabled').defaultTo(true).comment('Utilisateur reçoit les notifications par email');
  });
};

exports.down = async function (knex) {
  await knex.schema.table('users', (t) => {
    t.dropColumn('email_notifications_enabled');
  });
};
