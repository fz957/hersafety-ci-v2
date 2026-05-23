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
  is_anonymous:   Joi.boolean().default(true),
  category:       Joi.string().valid(...DANGER_TYPES).required(),
  title:          Joi.string().trim().max(255).required(),
  content:        Joi.string().trim().max(5000).required(),
  location_label: Joi.string().max(500).optional(),
});

const moderateSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  notes:  Joi.string().max(500).optional(),
});

// ─── GET /api/testimonies ─────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit = Math.min(50, parseInt(req.query.limit || '20', 10));

  try {
    const testimonies = await knex('testimonies')
      .where({ organization_id: req.user.organizationId, status: 'approved' })
      .select(
        'id', 'organization_id', 'is_anonymous', 'display_name',
        'category', 'title', 'content', 'location_label',
        'support_count', 'created_at'
        // user_id délibérément exclu pour préserver l'anonymat
      )
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return res.json({ success: true, data: testimonies });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur récupération témoignages' });
  }
});

// ─── POST /api/testimonies ────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { userId, organizationId } = req.user;

  try {
    let display_name = null;
    if (value.is_anonymous) {
      const result = await knex.raw('SELECT generate_anonymous_name() AS name');
      display_name = result.rows[0].name;
    }

    const [testimony] = await knex('testimonies')
      .insert({
        user_id:         userId,
        organization_id: organizationId,
        is_anonymous:    value.is_anonymous,
        display_name,
        category:        value.category,
        title:           value.title,
        content:         value.content,
        location_label:  value.location_label,
        status:          'pending',
      })
      .returning([
        'id', 'organization_id', 'is_anonymous', 'display_name',
        'category', 'title', 'content', 'location_label', 'status', 'created_at',
      ]);

    return res.status(201).json({ success: true, data: testimony });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur création témoignage' });
  }
});

// ─── PATCH /api/testimonies/:id — admin seulement ────────────────────────────

router.patch('/:id', requireAdmin, async (req, res) => {
  const { error, value } = moderateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const [testimony] = await knex('testimonies')
      .where({ id: req.params.id, organization_id: req.user.organizationId })
      .where('status', 'pending')
      .update({
        status:       value.action === 'approve' ? 'approved' : 'rejected',
        moderated_by: req.user.userId,
        moderated_at: new Date(),
        updated_at:   new Date(),
      })
      .returning('*');

    if (!testimony) {
      return res.status(404).json({ success: false, error: 'Témoignage introuvable ou déjà modéré' });
    }

    return res.json({ success: true, data: testimony });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur modération témoignage' });
  }
});

module.exports = router;
