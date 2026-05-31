/**
 * Routes pour Firebase Cloud Messaging
 * Enregistrement des tokens et notifications
 */

const express = require('express');
const Joi = require('joi');
const { requireAuth } = require('../middlewares/auth');
const { registerFCMToken, sendNotificationToUser } = require('../services/firebase.service');

const router = express.Router();
router.use(requireAuth);

const registerTokenSchema = Joi.object({
  token: Joi.string().min(10).required(),
  deviceType: Joi.string().valid('web', 'android', 'ios').default('web'),
});

/**
 * POST /api/fcm/register-token
 * Enregistrer un token FCM pour l'utilisateur
 */
router.post('/register-token', async (req, res) => {
  try {
    const { error, value } = registerTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { userId } = req.user;
    const result = await registerFCMToken(userId, value.token, value.deviceType);

    return res.json(result);
  } catch (err) {
    console.error('[FCM] Register token error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

/**
 * POST /api/fcm/test
 * Tester l'envoi d'une notification (dev only)
 */
router.post('/test', async (req, res) => {
  try {
    if (process.env.APP_MODE === 'production') {
      return res.status(403).json({ success: false, error: 'Not available in production' });
    }

    const { userId } = req.user;
    const result = await sendNotificationToUser(userId, {
      title: '🧪 Test Notification',
      body: 'This is a test notification from HerSafety',
      link: '/dashboard',
    }, {
      testNotification: 'true',
    });

    return res.json(result);
  } catch (err) {
    console.error('[FCM] Test error:', err);
    return res.status(500).json({ success: false, error: 'Test failed' });
  }
});

module.exports = router;
