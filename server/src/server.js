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

      // Vérifier la table users - si elle n'existe pas, créer les tables essentielles
      const usersTableExists = await knex.schema.hasTable('users');
      if (!usersTableExists) {
        console.warn('[DB] Tables manquantes! Création des tables essentielles...');

        try {
          // Créer l'ENUM user_role
          await knex.raw(`
            DO $$ BEGIN
              CREATE TYPE user_role AS ENUM ('user', 'admin', 'superadmin');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
          `);
          console.log('[DB] Type user_role créé');

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
          console.log('[DB] Table users créée ✓');

          // Créer la table login_attempts
          await knex.schema.createTable('login_attempts', (t) => {
            t.increments('id').primary();
            t.string('email').notNullable().index();
            t.string('ip_address').nullable();
            t.boolean('success').defaultTo(false);
            t.timestamp('attempted_at').defaultTo(knex.fn.now()).index();
          });
          console.log('[DB] Table login_attempts créée ✓');

          // Créer la table refresh_tokens
          await knex.schema.createTable('refresh_tokens', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            t.uuid('user_id').notNullable();
            t.text('token_hash').notNullable().unique();
            t.timestamp('expires_at', { useTz: true }).notNullable();
            t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
          });
          console.log('[DB] Table refresh_tokens créée ✓');

          console.log('[DB] ✓ Tables essentielles créées avec succès');
        } catch (createErr) {
          console.error('[DB] Erreur création tables:', createErr.message);
        }
      } else {
        console.log('[DB] Table users existe ✓');
      }

      // Lancer les autres migrations
      try {
        const migrations = await knex.migrate.latest();
        if (migrations[1].length > 0) {
          console.log(`[DB] ${migrations[1].length} migrations exécutées`);
          migrations[1].forEach(m => console.log(`  ✓ ${m}`));
        } else {
          console.log('[DB] Toutes les migrations sont à jour');
        }
      } catch (migErr) {
        console.warn('[DB] Migration error:', migErr.message);
      }

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
