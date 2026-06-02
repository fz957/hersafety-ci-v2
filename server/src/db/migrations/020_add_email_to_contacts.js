/**
 * Migration 020 — Add email column to contacts table
 */

exports.up = async function (knex) {
  await knex.schema.alterTable('contacts', (t) => {
    t.text('email').nullable(); // Allow null for existing contacts
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('contacts', (t) => {
    t.dropColumn('email');
  });
};
