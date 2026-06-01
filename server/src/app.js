const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes         = require('./routes/auth');
const usersRoutes        = require('./routes/users');
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
const emergencyHistoryRoutes = require('./routes/emergency-history');
const contentRoutes      = require('./routes/content');
const articlesRoutes     = require('./routes/articles');
const photosRoutes       = require('./routes/photos');
const videosRoutes       = require('./routes/videos');
const commentsRoutes     = require('./routes/comments');
const adminAssistantRoutes = require('./routes/admin-assistant');

const { apiLimiter } = require('./middlewares/rateLimit');

const app = express();

// Servir les images statiques
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// Servir les fichiers statiques AVANT Helmet (pour éviter les bloques CORS)
app.use('/uploads', express.static(path.join(__dirname, '../../uploads'), {
  // Cache les fichiers audio pendant 7 jours
  maxAge: 7 * 24 * 60 * 60 * 1000,
  // Permettre le CORS pour les fichiers statiques
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Sécurité HTTP headers
app.use(helmet({
  // Permettre les fichiers statiques
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS — uniquement le frontend autorisé, avec cookies
// Accept dev (localhost:5173) and production (Vercel) origins
const allowedOrigins = [
  'http://localhost:5173',           // Dev local
  'https://hersafety-ci-v2-kkol.vercel.app', // Vercel production
  process.env.FRONTEND_URL,           // Custom frontend URL if set
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests without origin (like mobile apps or curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parsers - augmentée pour les fichiers audio en base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(cookieParser());

// Rate limiting global sur /api
app.use('/api', apiLimiter);

// Test route to verify code is loaded
app.get('/api/test', (req, res) => res.json({ test: 'OK', timestamp: new Date().toISOString(), rateLimit: 'DISABLED' }));

// Routes
app.use('/api/auth',          authRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/alerts',        alertsRoutes);
app.use('/api/contacts',      contactsRoutes);
app.use('/api/tracks',        tracksRoutes);
app.use('/api/places',        placesRoutes);
app.use('/api/sms',           smsRoutes);
app.use('/api/claude',        claudeRoutes);
app.use('/api/testimonies',   testimoniesRoutes);
app.use('/api/articles',      articlesRoutes);
app.use('/api/photos',        photosRoutes);
app.use('/api/videos',        videosRoutes);
app.use('/api/comments',      commentsRoutes);
app.use('/api/reports',       reportsRoutes);
app.use('/api/admin',             adminRoutes);
app.use('/api/admin-assist',  adminAssistantRoutes);
app.use('/api/emergency-numbers', emergencyNumbersRoutes);
app.use('/api/locations',     locationsRoutes);
app.use('/api/fcm',           fcmRoutes);
app.use('/api/emergency-history', emergencyHistoryRoutes);
app.use('/api', contentRoutes);

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
