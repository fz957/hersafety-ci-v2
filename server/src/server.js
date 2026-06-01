require('dotenv').config();

// RATE LIMITER DISABLED FOR DEVELOPMENT - 2026-05-24
// Variables obligatoires au démarrage — l'app ne démarre pas sans elles
const REQUIRED_ENV = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'APP_MODE',
];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[FATAL] Variables d'environnement manquantes : ${missing.join(', ')}`);
  process.exit(1);
}

const app  = require('./app');
const knex = require('./db/knex');
const emailService = require('./services/email.service');
const wsService = require('./services/websocket.service');

const PORT = parseInt(process.env.PORT || '5000', 10);

async function start() {
  try {
    // Vérifie la connexion PostgreSQL avant d'ouvrir le port
    await knex.raw('SELECT 1');
    console.log('[DB] Connexion PostgreSQL établie');
    console.log('[CONFIG] APP_MODE=' + process.env.APP_MODE);

    // Créer la table email_verifications si elle n'existe pas
    const hasTable = await knex.schema.hasTable('email_verifications');
    if (!hasTable) {
      await knex.schema.createTable('email_verifications', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('email').notNullable().unique();
        table.string('token').notNullable().unique();
        table.string('full_name').nullable();
        table.string('phone').nullable();
        table.string('password_hash').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('expires_at').notNullable();
      });
      console.log('[DB] Table email_verifications créée');
    }

    // Initialiser le service email
    emailService.initializeTransporter();
    console.log('[EMAIL] Service email initialisé');

    // Initialiser le serveur HTTP et WebSocket
    const server = app.listen(PORT, () => {
      console.log(`[SERVER] HerSafety CI démarré sur le port ${PORT}`);
      console.log(`[SERVER] Mode : ${process.env.APP_MODE}`);
      if (process.env.APP_MODE === 'development') {
        console.log('[SERVER] ⚠  MODE TEST — SMS sandbox, appels simulés');
      }
    });

    // Initialiser WebSocket
    wsService.initWebSocket(server);
  } catch (err) {
    console.error('[FATAL] Impossible de démarrer le serveur');
    console.error('[FATAL] Message :', err.message);
    console.error('[FATAL] Stack   :', err.stack);
    // Détails supplémentaires pour les erreurs PostgreSQL (code, détail, contrainte)
    if (err.code)    console.error('[FATAL] PG code  :', err.code);
    if (err.detail)  console.error('[FATAL] PG détail:', err.detail);
    if (err.hint)    console.error('[FATAL] PG hint  :', err.hint);
    process.exit(1);
  }
}

// Arrêt propre (Docker / PM2 SIGTERM)
process.on('SIGTERM', async () => {
  console.log('[SERVER] SIGTERM reçu — arrêt en cours...');
  await knex.destroy();
  process.exit(0);
});

start();
