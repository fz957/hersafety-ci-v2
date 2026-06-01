require('dotenv').config();

// Helper to parse DATABASE_URL and add SSL config for production
function getConnectionConfig(dbUrl, env) {
  if (!dbUrl) {
    return 'postgresql://postgres:postgres@localhost:5432/hersafety';
  }

  // For production (Render, Heroku, etc.), SSL is required but may be self-signed
  if (env === 'production') {
    return {
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false, // Accept self-signed certificates (Render databases)
      },
    };
  }

  // For development and test, use simple connection string
  return dbUrl;
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
    connection: getConnectionConfig(process.env.DATABASE_URL, 'production'),
    pool: { min: 2, max: 10 },
    migrations: {
      directory: __dirname + '/migrations',
      tableName: 'knex_migrations',
    },
  },
};
