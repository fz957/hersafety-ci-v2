const express = require('express');
const Joi     = require('joi');

const knex              = require('../db/knex');
const { requireAuth }   = require('../middlewares/auth');
const { requireTenant } = require('../middlewares/tenant');
const { requireAdmin }  = require('../middlewares/admin');
const { sendAlertSMS }  = require('../services/sms.service');
const { sendNotificationToUser, notifyContacts } = require('../services/firebase.service');

const router = express.Router();
router.use(requireAuth, requireTenant);

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

  const { userId, organizationId } = req.user;
  const isSimulated = process.env.APP_MODE !== 'production';

  try {
    const [alert] = await knex('alerts')
      .insert({ user_id: userId, organization_id: organizationId, is_simulated: isSimulated, ...value })
      .returning('*');

    let smsLogs = [];
    let fcmResult = { success: false };

    // Texte d'alerte pour notifications
    const levelLabels = { '1': 'Vigilance', '2': 'Malaise', '3': 'DANGER', '4': 'SOS' };
    const alertText = value.location_label
      ? `Alerte ${levelLabels[value.level]}: ${value.location_label}`
      : `Alerte ${levelLabels[value.level]}`;

    if (['2', '3', '4'].includes(value.level)) {
      const contacts = await knex('contacts').where({ user_id: userId, organization_id: organizationId });

      // SMS (Africa's Talking)
      if (contacts.length > 0) {
        smsLogs = await sendAlertSMS({
          alertId:        alert.id,
          userId,
          organizationId,
          level:          value.level,
          contacts,
          locationLabel:  value.location_label,
          isSimulated,
        });

        const smsSent = smsLogs.some((l) => ['sent', 'simulated'].includes(l.status));
        await knex('alerts').where({ id: alert.id }).update({
          sms_sent:       smsSent,
          sms_sent_at:    smsSent ? new Date() : null,
          contacts_count: contacts.length,
        });

        alert.sms_sent       = smsSent;
        alert.contacts_count = contacts.length;
      }

      // Firebase Cloud Messaging - notifier les contacts
      if (contacts.length > 0) {
        fcmResult = await notifyContacts(userId, organizationId, contacts, {
          title: `🚨 ${levelLabels[value.level]}`,
          body: alertText,
          link: '/alerts',
        });
      }

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
  const { role, userId, organizationId } = req.user;

  try {
    const query = knex('alerts')
      .where({ organization_id: organizationId })
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

router.patch('/:id/resolve', requireAdmin, async (req, res) => {
  const { error, value } = resolveSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const [alert] = await knex('alerts')
      .where({ id: req.params.id, organization_id: req.user.organizationId, status: 'active' })
      .update({ status: value.status, notes: value.notes, resolved_at: new Date() })
      .returning('*');

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alerte introuvable ou déjà résolue' });
    }

    return res.json({ success: true, data: alert });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur résolution alerte' });
  }
});

module.exports = router;
