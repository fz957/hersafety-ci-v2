const express = require('express');
const Joi     = require('joi');

const knex              = require('../db/knex');
const { requireAuth }   = require('../middlewares/auth');
const { requireTenant } = require('../middlewares/tenant');
const { requireAdmin }  = require('../middlewares/admin');
const wsService         = require('../services/websocket.service');

const router = express.Router();
// Admin routes: superadmin only, no tenant filtering (global access)
router.use(requireAuth);
router.use((req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: 'Accès réservé au super administrateur' });
  }
  next();
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    // Get alerts from last 24 hours (not just today)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [alertsToday, activeUsers, verifiedReports, pendingTestimonies] = await Promise.all([
      knex('alerts')
        .whereRaw('created_at >= ?', [last24h])
        .count('id as total').first(),

      knex('users')
        .where({ is_active: true })
        .count('id as total').first(),

      knex('reports')
        .where('status', '=', 'verified')
        .count('*', { as: 'total' }).first(),

      knex('testimonies')
        .where({ status: 'pending' })
        .count('id as total').first(),
    ]);

    // DEBUG: Log query results
    console.log('[ADMIN STATS DEBUG]', {
      alerts: alertsToday,
      users: activeUsers,
      verified: verifiedReports,
      pending: pendingTestimonies,
    });

    return res.json({
      success: true,
      data: {
        alerts_today:         parseInt(alertsToday.total, 10),
        active_users:         parseInt(activeUsers.total, 10),
        verified_reports:     parseInt(verifiedReports.total, 10),
        pending_testimonies:  parseInt(pendingTestimonies.total, 10),
      },
    });
  } catch (err) {
    console.error('[ADMIN STATS ERROR]', err.message);
    return res.status(500).json({ success: false, error: 'Erreur récupération statistiques' });
  }
});

// ─── GET /api/admin/alerts/recent ───────────────────────────────────────────
// Retourne les urgences ACTIVES de emergency_history (status='active' uniquement)
// GET /api/admin/alerts/recent - ALL alerts from last 24h (for dashboard overview)
router.get('/alerts/recent', async (req, res) => {
  try {
    // Get ALL alerts from last 24 hours (regardless of status)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const alerts = await knex('alerts')
      .leftJoin('users', 'alerts.user_id', 'users.id')
      .whereRaw('alerts.created_at >= ?', [last24h])
      .where(function() {
        this.where('alerts.level', '2')
            .orWhere('alerts.level', '3')
            .orWhere('alerts.level', '4');
      })
      .select(
        'alerts.id',
        'alerts.user_id',
        'users.full_name',
        'users.email',
        'alerts.level',
        'alerts.location_lat',
        'alerts.location_lng',
        'alerts.location_label',
        'alerts.status',
        'alerts.created_at'
      )
      .orderBy('alerts.created_at', 'desc')
      .limit(50);

    return res.json({ success: true, data: alerts });
  } catch (err) {
    console.error('[ADMIN ALERTS RECENT ERROR]', err.message);
    return res.status(500).json({ success: false, error: 'Erreur récupération alertes récentes' });
  }
});

// GET /api/admin/alerts/active - Only ACTIVE alerts (currently in progress)
router.get('/alerts/active', async (req, res) => {
  try {
    const alerts = await knex('alerts')
      .leftJoin('users', 'alerts.user_id', 'users.id')
      .where('alerts.status', 'active')
      .whereIn('alerts.level', ['2', '3', '4'])
      .select(
        'alerts.id',
        'alerts.user_id',
        'users.full_name',
        'users.email',
        'alerts.level',
        'alerts.location_lat',
        'alerts.location_lng',
        'alerts.location_label',
        'alerts.status',
        'alerts.created_at'
      )
      .orderBy('alerts.created_at', 'desc')
      .limit(50);

    console.log('[ADMIN ALERTS ACTIVE] Found', alerts.length, 'active alerts');
    return res.json({ success: true, data: alerts });
  } catch (err) {
    console.error('[ADMIN ALERTS ACTIVE ERROR]', err.message);
    return res.status(500).json({ success: false, error: 'Erreur récupération alertes actives' });
  }
});

