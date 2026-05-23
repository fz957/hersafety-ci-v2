const rateLimit = require('express-rate-limit');

// Limiteur général : 10 requêtes / minute / IP sur toutes les routes /api
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de requêtes, réessayez dans une minute' },
  skip: (req) => process.env.NODE_ENV === 'test',
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
