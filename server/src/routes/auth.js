const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const Joi     = require('joi');
const crypto  = require('crypto');

const knex            = require('../db/knex');
const { authLimiter } = require('../middlewares/rateLimit');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

// ─── Schémas Joi ────────────────────────────────────────────────────────────

const registerSchema = Joi.object({
  email:     Joi.string().email().max(255).required(),
  password:  Joi.string().min(8).max(128).required(),
  full_name: Joi.string().max(255).required(),
  phone:     Joi.string().max(20).optional(),
  join_code: Joi.string().optional(),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, organizationId: user.organization_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

function setAuthCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('token', accessToken, {
    httpOnly: true,
    secure:   isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge:   24 * 60 * 60 * 1000, // 24h
    path:     '/',  // Important: envoi à tous les endpoints
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:   isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7j
    path:     '/api/auth/refresh',
  });
}

async function countRecentFailedAttempts(email) {
  const since = new Date(Date.now() - 15 * 60 * 1000); // 15 min
  const result = await knex('login_attempts')
    .where({ email, success: false })
    .where('attempted_at', '>', since)
    .count('id as total')
    .first();
  return parseInt(result.total, 10);
}

async function logAttempt(email, ip, success) {
  await knex('login_attempts').insert({ email, ip_address: ip, success });
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { email, password, full_name, phone, join_code } = value;

  try {
    // Si un join_code est fourni, on l'utilise ; sinon on rattache à l'org par défaut HerSafety CI
    const orgQuery = join_code
      ? { join_code, is_active: true, is_approved: true }
      : { join_code: 'HERSAFE1', is_active: true, is_approved: true };

    const org = await knex('organizations').where(orgQuery).first();

    if (!org) {
      return res.status(400).json({
        success: false,
        error: join_code ? 'Code d\'invitation invalide ou organisation inactive' : 'Organisation par défaut introuvable',
      });
    }

    // Email déjà utilisé ?
    const existing = await knex('users').where({ email }).first();
    if (existing) {
      return res.status(409).json({ success: false, error: 'Cette adresse email est déjà utilisée' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const [user] = await knex('users')
      .insert({ organization_id: org.id, email, password_hash, full_name, phone })
      .returning(['id', 'organization_id', 'email', 'full_name', 'role', 'onboarding_done']);

    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Stocke le hash du refresh token en base
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await knex('refresh_tokens').insert({ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt });

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, onboarding_done: user.onboarding_done },
        organization: { id: org.id, name: org.name, type: org.type },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur lors de l\'inscription' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post('/login', authLimiter, async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { email, password } = value;
  const ip = req.ip;

  try {
    // Brute-force : 5 tentatives échouées dans les 15 dernières minutes
    const failedCount = await countRecentFailedAttempts(email);
    if (failedCount >= 5) {
      return res.status(429).json({
        success: false,
        error: 'Compte temporairement bloqué après trop de tentatives. Réessayez dans 15 minutes.',
      });
    }

    const user = await knex('users')
      .where({ email, is_active: true })
      .first();

    if (!user) {
      await logAttempt(email, ip, false);
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      await logAttempt(email, ip, false);
      const remaining = 4 - failedCount;
      return res.status(401).json({
        success: false,
        error: `Email ou mot de passe incorrect. ${remaining > 0 ? `${remaining} tentative(s) restante(s).` : 'Dernière tentative avant blocage.'}`,
      });
    }

    // Vérifie que l'organisation est toujours active
    const org = await knex('organizations')
      .where({ id: user.organization_id, is_active: true, is_approved: true })
      .first();

    if (!org) {
      return res.status(403).json({ success: false, error: 'Votre organisation est inactive ou non approuvée' });
    }

    await logAttempt(email, ip, true);

    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Supprime les anciens refresh tokens de cet utilisateur
    await knex('refresh_tokens').where({ user_id: user.id }).delete();
    await knex('refresh_tokens').insert({ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt });

    setAuthCookies(res, accessToken, refreshToken);

    return res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, onboarding_done: user.onboarding_done },
        organization: { id: org.id, name: org.name, type: org.type },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur lors de la connexion' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

router.post('/logout', requireAuth, async (req, res) => {
  try {
    await knex('refresh_tokens').where({ user_id: req.user.userId }).delete();
  } catch (_) {
    // On efface les cookies même si la suppression DB échoue
  }

  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('token',        { httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax' });
  res.clearCookie('refreshToken', { httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax', path: '/api/auth/refresh' });

  return res.json({ success: true, data: { message: 'Déconnexion réussie' } });
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ success: false, error: 'Refresh token manquant' });
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = await knex('refresh_tokens')
      .where({ user_id: payload.userId, token_hash: tokenHash })
      .where('expires_at', '>', new Date())
      .first();

    if (!stored) {
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      return res.status(401).json({ success: false, error: 'Refresh token invalide ou expiré' });
    }

    const user = await knex('users').where({ id: payload.userId, is_active: true }).first();
    if (!user) {
      return res.status(401).json({ success: false, error: 'Utilisateur introuvable' });
    }

    const newAccessToken = generateAccessToken(user);

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', newAccessToken, {
      httpOnly: true,
      secure:   isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge:   24 * 60 * 60 * 1000,
    });

    return res.json({ success: true, data: { message: 'Token renouvelé' } });
  } catch (err) {
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    return res.status(401).json({ success: false, error: 'Refresh token invalide' });
  }
});

// ─── POST /api/auth/verify-phone/send ─────────────────────────────────────────

const sendOtpSchema = Joi.object({
  phone: Joi.string().max(20).required(),
});

router.post('/verify-phone/send', requireAuth, async (req, res) => {
  const { error, value } = sendOtpSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  // Check if phone verification is enabled (dev/test toggle)
  const phoneVerificationEnabled = process.env.PHONE_VERIFICATION_ENABLED === 'true';

  try {
    // Use test code "000000" if phone verification is disabled (testing mode on PC)
    const code = phoneVerificationEnabled ? Math.random().toString().slice(2, 8) : '000000';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    await knex('users')
      .where({ id: req.user.userId })
      .update({
        phone: value.phone,
        phone_verification_code: code,
        phone_verification_expires_at: expiresAt,
      });

    // En dev/test, log le code à la console. En prod, envoyer via SMS
    if (!phoneVerificationEnabled) {
      console.log(`[DEV MODE] Phone verification disabled - test code: ${code}`);
      return res.json({ success: true, data: { message: 'Code test: 000000', test_mode: true, expires_in_seconds: 300 } });
    }

    if (process.env.APP_MODE !== 'production') {
      console.log(`[DEV] OTP code for ${value.phone}: ${code}`);
    } else {
      // TODO: Envoyer SMS via Africa's Talking
      // await smsService.sendOTP(value.phone, code);
    }

    return res.json({ success: true, data: { message: 'Code envoyé', expires_in_seconds: 300 } });
  } catch (err) {
    console.error('OTP send error:', err);
    return res.status(500).json({ success: false, error: 'Erreur envoi code' });
  }
});

// ─── POST /api/auth/verify-phone/confirm ──────────────────────────────────────

const confirmOtpSchema = Joi.object({
  code: Joi.string().length(6).required(),
});

router.post('/verify-phone/confirm', requireAuth, async (req, res) => {
  const { error, value } = confirmOtpSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const user = await knex('users').where({ id: req.user.userId }).first();

    if (!user || !user.phone_verification_code) {
      return res.status(400).json({ success: false, error: 'Aucun code envoyé' });
    }

    if (new Date() > new Date(user.phone_verification_expires_at)) {
      return res.status(400).json({ success: false, error: 'Code expiré' });
    }

    if (user.phone_verification_code !== value.code) {
      return res.status(400).json({ success: false, error: 'Code incorrect' });
    }

    // Code valide: mettre à jour l'utilisateur
    await knex('users')
      .where({ id: req.user.userId })
      .update({
        phone_verified: true,
        phone_verification_code: null,
        phone_verification_expires_at: null,
        onboarding_step: 'contacts',
      });

    return res.json({
      success: true,
      data: {
        message: 'Téléphone vérifié',
        onboarding_step: 'contacts',
      },
    });
  } catch (err) {
    console.error('OTP confirm error:', err);
    return res.status(500).json({ success: false, error: 'Erreur vérification code' });
  }
});

module.exports = router;
