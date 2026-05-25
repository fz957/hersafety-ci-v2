const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes         = require('./routes/auth');
const usersRoutes        = require('./routes/users');
const organizationsRoutes = require('./routes/organizations');
const alertsRoutes       = require('./routes/alerts');
const contactsRoutes     = require('./routes/contacts');
const tracksRoutes       = require('./routes/tracks');
const placesRoutes       = require('./routes/places');
const smsRoutes          = require('./routes/sms');
const claudeRoutes       = require('./routes/claude');
const testimoniesRoutes  = require('./routes/testimonies');
const reportsRoutes      = require('./routes/reports');
const adminRoutes            = require('./routes/admin');
const emergencyNumbersRoutes = require('./routes/emergency-numbers');
const locationsRoutes    = require('./routes/locations');
const fcmRoutes          = require('./routes/fcm');

const { apiLimiter } = require('./middlewares/rateLimit');

const app = express();

// Sécurité HTTP headers
app.use(helmet());

// CORS — uniquement le frontend autorisé, avec cookies
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Rate limiting global sur /api
app.use('/api', apiLimiter);

// Test route to verify code is loaded
app.get('/api/test', (req, res) => res.json({ test: 'OK', timestamp: new Date().toISOString(), rateLimit: 'DISABLED' }));

// Routes
app.use('/api/auth',          authRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/alerts',        alertsRoutes);
app.use('/api/contacts',      contactsRoutes);
app.use('/api/tracks',        tracksRoutes);
app.use('/api/places',        placesRoutes);
app.use('/api/sms',           smsRoutes);
app.use('/api/claude',        claudeRoutes);
app.use('/api/testimonies',   testimoniesRoutes);
app.use('/api/reports',       reportsRoutes);
app.use('/api/admin',             adminRoutes);
app.use('/api/emergency-numbers', emergencyNumbersRoutes);
app.use('/api/locations',     locationsRoutes);
app.use('/api/fcm',           fcmRoutes);

// Santé de l'API
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', mode: process.env.APP_MODE } });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route introuvable' });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Erreur interne du serveur'
    : err.message;

  res.status(status).json({ success: false, error: message });
});

module.exports = app;
console.log("[RESTART] Force reload via app.js modification")
