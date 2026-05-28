/**
 * Migration: Créer table emergency_history pour garder les enregistrements
 */

exports.up = async function(knex) {
  // Créer l'extension UUID si elle n'existe pas
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  return knex.schema.createTable('emergency_history', (table) => {
    table.increments('id').primary();
    table.uuid('user_id').notNullable();
    table.uuid('organization_id').notNullable();

    // Infos de l'urgence
    table.enum('level', ['1', '2', '3', '4']).notNullable(); // Niveau d'urgence
    table.string('trigger_type').nullable(); // 'tap', 'double_press', 'long_press', etc.

    // Position et lieu
    table.decimal('latitude', 10, 8).nullable();
    table.decimal('longitude', 11, 8).nullable();
    table.string('location_name').nullable();

    // Contacts alertés
    table.json('contacts_alerted').nullable(); // Array de contacts notifiés
    table.json('sms_sent').nullable(); // Détails des SMS envoyés

    // Enregistrement audio
    table.string('audio_file_path').nullable(); // Chemin du fichier audio
    table.integer('audio_duration_seconds').nullable(); // Durée en secondes
    table.string('audio_mime_type').defaultTo('audio/webm'); // Type MIME

    // Notes et détails
    table.text('notes').nullable(); // Notes additionnelles
    table.string('status').defaultTo('active'); // 'active', 'resolved', 'false_alarm'

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('resolved_at').nullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indices
    table.index(['user_id', 'organization_id']);
    table.index(['created_at']);
    table.index(['organization_id']);

    // Foreign keys
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
  });
};

exports.down = async function(knex) {
  return knex.schema.dropTableIfExists('emergency_history');
};
