const express = require('express');
const Joi = require('joi');
const knex = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');
const { requireTenant } = require('../middlewares/tenant');
const { requireAdmin } = require('../middlewares/admin');

const router = express.Router();
router.use(requireAuth, requireTenant);

const reportSchema = Joi.object({
  report_type: Joi.string().valid('testimony', 'user').required(),
  testimony_id: Joi.number().optional(),
  reported_user_id: Joi.number().optional(),
  reason: Joi.string().valid('harassment', 'violence', 'misinformation', 'spam', 'other').required(),
  description: Joi.string().max(1000).optional(),
});

// POST /api/reports — Soumettre un signalement
router.post('/', async (req, res) => {
  const { error, value } = reportSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { userId, organizationId } = req.user;

  try {
    const [report] = await knex('reports')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        report_type: value.report_type,
        testimony_id: value.testimony_id,
        reported_user_id: value.reported_user_id,
        reason: value.reason,
        description: value.description,
        status: 'open',
      })
      .returning('*');

    // Si c''est un signalement de témoignage, incrémenter le compteur
    if (value.testimony_id) {
      await knex('testimonies')
        .where({ id: value.testimony_id })
        .increment('report_count', 1);
    }

    return res.status(201).json({ success: true, data: report });
  } catch (err) {
    console.error('Report error:', err);
    return res.status(500).json({ success: false, error: 'Erreur signalement' });
  }
});

// GET /api/reports — Admin: voir tous les signalements
router.get('/', requireAdmin, async (req, res) => {
  const { organizationId } = req.user;
  const status = req.query.status || 'open';

  try {
    const reports = await knex('reports')
      .where({ organization_id: organizationId, status })
      .select('*')
      .orderBy('created_at', 'desc');

    return res.json({ success: true, data: reports });
  } catch (err) {
    console.error('Reports get error:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération signalements' });
  }
});

// PATCH /api/reports/:id — Admin: marquer comme examiné/résolu
router.patch('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { userId, organizationId } = req.user;

  if (!['open', 'reviewed', 'resolved'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Status invalide' });
  }

  try {
    const [report] = await knex('reports')
      .where({ id, organization_id: organizationId })
      .update({
        status,
        reviewed_at: new Date(),
        reviewed_by: userId,
      })
      .returning('*');

    if (!report) {
      return res.status(404).json({ success: false, error: 'Signalement introuvable' });
    }

    return res.json({ success: true, data: report });
  } catch (err) {
    console.error('Report update error:', err);
    return res.status(500).json({ success: false, error: 'Erreur mise à jour signalement' });
  }
});

module.exports = router;
