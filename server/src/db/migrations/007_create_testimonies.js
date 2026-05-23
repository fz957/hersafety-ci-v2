/**
 * Migration 007 — Témoignages + réactions
 * Crée : danger_type, testimony_status, generate_anonymous_name(), testimonies, testimony_reactions
 */

exports.up = async function (knex) {
  await knex.raw(`DO $$ BEGIN CREATE TYPE danger_type AS ENUM ('harcelement_verbal','agression_physique','agression_sexuelle','vol','suivi','detour_force','autre'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await knex.raw(`DO $$ BEGIN CREATE TYPE testimony_status AS ENUM ('pending','approved','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION generate_anonymous_name()
    RETURNS TEXT AS $$
    DECLARE
      adj  TEXT[] := ARRAY['Courageuse','Forte','Brave','Resiliente','Libre'];
      noun TEXT[] := ARRAY['Lionne','Etoile','Flamme','Guerriere','Lumiere'];
    BEGIN
      RETURN adj[1 + floor(random() * 5)::int] ||
             noun[1 + floor(random() * 5)::int] ||
             floor(random() * 999)::TEXT;
    END;
    $$ LANGUAGE plpgsql
  `);

  await knex.schema.createTable('testimonies', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.boolean('is_anonymous').notNullable().defaultTo(true);
    t.text('display_name');
    t.specificType('category', 'danger_type').notNullable();
    t.text('title').notNullable();
    t.text('content').notNullable();
    t.text('location_label');
    t.specificType('status', 'testimony_status').notNullable().defaultTo('pending');
    t.integer('support_count').notNullable().defaultTo(0);
    t.uuid('moderated_by').references('id').inTable('users');
    t.timestamp('moderated_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('testimony_reactions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('testimony_id').notNullable().references('id').inTable('testimonies').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('reaction').notNullable().defaultTo('support');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['testimony_id', 'user_id']);
  });

  await knex.schema.alterTable('testimonies', (t) => {
    t.index('organization_id', 'idx_testimonies_org');
    t.index('status',          'idx_testimonies_status');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('testimony_reactions');
  await knex.schema.dropTableIfExists('testimonies');
  await knex.raw('DROP FUNCTION IF EXISTS generate_anonymous_name()');
  await knex.raw('DROP TYPE IF EXISTS testimony_status');
  await knex.raw('DROP TYPE IF EXISTS danger_type CASCADE');
};
