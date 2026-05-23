const express      = require('express');
const Joi          = require('joi');
const { randomBytes } = require('crypto');

const knex                  = require('../db/knex');
const { requireAuth }       = require('../middlewares/auth');
const { requireSuperAdmin } = require('../middlewares/admin');

const router = express.Router();
router.use(requireAuth, requireSuperAdmin);

const createSchema = Joi.object({
  name:    Joi.string().trim().max(255).required(),
  type:    Joi.string().valid('ong', 'entreprise', 'universite').required(),
  email:   Joi.string().email().max(255).required(),
  phone:   Joi.string().max(20).optional(),
  address: Joi.string().max(500).optional(),
});

function generateJoinCode() {
  return randomBytes(4).toString('hex').toUpperCase();
}

// ─── GET /api/organizations ───────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit || '50', 10));

  try {
    const orgs = await knex('organizations')
      .select('id', 'name', 'type', 'email', 'phone', 'address', 'join_code', 'is_active', 'is_approved', 'created_at')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return res.json({ success: true, data: orgs });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur récupération organisations' });
  }
});

// ─── POST /api/organizations ──────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    // Génère un join_code unique (retry sur collision — très rare)
    let join_code;
    let attempts = 0;
    while (attempts < 5) {
      const candidate = generateJoinCode();
      const exists = await knex('organizations').where({ join_code: candidate }).first();
      if (!exists) { join_code = candidate; break; }
      attempts++;
    }
    if (!join_code) {
      return res.status(500).json({ success: false, error: 'Impossible de générer un code unique' });
    }

    const existing = await knex('organizations').where({ email: value.email }).first();
    if (existing) {
      return res.status(409).json({ success: false, error: 'Un compte existe déjà pour cet email' });
    }

    const [org] = await knex('organizations')
      .insert({ ...value, join_code })
      .returning(['id', 'name', 'type', 'email', 'join_code', 'is_active', 'is_approved', 'created_at']);

    return res.status(201).json({ success: true, data: org });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur création organisation' });
  }
});

// ─── PATCH /api/organizations/:id/approve ────────────────────────────────────

router.patch('/:id/approve', async (req, res) => {
  try {
    const [org] = await knex('organizations')
      .where({ id: req.params.id })
      .update({ is_approved: true, updated_at: new Date() })
      .returning(['id', 'name', 'type', 'email', 'is_active', 'is_approved']);

    if (!org) {
      return res.status(404).json({ success: false, error: 'Organisation introuvable' });
    }

    return res.json({ success: true, data: org });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur approbation organisation' });
  }
});

// ─── PATCH /api/organizations/:id/status ─────────────────────────────────────

router.patch('/:id/status', async (req, res) => {
  const { error, value } = Joi.object({
    is_active: Joi.boolean().required(),
  }).validate(req.body);

  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const [org] = await knex('organizations')
      .where({ id: req.params.id })
      .update({ is_active: value.is_active, updated_at: new Date() })
      .returning(['id', 'name', 'type', 'is_active', 'is_approved']);

    if (!org) {
      return res.status(404).json({ success: false, error: 'Organisation introuvable' });
    }

    return res.json({ success: true, data: org });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur mise à jour statut' });
  }
});

module.exports = router;
