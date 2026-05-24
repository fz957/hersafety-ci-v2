require('dotenv').config();

// Mock SMS — aucun vrai envoi en test
jest.mock('../src/services/sms.service', () => ({
  sendAlertSMS:   jest.fn().mockResolvedValue([{ id: 'sms-mock', status: 'simulated' }]),
  LEVEL_MESSAGES: {},
}));

const request = require('supertest');
const app     = require('../src/app');
const { createTestOrg, createTestUser, authCookie, cleanupOrg, knex } = require('./setup');
const { sendAlertSMS } = require('../src/services/sms.service');

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
  await knex('alerts').whereIn('user_id', [userA.id, adminA.id, userB.id]).delete();
  jest.clearAllMocks();
});

// ─── POST /api/alerts ─────────────────────────────────────────────────────────

describe('POST /api/alerts', () => {
  it('retourne 401 sans cookie', async () => {
    const res = await request(app).post('/api/alerts').send({ level: '1' });
    expect(res.status).toBe(401);
  });

  it('retourne 400 si level manquant', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('Cookie', authCookie(userA))
      .send({});
    expect(res.status).toBe(400);
  });

  it('crée une alerte niveau 1 sans SMS', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('Cookie', authCookie(userA))
      .send({ level: '1', location_label: 'Abidjan, Plateau' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.alert.level).toBe('1');
    expect(res.body.data.sms_logs).toHaveLength(0);
    expect(sendAlertSMS).not.toHaveBeenCalled();
  });

  it('crée une alerte niveau 3 et déclenche SMS si contacts présents', async () => {
    await knex('contacts').insert({
      user_id: userA.id, organization_id: orgA.id,
      full_name: 'Maman', phone: '+2250700000010', relation: 'famille',
    });

    const res = await request(app)
      .post('/api/alerts')
      .set('Cookie', authCookie(userA))
      .send({ level: '3', location_label: 'Cocody, Abidjan' });

    expect(res.status).toBe(201);
    expect(sendAlertSMS).toHaveBeenCalled();
    expect(sendAlertSMS).toHaveBeenCalledWith(
      expect.objectContaining({
        level: '3',
      })
    );
    expect(res.body.data.sms_logs).toHaveLength(1);

    await knex('contacts').where({ user_id: userA.id }).delete();
  });

  it('crée une alerte niveau 2 sans SMS si aucun contact enregistré', async () => {
    // Réinitialiser le mock avant ce test
    jest.clearAllMocks();

    const res = await request(app)
      .post('/api/alerts')
      .set('Cookie', authCookie(userA))
      .send({ level: '2' });

    expect(res.status).toBe(201);
    // Level 2 sans contacts ne déclenche pas de SMS
    expect(sendAlertSMS).not.toHaveBeenCalled();
    expect(res.body.data.sms_logs).toHaveLength(0);
  });
});

// ─── GET /api/alerts ──────────────────────────────────────────────────────────

describe('GET /api/alerts', () => {
  it('retourne 401 sans cookie', async () => {
    const res = await request(app).get('/api/alerts');
    expect(res.status).toBe(401);
  });

  it('user simple ne voit que ses propres alertes', async () => {
    await knex('alerts').insert([
      { user_id: userA.id, organization_id: orgA.id, level: '1', status: 'active' },
      { user_id: adminA.id, organization_id: orgA.id, level: '2', status: 'active' },
    ]);

    const res = await request(app)
      .get('/api/alerts')
      .set('Cookie', authCookie(userA));

    expect(res.status).toBe(200);
    const ids = res.body.data.map((a) => a.user_id);
    expect(ids.every((id) => id === userA.id)).toBe(true);
  });

  it('admin voit toutes les alertes de son organisation', async () => {
    await knex('alerts').insert([
      { user_id: userA.id,  organization_id: orgA.id, level: '1', status: 'active' },
      { user_id: adminA.id, organization_id: orgA.id, level: '2', status: 'active' },
    ]);

    const res = await request(app)
      .get('/api/alerts')
      .set('Cookie', authCookie(adminA));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('isolation cross-tenant : userA ne voit pas les alertes de orgB', async () => {
    await knex('alerts').insert({
      user_id: userB.id, organization_id: orgB.id, level: '3', status: 'active',
    });

    const res = await request(app)
      .get('/api/alerts')
      .set('Cookie', authCookie(userA));

    const orgBIds = res.body.data.filter((a) => a.organization_id === orgB.id);
    expect(orgBIds).toHaveLength(0);
  });
});

// ─── PATCH /api/alerts/:id/resolve ────────────────────────────────────────────

describe('PATCH /api/alerts/:id/resolve', () => {
  it('retourne 403 si user simple tente de résoudre', async () => {
    const [alert] = await knex('alerts')
      .insert({ user_id: userA.id, organization_id: orgA.id, level: '1', status: 'active' })
      .returning('*');

    const res = await request(app)
      .patch(`/api/alerts/${alert.id}/resolve`)
      .set('Cookie', authCookie(userA))
      .send({ status: 'resolved' });

    expect(res.status).toBe(403);
  });

  it('admin résout une alerte active', async () => {
    const [alert] = await knex('alerts')
      .insert({ user_id: userA.id, organization_id: orgA.id, level: '2', status: 'active' })
      .returning('*');

    const res = await request(app)
      .patch(`/api/alerts/${alert.id}/resolve`)
      .set('Cookie', authCookie(adminA))
      .send({ status: 'resolved', notes: 'Situation résolue' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('resolved');
    expect(res.body.data.notes).toBe('Situation résolue');
  });

  it('retourne 404 si alerte appartient à un autre tenant', async () => {
    const [alertB] = await knex('alerts')
      .insert({ user_id: userB.id, organization_id: orgB.id, level: '1', status: 'active' })
      .returning('*');

    const res = await request(app)
      .patch(`/api/alerts/${alertB.id}/resolve`)
      .set('Cookie', authCookie(adminA))
      .send({ status: 'resolved' });

    expect(res.status).toBe(404);
  });
});
