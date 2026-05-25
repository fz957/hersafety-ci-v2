const express = require('express');
const Joi     = require('joi');
const crypto  = require('crypto');

const knex            = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');
const { requireTenant } = require('../middlewares/tenant');
const { sendVerificationEmail } = require('../services/email.service');

const router = express.Router();
router.use(requireAuth, requireTenant);

const contactSchema = Joi.object({
  full_name:  Joi.string().trim().max(255).required(),
  phone:      Joi.string().trim().max(20).allow('').optional(),
  email:      Joi.string().allow('').trim().max(255).email().optional(),
  relation:   Joi.string().valid('famille', 'ami', 'collegue', 'autre').default('autre'),
  is_primary: Joi.boolean().default(false),
});

// Generate verification token
const generateVerificationToken = () => crypto.randomBytes(32).toString('hex');

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

  // Convertir strings vides en null
  if (value.email === '') value.email = null;
  if (value.phone === '') value.phone = null;

  // Au moins un de phone ou email doit être fourni
  if (!value.phone && !value.email) {
    return res.status(400).json({ success: false, error: 'Fournir un numéro ou un email' });
  }

  try {
    // Générer token de vérification si email fourni
    const verificationToken = value.email ? generateVerificationToken() : null;

    const [contact] = await knex('contacts')
      .insert({
        user_id: req.user.userId,
        organization_id: req.user.organizationId,
        verification_token: verificationToken,
        email_verified: !value.email, // Si pas d'email, considérer comme vérifié
        ...value
      })
      .returning('*');

    // Envoyer email de vérification si fourni
    if (value.email) {
      const user = await knex('users').where({ id: req.user.userId }).first();
      await sendVerificationEmail(value.email, verificationToken, user.full_name);
    }

    return res.status(201).json({ success: true, data: contact });
  } catch (err) {
    console.error('Contact creation error:', err);
    if (err.message && err.message.includes('Maximum 5 contacts')) {
      return res.status(422).json({ success: false, error: 'Maximum 5 contacts de confiance autorisés' });
    }
    return res.status(500).json({ success: false, error: 'Erreur création contact' });
  }
});

// GET /api/contacts/verify-email?token=...
// Endpoint public (pas d'auth requise) pour vérifier l'email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token manquant' });
    }

    const contact = await knex('contacts')
      .where({ verification_token: token })
      .first();

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Token invalide ou expiré' });
    }

    // Marquer l'email comme vérifié
    await knex('contacts')
      .where({ id: contact.id })
      .update({
        email_verified: true,
        email_verified_at: knex.fn.now(),
        verification_token: null, // Effacer le token une fois utilisé
      });

    // Redirection vers une page de confirmation
    return res.status(200).json({
      success: true,
      data: { message: '✓ Email vérifié! Tu peux maintenant recevoir les alertes.' }
    });
  } catch (err) {
    console.error('Email verification error:', err);
    return res.status(500).json({ success: false, error: 'Erreur vérification' });
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
