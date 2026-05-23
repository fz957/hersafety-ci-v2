const express = require('express');
const Joi     = require('joi');

const knex            = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');
const { requireTenant } = require('../middlewares/tenant');

const router = express.Router();
router.use(requireAuth, requireTenant);

const contactSchema = Joi.object({
  full_name:  Joi.string().trim().max(255).required(),
  phone:      Joi.string().trim().max(20).required(),
  relation:   Joi.string().valid('famille', 'ami', 'collegue', 'autre').default('autre'),
  is_primary: Joi.boolean().default(false),
});

// GET /api/contacts
router.get('/', async (req, res) => {
  try {
    const contacts = await knex('contacts')
      .where({ user_id: req.user.userId, organization_id: req.user.organizationId })
      .orderBy('is_primary', 'desc')
      .orderBy('created_at', 'asc');

    return res.json({ success: true, data: contacts });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur récupération contacts' });
  }
});

// POST /api/contacts
router.post('/', async (req, res) => {
  const { error, value } = contactSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const [contact] = await knex('contacts')
      .insert({ user_id: req.user.userId, organization_id: req.user.organizationId, ...value })
      .returning('*');

    return res.status(201).json({ success: true, data: contact });
  } catch (err) {
    if (err.message && err.message.includes('Maximum 5 contacts')) {
      return res.status(422).json({ success: false, error: 'Maximum 5 contacts de confiance autorisés' });
    }
    return res.status(500).json({ success: false, error: 'Erreur création contact' });
  }
});

// DELETE /api/contacts/:id
router.delete('/:id', async (req, res) => {
  try {
    const count = await knex('contacts')
      .where({ id: req.params.id, user_id: req.user.userId, organization_id: req.user.organizationId })
      .delete();

    if (!count) {
      return res.status(404).json({ success: false, error: 'Contact introuvable' });
    }
    return res.json({ success: true, data: { message: 'Contact supprimé' } });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur suppression contact' });
  }
});

module.exports = router;
