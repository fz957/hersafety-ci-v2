/**
 * Migration 041 — Create testimony_comment_replies table
 */

exports.up = async (knex) => {
  await knex.schema.createTable('testimony_comment_replies', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('comment_id').notNullable().references('id').inTable('testimony_comments').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('reply_text').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true });

    t.index('comment_id');
    t.index('user_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('testimony_comment_replies');
};
