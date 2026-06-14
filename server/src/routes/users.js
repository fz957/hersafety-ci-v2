const express = require('express');
const Joi     = require('joi');

const knex              = require('../db/knex');
const { requireAuth }   = require('../middlewares/auth');
const emailService      = require('../services/email.service');

const router = express.Router();
router.use(requireAuth);

const updateSchema = Joi.object({
  full_name:       Joi.string().trim().max(255).optional(),
  email:           Joi.string().email().optional(),
  phone:           Joi.string().trim().max(20).allow('', null).optional(),
  onboarding_done: Joi.boolean().optional(),
  email_notifications_enabled: Joi.boolean().optional(),
  notify_alerts:   Joi.boolean().optional(),
  notify_reports:  Joi.boolean().optional(),
  notify_comments: Joi.boolean().optional(),
}).min(1); // Au moins un champ requis

// ─── GET /api/users/me ────────────────────────────────────────────────────────

router.get('/me', async (req, res) => {
  try {
    const user = await knex('users')
      .where({ id: req.user.userId })
      .select(
        'id',
        'email',
        'full_name',
        'phone',
        'phone_verified',
        'role',
        'is_active',
        'onboarding_done',
        'email_notifications_enabled',
        'notify_alerts',
        'notify_reports',
        'notify_comments',
        'created_at',
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
    // If setting onboarding_done to true, verify minimum 2 contacts
    if (value.onboarding_done === true) {
      const contactCount = await knex('contacts')
        .where({ user_id: req.user.userId })
        .count('id as total')
        .first();

      if (parseInt(contactCount.total, 10) < 2) {
        return res.status(422).json({
          success: false,
          error: 'Vous devez ajouter au minimum 2 contacts avant de terminer l\'onboarding'
        });
      }
    }

    // Get old values BEFORE update
    const oldUser = await knex('users')
      .where({ id: req.user.userId })
      .first();

    const [user] = await knex('users')
      .where({ id: req.user.userId })
      .update({ ...value, updated_at: new Date() })
      .returning(['id', 'email', 'full_name', 'phone', 'role', 'onboarding_done', 'email_notifications_enabled', 'notify_alerts', 'notify_reports', 'notify_comments', 'updated_at']);

    // Envoyer email de confirmation si changements profil (EN BACKGROUND - ne pas bloquer la réponse)
    if (value.full_name || value.email || value.phone) {
      const emailService = require('../services/email.service');
      const changes = {};

      // Compare old vs new values
      if (value.full_name && oldUser.full_name !== value.full_name) {
        changes['Nom complet'] = `${oldUser.full_name} → ${value.full_name}`;
      }
      if (value.email && oldUser.email !== value.email) {
        changes['Email'] = `${oldUser.email} → ${value.email}`;
      }
      if (value.phone && oldUser.phone !== value.phone) {
        changes['Téléphone'] = `${oldUser.phone} → ${value.phone}`;
      }

      // Only send email if there are actual changes
      if (Object.keys(changes).length > 0) {
        console.log('[Users] Profile changed, sending email to:', user.email);
        console.log('[Users] Changes:', changes);

        // Send email in background without awaiting (don't block API response)
        emailService.sendProfileChangeEmail(user.email, user.full_name || 'Utilisateur', changes)
          .then(result => {
            console.log('[Users] ✓ Profile change email sent successfully:', result.messageId);
          })
          .catch(err => {
            console.error('[Users] ✗ Error sending profile change email:', err.message);
            console.error('[Users] Full error:', err);
          });
      }
    }

    return res.json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur mise à jour profil' });
  }
});

// ─── DELETE /api/users/me ─────────────────────────────────────────────────────

router.delete('/me', async (req, res) => {
  const userId = req.user.userId;
  try {
    // Récupérer les infos utilisateur avant suppression
    const user = await knex('users').where({ id: userId }).first();

    // Commencer une transaction pour supprimer l'utilisateur et toutes ses données
    await knex.transaction(async (trx) => {
      // Supprimer les contacts
      await trx('contacts')
        .where({ user_id: userId })
        .del();

      // Supprimer les alertes
      await trx('alerts')
        .where({ user_id: userId })
        .del();

      // Supprimer les tracks
      await trx('tracks')
        .where({ user_id: userId })
        .del();

      // Supprimer les testimonies
      await trx('testimonies')
        .where({ user_id: userId })
        .del();

      // Supprimer les rapports
      await trx('reports')
        .where({ user_id: userId })
        .del();

      // Finalement, supprimer l'utilisateur
      await trx('users')
        .where({ id: userId })
        .del();
    });

    // Envoyer email de confirmation suppression (EN BACKGROUND)
    if (user && user.email) {
      emailService.sendAccountDeletionEmail(user.email, user.full_name || 'Utilisateur')
        .catch(err => console.error('[Email] Error sending account deletion email:', err.message));
    }

    return res.json({ success: true, message: 'Compte supprimé avec succès' });
  } catch (err) {
    console.error('Erreur suppression compte:', err);
    return res.status(500).json({ success: false, error: 'Erreur suppression compte' });
  }
});

module.exports = router;
