const rateLimit = require('express-rate-limit');

// ===== RATE LIMITING COMPLETELY DISABLED FOR DEVELOPMENT =====
// The check-in system requires rapid polling and frequent responses
// Rate limiting is incompatible with this design pattern
// This will be re-enabled only in true production with proper tuning

// apiLimiter: No-op middleware that does nothing (passes all requests through)
const apiLimiter = (req, res, next) => next();

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
