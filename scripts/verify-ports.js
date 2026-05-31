#!/usr/bin/env node

/**
 * Verify that PORT configuration is synchronized across:
 * 1. root/.env
 * 2. server/.env
 * 3. client/.env.development
 *
 * This prevents "connection refused" errors when starting the app.
 * Run: node scripts/verify-ports.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROOT_ENV = path.join(ROOT, '.env');
const SERVER_ENV = path.join(ROOT, 'server', '.env');
const CLIENT_ENV = path.join(ROOT, 'client', '.env.development');

function readPort(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/^PORT=(\d+)$/m);
    return match ? match[1] : null;
  } catch (err) {
    return null;
  }
}

function readAppUrl(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/^APP_URL=(.+)$/m);
    return match ? match[1] : null;
  } catch (err) {
    return null;
  }
}

function readApiUrl(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/^VITE_API_URL=(.+)$/m);
    return match ? match[1] : null;
  } catch (err) {
    return null;
  }
}

console.log('🔍 Vérification de la synchronisation des ports...\n');

const rootPort = readPort(ROOT_ENV);
const serverPort = readPort(SERVER_ENV);
const rootAppUrl = readAppUrl(ROOT_ENV);
const serverAppUrl = readAppUrl(SERVER_ENV);
const clientApiUrl = readApiUrl(CLIENT_ENV);

console.log('📋 Configuration trouvée:');
console.log(`   root/.env PORT:           ${rootPort || '❌ NOT FOUND'}`);
console.log(`   server/.env PORT:         ${serverPort || '❌ NOT FOUND'}`);
console.log(`   server/.env APP_URL:      ${serverAppUrl || '❌ NOT FOUND'}`);
console.log(`   client/.env.development:  ${clientApiUrl || '❌ NOT FOUND'}`);
console.log('');

let hasError = false;

// Check that all PORTs are defined
if (!rootPort || !serverPort) {
  console.error('❌ PORT est manquant dans root/.env ou server/.env');
  hasError = true;
}

// Check that PORTs match
if (rootPort && serverPort && rootPort !== serverPort) {
  console.error(`❌ PORT mismatch: root/.env=${rootPort} ≠ server/.env=${serverPort}`);
  console.error('   👉 Change server/.env PORT pour correspondre à root/.env\n');
  hasError = true;
}

// Check that APP_URL and VITE_API_URL match
if (rootAppUrl && serverAppUrl && rootAppUrl !== serverAppUrl) {
  console.error(`❌ APP_URL mismatch: root/.env=${rootAppUrl} ≠ server/.env=${serverAppUrl}`);
  hasError = true;
}

// Check that client API URL matches server port
if (serverPort && clientApiUrl) {
  const expectedUrl = `http://localhost:${serverPort}`;
  if (!clientApiUrl.includes(serverPort)) {
    console.error(`❌ Client API URL mismatch:`);
    console.error(`   Expected: http://localhost:${serverPort}`);
    console.error(`   Found:    ${clientApiUrl}`);
    console.error('   👉 Change client/.env.development VITE_API_URL\n');
    hasError = true;
  }
}

if (!hasError && rootPort && serverPort && clientApiUrl && clientApiUrl.includes(serverPort)) {
  console.log('✅ Tous les ports sont synchronisés!');
  console.log(`   Serveur: http://localhost:${serverPort}`);
  console.log(`   Client API: ${clientApiUrl}`);
  console.log('\n✓ Tu peux lancer les serveurs sans problème.\n');
  process.exit(0);
} else {
  console.error('\n⚠️  Corrige les configurations ci-dessus avant de démarrer les serveurs.');
  process.exit(1);
}
