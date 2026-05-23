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
  await knex('contacts').whereIn('user_id', [userA.id, userB.id]).delete();
});

// ─── GET /api/contacts ────────────────────────────────────────────────────────

describe('GET /api/contacts', () => {
  it('retourne 401 sans cookie', async () => {
    const res = await request(app).get('/api/contacts');
    expect(res.status).toBe(401);
  });

  it('retourne liste vide pour un nouvel utilisateur', async () => {
    const res = await request(app)
      .get('/api/contacts')
      .set('Cookie', authCookie(userA));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('isolation cross-tenant : userA ne voit pas les contacts de userB', async () => {
    await knex('contacts').insert({
      user_id: userB.id, organization_id: orgB.id,
      full_name: 'Contact B', phone: '+2250700000001', relation: 'famille',
    });

    const res = await request(app)
      .get('/api/contacts')
      .set('Cookie', authCookie(userA));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

// ─── POST /api/contacts ───────────────────────────────────────────────────────

describe('POST /api/contacts', () => {
  it('retourne 401 sans cookie', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .send({ full_name: 'Marie', phone: '+2250700000002' });
    expect(res.status).toBe(401);
  });

  it('retourne 400 si le numéro est absent', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .set('Cookie', authCookie(userA))
      .send({ full_name: 'Sans numéro' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('crée un contact et le rattache à user + organization', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .set('Cookie', authCookie(userA))
      .send({ full_name: 'Aminata Koné', phone: '+2250700000003', relation: 'famille', is_primary: true });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.full_name).toBe('Aminata Koné');
    expect(res.body.data.user_id).toBe(userA.id);
    expect(res.body.data.organization_id).toBe(orgA.id);
    expect(res.body.data.is_primary).toBe(true);
  });

  it('bloque le 6ème contact via trigger PostgreSQL (422)', async () => {
    for (let i = 0; i < 5; i++) {
      await knex('contacts').insert({
        user_id: userA.id, organization_id: orgA.id,
        full_name: `Contact ${i}`, phone: `+225070000000${i}`, relation: 'autre',
      });
    }

    const res = await request(app)
      .post('/api/contacts')
      .set('Cookie', authCookie(userA))
      .send({ full_name: 'Contact 6', phone: '+2250700000099', relation: 'autre' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});

// ─── DELETE /api/contacts/:id ─────────────────────────────────────────────────

describe('DELETE /api/contacts/:id', () => {
  it('supprime un contact appartenant à l\'utilisateur', async () => {
    const [contact] = await knex('contacts').insert({
      user_id: userA.id, organization_id: orgA.id,
      full_name: 'À supprimer', phone: '+2250700000004', relation: 'ami',
    }).returning('*');

    const res = await request(app)
      .delete(`/api/contacts/${contact.id}`)
      .set('Cookie', authCookie(userA));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const remaining = await knex('contacts').where({ id: contact.id });
    expect(remaining).toHaveLength(0);
  });

  it('retourne 404 si le contact appartient à un autre tenant (cross-tenant)', async () => {
    const [contactB] = await knex('contacts').insert({
      user_id: userB.id, organization_id: orgB.id,
      full_name: 'Contact de B', phone: '+2250700000005', relation: 'collegue',
    }).returning('*');

    const res = await request(app)
      .delete(`/api/contacts/${contactB.id}`)
      .set('Cookie', authCookie(userA));

    expect(res.status).toBe(404);

    const still = await knex('contacts').where({ id: contactB.id });
    expect(still).toHaveLength(1);
  });

  it('retourne 401 sans cookie', async () => {
    const res = await request(app).delete('/api/contacts/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });
});
