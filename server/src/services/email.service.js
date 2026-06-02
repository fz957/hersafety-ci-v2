/**
 * Email service
 * Sends emails via SMTP (Nodemailer)
 */

const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

// Logger helper - only logs in development mode
const isDev = process.env.NODE_ENV === 'development';
const log = (...args) => isDev && console.log(...args);

let transporter = null;

// MailerSend API wrapper (compatible with nodemailer interface)
class MailerSendTransporter {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.mailersend.com/v1';
  }

  async sendMail(mailOptions) {
    try {
      const response = await fetch(`${this.baseUrl}/email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: {
            email: mailOptions.from,
            name: 'HerSafety',
          },
          to: [{ email: mailOptions.to }],
          subject: mailOptions.subject,
          html: mailOptions.html,
          text: mailOptions.text || '',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`MailerSend API error: ${error.message || response.statusText}`);
      }

      return { response: { messageId: await response.json() } };
    } catch (err) {
      throw err;
    }
  }
}

// Resend API wrapper (compatible with nodemailer interface)
class ResendTransporter {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.resend.com';
  }

  async sendMail(mailOptions) {
    try {
      const response = await fetch(`${this.baseUrl}/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: mailOptions.from,
          to: mailOptions.to,
          subject: mailOptions.subject,
          html: mailOptions.html,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Resend API error: ${error.message || response.statusText}`);
      }

      const data = await response.json();
      return { response: { messageId: data.id } };
    } catch (err) {
      throw err;
    }
  }
}

// Helper to get correct "from" email based on provider
const getFromEmail = () => {
  if (process.env.EMAIL_PROVIDER === 'resend') {
    return 'onboarding@resend.dev'; // Resend test domain
  }
  if (process.env.EMAIL_PROVIDER === 'mailersend' && process.env.MAILERSEND_DOMAIN) {
    return `noreply@${process.env.MAILERSEND_DOMAIN}`;
  }
  return process.env.GMAIL_USER || process.env.SMTP_USER || 'noreply@hersafety.com';
};

/**
 * Initialize email transporter
 */
const initializeTransporter = () => {
  if (transporter) {
    console.log('[Email] Transporter already initialized');
    return;
  }

  try {
    console.log('[Email] ===== INITIALIZING TRANSPORTER =====');
    console.log('[Email] EMAIL_PROVIDER:', process.env.EMAIL_PROVIDER);
    console.log('[Email] MAILERSEND_API_KEY:', process.env.MAILERSEND_API_KEY ? `✓ Length ${process.env.MAILERSEND_API_KEY.length}` : '✗ NOT SET');
    console.log('[Email] MAILERSEND_DOMAIN:', process.env.MAILERSEND_DOMAIN || '✗ NOT SET');
    console.log('[Email] FROM_EMAIL:', getFromEmail());
    console.log('[Email] GMAIL_USER:', process.env.GMAIL_USER ? `✓ ${process.env.GMAIL_USER}` : '✗ NOT SET');
    console.log('[Email] GMAIL_PASSWORD:', process.env.GMAIL_PASSWORD ? `✓ Length ${process.env.GMAIL_PASSWORD.length}` : '✗ NOT SET');

    if (process.env.EMAIL_PROVIDER === 'resend') {
      transporter = new ResendTransporter(process.env.RESEND_API_KEY);
    } else if (process.env.EMAIL_PROVIDER === 'mailersend') {
      transporter = new MailerSendTransporter(process.env.MAILERSEND_API_KEY);
    } else if (process.env.EMAIL_PROVIDER === 'gmail') {
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // Use TLS instead of SSL
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

    console.log(`✓ [Email] Transporter initialized (${process.env.EMAIL_PROVIDER || 'SMTP'})`);
  } catch (err) {
    console.error('✗ [Email] Transporter init FAILED:', err.message);
    console.error('[Email] Full error:', err);
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

    log(`✓ Verification email sent to ${email}:`, result.messageId);
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

    log(`✓ Alert email sent to ${email}:`, result.messageId);
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

    log(`✓ Track notification sent to ${email}:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('✗ Track notification failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send profile change confirmation email
 */
const sendProfileChangeEmail = async (email, userName, changes) => {
  try {
    console.log('[Email] ===== sendProfileChangeEmail called =====');
    console.log('[Email] Email to:', email);
    console.log('[Email] Changes:', Object.keys(changes));

    if (!transporter) {
      console.log('[Email] Transporter not initialized, initializing...');
      initializeTransporter();
    }

    if (!transporter) {
      console.error('[Email] ✗ Transporter STILL not initialized after initialization attempt');
      return { success: false, error: 'Email service not configured' };
    }

    console.log('[Email] ✓ Transporter ready, preparing email...');

    const changesList = Object.entries(changes)
      .map(([key, value]) => {
        const labels = {
          full_name: 'Nom complet',
          email: 'Email',
          phone: 'Téléphone',
        };
        return `<li><strong>${labels[key] || key}:</strong> ${value}</li>`;
      })
      .join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
        <div style="background: #EC9C9D; color: white; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 24px;">✏️ Profil mis à jour</h1>
        </div>

        <p>Salut ${userName},</p>
        <p>Ton profil a été modifié avec les changements suivants:</p>

        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <ul style="color: #666;">${changesList}</ul>
        </div>

        <p style="color: #666;">
          Si tu n'as pas effectué ces modifications, <strong>change immédiatement ton mot de passe</strong>.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="font-size: 12px; color: #999;">
          © HerSafety CI — Sécurité des femmes
        </p>
      </div>
    `;

    console.log('[Email] Calling transporter.sendMail()...');
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@hersafety.ci',
      to: email,
      subject: '✏️ Ton profil HerSafety CI a été modifié',
      html: htmlContent,
    });

    console.log('✓ [Email] Profile change email SENT:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('✗ [Email] Profile change email FAILED:', err.message);
    console.error('[Email] Full error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Send account deletion confirmation email
 */
const sendAccountDeletionEmail = async (email, userName) => {
  try {
    if (!transporter) initializeTransporter();
    if (!transporter) {
      return { success: false, error: 'Email service not configured' };
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
        <div style="background: #B71C1C; color: white; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 24px;">⚠️ Compte supprimé</h1>
        </div>

        <p>Salut ${userName},</p>
        <p>Ton compte HerSafety CI a été supprimé ainsi que toutes tes données associées.</p>

        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #666; margin: 0;">
            • Tous tes trajets ont été supprimés<br>
            • Tous tes contacts ont été supprimés<br>
            • Toutes tes alertes ont été supprimées<br>
            • Tes données personnelles ont été effacées
          </p>
        </div>

        <p style="color: #666;">
          Si tu as besoin de restaurer ton compte, contacte notre support.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="font-size: 12px; color: #999;">
          © HerSafety CI — Merci d'avoir utilisé notre service
        </p>
      </div>
    `;

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@hersafety.ci',
      to: email,
      subject: '⚠️ Ton compte HerSafety CI a été supprimé',
      html: htmlContent,
    });

    log(`✓ Account deletion email sent to ${email}`);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('✗ Account deletion email failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send alert confirmation email to user
 */
const sendAlertConfirmationEmail = async (email, userName, alertLevel, contactsCount, locationLabel) => {
  try {
    if (!transporter) initializeTransporter();
    if (!transporter) {
      return { success: false, error: 'Email service not configured' };
    }

    const levelLabels = { '1': 'Vigilance', '2': 'Malaise', '3': 'DANGER', '4': 'SOS' };
    const levelColors = { '1': '#7B9171', '2': '#F48FB1', '3': '#C97B3B', '4': '#B71C1C' };

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
        <div style="background: ${levelColors[alertLevel]}; color: white; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 28px;">✓ Alerte ${levelLabels[alertLevel]} envoyée</h1>
          <p style="margin: 8px 0 0 0; font-size: 14px;">
            ${contactsCount} contact(s) a/ont reçu ta notification
          </p>
        </div>

        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0;"><strong>📍 Localisation:</strong> ${locationLabel || 'Non précisée'}</p>
          <p style="margin: 8px 0 0 0;"><strong>⏰ Heure:</strong> ${new Date().toLocaleString('fr-FR')}</p>
          <p style="margin: 8px 0 0 0;"><strong>🆘 Niveau:</strong> ${levelLabels[alertLevel]}</p>
        </div>

        <div style="background: #f0f0f0; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid ${levelColors[alertLevel]};">
          <h3 style="margin-top: 0;">💡 Que faire maintenant?</h3>
          <ul style="color: #666; margin: 0; padding-left: 20px;">
            <li>Reste en sécurité et suis tes instincts</li>
            <li>Tes contacts sont en alerte et peuvent t'aider</li>
            <li>Appelle les services d'urgence si nécessaire</li>
            <li>Tu peux escalader le niveau si la situation s'aggrave</li>
          </ul>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="font-size: 12px; color: #999;">
          © HerSafety CI — Sécurité des femmes
        </p>
      </div>
    `;

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@hersafety.ci',
      to: email,
      subject: `✓ Alerte ${levelLabels[alertLevel]} confirmée — ${contactsCount} contact(s) notifié(s)`,
      html: htmlContent,
    });

    log(`✓ Alert confirmation email sent to ${email}`);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('✗ Alert confirmation email failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send weekly report email
 */
const sendWeeklyReport = async (email, userName, reportData) => {
  try {
    if (!transporter) initializeTransporter();
    if (!transporter) {
      return { success: false, error: 'Email service not configured' };
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
        <div style="background: #EC9C9D; color: white; padding: 20px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">📊 Rapport Hebdomadaire</h1>
        </div>

        <p>Salut ${userName},</p>
        <p>Voici un résumé de ton activité cette semaine:</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #5C7F4F;">
            <h3 style="color: #5C7F4F; margin-top: 0; font-size: 24px;">${reportData.tracksCount || 0}</h3>
            <p style="color: #666; margin: 0; font-size: 13px;">🚗 Trajets suivis</p>
          </div>

          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #EC9C9D;">
            <h3 style="color: #EC9C9D; margin-top: 0; font-size: 24px;">${reportData.alertsCount || 0}</h3>
            <p style="color: #666; margin: 0; font-size: 13px;">🚨 Alertes envoyées</p>
          </div>

          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #C97B3B;">
            <h3 style="color: #C97B3B; margin-top: 0; font-size: 24px;">${reportData.checkinsDone || 0}</h3>
            <p style="color: #666; margin: 0; font-size: 13px;">✅ Check-ins complétés</p>
          </div>

          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #5C7F4F;">
            <h3 style="color: #5C7F4F; margin-top: 0; font-size: 24px;">${reportData.contactsAdded || 0}</h3>
            <p style="color: #666; margin: 0; font-size: 13px;">👥 Contacts ajoutés</p>
          </div>
        </div>

        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #443025;">
          <h3 style="color: #443025; margin-top: 0;">💡 Conseil de sécurité</h3>
          <p style="color: #666; margin: 0;">
            Partage toujours un trajet avec tes contacts de confiance, surtout en soirée.
            La sécurité collective est notre priorité. 🛡️
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="font-size: 12px; color: #999;">
          © HerSafety CI — Sécurité des femmes
        </p>
      </div>
    `;

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@hersafety.ci',
      to: email,
      subject: '📊 Ton rapport hebdomadaire HerSafety CI',
      html: htmlContent,
    });

    log(`✓ Weekly report sent to ${email}`);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('✗ Weekly report email failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send admin notification for new alert
 */
const sendAdminAlertNotification = async (adminEmail, alertData, userName) => {
  try {
    if (!transporter) initializeTransporter();
    if (!transporter) {
      console.warn('Email service not configured, skipping admin alert notification');
      return { success: false, error: 'Email service not configured' };
    }

    const levelLabels = {
      '1': '🟢 Vigilance',
      '2': '🟡 Malaise',
      '3': '🔴 Danger',
      '4': '🔴 SOS'
    };

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
        <h2 style="color: #B23A48;">⚠️ Nouvelle Alerte — HerSafety Admin</h2>
        <p>Une utilisatrice a créé une nouvelle alerte.</p>

        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Utilisatrice:</strong> ${userName || 'Anonyme'}</p>
          <p><strong>Niveau:</strong> ${levelLabels[alertData.alert_level] || 'Unknown'}</p>
          <p><strong>Heure:</strong> ${new Date(alertData.created_at).toLocaleString('fr-FR')}</p>
          ${alertData.location ? `<p><strong>Localisation:</strong> ${alertData.location}</p>` : ''}
        </div>

        <p style="margin-top: 24px;">
          <a href="${process.env.APP_URL}/admin/dashboard"
             style="background: #C2185B; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
            Voir les alertes
          </a>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="font-size: 12px; color: #999;">
          Cette notification a été envoyée car tu as activé les notifications email d'admin.
        </p>
      </div>
    `;

    const result = await transporter.sendMail({
      from: getFromEmail(),
      to: adminEmail,
      subject: `🚨 Nouvelle alerte — ${userName || 'Utilisatrice'}`,
      html: htmlContent,
    });

    log(`✓ Admin alert notification sent to ${adminEmail}`);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('✗ Admin alert notification failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send admin notification for new report
 */
const sendAdminReportNotification = async (adminEmail, reportData, userName) => {
  try {
    if (!transporter) initializeTransporter();
    if (!transporter) {
      console.warn('Email service not configured, skipping admin report notification');
      return { success: false, error: 'Email service not configured' };
    }

    const dangerTypes = {
      'vol': '🚔 Vol',
      'agression_physique': '👊 Agression physique',
      'harcelement_verbal': '🗣️ Harcèlement verbal',
      'suivi': '👁️ Suivi',
      'autre': '⚠️ Autre'
    };

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
        <h2 style="color: #B23A48;">📍 Nouveau Signalement — HerSafety Admin</h2>
        <p>Une utilisatrice a signalé une zone dangereuse.</p>

        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Utilisatrice:</strong> ${userName || 'Anonyme'}</p>
          <p><strong>Lieu:</strong> ${reportData.place_name || 'Localisation non identifiée'}</p>
          <p><strong>Type de danger:</strong> ${dangerTypes[reportData.danger_type] || reportData.danger_type || 'Non spécifié'}</p>
          <p><strong>Description:</strong> ${reportData.description || 'Aucune'}</p>
          <p><strong>Heure:</strong> ${new Date(reportData.created_at).toLocaleString('fr-FR')}</p>
        </div>

        <p style="margin-top: 24px;">
          <a href="${process.env.APP_URL}/admin/reports"
             style="background: #C2185B; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
            Modérer ce signalement
          </a>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="font-size: 12px; color: #999;">
          Cette notification a été envoyée car tu as activé les notifications email d'admin.
        </p>
      </div>
    `;

    const result = await transporter.sendMail({
      from: getFromEmail(),
      to: adminEmail,
      subject: `📍 Nouveau signalement — ${reportData.place_name || 'Zone dangereuse'}`,
      html: htmlContent,
    });

    log(`✓ Admin report notification sent to ${adminEmail}`);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('✗ Admin report notification failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send admin notification for new comment
 */
const sendAdminCommentNotification = async (adminEmail, commentData, userName, contentType) => {
  try {
    if (!transporter) initializeTransporter();
    if (!transporter) {
      console.warn('Email service not configured, skipping admin comment notification');
      return { success: false, error: 'Email service not configured' };
    }

    const contentTypes = {
      'article': '📰 Article',
      'photo': '📸 Photo',
      'video': '🎥 Vidéo',
      'testimony': '💬 Témoignage'
    };

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
        <h2 style="color: #B23A48;">💬 Nouveau Commentaire — HerSafety Admin</h2>
        <p>Un nouveau commentaire attend votre modération.</p>

        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Utilisatrice:</strong> ${userName || 'Anonyme'}</p>
          <p><strong>Type:</strong> ${contentTypes[contentType] || contentType || 'Contenu'}</p>
          <p><strong>Commentaire:</strong></p>
          <p style="font-style: italic; padding: 12px; background: white; border-left: 3px solid #C2185B;">
            "${commentData.comment_text || commentData.content || 'Commentaire vide'}"
          </p>
          <p><strong>Heure:</strong> ${new Date(commentData.created_at).toLocaleString('fr-FR')}</p>
        </div>

        <p style="margin-top: 24px;">
          <a href="${process.env.APP_URL}/admin/moderation"
             style="background: #C2185B; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
            Modérer maintenant
          </a>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="font-size: 12px; color: #999;">
          Cette notification a été envoyée car tu as activé les notifications email d'admin.
        </p>
      </div>
    `;

    const result = await transporter.sendMail({
      from: getFromEmail(),
      to: adminEmail,
      subject: `💬 Nouveau commentaire à modérer — ${userName || 'Utilisatrice'}`,
      html: htmlContent,
    });

    log(`✓ Admin comment notification sent to ${adminEmail}`);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('✗ Admin comment notification failed:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  initializeTransporter,
  sendVerificationEmail,
  sendAlertEmail,
  sendTrackNotification,
  sendProfileChangeEmail,
  sendAccountDeletionEmail,
  sendWeeklyReport,
  sendAlertConfirmationEmail,
  sendAdminAlertNotification,
  sendAdminReportNotification,
  sendAdminCommentNotification,
};
