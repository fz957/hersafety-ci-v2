const rateLimit = require('express-rate-limit');

// ===== RATE LIMITING ENABLED FOR PRODUCTION =====
// apiLimiter: Standard rate limiter for API endpoints
// Allows 30 requests per minute per IP in production
// Skipped in development to allow rapid testing/polling
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,           // 1 minute
  max: 30,                             // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de requêtes, réessayez dans une minute' },
  skip: (req) => process.env.APP_MODE === 'development',  // Skip rate limiting in dev
});

// authLimiter: Strict rate limiter for authentication attempts only
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,        // 15 minutes
  max: 5,                            // 5 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de tentatives, réessayez dans 15 minutes' },
  skip: (req) => process.env.APP_MODE !== 'production',  // Only apply in production
});

module.exports = { apiLimiter, authLimiter };
