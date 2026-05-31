/**
 * Migration: Ajouter les messages de conversation à emergency_history
 */

exports.up = async function(knex) {
  return knex.schema.alterTable('emergency_history', (table) => {
    // Messages de la conversation avec Lyra (pour la preuve)
    table.json('lyra_messages').nullable(); // Array des messages échangés
  });
};

exports.down = async function(knex) {
  return knex.schema.alterTable('emergency_history', (table) => {
    table.dropColumn('lyra_messages');
  });
};
