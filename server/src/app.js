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

// Trust proxy — Railway uses a reverse proxy with X-Forwarded-For headers
app.set('trust proxy', 1);

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
// Accept dev (localhost) et déploiement Netlify/Vercel spécifique
const allowedOrigins = [
  'http://localhost:5173',           // Dev local frontend
  'http://localhost:3000',           // Dev local (alt port)
  'https://hersafety-ci.netlify.app', // Production Netlify
  'https://hersafety-ci-v2.vercel.app', // Production Vercel (old)
  'https://hersafety-ci-v2-ld5jtlk85-fz957s-projects.vercel.app', // Production Vercel (current)
  process.env.FRONTEND_URL,           // Custom frontend URL if set
].filter(Boolean);

console.log('[CORS] Allowed origins:', allowedOrigins);

// CORS - ALLOW ALL for debugging (remove restrictions temporarily)
app.use(cors({
  origin: true, // Accept ALL origins temporarily
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

console.log('[CORS] ⚠️ CORS UNRESTRICTED - ACCEPT ALL ORIGINS (DEBUG MODE)');

// Parsers - augmentée pour les fichiers audio en base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(cookieParser());

// Rate limiting global sur /api
app.use('/api', apiLimiter);

// Test route to verify code is loaded
app.get('/api/test', (req, res) => res.json({ test: 'OK', timestamp: new Date().toISOString(), rateLimit: 'DISABLED' }));

// Health check endpoint (required for Docker health checks)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug route to check database
app.get('/api/debug/db', async (req, res) => {
  try {
    const knex = require('./db/knex');

    console.log('[DEBUG] DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');

    // Test connection first
    await knex.raw('SELECT 1');
    console.log('[DEBUG] Database connection OK');

    const tables = await knex.raw(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);

    console.log('[DEBUG] Tables found:', tables.rows?.map(r => r.table_name));

    let userCount = 0;
    let users = [];

    const usersTableExists = tables.rows?.some(r => r.table_name === 'users');
    if (usersTableExists) {
      const result = await knex('users').count('id as total').first();
      userCount = result?.total || 0;
      users = await knex('users').select('id', 'email', 'full_name').limit(20);
    }

    res.json({
      status: 'ok',
      database_url_set: !!process.env.DATABASE_URL,
      userCount: userCount,
      users: users,
      tables: tables.rows?.map(r => r.table_name) || [],
    });
  } catch (err) {
    console.error('[DEBUG] Error:', err.message);
    res.status(500).json({
      status: 'error',
      database_url_set: !!process.env.DATABASE_URL,
      error: err.message,
    });
  }
});

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

