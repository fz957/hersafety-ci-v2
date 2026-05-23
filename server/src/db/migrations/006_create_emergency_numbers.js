/**
 * Migration 006 — Numéros d'urgence et lieux sûrs
 */

exports.up = async function (knex) {
  await knex.raw(`DO $$ BEGIN CREATE TYPE place_type AS ENUM ('police','gendarmerie','pharmacie','pompiers','hopital','autre'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

  await knex.schema.createTable('safe_places', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    t.text('name').notNullable();
    t.specificType('type', 'place_type').notNullable();
    t.decimal('lat', 10, 8).notNullable();
    t.decimal('lng', 11, 8).notNullable();
    t.text('address');
    t.text('phone');
    t.boolean('is_verified').notNullable().defaultTo(false);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.text('opening_hours');
    t.uuid('created_by').references('id').inTable('users');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('emergency_numbers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.text('name').notNullable();
    t.text('number').notNullable();
    t.specificType('type', 'place_type').notNullable();
    t.boolean('is_national').notNullable().defaultTo(true);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.integer('display_order').defaultTo(0);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Données initiales Côte d'Ivoire
  await knex('emergency_numbers').insert([
    { name: 'Police nationale',            number: '110',  type: 'police',      is_national: true, display_order: 1 },
    { name: 'Gendarmerie nationale',       number: '111',  type: 'gendarmerie', is_national: true, display_order: 2 },
    { name: 'Sapeurs-pompiers',            number: '180',  type: 'pompiers',    is_national: true, display_order: 3 },
    { name: 'SAMU',                        number: '185',  type: 'hopital',     is_national: true, display_order: 4 },
    { name: 'Ligne VBG — Ministère Femme', number: '1308', type: 'autre',       is_national: true, display_order: 5 },
  ]);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('emergency_numbers');
  await knex.schema.dropTableIfExists('safe_places');
  await knex.raw('DROP TYPE IF EXISTS place_type');
};
