const knex = require('./src/db/knex');

(async () => {
  try {
    const alerts = await knex('alerts')
      .select('id', 'status', 'created_at', 'organization_id')
      .orderBy('created_at', 'desc')
      .limit(15);
    
    console.log('=== Alertes (dernieres 15) ===');
    alerts.forEach(a => {
      console.log(`ID: ${a.id.substring(0, 8)}, Status: ${a.status}, Created: ${a.created_at}`);
    });
    
    console.log('\n=== Statut summary ===');
    const summary = await knex('alerts')
      .select('status')
      .count('* as count')
      .groupBy('status');
    
    summary.forEach(s => {
      console.log(`${s.status}: ${s.count} alertes`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
