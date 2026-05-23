/**
 * Migration 001 — Organizations (tenant racine)
 * Crée l'extension uuid, l'enum org_type et la table organizations.
 */

exports.up = async function (knex) {
  // Extension UUID
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // ENUM org_type
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE org_type AS ENUM ('ong', 'entreprise', 'universite');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);

  // Table organizations
  await knex.schema.createTable('organizations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.text('name').notNullable();
    t.specificType('type', 'org_type').notNullable();
    t.text('email').notNullable().unique();
    t.text('phone');
    t.text('address');
    t.text('join_code').notNullable().unique();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.boolean('is_approved').notNullable().defaultTo(false);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('organizations');
  await knex.raw('DROP TYPE IF EXISTS org_type');
};
