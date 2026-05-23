/**
 * Migration 002 — Users + tables auth (login_attempts, refresh_tokens)
 * Dépend de : 001_create_organizations
 */

exports.up = async function (knex) {
  // ENUM user_role
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('user', 'admin', 'superadmin');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);

  // Table users
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    t.text('email').notNullable().unique();
    t.text('password_hash').notNullable();
    t.text('phone');
    t.text('full_name');
    t.specificType('role', 'user_role').notNullable().defaultTo('user');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.boolean('onboarding_done').notNullable().defaultTo(false);
    t.boolean('is_demo').notNullable().defaultTo(false);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Index sur organization_id
  await knex.schema.alterTable('users', (t) => {
    t.index('organization_id', 'idx_users_org');
  });

  // Table login_attempts (anti brute-force)
  await knex.schema.createTable('login_attempts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.text('email').notNullable();
    t.text('ip_address');
    t.boolean('success').notNullable().defaultTo(false);
    t.timestamp('attempted_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('login_attempts', (t) => {
    t.index('email', 'idx_login_email');
    t.index('attempted_at', 'idx_login_time');
  });

  // Table refresh_tokens
  await knex.schema.createTable('refresh_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.text('token_hash').notNullable().unique();
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('login_attempts');
  await knex.schema.dropTableIfExists('users');
  await knex.raw('DROP TYPE IF EXISTS user_role');
};
