/**
 * Migration: Ajouter les champs de lieu de refuge à emergency_history
 */

exports.up = async function(knex) {
  return knex.schema.alterTable('emergency_history', (table) => {
    // Lieu où l'utilisatrice s'est réfugiée (si elle a bougé)
    table.decimal('final_latitude', 10, 8).nullable(); // Position finale (refuge)
    table.decimal('final_longitude', 11, 8).nullable(); // Position finale (refuge)
    table.string('final_location_name').nullable(); // Nom du lieu de refuge
  });
};

exports.down = async function(knex) {
  return knex.schema.alterTable('emergency_history', (table) => {
    table.dropColumn('final_latitude');
    table.dropColumn('final_longitude');
    table.dropColumn('final_location_name');
  });
};
