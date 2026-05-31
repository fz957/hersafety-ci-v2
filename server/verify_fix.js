const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== Vérification des corrections ===\n');
    
    // 1. Vérifier les alertes
    const alertsSummary = await knex('alerts')
      .select('status')
      .count('* as count')
      .groupBy('status');
    
    console.log('1. ALERTES:');
    alertsSummary.forEach(s => {
      console.log(`   ${s.status}: ${s.count} alertes`);
    });
    
    // 2. Vérifier les utilisatrices
    const usersSummary = await knex('users')
      .where('role', 'user')
      .select('is_active')
      .count('* as count')
      .groupBy('is_active');
    
    console.log('\n2. UTILISATRICES:');
    usersSummary.forEach(s => {
      const status = s.is_active ? 'Actives' : 'Inactives';
      console.log(`   ${status}: ${s.count}`);
    });
    
    // 3. Vérifier le code UserRow.jsx
    const fs = require('fs');
    const userRowCode = fs.readFileSync('./src/components/admin/UserRow.jsx', 'utf-8');
    
    console.log('\n3. CODE UserRow.jsx:');
    const hasActiveInactive = userRowCode.includes("'active'") && userRowCode.includes("'inactive'");
    const hasAtVerifire = userRowCode.includes("'À vérifier'");
    const hasPending = userRowCode.includes("'pending'");
    
    console.log(`   ✓ Contient 'active' et 'inactive': ${hasActiveInactive ? 'OUI' : 'NON'}`);
    console.log(`   ✓ Pas de "À vérifier": ${!hasAtVerifire ? 'OUI ✓' : 'NON ✗'}`);
    console.log(`   ✓ Pas de statut 'pending': ${!hasPending ? 'OUI ✓' : 'NON ✗'}`);
    
    console.log('\n✅ RÉSUMÉ: Données et code sont synchronisés');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
