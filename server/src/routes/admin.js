const express = require('express');
const Joi     = require('joi');

const knex              = require('../db/knex');
const { requireAuth }   = require('../middlewares/auth');
const { requireTenant } = require('../middlewares/tenant');
const { requireAdmin }  = require('../middlewares/admin');

const router = express.Router();
router.use(requireAuth, requireTenant, requireAdmin);

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  const { organizationId } = req.user;

  try {
    const [alertsToday, activeUsers, pendingReports, pendingTestimonies] = await Promise.all([
      knex('alerts')
        .where({ organization_id: organizationId })
        .whereRaw("DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE")
        .count('id as total').first(),

      knex('users')
        .where({ is_active: true })
        .count('id as total').first(),

      knex('reports')
        .where({ status: 'pending' })
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
        pending_reports:      parseInt(pendingReports.total, 10),
        pending_testimonies:  parseInt(pendingTestimonies.total, 10),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur récupération statistiques' });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit || '50', 10));

  try {
    const users = await knex('users')
      .where({ organization_id: req.user.organizationId })
      .select('id', 'email', 'full_name', 'phone', 'role', 'is_active', 'onboarding_done', 'created_at')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return res.json({ success: true, data: users });
  } catch (err) {
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
