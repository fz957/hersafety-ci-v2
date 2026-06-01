require('dotenv').config();
const knexLib = require('knex');

// Add SSL mode to DATABASE_URL if in production
const dbUrl = process.env.DATABASE_URL || '';
const connectionString = process.env.NODE_ENV === 'production' && !dbUrl.includes('sslmode')
  ? `${dbUrl}?sslmode=require`
  : dbUrl;

const config = {
  client: 'pg',
  connection: connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
