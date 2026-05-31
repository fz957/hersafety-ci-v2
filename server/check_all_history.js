const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== TOUS les contenus de emergency_history ===\n');
    
    const history = await knex('emergency_history')
      .join('users', 'emergency_history.user_id', '=', 'users.id')
      .select(
        'users.full_name',
        'emergency_history.location_name',
        'emergency_history.latitude',
        'emergency_history.longitude',
        'emergency_history.notes',
        'emergency_history.lyra_messages',
        'emergency_history.trigger_type'
      )
      .orderBy('emergency_history.created_at', 'desc')
      .limit(10);
    
    history.forEach(h => {
      console.log(`${h.full_name}:`);
      console.log(`  location_name: ${h.location_name}`);
      console.log(`  GPS: ${h.latitude}, ${h.longitude}`);
      console.log(`  notes: ${h.notes}`);
      console.log(`  trigger_type: ${h.trigger_type}`);
      if (h.lyra_messages) {
        console.log(`  lyra_messages: ${String(h.lyra_messages).substring(0, 100)}`);
      }
      console.log('');
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
