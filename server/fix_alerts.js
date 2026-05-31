const knex = require('./src/db/knex');

(async () => {
  try {
    // Update all active alerts to resolved
    const result = await knex('alerts')
      .where('status', 'active')
      .update({ status: 'resolved', resolved_at: new Date() });
    
    console.log(`✓ ${result} alertes mises à jour de 'active' → 'resolved'`);
    
    // Verify
    const summary = await knex('alerts')
      .select('status')
      .count('* as count')
      .groupBy('status');
    
    console.log('\n=== Nouveau résumé des statuts ===');
    summary.forEach(s => {
      console.log(`${s.status}: ${s.count} alertes`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
