/**
 * Migration 035 — Add is_anonymous field to comments and replies
 */

exports.up = async function (knex) {
  // Ajouter is_anonymous à content_comments
  await knex.schema.alterTable('content_comments', (t) => {
    t.boolean('is_anonymous').defaultTo(false);
    t.string('display_name').nullable(); // Pseudonyme anonyme si is_anonymous=true
  });

  // Ajouter is_anonymous à comment_replies
  await knex.schema.alterTable('comment_replies', (t) => {
    t.boolean('is_anonymous').defaultTo(false);
    t.string('display_name').nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('content_comments', (t) => {
    t.dropColumn('is_anonymous');
    t.dropColumn('display_name');
  });

  await knex.schema.alterTable('comment_replies', (t) => {
    t.dropColumn('is_anonymous');
    t.dropColumn('display_name');
  });
};
