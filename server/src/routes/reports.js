const express = require('express');
const Joi     = require('joi');

const knex              = require('../db/knex');
const { requireAuth }   = require('../middlewares/auth');
const { requireTenant } = require('../middlewares/tenant');
const { requireAdmin }  = require('../middlewares/admin');

const router = express.Router();
router.use(requireAuth, requireTenant);

const DANGER_TYPES = ['harcelement_verbal', 'agression_physique', 'agression_sexuelle', 'vol', 'suivi', 'detour_force', 'autre'];

const createSchema = Joi.object({
  is_anonymous:      Joi.boolean().default(true),
  report_type:       Joi.string().valid('lieu', 'chauffeur').required(),
  danger_type:       Joi.string().valid(...DANGER_TYPES).required(),
  description:       Joi.string().trim().max(5000).required(),
  incident_date:     Joi.date().max('now').optional(),
  // Champs lieu
  place_name:        Joi.string().max(255).optional(),
  place_address:     Joi.string().max(500).optional(),
  place_lat:         Joi.number().min(-90).max(90).optional(),
  place_lng:         Joi.number().min(-180).max(180).optional(),
  // Champs chauffeur/VTC
  vehicle_plate:     Joi.string().max(20).optional(),
  vtc_app:           Joi.string().max(100).optional(),
});

const verifySchema = Joi.object({
  action:            Joi.string().valid('verify', 'refute').required(),
  verification_note: Joi.string().max(500).optional(),
});

// ─── GET /api/reports ─────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit = Math.min(50, parseInt(req.query.limit || '20', 10));

  try {
    const reports = await knex('reports')
      .where({ organization_id: req.user.organizationId, status: 'verified' })
      .select(
        'id', 'organization_id', 'is_anonymous', 'report_type', 'danger_type',
        'place_name', 'place_address', 'place_lat', 'place_lng',
        'vtc_app', 'description', 'incident_date', 'status', 'created_at'
        // vehicle_plate et user_id exclus pour préserver l'anonymat
      )
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return res.json({ success: true, data: reports });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur récupération signalements' });
  }
});

// ─── POST /api/reports ────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const [report] = await knex('reports')
      .insert({
        user_id:         req.user.userId,
        organization_id: req.user.organizationId,
        status:          'pending',
        ...value,
      })
      .returning([
        'id', 'organization_id', 'is_anonymous', 'report_type', 'danger_type',
        'description', 'status', 'created_at',
      ]);

    return res.status(201).json({ success: true, data: report });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur création signalement' });
  }
});

// ─── PATCH /api/reports/:id/verify — admin seulement ─────────────────────────

router.patch('/:id/verify', requireAdmin, async (req, res) => {
  const { error, value } = verifySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const [report] = await knex('reports')
      .where({ id: req.params.id, organization_id: req.user.organizationId, status: 'pending' })
      .update({
        status:            value.action === 'verify' ? 'verified' : 'refuted',
        verified_by:       req.user.userId,
        verified_at:       new Date(),
        verification_note: value.verification_note,
        updated_at:        new Date(),
      })
      .returning('*');

    if (!report) {
      return res.status(404).json({ success: false, error: 'Signalement introuvable ou déjà traité' });
    }

    return res.json({ success: true, data: report });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur vérification signalement' });
  }
});

module.exports = router;
