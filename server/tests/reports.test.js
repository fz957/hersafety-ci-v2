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
  await knex('reports').whereIn('organization_id', [orgA.id, orgB.id]).delete();
});

const BASE = {
  report_type:  'lieu',
  danger_type:  'harcelement_verbal',
  description:  'Lieu dangereux le soir.',
  place_name:   'Marché Adjamé',
  is_anonymous: true,
};

// ─── GET /api/reports ─────────────────────────────────────────────────────────

describe('GET /api/reports', () => {
  it('retourne 401 sans cookie', async () => {
    expect((await request(app).get('/api/reports')).status).toBe(401);
  });

  it('ne retourne que les signalements vérifiés', async () => {
    await knex('reports').insert([
      { user_id: userA.id, organization_id: orgA.id, status: 'verified', ...BASE },
      { user_id: userA.id, organization_id: orgA.id, status: 'pending',  ...BASE },
      { user_id: userA.id, organization_id: orgA.id, status: 'refuted',  ...BASE },
    ]);

    const res = await request(app)
      .get('/api/reports')
      .set('Cookie', authCookie(userA));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('verified');
  });

  it('isolation cross-tenant', async () => {
    await knex('reports').insert({
      user_id: userB.id, organization_id: orgB.id, status: 'verified', ...BASE,
    });

    const res = await request(app)
      .get('/api/reports')
      .set('Cookie', authCookie(userA));

    const orgBItems = res.body.data?.filter((r) => r.organization_id === orgB.id) || [];
    expect(orgBItems).toHaveLength(0);
  });
});

// ─── POST /api/reports ────────────────────────────────────────────────────────

describe('POST /api/reports', () => {
  it('crée un signalement avec status pending', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Cookie', authCookie(userA))
      .send(BASE);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.organization_id).toBe(orgA.id);
  });

  it('accepte un signalement chauffeur avec plaque', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Cookie', authCookie(userA))
      .send({
        report_type:   'chauffeur',
        danger_type:   'detour_force',
        description:   'Chauffeur m\'a fait un détour forcé.',
        vehicle_plate: 'CI-0123-AB',
        vtc_app:       'Yango',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.report_type).toBe('chauffeur');
  });

  it('retourne 400 si report_type manquant', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Cookie', authCookie(userA))
      .send({ danger_type: 'vol', description: 'Test' });

    expect(res.status).toBe(400);
  });

  it('retourne 400 si danger_type invalide', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Cookie', authCookie(userA))
      .send({ ...BASE, danger_type: 'inconnu' });

    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/reports/:id/verify ───────────────────────────────────────────

describe('PATCH /api/reports/:id/verify', () => {
  it('retourne 403 si user simple tente de vérifier', async () => {
    const [r] = await knex('reports')
      .insert({ user_id: userA.id, organization_id: orgA.id, status: 'pending', ...BASE })
      .returning('*');

    const res = await request(app)
      .patch(`/api/reports/${r.id}/verify`)
      .set('Cookie', authCookie(userA))
      .send({ action: 'verify' });

    expect(res.status).toBe(403);
  });

  it('admin vérifie un signalement pending', async () => {
    const [r] = await knex('reports')
      .insert({ user_id: userA.id, organization_id: orgA.id, status: 'pending', ...BASE })
      .returning('*');

    const res = await request(app)
      .patch(`/api/reports/${r.id}/verify`)
      .set('Cookie', authCookie(adminA))
      .send({ action: 'verify', verification_note: 'Confirmé sur place' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('verified');
    expect(res.body.data.verified_by).toBe(adminA.id);
    expect(res.body.data.verification_note).toBe('Confirmé sur place');
  });

  it('admin réfute un signalement', async () => {
    const [r] = await knex('reports')
      .insert({ user_id: userA.id, organization_id: orgA.id, status: 'pending', ...BASE })
      .returning('*');

    const res = await request(app)
      .patch(`/api/reports/${r.id}/verify`)
      .set('Cookie', authCookie(adminA))
      .send({ action: 'refute' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('refuted');
  });

  it('retourne 404 si signalement déjà traité', async () => {
    const [r] = await knex('reports')
      .insert({ user_id: userA.id, organization_id: orgA.id, status: 'verified', ...BASE })
      .returning('*');

    const res = await request(app)
      .patch(`/api/reports/${r.id}/verify`)
      .set('Cookie', authCookie(adminA))
      .send({ action: 'refute' });

    expect(res.status).toBe(404);
  });

  it('isolation cross-tenant : admin de orgA ne peut pas traiter signalement de orgB', async () => {
    const [r] = await knex('reports')
      .insert({ user_id: userB.id, organization_id: orgB.id, status: 'pending', ...BASE })
      .returning('*');

    const res = await request(app)
      .patch(`/api/reports/${r.id}/verify`)
      .set('Cookie', authCookie(adminA))
      .send({ action: 'verify' });

    expect(res.status).toBe(404);
  });
});
