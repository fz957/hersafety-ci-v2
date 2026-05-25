/**
 * Migration 015 — Ajouter email et vérification aux contacts
 */

exports.up = async function (knex) {
  await knex.schema.table('contacts', (t) => {
    t.string('email').nullable(); // Email du contact
    t.string('verification_token').nullable(); // Token de vérification unique
    t.boolean('email_verified').defaultTo(false); // Email vérifié?
    t.timestamp('email_verified_at', { useTz: true }).nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.table('contacts', (t) => {
    t.dropColumn('email');
    t.dropColumn('verification_token');
    t.dropColumn('email_verified');
    t.dropColumn('email_verified_at');
  });
};
