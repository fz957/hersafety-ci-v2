/**
 * Email service
 * Sends emails via SMTP (Nodemailer)
 */

const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Initialize email transporter
 */
const initializeTransporter = () => {
  if (transporter) return;

  try {
    if (process.env.EMAIL_PROVIDER === 'gmail') {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASSWORD,
        },
      });
    } else if (process.env.EMAIL_PROVIDER === 'sendgrid') {
      transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });
    } else if (process.env.EMAIL_PROVIDER === 'mailtrap') {
      transporter = nodemailer.createTransport({
        host: 'smtp.mailtrap.io',
        port: 2525,
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASSWORD,
        },
      });
    } else {
      // Generic SMTP
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        } : undefined,
      });
    }

    console.log(`✓ Email transporter initialized (${process.env.EMAIL_PROVIDER || 'SMTP'})`);
  } catch (err) {
    console.error('✗ Email transporter init failed:', err.message);
  }
};

/**
 * Send verification email to contact
 */
const sendVerificationEmail = async (email, verificationToken, senderName) => {
  try {
    if (!transporter) initializeTransporter();
    if (!transporter) {
      console.warn('Email service not configured, skipping verification email');
      return { success: false, error: 'Email service not configured' };
    }

    const verificationLink = `${process.env.APP_URL}/api/contacts/verify-email?token=${verificationToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
        <h2 style="color: #C2185B;">Vérification d'email — HerSafety</h2>
        <p>Bonjour,</p>
        <p><strong>${senderName}</strong> t'a ajouté(e) comme contact d'urgence sur HerSafety.</p>
        <p>En cas de situation dangereuse, elle pourra t'alerter par email et notification.</p>

        <div style="margin: 24px 0;">
          <a href="${verificationLink}"
             style="background: #C2185B; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
            ✓ Vérifier mon email
          </a>
        </div>

        <p style="font-size: 12px; color: #666;">
          Ou copie ce lien: <br>
          <code style="word-break: break-all;">${verificationLink}</code>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="font-size: 12px; color: #999;">
          Cet email a été envoyé parce que tu as été ajouté(e) comme contact d'urgence.<br>
          Si ce n'est pas toi, ignore cet email.
        </p>
      </div>
    `;

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@hersafety.ci',
      to: email,
      subject: '✓ Vérification email — HerSafety',
      html: htmlContent,
      text: `Vérification email HerSafety\n\n${senderName} t'a ajouté(e) comme contact d'urgence.\n\nVérification: ${verificationLink}`,
    });

    console.log(`✓ Verification email sent to ${email}:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('✗ Verification email failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send alert notification email to contact
 */
const sendAlertEmail = async (email, alertData) => {
  try {
    if (!transporter) initializeTransporter();
    if (!transporter) {
      console.warn('Email service not configured, skipping alert email');
      return { success: false, error: 'Email service not configured' };
    }

    const { senderName, alertLevel, locationLabel, createdAt } = alertData;
    const levelLabels = { '1': 'Vigilance', '2': 'Malaise', '3': 'DANGER', '4': 'SOS' };
    const levelColors = { '1': '#7B9171', '2': '#F48FB1', '3': '#C97B3B', '4': '#B71C1C' };

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
        <div style="background: ${levelColors[alertLevel]}; color: white; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 28px;">🚨 ${levelLabels[alertLevel]}</h1>
          <p style="margin: 8px 0 0 0; font-size: 14px;">
            ${senderName} a déclenché une alerte d'urgence
          </p>
        </div>

        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          ${locationLabel ? `<p><strong>📍 Localisation:</strong> ${locationLabel}</p>` : ''}
          <p><strong>⏰ Heure:</strong> ${new Date(createdAt).toLocaleString('fr-FR')}</p>
          <p><strong>🆘 Niveau:</strong> ${levelLabels[alertLevel]}</p>
        </div>

        <p style="color: #666;">
          HerSafety t'a notifié(e) parce que tu es dans sa liste de contacts d'urgence.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="font-size: 12px; color: #999;">
          Garde cet email et partage-le si nécessaire.<br>
          © HerSafety — Sécurité des femmes
        </p>
      </div>
    `;

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@hersafety.ci',
      to: email,
      subject: `🚨 ALERTE ${levelLabels[alertLevel]} — ${senderName}`,
      html: htmlContent,
      text: `ALERTE ${levelLabels[alertLevel]}\n\n${senderName} a déclenché une alerte.\n${locationLabel ? `Localisation: ${locationLabel}` : ''}`,
    });

    console.log(`✓ Alert email sent to ${email}:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('✗ Alert email failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send track notification to contact
 */
const sendTrackNotification = async (email, trackData) => {
  try {
    if (!transporter) initializeTransporter();
    if (!transporter) {
      console.warn('Email service not configured, skipping track notification');
      return { success: false, error: 'Email service not configured' };
    }

    const { senderName, trackLink } = trackData;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
        <div style="background: linear-gradient(135deg, #7B9171, #3d6b30); color: white; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 28px;">🚗 ${senderName} a démarré un trajet</h1>
          <p style="margin: 8px 0 0 0; font-size: 14px;">
            Clique pour suivre sa position en direct
          </p>
        </div>

        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0;">
            <strong>📍 Suivi en temps réel</strong>
          </p>
          <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">
            Tu peux voir exactement où ${senderName} se trouve et ses déplacements.
          </p>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${trackLink}"
             style="background: #7B9171; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; font-size: 16px;">
            Voir la position en direct
          </a>
        </div>

        <p style="color: #666; font-size: 13px;">
          HerSafety t'a notifié(e) parce que tu es dans sa liste de contacts de confiance.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="font-size: 12px; color: #999;">
          © HerSafety — Sécurité des femmes
        </p>
      </div>
    `;

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@hersafety.ci',
      to: email,
      subject: `📍 ${senderName} partage sa position en direct`,
      html: htmlContent,
      text: `${senderName} a démarré un trajet. Voir sa position: ${trackLink}`,
    });

    console.log(`✓ Track notification sent to ${email}:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('✗ Track notification failed:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  initializeTransporter,
  sendVerificationEmail,
  sendAlertEmail,
  sendTrackNotification,
};
