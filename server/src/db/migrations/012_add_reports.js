/**
 * Migration 012 — Ajouter système de signalement de contenu (content_reports)
 * Permet aux utilisatrices de signaler des publications ou des comptes
 * NOTE: Table séparée de 'reports' (008) qui gère reports lieu/chauffeur
 */

exports.up = async function (knex) {
  await knex.schema.createTable('content_reports', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('cascade');
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('cascade');
    t.enum('report_type', ['testimony', 'user'], { useNative: true, enumName: 'content_report_type_enum' }).notNullable();
    t.uuid('testimony_id').nullable().references('id').inTable('testimonies').onDelete('cascade');
    t.uuid('reported_user_id').nullable().references('id').inTable('users').onDelete('cascade');
    t.enum('reason', ['harassment', 'violence', 'misinformation', 'spam', 'other'], { useNative: true, enumName: 'content_report_reason_enum' }).notNullable();
    t.text('description').nullable();
    t.enum('status', ['open', 'reviewed', 'resolved'], { useNative: true, enumName: 'content_report_status_enum' }).defaultTo('open');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('reviewed_at', { useTz: true }).nullable();
    t.uuid('reviewed_by').nullable().references('id').inTable('users');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTable('content_reports');
  await knex.raw('DROP TYPE IF EXISTS content_report_type_enum');
  await knex.raw('DROP TYPE IF EXISTS content_report_reason_enum');
  await knex.raw('DROP TYPE IF EXISTS content_report_status_enum');
};
