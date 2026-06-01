exports.up = async (knex) => {
  const hasTable = await knex.schema.hasTable('login_attempts');
  if (hasTable) {
    console.log('[Migration] Table login_attempts already exists');
    return;
  }

  await knex.schema.createTable('login_attempts', (table) => {
    table.increments('id').primary();
    table.string('email').notNullable().index();
    table.string('ip_address').nullable();
    table.boolean('success').defaultTo(false);
    table.timestamp('attempted_at').defaultTo(knex.fn.now()).index();
  });

  console.log('[Migration] Table login_attempts created');
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('login_attempts');
  console.log('[Migration] Table login_attempts dropped');
};
