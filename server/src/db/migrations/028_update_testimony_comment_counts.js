exports.up = async (knex) => {
  try {
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
  await knex('testimonies').update({ comment_count: 0 });
};
