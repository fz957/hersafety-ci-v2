const knex = require('./src/db/knex');

(async () => {
  try {
    // L'organization_id des données de test
    const testOrgId = '9b63683f-9b14-418a-96c0-4c41d40defd5';

    console.log(`\n=== Testing /api/admin/moderation with org: ${testOrgId} ===\n`);

    // Simuler ce que fait le endpoint
    let results = { testimonies: [], articles: [], photos: [], videos: [] };

    results.testimonies = await knex('testimonies')
      .where({ organization_id: testOrgId, status: 'pending' })
      .select('id', 'display_name', 'title', 'content', 'category', 'location_label', 'created_at', 'status')
      .orderBy('created_at', 'desc')
      .limit(50);

    results.articles = await knex('articles')
      .where({ organization_id: testOrgId, status: 'pending' })
      .select('id', 'title', 'content', 'category', 'created_at', 'status')
      .orderBy('created_at', 'desc')
      .limit(50);

    results.photos = await knex('photos')
      .where({ organization_id: testOrgId, status: 'pending' })
      .select('id', 'url', 'description', 'category', 'created_at', 'status')
      .orderBy('created_at', 'desc')
      .limit(50);

    results.videos = await knex('videos')
      .where({ organization_id: testOrgId, status: 'pending' })
      .select('id', 'url', 'description', 'category', 'created_at', 'status')
      .orderBy('created_at', 'desc')
      .limit(50);

    console.log('API Response that AdminModeration receives:');
    console.log(JSON.stringify(results, null, 2));

    console.log(`\nTotal items: ${results.testimonies.length + results.articles.length + results.photos.length + results.videos.length}`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
