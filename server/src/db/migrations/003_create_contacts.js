/**
 * Migration 003 — Contacts de confiance
 * Inclut l'enum contact_relation et le trigger max 5 contacts.
 */

exports.up = async function (knex) {
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE contact_relation AS ENUM ('famille', 'ami', 'collegue', 'autre');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);

  await knex.schema.createTable('contacts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.text('full_name').notNullable();
    t.text('phone').notNullable();
    t.specificType('relation', 'contact_relation').notNullable().defaultTo('autre');
    t.boolean('is_primary').notNullable().defaultTo(false);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('contacts', (t) => {
    t.index('user_id', 'idx_contacts_user');
  });

  await knex.raw(`
    CREATE OR REPLACE FUNCTION check_max_contacts()
    RETURNS TRIGGER AS $$
    BEGIN
      IF (SELECT COUNT(*) FROM contacts WHERE user_id = NEW.user_id) >= 5 THEN
        RAISE EXCEPTION 'Maximum 5 contacts autorises';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await knex.raw(`
    CREATE TRIGGER max_contacts_trigger
      BEFORE INSERT ON contacts
      FOR EACH ROW EXECUTE FUNCTION check_max_contacts()
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP TRIGGER IF EXISTS max_contacts_trigger ON contacts');
  await knex.raw('DROP FUNCTION IF EXISTS check_max_contacts()');
  await knex.schema.dropTableIfExists('contacts');
  await knex.raw('DROP TYPE IF EXISTS contact_relation');
};
