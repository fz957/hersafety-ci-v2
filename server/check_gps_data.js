const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== Positions GPS des utilisatrices ===\n');
    
    // Vérifier les waypoints
    const tracks = await knex('tracks')
      .where('status', '!=', 'completed')  // Tracks actifs/en cours
      .select('id', 'user_id', 'status', 'waypoints', 'destination_label')
      .limit(5);
    
    console.log(`Tracks actifs/en cours: ${tracks.length}\n`);
    
    tracks.forEach(t => {
      console.log(`Track ${t.id.substring(0, 8)}`);
      console.log(`  Status: ${t.status}`);
      console.log(`  Destination: ${t.destination_label}`);
      if (t.waypoints) {
        const wp = typeof t.waypoints === 'string' ? JSON.parse(t.waypoints) : t.waypoints;
        console.log(`  Waypoints: ${JSON.stringify(wp).substring(0, 100)}`);
      }
    });
    
    // Vérifier s'il y a une table check_ins ou positions
    const tables = await knex.raw(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n=== Tables disponibles ===');
    const relevantTables = tables.rows
      .filter(t => t.table_name.toLowerCase().includes('check') ||
                    t.table_name.toLowerCase().includes('position') ||
                    t.table_name.toLowerCase().includes('location') ||
                    t.table_name.toLowerCase().includes('gps') ||
                    t.table_name.toLowerCase().includes('waypoint'))
      .map(t => t.table_name);
    
    if (relevantTables.length > 0) {
      console.log('Tables GPS/Position:');
      relevantTables.forEach(t => console.log(`  ✓ ${t}`));
    } else {
      console.log('❌ Pas de table check-in/position/GPS trouvée');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
