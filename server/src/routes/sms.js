const express = require('express');
const Joi     = require('joi');

const knex              = require('../db/knex');
const { requireAuth }   = require('../middlewares/auth');
const { requireTenant } = require('../middlewares/tenant');
const { sendAlertSMS }  = require('../services/sms.service');

const router = express.Router();

const alertSchema = Joi.object({
  level:          Joi.string().valid('1', '2', '3', '4').required(),
  location_label: Joi.string().max(500).optional(),
  alert_id:       Joi.string().uuid().optional(), // rattacher à une alerte existante
});

/**
 * POST /api/sms/alert
 * Envoie manuellement un SMS d'alerte à tous les contacts de confiance
 * de l'utilisatrice connectée. Vérifie APP_MODE avant tout envoi réel.
 * NOTE: Permet les requêtes authentifiées OR depuis le service worker
 */
// Apply auth to this specific route
router.post('/alert', requireAuth, requireTenant, async (req, res) => {
  console.log('[SMS] Alert request received:', {
    body: req.body,
    userId: req.user?.userId,
    orgId: req.user?.organizationId,
    timestamp: new Date().toISOString(),
  });

  const { error, value } = alertSchema.validate(req.body);
  if (error) {
    console.log('[SMS] Validation error:', error.details[0].message);
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { userId, organizationId } = req.user;
  const isSimulated = process.env.APP_MODE !== 'production';

  try {
    // Récupère les contacts de confiance de l'utilisatrice
    const contacts = await knex('contacts')
      .where({ user_id: userId, organization_id: organizationId });

    if (contacts.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'Aucun contact de confiance enregistré. Ajoute des contacts avant d\'envoyer une alerte.',
      });
    }

    // Envoie les SMS via le service (gère sandbox vs production)
    const logs = await sendAlertSMS({
      alertId:       value.alert_id || null,
      userId,
      organizationId,
      level:         value.level,
      contacts,
      locationLabel: value.location_label,
      isSimulated,
    });

    const sentCount   = logs.filter((l) => ['sent', 'simulated'].includes(l.status)).length;
    const failedCount = logs.filter((l) => l.status === 'failed').length;

    return res.json({
      success: true,
      data: {
        sent:       sentCount,
        failed:     failedCount,
        simulated:  isSimulated,
        total:      contacts.length,
        logs,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur envoi SMS' });
  }
});

/**
 * GET /api/sms/logs
 * Historique des SMS envoyés par l'utilisatrice (ses propres envois).
 */
router.get('/logs', async (req, res) => {
  try {
    const logs = await knex('sms_logs')
      .where({ user_id: req.user.userId, organization_id: req.user.organizationId })
      .orderBy('created_at', 'desc')
      .limit(50);

    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur récupération logs SMS' });
  }
});

module.exports = router;
