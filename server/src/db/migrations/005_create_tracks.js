/**
 * Migration 005 — Trajets et check-ins
 */

exports.up = async function (knex) {
  await knex.raw(`DO $$ BEGIN CREATE TYPE track_status    AS ENUM ('active','completed','interrupted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await knex.raw(`DO $$ BEGIN CREATE TYPE checkin_response AS ENUM ('ok','no_response','escalated');    EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

  await knex.schema.createTable('tracks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.specificType('status', 'track_status').notNullable().defaultTo('active');
    t.timestamp('started_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('ended_at', { useTz: true });
    t.text('destination_label');
    t.integer('checkin_interval_min').defaultTo(10);
    t.jsonb('waypoints').defaultTo('[]');
    t.uuid('alert_id').references('id').inTable('alerts');
  });

  await knex.schema.createTable('checkins', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('track_id').notNullable().references('id').inTable('tracks').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.timestamp('checked_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.specificType('response', 'checkin_response').notNullable().defaultTo('ok');
    t.timestamp('responded_at', { useTz: true });
    t.decimal('location_lat', 10, 8);
    t.decimal('location_lng', 11, 8);
  });

  await knex.schema.alterTable('tracks', (t) => {
    t.index('user_id', 'idx_tracks_user');
    t.index('status',  'idx_tracks_status');
  });
  await knex.schema.alterTable('checkins', (t) => {
    t.index('track_id', 'idx_checkins_track');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('checkins');
  await knex.schema.dropTableIfExists('tracks');
  await knex.raw('DROP TYPE IF EXISTS checkin_response');
  await knex.raw('DROP TYPE IF EXISTS track_status');
};
