/**
 * Génère des alertes réalistes et passées pour l'historique des utilisatrices
 * Exécuter: node src/scripts/generate-realistic-alerts.js
 */
const knex = require('../db/knex');
const { v4: uuidv4 } = require('uuid');

async function generateAlerts() {
  try {
    console.log('👥 Récupération des utilisatrices...');
    const users = await knex('users').where({ role: 'user' }).limit(10);
    if (users.length === 0) {
      console.error('❌ Pas d\'utilisatrices trouvées');
      process.exit(1);
    }

    console.log(`✓ ${users.length} utilisatrices trouvées\n`);

    // Générer 3-5 alertes par utilisatrice
    const alerts = [];
    const now = new Date();

    for (const user of users) {
      const alertCount = Math.floor(Math.random() * 3) + 2; // 2-4 alertes par user

      for (let i = 0; i < alertCount; i++) {
        const daysAgo = Math.floor(Math.random() * 30) + 1; // 1-30 jours passés
        const hoursAgo = Math.floor(Math.random() * 24);
        const createdAt = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000));

        const level = [1, 2, 3, 4][Math.floor(Math.random() * 4)];
        const status = Math.random() > 0.2 ? 'resolved' : 'active'; // 80% résolues, 20% actives

        alerts.push({
          id: uuidv4(),
          user_id: user.id,
          organization_id: user.organization_id,
          level,
          status,
          location_lat: 5.3364 + (Math.random() - 0.5) * 0.1,
          location_lng: -4.0377 + (Math.random() - 0.5) * 0.1,
          location_label: ['Cocody', 'Yopougon', 'Marcory', 'Treichville'][Math.floor(Math.random() * 4)],
          created_at: createdAt,
        });
      }
    }

    console.log(`📝 Insertion de ${alerts.length} alertes réalistes...`);
    await knex('alerts').insert(alerts);

    // Afficher les stats
    const byStatus = await knex('alerts').select('status').count('id as count').groupBy('status');
    console.log('\n✅ Alertes générées par status:');
    console.log(JSON.stringify(byStatus, null, 2));

    // Montrer un exemple
    const example = await knex('alerts')
      .leftJoin('users', 'alerts.user_id', 'users.id')
      .select('alerts.level', 'alerts.status', 'users.full_name', 'alerts.created_at')
      .limit(5);

    console.log('\n📌 Exemple d\'alertes:');
    console.log(JSON.stringify(example, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

generateAlerts();
