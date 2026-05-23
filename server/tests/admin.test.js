require('dotenv').config();
const request = require('supertest');
const app     = require('../src/app');
const { createTestOrg, createTestUser, authCookie, cleanupOrg, knex } = require('./setup');

let org, userA, adminA;

beforeAll(async () => {
  await knex.migrate.latest();
  org    = await createTestOrg();
  userA  = await createTestUser(org.id);
  adminA = await createTestUser(org.id, { role: 'admin' });
});

afterAll(async () => {
  await cleanupOrg(org.id);
  await knex.destroy();
});

// ─── Accès refusé aux non-admins ─────────────────────────────────────────────

describe('Contrôle d\'accès admin', () => {
  it('GET /admin/stats retourne 403 pour un user simple', async () => {
    const res = await request(app).get('/api/admin/stats').set('Cookie', authCookie(userA));
    expect(res.status).toBe(403);
  });

  it('GET /admin/users retourne 401 sans cookie', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

describe('GET /api/admin/stats', () => {
  it('retourne les 4 compteurs pour l\'organisation', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', authCookie(adminA));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('alerts_today');
    expect(res.body.data).toHaveProperty('active_users');
    expect(res.body.data).toHaveProperty('pending_reports');
    expect(res.body.data).toHaveProperty('pending_testimonies');
    expect(typeof res.body.data.active_users).toBe('number');
    expect(res.body.data.active_users).toBeGreaterThanOrEqual(2); // userA + adminA
  });
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

describe('GET /api/admin/users', () => {
  it('retourne uniquement les users de l\'organisation', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Cookie', authCookie(adminA));

    expect(res.status).toBe(200);
    const ids = res.body.data.map((u) => u.id);
    expect(ids).toContain(userA.id);
    expect(ids).toContain(adminA.id);

    // Ne retourne pas password_hash
    expect(res.body.data[0]).not.toHaveProperty('password_hash');
  });
});

// ─── PATCH /api/admin/users/:id/status ───────────────────────────────────────

describe('PATCH /api/admin/users/:id/status', () => {
  it('désactive un utilisateur', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${userA.id}/status`)
      .set('Cookie', authCookie(adminA))
      .send({ is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.data.is_active).toBe(false);

    // Remet actif pour les autres tests
    await knex('users').where({ id: userA.id }).update({ is_active: true });
  });

  it('retourne 404 si l\'utilisateur n\'appartient pas au tenant', async () => {
    const otherOrg  = await createTestOrg();
    const otherUser = await createTestUser(otherOrg.id);

    const res = await request(app)
      .patch(`/api/admin/users/${otherUser.id}/status`)
      .set('Cookie', authCookie(adminA))
      .send({ is_active: false });

    expect(res.status).toBe(404);
    await cleanupOrg(otherOrg.id);
  });
});

// ─── GET /api/admin/testimonies/pending ──────────────────────────────────────

describe('GET /api/admin/testimonies/pending', () => {
  afterEach(async () => {
    await knex('testimonies').where({ organization_id: org.id }).delete();
  });

  it('retourne les témoignages en attente de l\'org', async () => {
    await knex('testimonies').insert([
      { user_id: userA.id, organization_id: org.id, category: 'vol', title: 'T1', content: 'Contenu', status: 'pending' },
      { user_id: userA.id, organization_id: org.id, category: 'vol', title: 'T2', content: 'Contenu', status: 'approved' },
    ]);

    const res = await request(app)
      .get('/api/admin/testimonies/pending')
      .set('Cookie', authCookie(adminA));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBeUndefined(); // status non retourné intentionnellement
    expect(res.body.data[0].title).toBe('T1');
  });
});

// ─── GET /api/admin/reports/pending ──────────────────────────────────────────

describe('GET /api/admin/reports/pending', () => {
  afterEach(async () => {
    await knex('reports').where({ organization_id: org.id }).delete();
  });

  it('retourne les signalements en attente de l\'org', async () => {
    await knex('reports').insert([
      { user_id: userA.id, organization_id: org.id, report_type: 'lieu', danger_type: 'vol', description: 'R1', status: 'pending' },
      { user_id: userA.id, organization_id: org.id, report_type: 'lieu', danger_type: 'vol', description: 'R2', status: 'verified' },
    ]);

    const res = await request(app)
      .get('/api/admin/reports/pending')
      .set('Cookie', authCookie(adminA));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].description).toBe('R1');
  });
});
