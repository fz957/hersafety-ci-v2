/**
 * Migration 011 — Ajouter support pour trigger warnings
 * Ajoute la colonne trigger_warning_level aux témoignages
 */

exports.up = async function (knex) {
  await knex.schema.alterTable('testimonies', (t) => {
    t.enum('trigger_warning_level', ['none', 'low', 'moderate', 'severe'], {
      useNative: true,
      enumName: 'warning_level'
    }).notNullable().defaultTo('none');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('testimonies', (t) => {
    t.dropColumn('trigger_warning_level');
  });
  await knex.raw('DROP TYPE IF EXISTS warning_level');
};
