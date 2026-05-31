const express = require('express');
const Joi     = require('joi');

const knex              = require('../db/knex');
const { requireAuth }   = require('../middlewares/auth');
const { requireTenant } = require('../middlewares/tenant');
const { requireAdmin }  = require('../middlewares/admin');

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
    const [alertsToday, activeUsers, verifiedReports, pendingTestimonies] = await Promise.all([
      knex('alerts')
        .whereRaw("DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE")
        .count('id as total').first(),

      knex('users')
        .where({ is_active: true })
        .count('id as total').first(),

      knex('reports')
        .where({ status: 'verified' })
        .count('id as total').first(),

      knex('testimonies')
        .where({ status: 'pending' })
        .count('id as total').first(),
    ]);

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
router.get('/alerts/recent', async (req, res) => {
  try {
    const alerts = await knex('alerts')
      .leftJoin('users', 'alerts.user_id', 'users.id')
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
      .where('alerts.status', '=', 'active')
      .orderBy('alerts.created_at', 'desc')
      .limit(20);

    return res.json({ success: true, data: alerts });
  } catch (err) {
    console.error('[ADMIN ALERTS RECENT ERROR]', err.message);
    return res.status(500).json({ success: false, error: 'Erreur récupération alertes récentes' });
  }
});

// ─── GET /api/admin/alerts/history ──────────────────────────────────────────
router.get('/alerts/history', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit || '50', 10));

  try {
    const alerts = await knex('alerts')
      .leftJoin('users', 'alerts.user_id', 'users.id')
      .select(
        'alerts.id',
        'alerts.user_id',
        'users.full_name as user_name',
        'alerts.level',
        'alerts.location_lat',
        'alerts.location_lng',
        'alerts.location_label',
        'alerts.status',
        'alerts.created_at'
      )
      .orderBy('alerts.created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    const total = await knex('alerts').count('alerts.id as count').first();

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

// ─── GET /api/admin/testimonies/pending ──────────────────────────────────────

router.get('/testimonies/pending', async (req, res) => {
  try {
    const testimonies = await knex('testimonies')
      .where({ status: 'pending' })
      .select('id', 'user_id', 'is_anonymous', 'display_name', 'category', 'title', 'content', 'location_label', 'created_at')
      .orderBy('created_at', 'asc')
      .limit(50);

    return res.json({ success: true, data: testimonies });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur récupération témoignages' });
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

module.exports = router;
