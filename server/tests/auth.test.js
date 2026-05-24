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
    const setCookie = res.headers['set-cookie'];
    expect(setCookie.some((c) => c.includes('token='))).toBe(true);
    expect(setCookie.some((c) => c.includes('Max-Age=0'))).toBe(true);
  });

  it('empêche l\'accès après logout', async () => {
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

    // Essayer d'accéder à une route protégée avec les anciens cookies
    const meRes = await request(app)
      .get('/api/users/me')
      .set('Cookie', cookies);

    expect(meRes.status).toBe(401);
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
});
