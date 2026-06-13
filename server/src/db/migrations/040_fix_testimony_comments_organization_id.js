/**
 * Migration 040 — Fix testimony_comments organization_id constraint
 * Make organization_id nullable in testimony_comments table
 */

exports.up = async (knex) => {
  try {
    const hasColumn = await knex.schema.hasColumn('testimony_comments', 'organization_id');
    if (!hasColumn) {
      console.log('testimony_comments: organization_id column does not exist');
      return;
    }

    await knex.schema.alterTable('testimony_comments', (t) => {
      t.uuid('organization_id').nullable().alter();
    });
    console.log('✓ testimony_comments: organization_id made nullable');
  } catch (err) {
    console.log(`testimony_comments: ${err.message}`);
  }
};

exports.down = async (knex) => {
  // Revert not supported
};
