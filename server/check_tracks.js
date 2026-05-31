const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== Table TRACKS ===\n');
    
    // Colonnes de tracks
    const columns = await knex.raw(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tracks'
      ORDER BY ordinal_position
    `);
    
    console.log('Colonnes:');
    columns.rows.forEach(c => {
      console.log(`  - ${c.column_name}`);
    });
    
    // Voir quelques tracks
    console.log('\nExemples de tracks:');
    const tracks = await knex('tracks')
      .select('*')
      .limit(3);
    
    if (tracks.length > 0) {
      tracks.forEach(t => {
        console.log(`\nTrack ID: ${t.id?.substring(0, 8)}`);
        Object.keys(t).forEach(k => {
          if (t[k] !== null) {
            console.log(`  ${k}: ${String(t[k]).substring(0, 50)}`);
          }
        });
      });
    } else {
      console.log('Aucune track trouvée');
    }
    
    // Vérifier par utilisateur
    console.log('\n=== Tracks par utilisateur ===');
    const users = await knex('users').where('role', 'user').select('id', 'full_name').limit(3);
    
    for (const user of users) {
      const userTracks = await knex('tracks')
        .where('user_id', user.id)
        .select('start_location_label', 'end_location_label', 'status', 'created_at')
        .limit(1);
      
      if (userTracks.length > 0) {
        console.log(`\n${user.full_name}:`);
        console.log(`  start: ${userTracks[0].start_location_label}`);
        console.log(`  end: ${userTracks[0].end_location_label}`);
        console.log(`  status: ${userTracks[0].status}`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
