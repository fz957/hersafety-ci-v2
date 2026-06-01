require('dotenv').config();

// RATE LIMITER DISABLED FOR DEVELOPMENT - 2026-05-24
// Variables obligatoires au démarrage
// DATABASE_URL peut être vide au démarrage (sera configurée plus tard)
// Mais JWT secrets sont obligatoires
const REQUIRED_ENV = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'APP_MODE',
];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[FATAL] Variables d'environnement manquantes : ${missing.join(', ')}`);
  process.exit(1);
}

// DATABASE_URL est optionnel au démarrage (peut être configurée par Railway)
if (!process.env.DATABASE_URL) {
  console.warn('[WARN] DATABASE_URL non configurée - la base de données ne sera pas accessible');
  console.warn('[WARN] Configurer DATABASE_URL dans Railway pour activer la DB');
  process.env.DATABASE_URL = 'postgresql://localhost/hersafety'; // Fallback dummy
}

const app  = require('./app');
const knex = require('./db/knex');
const emailService = require('./services/email.service');
const wsService = require('./services/websocket.service');

const PORT = parseInt(process.env.PORT || '5000', 10);

async function start() {
  console.log('[CONFIG] APP_MODE=' + process.env.APP_MODE);

  // Initialiser le service email
  emailService.initializeTransporter();
  console.log('[EMAIL] Service email initialisé');

  // Initialiser et démarrer le serveur HTTP et WebSocket IMMÉDIATEMENT
  // Cela permet au healthcheck de réussir même si la DB n'est pas prête
  const server = app.listen(PORT, () => {
    console.log(`[SERVER] HerSafety CI démarré sur le port ${PORT}`);
    console.log(`[SERVER] Mode : ${process.env.APP_MODE}`);
    if (process.env.APP_MODE === 'development') {
      console.log('[SERVER] ⚠  MODE TEST — SMS sandbox, appels simulés');
    }
  });

  // Initialiser WebSocket
  wsService.initWebSocket(server);

  // Essayer de se connecter à la DB en arrière-plan (non-bloquant)
  // Cela ne doit pas empêcher le serveur d'écouter sur le port
  setImmediate(async () => {
    try {
      await knex.raw('SELECT 1');
      console.log('[DB] Connexion PostgreSQL établie');

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
    } catch (dbErr) {
      console.warn('[DB] Impossible de se connecter à la base de données');
      console.warn('[DB] Message:', dbErr.message);
      console.warn('[DB] Tentative de reconnexion dans 5 secondes...');

      // Retry après 5 secondes
      setTimeout(async () => {
        try {
          await knex.raw('SELECT 1');
          console.log('[DB] Connexion PostgreSQL rétablie');
        } catch (retryErr) {
          console.error('[DB] Reconnexion échouée:', retryErr.message);
        }
      }, 5000);
    }
  });
}

// Arrêt propre (Docker / PM2 SIGTERM)
process.on('SIGTERM', async () => {
  console.log('[SERVER] SIGTERM reçu — arrêt en cours...');
  await knex.destroy();
  process.exit(0);
});

start();
