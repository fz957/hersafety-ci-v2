const knex = require('./src/db/knex');

(async () => {
  try {
    const articles = await knex('articles').select('id', 'title', 'status', 'organization_id').limit(5);
    const photos = await knex('photos').select('id', 'url', 'status', 'organization_id').limit(5);
    const videos = await knex('videos').select('id', 'url', 'status', 'organization_id').limit(5);
    const testimonies = await knex('testimonies').select('id', 'display_name', 'status', 'organization_id').limit(5);

    console.log('=== ARTICLES ===');
    console.log(articles);
    console.log('\n=== PHOTOS ===');
    console.log(photos);
    console.log('\n=== VIDEOS ===');
    console.log(videos);
    console.log('\n=== TESTIMONIES ===');
    console.log(testimonies);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
