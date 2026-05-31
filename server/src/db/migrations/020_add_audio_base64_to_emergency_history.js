/**
 * Migration: Ajouter l'audio en base64 à emergency_history
 */

exports.up = async function(knex) {
  return knex.schema.alterTable('emergency_history', (table) => {
    // Garder l'audio en base64 pour pouvoir le lire directement
    table.text('audio_base64').nullable(); // Base64 encoded audio data
  });
};

exports.down = async function(knex) {
  return knex.schema.alterTable('emergency_history', (table) => {
    table.dropColumn('audio_base64');
  });
};
