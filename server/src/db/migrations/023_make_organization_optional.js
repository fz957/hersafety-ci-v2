/**
 * Migration 023 — Make organization_id optional for user signup
 * Users can sign up without belonging to an organization initially
 */

exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.uuid('organization_id').nullable().alter();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.uuid('organization_id').notNullable().alter();
  });
};
