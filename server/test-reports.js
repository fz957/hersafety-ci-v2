const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('🔍 Testant la requête des signalements vérifiés...\n');

    // Test 1: Tous les signalements
    const all = await knex('reports').count('id as total').first();
    console.log('📊 TOUS les signalements:', all);

    // Test 2: Seulement les vérifiés (syntaxe object)
    const verified1 = await knex('reports')
      .where({ status: 'verified' })
      .count('id as total').first();
    console.log('✅ Vérifiés (where object):', verified1);

    // Test 3: Seulement les vérifiés (syntaxe explicite)
    const verified2 = await knex('reports')
      .where('status', '=', 'verified')
      .count('id as total').first();
    console.log('✅ Vérifiés (where explicite):', verified2);

    // Test 4: Vérifier les valeurs réelles
    const list = await knex('reports').select('id', 'status');
    console.log('\n📋 Liste complète des signalements:');
    list.forEach(r => {
      console.log(`  - ${r.id.substring(0, 8)}: status="${r.status}"`);
    });

    console.log(`\n✨ RÉSUMÉ: ${all.total} total, ${verified2.total} vérifiés`);
    process.exit(0);
  } catch (err) {
    console.error('❌ ERREUR:', err.message);
    process.exit(1);
  }
})();
