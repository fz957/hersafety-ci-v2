exports.up = async (knex) => {
  try {
    // Check if required tables exist
    const testimoniesTableExists = await knex.schema.hasTable('testimonies');
    const commentsTableExists = await knex.schema.hasTable('comments');
    const hasCommentCountColumn = await knex.schema.hasColumn('testimonies', 'comment_count');

    if (!testimoniesTableExists || !commentsTableExists || !hasCommentCountColumn) {
      console.log('- testimonies, comments table or comment_count column does not exist, skipping migration');
      return;
    }

    // Pour chaque témoignage, compter les commentaires et mettre à jour comment_count
    const testimonies = await knex('testimonies').select('id');

    for (const testimony of testimonies) {
      const commentCount = await knex('comments')
        .where({ content_type: 'testimony', content_id: testimony.id })
        .count('* as cnt')
        .first();

      await knex('testimonies')
        .where({ id: testimony.id })
        .update({ comment_count: parseInt(commentCount?.cnt || 0, 10) });
    }

    console.log(`✓ Updated comment_count for ${testimonies.length} testimonies`);
  } catch (err) {
    console.error('Error updating comment counts:', err.message);
  }
};

exports.down = async (knex) => {
  // Réinitialiser comment_count à 0
  const testimoniesTableExists = await knex.schema.hasTable('testimonies');
  const hasCommentCountColumn = await knex.schema.hasColumn('testimonies', 'comment_count');

  if (testimoniesTableExists && hasCommentCountColumn) {
    await knex('testimonies').update({ comment_count: 0 });
  }
};
