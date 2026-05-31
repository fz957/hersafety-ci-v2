/**
 * Firebase Cloud Messaging service
 * Envoie les notifications push via Google Firebase
 */

const admin = require('firebase-admin');
const path = require('path');

// Logger helper - only logs in development mode
const isDev = process.env.NODE_ENV === 'development';
const log = (...args) => isDev && log(...args);

let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) return;

  try {
    // Utiliser les credentials depuis la variable d'environnement
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      path.join(__dirname, '../../firebase-service-account.json');

    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    firebaseInitialized = true;
    log('✓ Firebase Admin SDK initialized');
  } catch (err) {
    console.error('✗ Firebase init failed:', err.message);
    console.error('Set FIREBASE_SERVICE_ACCOUNT_PATH or place firebase-service-account.json in project root');
  }
};

/**
 * Envoyer une notification push à un utilisateur
 */
const sendNotificationToUser = async (userId, notification, data = {}) => {
  try {
    if (!firebaseInitialized) initializeFirebase();
    if (!firebaseInitialized) {
      console.warn('Firebase not initialized, notification not sent');
      return { success: false, error: 'Firebase not initialized' };
    }

    const knex = require('../db/knex');
    const tokens = await knex('fcm_tokens')
      .where({ user_id: userId })
      .select('token');

    if (tokens.length === 0) {
      log(`[FCM] No tokens for user ${userId}`);
      return { success: false, error: 'No FCM tokens' };
    }

    const message = {
      notification: {
        title: notification.title || 'HerSafety',
        body: notification.body || 'Notification',
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      webpush: {
        urgency: 'high',
        fcmOptions: {
          link: notification.link || '/',
        },
      },
    };

    const results = [];
    for (const { token } of tokens) {
      try {
        const response = await admin.messaging().send({
          ...message,
          token,
        });
        results.push({ token, success: true, response });
        log(`[FCM] Sent to ${userId}:`, response);
      } catch (err) {
        results.push({ token, success: false, error: err.message });
        console.error(`[FCM] Failed for token:`, err.message);
      }
    }

    // Mettre à jour last_used_at
    await knex('fcm_tokens').where({ user_id: userId }).update({
      last_used_at: knex.fn.now(),
    });

    return { success: results.some(r => r.success), results };
  } catch (err) {
    console.error('[FCM] Send error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Envoyer une notification à tous les contacts d'une utilisatrice
 */
const notifyContacts = async (userId, organizationId, contacts, notification) => {
  try {
    const knex = require('../db/knex');

    const contactUsers = await knex('users')
      .where({ organization_id: organizationId })
      .whereIn('phone_number', contacts.map(c => c.phone_number))
      .select('id');

    const results = [];
    for (const { id } of contactUsers) {
      const result = await sendNotificationToUser(id, notification, {
        alertType: 'contact_notification',
        alertFromUserId: userId,
      });
      results.push(result);
    }

    return { success: results.some(r => r.success), results };
  } catch (err) {
    console.error('[FCM] Notify contacts error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Enregistrer un nouveau token FCM
 */
const registerFCMToken = async (userId, organizationId, token, deviceType = 'web') => {
  try {
    const knex = require('../db/knex');

    const existing = await knex('fcm_tokens').where({
      user_id: userId,
      token,
    });

    if (existing.length > 0) {
      // Token existe déjà, juste update last_used_at
      await knex('fcm_tokens')
        .where({ user_id: userId, token })
        .update({ last_used_at: knex.fn.now() });
      return { success: true, isNew: false };
    }

    // Nouveau token
    await knex('fcm_tokens').insert({
      user_id: userId,
      organization_id: organizationId,
      token,
      device_type: deviceType,
    });

    log(`[FCM] Registered token for user ${userId}`);
    return { success: true, isNew: true };
  } catch (err) {
    console.error('[FCM] Register token error:', err);
    return { success: false, error: err.message };
  }
};

module.exports = {
  initializeFirebase,
  sendNotificationToUser,
  notifyContacts,
  registerFCMToken,
};
