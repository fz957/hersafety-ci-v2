require('dotenv').config();
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const { createTestOrg, createTestUser, authCookie, cleanupOrg, knex } = require('./setup');

let org;

beforeAll(async () => {
  await knex.migrate.latest();
  org = await createTestOrg();
});

afterAll(async () => {
  await cleanupOrg(org.id);
  await knex.destroy();
});

afterEach(async () => {
  // Clear login attempts to prevent rate limiting between tests
  await knex('login_attempts').delete();
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('crée un utilisateur avec les données valides', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: `test-${Date.now()}@test.com`,
      password: 'Password123!',
      full_name: 'Aminata Test',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBeTruthy();
    expect(res.body.data.user.id).toBeTruthy();
    expect(res.body.data.organization.id).toBeTruthy();
  });

  it('définit les cookies httpOnly correctement', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: `test-cookie-${Date.now()}@test.com`,
      password: 'Password123!',
      full_name: 'Cookie Test',
    });

    expect(res.status).toBe(201);
    // Vérifier que les cookies httpOnly sont présents
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie.some((c) => c.includes('token='))).toBe(true);
    expect(setCookie.some((c) => c.includes('HttpOnly'))).toBe(true);
  });

  it('rejette un email déjà utilisé', async () => {
    const email = `duplicate-${Date.now()}@test.com`;
    await request(app).post('/api/auth/register').send({
      email,
      password: 'Password123!',
      full_name: 'User 1',
    });

    const res = await request(app).post('/api/auth/register').send({
      email,
      password: 'Password123!',
      full_name: 'User 2',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejette un mot de passe trop court', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: `test-${Date.now()}@test.com`,
      password: 'short',
      full_name: 'Test User',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rattache au HERSAFE1 par défaut si pas de join_code', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: `default-org-${Date.now()}@test.com`,
      password: 'Password123!',
      full_name: 'Default Org User',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.organization.id).toBeTruthy();
  });
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  let testUser;

  beforeAll(async () => {
    testUser = await createTestUser(org.id, {
      email: 'login-test@test.com',
      password_hash: await bcrypt.hash('CorrectPassword123!', 12),
    });
  });

  it('connecte un utilisateur avec email/password valides', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login-test@test.com',
      password: 'CorrectPassword123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBe(testUser.id);
    expect(res.body.data.user.email).toBe('login-test@test.com');
    expect(res.body.data.user.organization_id).toBeUndefined();
    expect(res.body.data.organization.id).toBe(org.id);
  });

  it('retourne les données organisation séparément', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login-test@test.com',
      password: 'CorrectPassword123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data).toHaveProperty('organization');
    expect(res.body.data.organization.name).toBe(org.name);
    expect(res.body.data.organization.type).toBe('ong');
  });

  it('définit le token cookie avec path=/', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login-test@test.com',
      password: 'CorrectPassword123!',
    });

    const setCookie = res.headers['set-cookie'];
    const tokenCookie = setCookie.find((c) => c.includes('token='));
    expect(tokenCookie).toContain('Path=/');
    expect(tokenCookie).toContain('HttpOnly');
  });

  it('rejette un mot de passe incorrect', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login-test@test.com',
      password: 'WrongPassword123!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejette un email inexistant', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@test.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('bloque après 5 tentatives échouées', async () => {
    const testEmail = `brute-force-${Date.now()}@test.com`;
    await createTestUser(org.id, { email: testEmail });

    // 5 tentatives échouées
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send({
        email: testEmail,
        password: 'WrongPassword!',
      });
    }

    // La 6e tentative avec bon mot de passe devrait être bloquée
    const res = await request(app).post('/api/auth/login').send({
      email: testEmail,
      password: 'CorrectPassword123!',
    });

    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
  });
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  let testUser;

  beforeAll(async () => {
    testUser = await createTestUser(org.id);
  });

  it('retourne 401 sans cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });

  it('efface les cookies de session', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', authCookie(testUser));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const setCookie = res.headers['set-cookie'];
    // Vérifier que des cookies sont bien effacés (contiennent token= et refreshToken=)
    expect(setCookie.some((c) => c.includes('token='))).toBe(true);
    expect(setCookie.some((c) => c.includes('refreshToken='))).toBe(true);
  });

  it('retourne 200 après logout', async () => {
    // D'abord se connecter
    const loginRes = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'Password123!',
    });

    const cookies = loginRes.headers['set-cookie'];

    // Ensuite se déconnecter
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Vérifier que les tokens sont supprimés de la base de données
    const tokenCount = await require('../src/db/knex')('refresh_tokens')
      .where({ user_id: testUser.id })
      .count('* as cnt')
      .first();

    expect(Number(tokenCount.cnt)).toBe(0);
  });
});

