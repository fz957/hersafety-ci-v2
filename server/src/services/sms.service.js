const knex = require('../db/knex');

let smsProvider = null;

function getProvider() {
  if (!smsProvider && process.env.AFRICASTALKING_API_KEY) {
    const AfricasTalking = require('africastalking');
    const at = AfricasTalking({
      apiKey:   process.env.AFRICASTALKING_API_KEY,
      username: process.env.AFRICASTALKING_USERNAME || 'sandbox',
    });
    smsProvider = at.SMS;
  }
  return smsProvider;
}

const LEVEL_MESSAGES = {
  '2': (label) => `🔵 HerSafety : Je ne me sens pas bien. Contactez-moi.${label ? ` Position : ${label}` : ''}`,
  '3': (label) => `🔴 HerSafety URGENCE : Je suis en danger ! Appelez le 110.${label ? ` Position : ${label}` : ''}`,
  '4': (label) => `🆘 HerSafety SOS : DANGER IMMÉDIAT. Appelez le 110 maintenant !${label ? ` Position : ${label}` : ''}`,
};

/**
 * Envoie un SMS à chaque contact et logue le résultat.
 * En mode développement (isSimulated=true) aucun vrai SMS n'est envoyé.
 */
async function sendAlertSMS({ alertId, userId, organizationId, level, contacts, locationLabel, isSimulated }) {
  const message = (LEVEL_MESSAGES[level] || LEVEL_MESSAGES['3'])(locationLabel);
  const provider = getProvider();
  const results = [];

  for (const contact of contacts) {
    const log = {
      alert_id:        alertId,
      user_id:         userId,
      organization_id: organizationId,
      contact_id:      contact.id,
      phone_to:        contact.phone,
      message,
      is_simulated:    isSimulated,
    };

    try {
      if (!isSimulated && provider) {
        const response = await provider.send({ to: [contact.phone], message, from: 'HerSafety' });
        const recipient = response.SMSMessageData?.Recipients?.[0];
        log.status       = recipient?.status === 'Success' ? 'sent' : 'failed';
        log.provider_ref = recipient?.messageId;
        log.sent_at      = new Date();
        if (log.status === 'failed') log.error_message = recipient?.status;
      } else {
        log.status  = 'simulated';
        log.sent_at = new Date();
      }
    } catch (err) {
      log.status        = 'failed';
      log.error_message = err.message;
    }

    const [row] = await knex('sms_logs').insert(log).returning('*');
    results.push(row);
  }

  return results;
}

module.exports = { sendAlertSMS, LEVEL_MESSAGES };
