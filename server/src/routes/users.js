const express = require('express');
const Joi     = require('joi');

const knex              = require('../db/knex');
const { requireAuth }   = require('../middlewares/auth');
const { requireTenant } = require('../middlewares/tenant');

const router = express.Router();
router.use(requireAuth, requireTenant);

const updateSchema = Joi.object({
  full_name:       Joi.string().trim().max(255).optional(),
  phone:           Joi.string().trim().max(20).allow('', null).optional(),
  onboarding_done: Joi.boolean().optional(),
}).min(1); // Au moins un champ requis

// ─── GET /api/users/me ────────────────────────────────────────────────────────

router.get('/me', async (req, res) => {
  try {
    const user = await knex('users')
      .join('organizations', 'users.organization_id', 'organizations.id')
      .where({ 'users.id': req.user.userId })
      .select(
        'users.id',
        'users.email',
        'users.full_name',
        'users.phone',
        'users.role',
        'users.is_active',
        'users.onboarding_done',
        'users.created_at',
        'organizations.id        as organization_id',
        'organizations.name      as organization_name',
        'organizations.type      as organization_type',
        'organizations.join_code as organization_join_code',
      )
      .first();

    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
    }

    return res.json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur récupération profil' });
  }
});

// ─── PATCH /api/users/me ──────────────────────────────────────────────────────

router.patch('/me', async (req, res) => {
  const { error, value } = updateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const [user] = await knex('users')
      .where({ id: req.user.userId })
      .update({ ...value, updated_at: new Date() })
      .returning(['id', 'email', 'full_name', 'phone', 'role', 'onboarding_done', 'updated_at']);

    return res.json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur mise à jour profil' });
  }
});

module.exports = router;