// ─── GET /api/admin/alerts/history ──────────────────────────────────────────
// Retourne TOUTES les urgences de emergency_history (vraie source de données)
router.get('/alerts/history', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit || '50', 10));

  try {
    const alerts = await knex('emergency_history')
      .leftJoin('users', 'emergency_history.user_id', 'users.id')
      .select(
        'emergency_history.id',
        'emergency_history.user_id',
        'users.full_name',
        'users.email',
        'emergency_history.level',
        'emergency_history.latitude as location_lat',
        'emergency_history.longitude as location_lng',
        'emergency_history.location_name as location_label',
        'emergency_history.status',
        'emergency_history.created_at'
      )
      .orderBy('emergency_history.created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    const total = await knex('emergency_history').count('emergency_history.id as count').first();

    return res.json({
      success: true,
      data: alerts,
      pagination: { page, limit, total: total.count }
    });
  } catch (err) {
    console.error('[ADMIN ALERTS HISTORY ERROR]', err.message);
    return res.status(500).json({ success: false, error: 'Erreur récupération historique alertes' });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit || '50', 10));

  try {
    const users = await knex('users')
      .select('id', 'email', 'full_name', 'phone', 'role', 'is_active', 'onboarding_done', 'created_at')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return res.json({ success: true, data: users });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur récupération utilisateurs' });
  }
});

// ─── GET /api/admin/users/list (with search) ────────────────────────────────
router.get('/users/list', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit || '100', 10));
  const search = req.query.search?.trim() || '';

  try {
    let query = knex('users');

    if (search) {
      query = query.where((qb) => {
        qb.where('email', 'ilike', `%${search}%`)
          .orWhere('full_name', 'ilike', `%${search}%`)
          .orWhere('phone', 'ilike', `%${search}%`);
      });
    }

    const users = await query
      .select('id', 'email', 'full_name', 'phone', 'role', 'is_active', 'onboarding_done', 'created_at')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    const countQuery = knex('users');
    if (search) {
      countQuery.where((qb) => {
        qb.where('email', 'ilike', `%${search}%`)
          .orWhere('full_name', 'ilike', `%${search}%`)
          .orWhere('phone', 'ilike', `%${search}%`);
      });
    }
    const total = await countQuery.count('id as count').first();

    // Count alerts per user for AdminUsers display
    const userIds = users.map(u => u.id);
    let alertCounts = {};
    if (userIds.length > 0) {
      const counts = await knex('alerts')
        .whereIn('user_id', userIds)
        .select('user_id')
        .count('id as count')
        .groupBy('user_id');
      counts.forEach(c => {
        alertCounts[c.user_id] = c.count;
      });
    }

    const usersWithAlertCount = users.map(u => ({
      ...u,
      alert_count: alertCounts[u.id] || 0
    }));

    return res.json({
      success: true,
      data: usersWithAlertCount,
      pagination: { page, limit, total: total.count }
    });
  } catch (err) {
    console.error('Admin users/list error:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération utilisateurs' });
  }
});

// ─── PATCH /api/admin/users/:id/status ───────────────────────────────────────

router.patch('/users/:id/status', async (req, res) => {
  const { error, value } = Joi.object({
    is_active: Joi.boolean().required(),
  }).validate(req.body);

  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const [user] = await knex('users')
      .where({ id: req.params.id})
      .update({ is_active: value.is_active, updated_at: new Date() })
      .returning(['id', 'email', 'full_name', 'role', 'is_active']);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
    }

    return res.json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur mise à jour statut' });
  }
});

// ─── GET /api/admin/moderation (ALL testimonies with status filter) ────────

