const express = require('express');
const Joi     = require('joi');

const knex              = require('../db/knex');
const { requireAuth }   = require('../middlewares/auth');
const { requireAdmin }  = require('../middlewares/admin');
const { sendAlertSMS }  = require('../services/sms.service');
const { sendNotificationToUser, notifyContacts } = require('../services/firebase.service');
const { sendAlertEmail, sendAlertConfirmationEmail, sendAdminAlertNotification } = require('../services/email.service');

const router = express.Router();
router.use(requireAuth);

const alertSchema = Joi.object({
  level:          Joi.string().valid('1', '2', '3', '4').required(),
  location_lat:   Joi.number().min(-90).max(90).optional(),
  location_lng:   Joi.number().min(-180).max(180).optional(),
  location_label: Joi.string().max(500).optional(),
  notes:          Joi.string().max(1000).optional(),
});

const resolveSchema = Joi.object({
  status: Joi.string().valid('resolved', 'false_alarm').default('resolved'),
  notes:  Joi.string().max(1000).optional(),
});

// ─── POST /api/alerts ─────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { error, value } = alertSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { userId } = req.user;
  const isSimulated = process.env.APP_MODE !== 'production';

  try {
    const [alert] = await knex('alerts')
      .insert({ user_id: userId, is_simulated: isSimulated, ...value })
      .returning('*');

    let smsLogs = [];
    let fcmResult = { success: false };

    // Texte d'alerte pour notifications
    const levelLabels = { '1': 'Vigilance', '2': 'Malaise', '3': 'DANGER', '4': 'SOS' };
    const alertText = value.location_label
      ? `Alerte ${levelLabels[value.level]}: ${value.location_label}`
      : `Alerte ${levelLabels[value.level]}`;

    // Récupérer l'utilisateur et son organization_id
    const sender = await knex('users').where({ id: userId }).first();

    // Envoyer notification à l'admin si les notifications sont activées
    if (sender && sender.organization_id) {
      const admin = await knex('users')
        .where({ organization_id: sender.organization_id, role: 'admin' })
        .where('email_notifications_enabled', '!=', false)
        .first();

      if (admin && admin.email) {
        await sendAdminAlertNotification(admin.email, alert, sender.full_name || 'Utilisatrice');
      }
    }

    if (['2', '3', '4'].includes(value.level)) {
      const contacts = await knex('contacts').where({ user_id: userId });

      if (contacts.length > 0) {
        // Mettre à jour l'alerte IMMÉDIATEMENT
        await knex('alerts').where({ id: alert.id }).update({
          sms_sent:       true, // Mark as sent
          sms_sent_at:    new Date(),
          contacts_count: contacts.length,
        });

        alert.sms_sent       = true;
        alert.contacts_count = contacts.length;

        // SEND EMAILS IN BACKGROUND (don't block the alert creation response)
        // Envoyer emails aux contacts
        (async () => {
          console.log(`[Alert] Starting email send - ${contacts.length} contacts found`);
          let emailsSent = 0;
          for (const contact of contacts) {
            console.log(`[Alert] Contact: email="${contact.email}"`);
            if (contact.email) {
              try {
                console.log(`[Alert] Sending email to ${contact.email}...`);
                const emailResult = await sendAlertEmail(contact.email, {
                  senderName: sender.full_name,
                  alertLevel: value.level,
                  locationLabel: value.location_label,
                  createdAt: alert.created_at,
                });
                console.log(`[Alert] Email result for ${contact.email}:`, emailResult);
                if (emailResult.success) emailsSent++;
              } catch (err) {
                console.error('[Alert Email] Error sending to contact:', err.message);
              }
            }
          }

          // Envoyer email de confirmation à l'utilisateur
          if (sender && sender.email) {
            try {
              await sendAlertConfirmationEmail(sender.email, sender.full_name, value.level, contacts.length, value.location_label);
            } catch (err) {
              console.error('[Alert Email] Error sending confirmation:', err.message);
            }
          }
        })().catch(err => console.error('[Alert] Background email process error:', err.message));
      }

      // Contacts reçoivent des emails (pas de notifications push FCM)

      // FCM - notifier l'utilisateur aussi (pour son propre appareil)
      await sendNotificationToUser(userId, {
        title: `✓ Alerte ${levelLabels[value.level]} envoyée`,
        body: `${contacts.length} contact(s) notifié(s)`,
        link: '/alerts',
      }, {
        alertId: alert.id,
        alertLevel: value.level,
      });
    }

    // FCM - pour le niveau 1 (vigilance seulement), notifier l'utilisateur
    if (value.level === '1') {
      await sendNotificationToUser(userId, {
        title: '👀 Mode Vigilance',
        body: 'Check-ins programmés toutes les 10 min',
        link: '/dashboard',
      }, {
        alertId: alert.id,
        alertLevel: '1',
      });
    }

    return res.status(201).json({
      success: true,
      data: { alert, sms_logs: smsLogs, fcm: fcmResult }
    });
  } catch (err) {
    console.error('Alert creation error:', err);
    return res.status(500).json({ success: false, error: 'Erreur création alerte' });
  }
});

// ─── GET /api/alerts ──────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const { role, userId } = req.user;

  try {
    const query = knex('alerts')
      .orderBy('created_at', 'desc')
      .limit(50);

    // User simple : uniquement ses propres alertes
    if (role === 'user') query.where({ user_id: userId });

    const alerts = await query;
    return res.json({ success: true, data: alerts });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur récupération alertes' });
  }
});

// ─── PATCH /api/alerts/:id/resolve ────────────────────────────────────────────

router.patch('/:id/resolve', async (req, res) => {
  const { error, value } = resolveSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { userId, role } = req.user;

  try {
    // Récupérer l'alerte
    const alert = await knex('alerts').where({ id: req.params.id }).first();

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alerte introuvable' });
    }

    // Vérifier les permissions:
    // - L'utilisatrice peut résoudre sa propre alerte
    // - Les admins peuvent résoudre n'importe quelle alerte
    const isOwner = alert.user_id === userId;
    const isAdmin = role === 'superadmin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Vous ne pouvez pas résoudre cette alerte' });
    }

    // Résoudre l'alerte
    const [updated] = await knex('alerts')
      .where({ id: req.params.id, status: 'active' })
      .update({
        status: value.status,
        notes: value.notes,
        resolved_at: new Date()
      })
      .returning('*');

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Alerte introuvable ou déjà résolue' });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Alert resolve error:', err);
    return res.status(500).json({ success: false, error: 'Erreur résolution alerte' });
  }
});

module.exports = router;
