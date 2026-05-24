require('dotenv').config();
const request = require('supertest');
const app     = require('../src/app');
const { createTestOrg, createTestUser, authCookie, cleanupOrg, knex } = require('./setup');

let orgA, orgB, userA, adminA, userB;

beforeAll(async () => {
  await knex.migrate.latest();
  orgA   = await createTestOrg();
  orgB   = await createTestOrg();
  userA  = await createTestUser(orgA.id);
  adminA = await createTestUser(orgA.id, { role: 'admin' });
  userB  = await createTestUser(orgB.id);
});

afterAll(async () => {
  await cleanupOrg(orgA.id);
  await cleanupOrg(orgB.id);
  await knex.destroy();
});

afterEach(async () => {
  await knex('testimonies').whereIn('organization_id', [orgA.id, orgB.id]).delete();
});

const BASE = { category: 'harcelement_verbal', title: 'Mon titre', content: 'Mon témoignage complet ici.' };

// ─── GET /api/testimonies ─────────────────────────────────────────────────────

describe('GET /api/testimonies', () => {
  it('retourne 401 sans cookie', async () => {
    expect((await request(app).get('/api/testimonies')).status).toBe(401);
  });

  it('retourne les approuvés + les pending du user courant', async () => {
    await knex('testimonies').insert([
      { user_id: userA.id, organization_id: orgA.id, status: 'approved', ...BASE },
      { user_id: userA.id, organization_id: orgA.id, status: 'pending',  ...BASE, title: 'En attente' },
      { user_id: userA.id, organization_id: orgA.id, status: 'rejected', ...BASE, title: 'Refusé' },
    ]);

    const res = await request(app)
      .get('/api/testimonies')
      .set('Cookie', authCookie(userA));

    expect(res.status).toBe(200);
    // User voit: 1 approved + 1 pending (du user) = 2 total
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.some((t) => t.status === 'approved')).toBe(true);
    expect(res.body.data.some((t) => t.status === 'pending')).toBe(true);
  });

  it('isolation cross-tenant : ne retourne pas les témoignages de orgB', async () => {
    await knex('testimonies').insert({
      user_id: userB.id, organization_id: orgB.id, status: 'approved', ...BASE,
    });

    const res = await request(app)
      .get('/api/testimonies')
      .set('Cookie', authCookie(userA));

    const orgBItems = res.body.data?.filter((t) => t.organization_id === orgB.id) || [];
    expect(orgBItems).toHaveLength(0);
  });

  it('ne retourne pas user_id dans la réponse (anonymat)', async () => {
    await knex('testimonies').insert({
      user_id: userA.id, organization_id: orgA.id, status: 'approved', ...BASE,
    });

    const res = await request(app)
      .get('/api/testimonies')
      .set('Cookie', authCookie(userA));

    expect(res.body.data[0]).not.toHaveProperty('user_id');
  });
});

// ─── POST /api/testimonies ────────────────────────────────────────────────────

describe('POST /api/testimonies', () => {
  it('crée un témoignage avec status pending', async () => {
    const res = await request(app)
      .post('/api/testimonies')
      .set('Cookie', authCookie(userA))
      .send({ ...BASE, is_anonymous: false });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.organization_id).toBe(orgA.id);
  });

  it('génère un pseudo anonyme si is_anonymous=true', async () => {
    const res = await request(app)
      .post('/api/testimonies')
      .set('Cookie', authCookie(userA))
      .send({ ...BASE, is_anonymous: true });

    expect(res.status).toBe(201);
    expect(res.body.data.is_anonymous).toBe(true);
    expect(res.body.data.display_name).toBeTruthy();
    expect(typeof res.body.data.display_name).toBe('string');
    expect(res.body.data.display_name.length).toBeGreaterThan(4);
  });

  it('retourne 400 si category invalide', async () => {
    const res = await request(app)
      .post('/api/testimonies')
      .set('Cookie', authCookie(userA))
      .send({ ...BASE, category: 'invalide' });

    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/testimonies/:id ───────────────────────────────────────────────

describe('PATCH /api/testimonies/:id (modération)', () => {
  it('retourne 403 si user simple tente de modérer', async () => {
    const [t] = await knex('testimonies')
      .insert({ user_id: userA.id, organization_id: orgA.id, status: 'pending', ...BASE })
      .returning('*');

    const res = await request(app)
      .patch(`/api/testimonies/${t.id}`)
      .set('Cookie', authCookie(userA))
      .send({ action: 'approve' });

    expect(res.status).toBe(403);
  });

  it('admin approuve un témoignage pending', async () => {
    const [t] = await knex('testimonies')
      .insert({ user_id: userA.id, organization_id: orgA.id, status: 'pending', ...BASE })
      .returning('*');

    const res = await request(app)
      .patch(`/api/testimonies/${t.id}`)
      .set('Cookie', authCookie(adminA))
      .send({ action: 'approve' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
    expect(res.body.data.moderated_by).toBe(adminA.id);
  });

  it('admin rejette un témoignage pending', async () => {
    const [t] = await knex('testimonies')
      .insert({ user_id: userA.id, organization_id: orgA.id, status: 'pending', ...BASE })
      .returning('*');

    const res = await request(app)
      .patch(`/api/testimonies/${t.id}`)
      .set('Cookie', authCookie(adminA))
      .send({ action: 'reject' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
  });

  it('retourne 404 si témoignage déjà modéré', async () => {
    const [t] = await knex('testimonies')
      .insert({ user_id: userA.id, organization_id: orgA.id, status: 'approved', ...BASE })
      .returning('*');

    const res = await request(app)
      .patch(`/api/testimonies/${t.id}`)
      .set('Cookie', authCookie(adminA))
      .send({ action: 'reject' });

    expect(res.status).toBe(404);
  });

  it('isolation cross-tenant : admin de orgA ne peut pas modérer témoignage de orgB', async () => {
    const [t] = await knex('testimonies')
      .insert({ user_id: userB.id, organization_id: orgB.id, status: 'pending', ...BASE })
      .returning('*');

    const res = await request(app)
      .patch(`/api/testimonies/${t.id}`)
      .set('Cookie', authCookie(adminA))
      .send({ action: 'approve' });

    expect(res.status).toBe(404);
  });
});