router.get('/moderation', async (req, res) => {
  try {
    const testimonies = await knex('testimonies')
      .leftJoin('users', 'testimonies.user_id', 'users.id')
      .select(
        'testimonies.id',
        'testimonies.user_id',
        'testimonies.display_name',
        'testimonies.is_anonymous',
        'users.email',
        'users.full_name as user_name',
        'testimonies.title',
        'testimonies.content',
        'testimonies.category',
        'testimonies.status',
        'testimonies.created_at',
        'testimonies.trigger_warning_level'
      )
      .orderBy('testimonies.created_at', 'desc')
      .limit(100);

    // Count comments for each testimony
    const withComments = await Promise.all(testimonies.map(async (t) => {
      const comments = await knex('comments')
        .where({ content_type: 'testimony', content_id: t.id })
        .count('id as count').first();
      return { ...t, comment_count: comments?.count || 0 };
    }));

    return res.json({ success: true, data: { testimonies: withComments } });
  } catch (err) {
    console.error('[ADMIN MODERATION ERROR]', err.message);
    return res.status(500).json({ success: false, error: 'Erreur récupération modération' });
  }
});

// ─── GET /api/admin/testimonies/pending ──────────────────────────────────────

router.get('/testimonies/pending', async (req, res) => {
  try {
    const testimonies = await knex('testimonies')
      .leftJoin('users', 'testimonies.user_id', 'users.id')
      .where({ 'testimonies.status': 'pending' })
      .select(
        'testimonies.id',
        'testimonies.user_id',
        'testimonies.is_anonymous',
        'testimonies.display_name',
        'testimonies.category',
        'testimonies.title',
        'testimonies.content',
        'testimonies.location_label',
        'testimonies.created_at',
        'users.full_name as user_name'
      )
      .orderBy('testimonies.created_at', 'asc')
      .limit(50);

    return res.json({ success: true, data: testimonies });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur récupération témoignages' });
  }
});

// ─── PATCH /api/admin/testimonies/:id/status ─────────────────────────────────

router.patch('/testimonies/:id/status', async (req, res) => {
  const { status, reason } = req.body;
  try {
    const [testimony] = await knex('testimonies')
      .where({ id: req.params.id })
      .update({ status, updated_at: new Date() })
      .returning(['id', 'user_id', 'display_name', 'title', 'status']);

    if (!testimony) return res.status(404).json({ success: false, error: 'Témoignage introuvable' });

    // TODO: Send notification to user with reason
    return res.json({ success: true, data: testimony });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur mise à jour statut' });
  }
});

// ─── DELETE /api/admin/testimonies/:id ────────────────────────────────────────

