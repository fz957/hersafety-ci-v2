const rateLimit = require('express-rate-limit');

// Limiteur général : 100 requêtes / minute en dev, 10 en prod
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 200 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de requêtes, réessayez dans une minute' },
  skip: (req) => process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development',
});

// Limiteur strict pour les routes d'authentification : 5 tentatives / 15 min / IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de tentatives, réessayez dans 15 minutes' },
  skip: (req) => process.env.NODE_ENV === 'test',
});

module.exports = { apiLimiter, authLimiter };
