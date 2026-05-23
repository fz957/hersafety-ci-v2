/**
 * Migration 008 — Signalements lieux/chauffeurs
 * danger_type est déjà créé par migration 007.
 */

exports.up = async function (knex) {
  await knex.raw(`DO $$ BEGIN CREATE TYPE report_type   AS ENUM ('lieu','chauffeur');            EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await knex.raw(`DO $$ BEGIN CREATE TYPE report_status AS ENUM ('pending','verified','refuted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

  await knex.schema.createTable('reports', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.boolean('is_anonymous').notNullable().defaultTo(true);
    t.specificType('report_type', 'report_type').notNullable();
    t.text('place_name');
    t.text('place_address');
    t.decimal('place_lat', 10, 8);
    t.decimal('place_lng', 11, 8);
    t.text('vehicle_plate');
    t.text('vtc_app');
    t.specificType('danger_type', 'danger_type').notNullable();
    t.text('description').notNullable();
    t.date('incident_date');
    t.specificType('status', 'report_status').notNullable().defaultTo('pending');
    t.uuid('verified_by').references('id').inTable('users');
    t.timestamp('verified_at', { useTz: true });
    t.text('verification_note');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('reports', (t) => {
    t.index('organization_id', 'idx_reports_org');
    t.index('status',          'idx_reports_status');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('reports');
  await knex.raw('DROP TYPE IF EXISTS report_status');
  await knex.raw('DROP TYPE IF EXISTS report_type');
};
