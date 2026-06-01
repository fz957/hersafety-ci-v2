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
const firebaseService = require('./services/firebase.service');
const wsService = require('./services/websocket.service');

const PORT = parseInt(process.env.PORT || '5000', 10);

async function start() {
  console.log('[CONFIG] APP_MODE=' + process.env.APP_MODE);

  // Initialiser les services
  emailService.initializeTransporter();
  console.log('[EMAIL] Service email initialisé');

  // Initialiser Firebase Admin SDK (DISABLED - causes 502 on Render)
  // TODO: Debug Firebase initialization without blocking server startup
  // try {
  //   firebaseService.initializeFirebase();
  //   console.log('[Firebase] Admin SDK initialisé');
  // } catch (err) {
  //   console.warn('[Firebase] Initialization error (notifications may not work):', err.message);
  // }

  // ===== DATABASE INITIALIZATION (BLOCKING) =====
  console.log('[DB] Vérification de la base de données...');
  try {
    // Test connection
    await knex.raw('SELECT 1');
    console.log('[DB] ✓ Connexion établie');

    // Run migrations only - they handle all table creation
    // IMPORTANT: Migrations must run in correct order
    try {
      const migrations = await knex.migrate.latest();
      if (migrations[1] && migrations[1].length > 0) {
        console.log(`[DB] ✓ ${migrations[1].length} migrations exécutées`);
      } else {
        console.log('[DB] ✓ Migrations à jour (aucune nouvelle à exécuter)');
      }
    } catch (migErr) {
      console.error('[DB] ❌ Migration error:', migErr.message);
      throw migErr;
    }
  } catch (dbErr) {
    console.error('[DB] ❌ ERREUR CRITIQUE:', dbErr.message);
    process.exit(1);
  }
  // ===== END DATABASE INITIALIZATION =====

  // Initialiser et démarrer le serveur HTTP et WebSocket
  const server = app.listen(PORT, () => {
    console.log(`[SERVER] HerSafety CI démarré sur le port ${PORT}`);
    console.log(`[SERVER] Mode : ${process.env.APP_MODE}`);
    if (process.env.APP_MODE === 'development') {
      console.log('[SERVER] ⚠  MODE TEST — SMS sandbox, appels simulés');
    }
  });

  // Initialiser WebSocket
  wsService.initWebSocket(server);

}

// Arrêt propre (Docker / PM2 SIGTERM)
process.on('SIGTERM', async () => {
  console.log('[SERVER] SIGTERM reçu — arrêt en cours...');
  await knex.destroy();
  process.exit(0);
});

start();
