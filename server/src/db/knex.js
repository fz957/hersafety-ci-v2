require('dotenv').config();
const knexLib = require('knex');

// Helper to parse DATABASE_URL for Knex
function parseDbUrl(dbUrl) {
  if (!dbUrl) {
    return {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'hersafety',
    };
  }

  // Parse postgresql://user:password@host:port/database?params
  const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+)(?::(\d+))?\/([^?]+)(?:\?.*)?/);
  if (!match) {
    console.error('Invalid DATABASE_URL format:', dbUrl.substring(0, 50) + '...');
    return {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'hersafety',
    };
  }

  return {
    host: match[3],
    port: match[4] ? parseInt(match[4]) : 5432,
    user: match[1],
    password: match[2],
    database: match[5],
  };
}

// Build connection config with SSL support for production
const dbUrl = process.env.DATABASE_URL || '';
const connectionConfig = {
  ...parseDbUrl(dbUrl),
};

// Add SSL for production (Render, Heroku, etc.)
if (process.env.NODE_ENV === 'production') {
  connectionConfig.ssl = {
    rejectUnauthorized: false, // Accept self-signed certificates
  };
}

const config = {
  client: 'pg',
  connection: connectionConfig,
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 600000,
  },
  migrations: {
    directory: __dirname + '/migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: __dirname + '/seeds',
  },
};

const knex = knexLib(config);

module.exports = knex;
