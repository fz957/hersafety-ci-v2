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
    await knex.raw('SELECT 1');
    console.log('[DB] Connexion établie');

    const usersTableExists = await knex.schema.hasTable('users');
    if (!usersTableExists) {
      console.warn('[DB] ⚠️  Table users manquante! Création des tables...');

      // Créer l'ENUM user_role
      await knex.raw(`
        DO $$ BEGIN
          CREATE TYPE user_role AS ENUM ('user', 'admin', 'superadmin');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
      `);

      // Créer la table users
      await knex.schema.createTable('users', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
        t.uuid('organization_id').nullable();
        t.text('email').notNullable().unique();
        t.text('password_hash').notNullable();
        t.text('phone').nullable();
        t.text('full_name').nullable();
        t.specificType('role', 'user_role').notNullable().defaultTo('user');
        t.boolean('is_active').notNullable().defaultTo(true);
        t.boolean('onboarding_done').notNullable().defaultTo(false);
        t.boolean('is_demo').notNullable().defaultTo(false);
        t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      });

      await knex.schema.createTable('login_attempts', (t) => {
        t.increments('id').primary();
        t.string('email').notNullable().index();
        t.string('ip_address').nullable();
        t.boolean('success').defaultTo(false);
        t.timestamp('attempted_at').defaultTo(knex.fn.now()).index();
      });

      await knex.schema.createTable('refresh_tokens', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
        t.uuid('user_id').notNullable();
        t.text('token_hash').notNullable().unique();
        t.timestamp('expires_at', { useTz: true }).notNullable();
        t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      });

      console.log('[DB] ✓ Tables créées avec succès');
    } else {
      console.log('[DB] ✓ Tables existantes confirmées');
    }

    // Créer email_verifications si elle n'existe pas
    const hasEmailVerifications = await knex.schema.hasTable('email_verifications');
    if (!hasEmailVerifications) {
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
      console.log('[DB] ✓ Table email_verifications créée');
    }

    // Lancer les migrations
    try {
      const migrations = await knex.migrate.latest();
      if (migrations[1].length > 0) {
        console.log(`[DB] ✓ ${migrations[1].length} migrations exécutées`);
      }
    } catch (migErr) {
      console.warn('[DB] Migration warning (non-critical):', migErr.message);
    }
  } catch (dbErr) {
    console.error('[DB] ❌ ERREUR CRITIQUE:', dbErr.message);
    console.error('[DB] Les tables n\'ont pas pu être créées!');
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
