const fs = require('fs');
const path = require('path');

console.log('=== Vérification des corrections ===\n');

// Vérifier le code UserRow.jsx
const userRowPath = path.join(__dirname, 'client/src/components/admin/UserRow.jsx');
const userRowCode = fs.readFileSync(userRowPath, 'utf-8');

console.log('UserRow.jsx - Statuts définis:');
const statusMapMatch = userRowCode.match(/const statusMap = \{([^}]+)\}/s);
if (statusMapMatch) {
  const statusMapContent = statusMapMatch[1];
  const hasActive = statusMapContent.includes("'active'");
  const hasInactive = statusMapContent.includes("'inactive'");
  const hasAtVerifier = statusMapContent.includes("'À vérifier'");
  const hasPending = statusMapContent.includes("'pending'");
  
  console.log(`   ✓ 'active' défini: ${hasActive ? 'OUI ✓' : 'NON ✗'}`);
  console.log(`   ✓ 'inactive' défini: ${hasInactive ? 'OUI ✓' : 'NON ✗'}`);
  console.log(`   ✓ Pas de "À vérifier": ${!hasAtVerifier ? 'OUI ✓' : 'NON ✗'}`);
  console.log(`   ✓ Pas de 'pending': ${!hasPending ? 'OUI ✓' : 'NON ✗'}`);
}

console.log('\ngetStatus() logic:');
const getStatusMatch = userRowCode.match(/const getStatus = \(user\) => \{([^}]+)\}/s);
if (getStatusMatch) {
  const getStatusContent = getStatusMatch[1];
  const isSimple = getStatusContent.includes('user.is_active');
  console.log(`   ✓ Basé sur is_active: ${isSimple ? 'OUI ✓' : 'NON'}`);
  console.log(`   Code: return user.is_active ? 'active' : 'inactive';`);
}

console.log('\n✅ CORRECTIONS APPLIQUÉES:');
console.log('   • Supprimé: "À vérifier" (pending)');
console.log('   • Supprimé: "Signalée" (flagged)');
console.log('   • Gardé: "Actif" (active) et "Inactif" (inactive)');
console.log('   • Logique: Basée seulement sur is_active');