// ─── POST /api/auth/refresh ──────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  let testUser;

  beforeAll(async () => {
    testUser = await createTestUser(org.id);
  });

  it('retourne 401 sans refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('renouvelle le token avec un refresh token valide', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'Password123!',
    });

    const refreshToken = loginRes.headers['set-cookie']
      .find((c) => c.includes('refreshToken='))
      .split(';')[0]
      .split('=')[1];

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `refreshToken=${refreshToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'].some((c) => c.includes('token='))).toBe(true);
  });

  it('retourne 401 avec un refresh token expiré', async () => {
    // Créer un token expiré en base
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkdW1teSJ9.dummy';
    const tokenHash = require('crypto').createHash('sha256').update(expiredToken).digest('hex');

    await knex('refresh_tokens').insert({
      user_id: testUser.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() - 1000), // Déjà expiré
    });

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `refreshToken=${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── POST /api/auth/verify-phone/send ───────────────────────────────────────

describe('POST /api/auth/verify-phone/send', () => {
  let testUser;

  beforeAll(async () => {
    testUser = await createTestUser(org.id);
  });

  it('retourne 401 sans cookie', async () => {
    const res = await request(app)
      .post('/api/auth/verify-phone/send')
      .send({ phone: '+225070000000' });

    expect(res.status).toBe(401);
  });

  it('envoie un code OTP pour vérifier le téléphone', async () => {
    const res = await request(app)
      .post('/api/auth/verify-phone/send')
      .set('Cookie', authCookie(testUser))
      .send({ phone: '+225070000001' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.expires_in_seconds).toBe(300);
  });

  it('retourne 400 si phone manquant', async () => {
    const res = await request(app)
      .post('/api/auth/verify-phone/send')
      .set('Cookie', authCookie(testUser))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── POST /api/auth/verify-phone/confirm ────────────────────────────────────

describe('POST /api/auth/verify-phone/confirm', () => {
  let testUser;

  beforeAll(async () => {
    testUser = await createTestUser(org.id);
  });

  it('retourne 401 sans cookie', async () => {
    const res = await request(app)
      .post('/api/auth/verify-phone/confirm')
      .send({ code: '123456' });

    expect(res.status).toBe(401);
  });

  it('retourne 400 si aucun code envoyé', async () => {
    const res = await request(app)
      .post('/api/auth/verify-phone/confirm')
      .set('Cookie', authCookie(testUser))
      .send({ code: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Aucun code envoyé');
  });

  it('retourne 400 si code incorrect', async () => {
    // D'abord envoyer un code
    await request(app)
      .post('/api/auth/verify-phone/send')
      .set('Cookie', authCookie(testUser))
      .send({ phone: '+225070000002' });

    // Essayer avec un code incorrect
    const res = await request(app)
      .post('/api/auth/verify-phone/confirm')
      .set('Cookie', authCookie(testUser))
      .send({ code: '999999' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Code incorrect');
  });

  it('vérifie le téléphone avec le bon code', async () => {
    // Envoyer un code
    await request(app)
      .post('/api/auth/verify-phone/send')
      .set('Cookie', authCookie(testUser))
      .send({ phone: '+225070000003' });

    // Récupérer le code depuis la base
    const user = await knex('users').where({ id: testUser.id }).first();
    const correctCode = user.phone_verification_code;

    // Vérifier avec le bon code
    const res = await request(app)
      .post('/api/auth/verify-phone/confirm')
      .set('Cookie', authCookie(testUser))
      .send({ code: correctCode });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.onboarding_step).toBe('contacts');
  });

  it('retourne 400 si code expiré', async () => {
    // Envoyer un code
    await request(app)
      .post('/api/auth/verify-phone/send')
      .set('Cookie', authCookie(testUser))
      .send({ phone: '+225070000004' });

    // Forcer l'expiration
    await knex('users')
      .where({ id: testUser.id })
      .update({ phone_verification_expires_at: new Date(Date.now() - 1000) });

    const user = await knex('users').where({ id: testUser.id }).first();
    const code = user.phone_verification_code;

    const res = await request(app)
      .post('/api/auth/verify-phone/confirm')
      .set('Cookie', authCookie(testUser))
      .send({ code });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Code expiré');
  });
});

// ─── Additional error case coverage ──────────────────────────────────────────

describe('POST /api/auth/register - error cases', () => {
  it('retourne 400 avec un join_code invalide', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `invalid-code-${Date.now()}@test.com`,
        password: 'Password123!',
        full_name: 'Test User',
        join_code: 'INVALID_CODE_THAT_DOES_NOT_EXIST',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('invalide');
  });

  it('retourne 400 si email invalide', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'not-an-email',
      password: 'Password123!',
      full_name: 'Test User',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('retourne 400 si password trop court au départ', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: `test-${Date.now()}@test.com`,
      password: '1234567', // Moins de 8 caractères
      full_name: 'Test User',
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login - error cases', () => {
  let testUser, testOrg;

  beforeAll(async () => {
    testOrg = await createTestOrg();
    testUser = await createTestUser(testOrg.id);
  });

  it('retourne 403 si organisation inactive', async () => {
    // Désactiver l'organisation
    await knex('organizations').where({ id: testOrg.id }).update({ is_active: false });

    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'Password123!',
    });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('organisation');

    // Réactiver pour ne pas affecter les autres tests
    await knex('organizations').where({ id: testOrg.id }).update({ is_active: true });
  });

  it('retourne 400 si email manquant', async () => {
    const res = await request(app).post('/api/auth/login').send({
      password: 'Password123!',
    });

    expect(res.status).toBe(400);
  });

  it('retourne 400 si password manquant', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/refresh - additional cases', () => {
  let testUser;

  beforeAll(async () => {
    testUser = await createTestUser(org.id);
  });

  it('retourne 401 si utilisateur supprimé après émission du token', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'Password123!',
    });

    const refreshToken = loginRes.headers['set-cookie']
      .find((c) => c.includes('refreshToken='))
      .split(';')[0]
      .split('=')[1];

    // Désactiver l'utilisateur
    await knex('users').where({ id: testUser.id }).update({ is_active: false });

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `refreshToken=${refreshToken}`);

    expect(res.status).toBe(401);

    // Réactiver pour ne pas affecter d'autres tests
    await knex('users').where({ id: testUser.id }).update({ is_active: true });
  });

  it('retourne 401 avec un token invalide (non décodable)', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=invalid.token.format');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/verify-phone/send - additional cases', () => {
  let testUser;

  beforeAll(async () => {
    testUser = await createTestUser(org.id);
  });

  it('retourne 400 si phone invalide (trop long)', async () => {
    const res = await request(app)
      .post('/api/auth/verify-phone/send')
      .set('Cookie', authCookie(testUser))
      .send({ phone: 'a'.repeat(21) });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/verify-phone/confirm - additional cases', () => {
  let testUser;

  beforeAll(async () => {
    testUser = await createTestUser(org.id);
  });

  it('retourne 400 si code invalide (pas 6 caractères)', async () => {
    const res = await request(app)
      .post('/api/auth/verify-phone/confirm')
      .set('Cookie', authCookie(testUser))
      .send({ code: '12345' });

    expect(res.status).toBe(400);
  });

  it('retourne 400 si code manquant', async () => {
    const res = await request(app)
      .post('/api/auth/verify-phone/confirm')
      .set('Cookie', authCookie(testUser))
      .send({});

    expect(res.status).toBe(400);
  });
});
