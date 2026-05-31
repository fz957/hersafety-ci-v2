const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== Vérification API /admin/alerts/history ===\n');
    
    const organizationId = '9b63683f-9b14-418a-96c0-4c41d40defd5';
    
    // Simuler l'API
    const alerts = await knex('alerts')
      .where('alerts.organization_id', organizationId)
      .join('users', 'alerts.user_id', '=', 'users.id')
      .select(
        'alerts.id',
        'alerts.level',
        'alerts.status',
        'alerts.location_label',
        'alerts.created_at',
        'users.full_name',
        'users.id as user_id'
      )
      .orderBy('alerts.created_at', 'desc')
      .limit(10);
    
    console.log('Ce que l\'API retourne:\n');
    alerts.forEach(a => {
      console.log(`ID: ${a.id.substring(0, 8)}`);
      console.log(`  User: ${a.full_name}`);
      console.log(`  Location: ${a.location_label || '(VIDE!)'}`);
      console.log(`  Level: ${a.level}`);
      console.log(`  Status: ${a.status}\n`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
