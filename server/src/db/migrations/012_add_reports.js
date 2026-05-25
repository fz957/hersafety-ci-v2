/**
 * Migration 012 — Ajouter système de signalement (reports)
 * Permet aux utilisatrices de signaler des publications ou des comptes
 */

exports.up = async function (knex) {
  await knex.schema.createTable('reports', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable();
    t.integer('organization_id').notNullable();
    t.enum('report_type', ['testimony', 'user'], { useNative: true, enumName: 'report_type_enum' }).notNullable();
    t.integer('testimony_id').nullable();
    t.integer('reported_user_id').nullable();
    t.enum('reason', ['harassment', 'violence', 'misinformation', 'spam', 'other'], { useNative: true, enumName: 'report_reason_enum' }).notNullable();
    t.text('description').nullable();
    t.enum('status', ['open', 'reviewed', 'resolved'], { useNative: true, enumName: 'report_status_enum' }).defaultTo('open');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('reviewed_at').nullable();
    t.integer('reviewed_by').nullable();

    t.foreign('user_id').references('id').inTable('users').onDelete('cascade');
    t.foreign('organization_id').references('id').inTable('organizations').onDelete('cascade');
    t.foreign('testimony_id').references('id').inTable('testimonies').onDelete('cascade');
    t.foreign('reported_user_id').references('id').inTable('users').onDelete('cascade');
  });

  // Ajouter colonne pour compter les signalements
  await knex.schema.alterTable('testimonies', (t) => {
    t.integer('report_count').defaultTo(0);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTable('reports');
  await knex.schema.alterTable('testimonies', (t) => {
    t.dropColumn('report_count');
  });
  await knex.raw('DROP TYPE IF EXISTS report_type_enum');
  await knex.raw('DROP TYPE IF EXISTS report_reason_enum');
  await knex.raw('DROP TYPE IF EXISTS report_status_enum');
};
