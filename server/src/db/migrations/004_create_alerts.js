/**
 * Migration 004 — Alertes + logs SMS
 */

exports.up = async function (knex) {
  await knex.raw(`DO $$ BEGIN CREATE TYPE alert_level  AS ENUM ('1','2','3','4');           EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await knex.raw(`DO $$ BEGIN CREATE TYPE alert_status AS ENUM ('active','resolved','false_alarm'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

  await knex.schema.createTable('alerts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.specificType('level', 'alert_level').notNullable();
    t.specificType('status', 'alert_status').notNullable().defaultTo('active');
    t.decimal('location_lat', 10, 8);
    t.decimal('location_lng', 11, 8);
    t.text('location_label');
    t.boolean('sms_sent').notNullable().defaultTo(false);
    t.timestamp('sms_sent_at', { useTz: true });
    t.integer('contacts_count').defaultTo(0);
    t.boolean('is_simulated').notNullable().defaultTo(false);
    t.timestamp('resolved_at', { useTz: true });
    t.text('notes');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('sms_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('alert_id').references('id').inTable('alerts');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.uuid('contact_id').references('id').inTable('contacts');
    t.text('phone_to').notNullable();
    t.text('message').notNullable();
    t.text('status').notNullable().defaultTo('pending');
    t.boolean('is_simulated').notNullable().defaultTo(false);
    t.text('provider_ref');
    t.timestamp('sent_at', { useTz: true });
    t.text('error_message');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('alerts', (t) => {
    t.index('user_id',         'idx_alerts_user');
    t.index('organization_id', 'idx_alerts_org');
    t.index('created_at',      'idx_alerts_created');
  });
  await knex.schema.alterTable('sms_logs', (t) => {
    t.index('alert_id', 'idx_sms_alert');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('sms_logs');
  await knex.schema.dropTableIfExists('alerts');
  await knex.raw('DROP TYPE IF EXISTS alert_status');
  await knex.raw('DROP TYPE IF EXISTS alert_level');
};
