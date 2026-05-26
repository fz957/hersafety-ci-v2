exports.up = function(knex) {
  return knex.schema.table('tracks', function(table) {
    table.string('share_token').unique().nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('tracks', function(table) {
    table.dropColumn('share_token');
  });
};
