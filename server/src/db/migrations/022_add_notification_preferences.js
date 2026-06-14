/**
 * Migration 022 — Add granular notification preferences
 * Adds separate columns for alerts, reports, and comments notifications
 */

exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.boolean('notify_alerts').notNullable().defaultTo(true);
    t.boolean('notify_reports').notNullable().defaultTo(true);
    t.boolean('notify_comments').notNullable().defaultTo(true);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('notify_alerts');
    t.dropColumn('notify_reports');
    t.dropColumn('notify_comments');
  });
};
