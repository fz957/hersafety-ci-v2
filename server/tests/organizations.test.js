require('dotenv').config();
const request = require('supertest');
const app     = require('../src/app');
const { createTestOrg, createTestUser, authCookie, cleanupOrg, knex } = require('./setup');

let org, adminUser, superAdmin, createdOrgId;

beforeAll(async () => {
  await knex.migrate.latest();
  org        = await createTestOrg();
  adminUser  = await createTestUser(org.id, { role: 'admin' });
  superAdmin = await createTestUser(org.id, { role: 'superadmin' });
});

afterAll(async () => {
  if (createdOrgId) await knex('organizations').where({ id: createdOrgId }).delete();
  await cleanupOrg(org.id);
  await knex.destroy();
});

// ─── Contrôle d'accès ─────────────────────────────────────────────────────────

describe('Contrôle d\'accès superadmin', () => {
  it('retourne 403 pour un admin simple', async () => {
    const res = await request(app).get('/api/organizations').set('Cookie', authCookie(adminUser));
    expect(res.status).toBe(403);
  });

  it('retourne 401 sans cookie', async () => {
    const res = await request(app).get('/api/organizations');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/organizations ───────────────────────────────────────────────────

describe('GET /api/organizations', () => {
  it('superadmin voit toutes les organisations', async () => {
    const res = await request(app)
      .get('/api/organizations')
      .set('Cookie', authCookie(superAdmin));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('retourne join_code dans la réponse', async () => {
    const res = await request(app)
      .get('/api/organizations')
      .set('Cookie', authCookie(superAdmin));

    expect(res.body.data[0]).toHaveProperty('join_code');
  });
});

// ─── POST /api/organizations ──────────────────────────────────────────────────

describe('POST /api/organizations', () => {
  it('crée une organisation avec join_code généré automatiquement', async () => {
    const res = await request(app)
      .post('/api/organizations')
      .set('Cookie', authCookie(superAdmin))
      .send({ name: 'ONG Test CI', type: 'ong', email: `ong-${Date.now()}@test.ci` });

    expect(res.status).toBe(201);
    expect(res.body.data.join_code).toBeTruthy();
    expect(res.body.data.join_code).toHaveLength(8);
    expect(res.body.data.is_approved).toBe(false); // non approuvée par défaut
    createdOrgId = res.body.data.id;
  });

  it('retourne 409 si email déjà utilisé', async () => {
    const res = await request(app)
      .post('/api/organizations')
      .set('Cookie', authCookie(superAdmin))
      .send({ name: 'Doublon', type: 'entreprise', email: org.email });

    expect(res.status).toBe(409);
  });

  it('retourne 400 si type invalide', async () => {
    const res = await request(app)
      .post('/api/organizations')
      .set('Cookie', authCookie(superAdmin))
      .send({ name: 'X', type: 'ecole', email: 'x@test.ci' });

    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/organizations/:id/approve ────────────────────────────────────

describe('PATCH /api/organizations/:id/approve', () => {
  it('superadmin approuve une organisation', async () => {
    const notApprovedOrg = await createTestOrg();
    await knex('organizations').where({ id: notApprovedOrg.id }).update({ is_approved: false });

    const res = await request(app)
      .patch(`/api/organizations/${notApprovedOrg.id}/approve`)
      .set('Cookie', authCookie(superAdmin));

    expect(res.status).toBe(200);
    expect(res.body.data.is_approved).toBe(true);
    await cleanupOrg(notApprovedOrg.id);
  });
});

// ─── PATCH /api/organizations/:id/status ─────────────────────────────────────

describe('PATCH /api/organizations/:id/status', () => {
  it('superadmin désactive une organisation', async () => {
    const targetOrg = await createTestOrg();

    const res = await request(app)
      .patch(`/api/organizations/${targetOrg.id}/status`)
      .set('Cookie', authCookie(superAdmin))
      .send({ is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.data.is_active).toBe(false);
    await cleanupOrg(targetOrg.id);
  });
});