router.delete('/testimonies/:id', async (req, res) => {
  const { reason } = req.body;
  try {
    const testimony = await knex('testimonies').where({ id: req.params.id }).first();
    if (!testimony) return res.status(404).json({ success: false, error: 'Introuvable' });

    await knex('testimonies').where({ id: req.params.id }).delete();

    // TODO: Send notification to user with deletion reason
    return res.json({ success: true, message: 'Témoignage supprimé' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur suppression' });
  }
});

// ─── DELETE /api/admin/comments/:id ───────────────────────────────────────────
// Supprime un commentaire de la table content_comments

router.delete('/comments/:id', async (req, res) => {
  const { reason } = req.body;
  try {
    // Chercher dans la table content_comments (nouvelle table)
    const comment = await knex('content_comments').where({ id: req.params.id }).first();
    if (!comment) return res.status(404).json({ success: false, error: 'Commentaire introuvable' });

    // Supprimer le commentaire
    await knex('content_comments').where({ id: req.params.id }).delete();

    // Notifier tous les clients via WebSocket
    wsService.notifyCommentDeleted(comment.content_type, comment.content_id, req.params.id);

    console.log(`[Admin] Commentaire supprimé: ${req.params.id}`);
    return res.json({ success: true, message: 'Commentaire supprimé' });
  } catch (err) {
    console.error('[Admin] Error deleting comment:', err);
    return res.status(500).json({ success: false, error: 'Erreur suppression commentaire' });
  }
});

// ─── GET /api/admin/reports/pending ──────────────────────────────────────────

router.get('/reports/pending', async (req, res) => {
  try {
    const reports = await knex('reports')
      .where({ status: 'pending' })
      .select(
        'id', 'user_id', 'is_anonymous', 'report_type', 'danger_type',
        'place_name', 'place_address', 'place_lat', 'place_lng',
        'vehicle_plate', 'vtc_app', 'description', 'incident_date', 'created_at'
      )
      .orderBy('created_at', 'asc')
      .limit(50);

    return res.json({ success: true, data: reports });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur récupération signalements' });
  }
});

// ─── GET /api/admin/reports (with optional status filter) ──────────────────

router.get('/reports', async (req, res) => {
  const status = req.query.status || 'verified';
  try {
    const reports = await knex('reports')
      .where({ status })
      .select(
        'id', 'user_id', 'is_anonymous', 'report_type', 'danger_type',
        'place_name', 'place_address', 'place_lat', 'place_lng',
        'vehicle_plate', 'vtc_app', 'description', 'incident_date', 'created_at'
      )
      .orderBy('created_at', 'desc')
      .limit(100);

    return res.json({ success: true, data: reports });
  } catch (err) {
    console.error('[ADMIN REPORTS ERROR]', err.message);
    return res.status(500).json({ success: false, error: 'Erreur récupération signalements' });
  }
});

// ─── GET /api/admin/admins ────────────────────────────────────────────────────

router.get('/admins', async (req, res) => {
  try {
    const admins = await knex('users')
      .where({ role: 'admin' })
      .select('id', 'email', 'full_name', 'created_at')
      .orderBy('created_at', 'asc');

    return res.json({ success: true, data: admins });
  } catch (err) {
    console.error('[ADMIN ADMINS ERROR]', err.message);
    return res.status(500).json({ success: false, error: 'Erreur récupération admins' });
  }
});

// ─── POST /api/admin/create-admin ──────────────────────────────────────────────

router.post('/create-admin', async (req, res) => {
  const { email, full_name } = req.body;

  if (!email || !full_name) {
    return res.status(400).json({ success: false, error: 'Email et nom requis' });
  }

  try {
    // Vérifier si l'email existe déjà
    const existing = await knex('users').where({ email }).first();
    if (existing) {
      return res.status(409).json({ success: false, error: 'Cet email est déjà utilisé' });
    }

    // Générer un mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-12).toUpperCase();
    const bcrypt = require('bcrypt');
    const password_hash = await bcrypt.hash(tempPassword, 12);

    // Créer l'admin
    const [admin] = await knex('users')
      .insert({
        email: email.trim().toLowerCase(),
        full_name: full_name.trim(),
        password_hash,
        role: 'admin',
        is_active: true,
      })
      .returning(['id', 'email', 'full_name']);

    // Envoyer email avec lien de setup
    const emailService = require('../services/email.service');
    const resetToken = Math.random().toString(36).slice(-32);

    // Stocker le token en BD (on peut utiliser refresh_tokens ou créer une nouvelle table)
    // Pour simplifier, on va juste envoyer l'email avec les infos
    const setupLink = `${process.env.APP_URL}/admin-setup?email=${encodeURIComponent(email)}&token=${resetToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
        <h2 style="color: #C2185B;">👋 Bienvenue Admin — HerSafety</h2>
        <p>Tu as été ajouté(e) en tant qu'administrateur HerSafety.</p>

        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Mot de passe temporaire:</strong> <code>${tempPassword}</code></p>
        </div>

        <p style="margin: 20px 0;">
          <a href="${process.env.APP_URL}/login"
             style="background: #C2185B; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
            Accéder à HerSafety Admin
          </a>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="font-size: 12px; color: #999;">
          Après ta première connexion, nous te recommandons de changer ton mot de passe dans les paramètres.
        </p>
      </div>
    `;

    await emailService.initializeTransporter();
    const transporter = require('nodemailer').createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      } : undefined,
    });

    try {
      await transporter.sendMail({
        from: process.env.GMAIL_USER || process.env.SMTP_USER || 'noreply@hersafety.com',
        to: email,
        subject: '👋 Bienvenue Admin — HerSafety',
        html: htmlContent,
      });
    } catch (emailErr) {
      console.warn('Admin setup email failed:', emailErr.message);
      // Continuer même si l'email échoue
    }

    return res.status(201).json({
      success: true,
      data: admin,
      message: 'Admin créé! Email de setup envoyé',
    });
  } catch (err) {
    console.error('[CREATE ADMIN ERROR]', err.message);
    return res.status(500).json({ success: false, error: 'Erreur création admin' });
  }
});

module.exports = router;
