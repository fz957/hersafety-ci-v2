/**
 * Crée une alerte ACTIVE pour tester l'endpoint
 */
const knex = require('../db/knex');
const { v4: uuidv4 } = require('uuid');

async function createActiveAlert() {
  try {
    // Récupérer un user réel
    const user = await knex('users').where({ role: 'user' }).first();
    if (!user) {
      console.error('❌ Pas d\'utilisateur user trouvé');
      process.exit(1);
    }

    console.log(`✓ Utilisateur trouvé: ${user.full_name} (${user.id})`);

    // Insérer une alerte ACTIVE
    const alertId = uuidv4();
    await knex('alerts').insert({
      id: alertId,
      user_id: user.id,
      organization_id: user.organization_id,
      level: 3,
      status: 'active',
      location_lat: 5.3364,
      location_lng: -4.0377,
      location_label: 'Test Location',
      created_at: new Date(),
    });

    console.log(`✅ Alerte ACTIVE créée: ${alertId}`);
    console.log(`   Utilisateur: ${user.full_name}`);
    console.log(`   Status: active`);
    console.log(`   Level: 3\n`);

    // Vérifier que le LEFT JOIN retourne le nom
    const alert = await knex('alerts')
      .leftJoin('users', 'alerts.user_id', 'users.id')
      .where('alerts.id', alertId)
      .select('alerts.id', 'users.full_name', 'alerts.status')
      .first();

    console.log('🔍 Vérification LEFT JOIN:');
    console.log(JSON.stringify(alert, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

createActiveAlert();
