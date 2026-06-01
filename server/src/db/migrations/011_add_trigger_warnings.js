/**
 * Migration 011 — Ajouter support pour trigger warnings
 * Ajoute la colonne trigger_warning_level aux témoignages
 */

exports.up = async function (knex) {
  const tableExists = await knex.schema.hasTable('testimonies');
  if (!tableExists) {
    console.log('- testimonies table does not exist, skipping migration');
    return;
  }

  const hasColumn = await knex.schema.hasColumn('testimonies', 'trigger_warning_level');
  if (hasColumn) {
    console.log('- trigger_warning_level column already exists, skipping');
    return;
  }

  await knex.schema.alterTable('testimonies', (t) => {
    t.enum('trigger_warning_level', ['none', 'low', 'moderate', 'severe'], {
      useNative: true,
      enumName: 'warning_level'
    }).notNullable().defaultTo('none');
  });
};

exports.down = async function (knex) {
  const tableExists = await knex.schema.hasTable('testimonies');
  if (!tableExists) {
    console.log('- testimonies table does not exist, skipping revert');
    return;
  }

  const hasColumn = await knex.schema.hasColumn('testimonies', 'trigger_warning_level');
  if (hasColumn) {
    await knex.schema.alterTable('testimonies', (t) => {
      t.dropColumn('trigger_warning_level');
    });
  }

  await knex.raw('DROP TYPE IF EXISTS warning_level');
};
