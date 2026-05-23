require('dotenv').config();
const request = require('supertest');
const app     = require('../src/app');
const { createTestOrg, createTestUser, authCookie, cleanupOrg, knex } = require('./setup');

let org, user;

beforeAll(async () => {
  await knex.migrate.latest();
  org  = await createTestOrg();
  user = await createTestUser(org.id, { full_name: 'Aminata Diallo', phone: '+2250700000099' });
});

afterAll(async () => {
  await cleanupOrg(org.id);
  await knex.destroy();
});

// ─── GET /api/users/me ────────────────────────────────────────────────────────

describe('GET /api/users/me', () => {
  it('retourne 401 sans cookie', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('retourne le profil complet avec infos organisation', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Cookie', authCookie(user));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
    expect(res.body.data.email).toBe(user.email);
    expect(res.body.data.full_name).toBe('Aminata Diallo');
    expect(res.body.data.organization_id).toBe(org.id);
    expect(res.body.data.organization_name).toBeTruthy();
    expect(res.body.data.organization_type).toBe('ong');
  });

  it('ne retourne pas password_hash', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Cookie', authCookie(user));

    expect(res.body.data).not.toHaveProperty('password_hash');
  });
});

// ─── PATCH /api/users/me ──────────────────────────────────────────────────────

describe('PATCH /api/users/me', () => {
  it('retourne 401 sans cookie', async () => {
    const res = await request(app).patch('/api/users/me').send({ full_name: 'X' });
    expect(res.status).toBe(401);
  });

  it('retourne 400 si body vide', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', authCookie(user))
      .send({});
    expect(res.status).toBe(400);
  });

  it('met à jour le nom', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', authCookie(user))
      .send({ full_name: 'Aminata Koné' });

    expect(res.status).toBe(200);
    expect(res.body.data.full_name).toBe('Aminata Koné');
  });

  it('met à jour le téléphone', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', authCookie(user))
      .send({ phone: '+2250701234567' });

    expect(res.status).toBe(200);
    expect(res.body.data.phone).toBe('+2250701234567');
  });

  it('marque l\'onboarding comme terminé', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', authCookie(user))
      .send({ onboarding_done: true });

    expect(res.status).toBe(200);
    expect(res.body.data.onboarding_done).toBe(true);
  });

  it('ne peut pas modifier son propre rôle', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', authCookie(user))
      .send({ role: 'superadmin' });

    // Le schéma Joi ignore les champs non autorisés → 400 (champ inconnu) ou 200 sans effet
    // Vérifie que le rôle n'a pas changé dans tous les cas
    const check = await knex('users').where({ id: user.id }).first();
    expect(check.role).toBe('user');
  });
});
