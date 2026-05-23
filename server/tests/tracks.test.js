require('dotenv').config();
const request = require('supertest');
const app     = require('../src/app');
const { createTestOrg, createTestUser, authCookie, cleanupOrg, knex } = require('./setup');

let orgA, orgB, userA, userB;

beforeAll(async () => {
  await knex.migrate.latest();
  orgA  = await createTestOrg();
  orgB  = await createTestOrg();
  userA = await createTestUser(orgA.id);
  userB = await createTestUser(orgB.id);
});

afterAll(async () => {
  await cleanupOrg(orgA.id);
  await cleanupOrg(orgB.id);
  await knex.destroy();
});

afterEach(async () => {
  await knex('checkins').whereIn('user_id', [userA.id, userB.id]).delete();
  await knex('tracks').whereIn('user_id', [userA.id, userB.id]).delete();
});

// ─── POST /api/tracks ─────────────────────────────────────────────────────────

describe('POST /api/tracks', () => {
  it('retourne 401 sans cookie', async () => {
    const res = await request(app).post('/api/tracks').send({});
    expect(res.status).toBe(401);
  });

  it('démarre un trajet avec les valeurs par défaut', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .set('Cookie', authCookie(userA))
      .send({ destination_label: 'Gare de Treichville' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.destination_label).toBe('Gare de Treichville');
    expect(res.body.data.checkin_interval_min).toBe(10);
    expect(res.body.data.user_id).toBe(userA.id);
    expect(res.body.data.organization_id).toBe(orgA.id);
  });

  it('interrompt le trajet actif précédent avant d\'en démarrer un nouveau', async () => {
    const first = await request(app)
      .post('/api/tracks')
      .set('Cookie', authCookie(userA))
      .send({ destination_label: 'Premier trajet' });

    expect(first.body.data.status).toBe('active');

    await request(app)
      .post('/api/tracks')
      .set('Cookie', authCookie(userA))
      .send({ destination_label: 'Deuxième trajet' });

    const previous = await knex('tracks').where({ id: first.body.data.id }).first();
    expect(previous.status).toBe('interrupted');
  });

  it('stocke le waypoint initial si GPS fourni', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .set('Cookie', authCookie(userA))
      .send({ location_lat: 5.352, location_lng: -4.008 });

    expect(res.status).toBe(201);
    expect(res.body.data.waypoints).toHaveLength(1);
    expect(res.body.data.waypoints[0].lat).toBeCloseTo(5.352, 3);
  });
});

// ─── PATCH /api/tracks/:id/checkin ───────────────────────────────────────────

describe('PATCH /api/tracks/:id/checkin', () => {
  it('enregistre un check-in sur un trajet actif', async () => {
    const { body: { data: track } } = await request(app)
      .post('/api/tracks')
      .set('Cookie', authCookie(userA))
      .send({});

    const res = await request(app)
      .patch(`/api/tracks/${track.id}/checkin`)
      .set('Cookie', authCookie(userA))
      .send({ location_lat: 5.355, location_lng: -4.010 });

    expect(res.status).toBe(200);
    expect(res.body.data.response).toBe('ok');
    expect(res.body.data.track_id).toBe(track.id);

    // Vérifie que le waypoint a été ajouté
    const updated = await knex('tracks').where({ id: track.id }).first();
    expect(updated.waypoints).toHaveLength(1);
  });

  it('retourne 404 sur un trajet terminé', async () => {
    const [track] = await knex('tracks')
      .insert({ user_id: userA.id, organization_id: orgA.id, status: 'completed' })
      .returning('*');

    const res = await request(app)
      .patch(`/api/tracks/${track.id}/checkin`)
      .set('Cookie', authCookie(userA))
      .send({});

    expect(res.status).toBe(404);
  });

  it('isolation cross-tenant : userA ne peut pas checker le trajet de userB', async () => {
    const [trackB] = await knex('tracks')
      .insert({ user_id: userB.id, organization_id: orgB.id, status: 'active' })
      .returning('*');

    const res = await request(app)
      .patch(`/api/tracks/${trackB.id}/checkin`)
      .set('Cookie', authCookie(userA))
      .send({});

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/tracks/:id/end ────────────────────────────────────────────────

describe('PATCH /api/tracks/:id/end', () => {
  it('termine un trajet actif', async () => {
    const { body: { data: track } } = await request(app)
      .post('/api/tracks')
      .set('Cookie', authCookie(userA))
      .send({ destination_label: 'Maison' });

    const res = await request(app)
      .patch(`/api/tracks/${track.id}/end`)
      .set('Cookie', authCookie(userA));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.ended_at).not.toBeNull();
  });

  it('retourne 404 si le trajet est déjà terminé', async () => {
    const [track] = await knex('tracks')
      .insert({ user_id: userA.id, organization_id: orgA.id, status: 'completed' })
      .returning('*');

    const res = await request(app)
      .patch(`/api/tracks/${track.id}/end`)
      .set('Cookie', authCookie(userA));

    expect(res.status).toBe(404);
  });

  it('isolation cross-tenant : userA ne peut pas terminer le trajet de userB', async () => {
    const [trackB] = await knex('tracks')
      .insert({ user_id: userB.id, organization_id: orgB.id, status: 'active' })
      .returning('*');

    const res = await request(app)
      .patch(`/api/tracks/${trackB.id}/end`)
      .set('Cookie', authCookie(userA));

    expect(res.status).toBe(404);
  });
});
