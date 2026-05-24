exports.up = async (knex) => {
  await knex.schema.alterTable('users', (table) => {
    table.boolean('phone_verified').defaultTo(false);
    table.string('phone_verification_code', 255).nullable();
    table.timestamp('phone_verification_expires_at').nullable();
    table.enum('onboarding_step', ['emergency_numbers', 'phone_verification', 'contacts', 'completed']).defaultTo('emergency_numbers');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('phone_verified');
    table.dropColumn('phone_verification_code');
    table.dropColumn('phone_verification_expires_at');
    table.dropColumn('onboarding_step');
  });
};
