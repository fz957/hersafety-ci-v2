exports.up = async (knex) => {
  // Only seed if tables exist
  const articlesExists = await knex.schema.hasTable('articles');
  if (articlesExists) {
    // Mise à jour des articles avec des support_count réalistes
    await knex('articles').update({ support_count: 45 }).where({ status: 'approved' }).limit(1);
    await knex('articles').update({ support_count: 67 }).where({ status: 'approved' }).offset(1).limit(1);
    await knex('articles').update({ support_count: 89 }).where({ status: 'approved' }).offset(2).limit(1);
    await knex('articles').update({ support_count: 34 }).where({ status: 'approved' }).offset(3).limit(1);
    await knex('articles').update({ support_count: 56 }).where({ status: 'approved' }).offset(4).limit(1);
    await knex('articles').update({ support_count: 78 }).where({ status: 'approved' }).offset(5).limit(1);
    await knex('articles').update({ support_count: 42 }).where({ status: 'approved' }).offset(6).limit(1);
    await knex('articles').update({ support_count: 61 }).where({ status: 'approved' }).offset(7).limit(1);
  }

  const photosExists = await knex.schema.hasTable('photos');
  if (photosExists) {
    // Mise à jour des photos avec des support_count réalistes
    await knex('photos').update({ support_count: 89 }).where({ status: 'approved' }).limit(1);
    await knex('photos').update({ support_count: 64 }).where({ status: 'approved' }).offset(1).limit(1);
    await knex('photos').update({ support_count: 72 }).where({ status: 'approved' }).offset(2).limit(1);
    await knex('photos').update({ support_count: 51 }).where({ status: 'approved' }).offset(3).limit(1);
  }

  const videosExists = await knex.schema.hasTable('videos');
  if (videosExists) {
    // Mise à jour des vidéos avec des support_count réalistes
    await knex('videos').update({ support_count: 142 }).where({ status: 'approved' }).limit(1);
    await knex('videos').update({ support_count: 95 }).where({ status: 'approved' }).offset(1).limit(1);
    await knex('videos').update({ support_count: 78 }).where({ status: 'approved' }).offset(2).limit(1);
  }

  const testimoniesExists = await knex.schema.hasTable('testimonies');
  if (testimoniesExists) {
    // Mise à jour des témoignages avec des support_count réalistes
    await knex('testimonies').update({ support_count: 12 }).where({ status: 'approved' }).limit(1);
    await knex('testimonies').update({ support_count: 45 }).where({ status: 'approved' }).offset(1).limit(1);
    await knex('testimonies').update({ support_count: 28 }).where({ status: 'approved' }).offset(2).limit(1);
    await knex('testimonies').update({ support_count: 18 }).where({ status: 'approved' }).offset(3).limit(1);
    await knex('testimonies').update({ support_count: 35 }).where({ status: 'approved' }).offset(4).limit(1);
    await knex('testimonies').update({ support_count: 62 }).where({ status: 'approved' }).offset(5).limit(1);
  }
};

exports.down = async (knex) => {
  // Reset support_count à 0 (only if tables exist)
  const articlesExists = await knex.schema.hasTable('articles');
  if (articlesExists) await knex('articles').update({ support_count: 0 });

  const photosExists = await knex.schema.hasTable('photos');
  if (photosExists) await knex('photos').update({ support_count: 0 });

  const videosExists = await knex.schema.hasTable('videos');
  if (videosExists) await knex('videos').update({ support_count: 0 });

  const testimoniesExists = await knex.schema.hasTable('testimonies');
  if (testimoniesExists) await knex('testimonies').update({ support_count: 0 });
};
