const knex = require('./src/db/knex');

(async () => {
  try {
    const articles = await knex('articles').select('*').orderBy('created_at', 'desc');
    const photos = await knex('photos').select('*').orderBy('created_at', 'desc');
    const videos = await knex('videos').select('*').orderBy('created_at', 'desc');

    console.log(`\n=== ARTICLES (${articles.length}) ===`);
    articles.forEach(a => console.log(`  ${a.created_at} | ${a.title}`));

    console.log(`\n=== PHOTOS (${photos.length}) ===`);
    photos.forEach(p => console.log(`  ${p.created_at} | ${p.url}`));

    console.log(`\n=== VIDEOS (${videos.length}) ===`);
    videos.forEach(v => console.log(`  ${v.created_at} | ${v.url}`));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
