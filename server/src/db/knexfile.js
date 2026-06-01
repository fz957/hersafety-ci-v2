require('dotenv').config();

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
  // Regex: postgresql://[user]:[password]@[host]:[port]/[database][?params]
  const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+)(?::(\d+))?\/([^?]+)(?:\?.*)?/);
  if (!match) {
    throw new Error(`Invalid DATABASE_URL format: ${dbUrl}`);
  }

  return {
    host: match[3],
    port: match[4] ? parseInt(match[4]) : 5432,
    user: match[1],
    password: match[2],
    database: match[5], // Ignores ?sslmode=require and other params
  };
}

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hersafety',
    migrations: {
      directory: __dirname + '/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: __dirname + '/seeds',
    },
  },
  test: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: __dirname + '/migrations',
      tableName: 'knex_migrations',
    },
  },
  production: {
    client: 'pg',
    connection: {
      ...parseDbUrl(process.env.DATABASE_URL),
      ssl: {
        rejectUnauthorized: false, // Accept self-signed certificates (Render)
      },
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: __dirname + '/migrations',
      tableName: 'knex_migrations',
    },
  },
};
