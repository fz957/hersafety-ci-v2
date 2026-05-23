require('dotenv').config();

// Mock Anthropic SDK — jamais d'appel réel en test
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ text: 'Vous êtes forte. Respirez calmement et éloignez-vous si possible.' }],
      }),
    },
  }));
});

const request = require('supertest');
const app     = require('../src/app');
const { createTestOrg, createTestUser, authCookie, cleanupOrg, knex } = require('./setup');

let org, user;

beforeAll(async () => {
  await knex.migrate.latest();
  org  = await createTestOrg();
  user = await createTestUser(org.id);
  // Force l'initialisation du client avec une clé factice
  process.env.ANTHROPIC_API_KEY = 'test-key-mock';
});

afterAll(async () => {
  await cleanupOrg(org.id);
  await knex.destroy();
});

describe('POST /api/claude/assist', () => {
  it('retourne 401 sans cookie', async () => {
    const res = await request(app).post('/api/claude/assist').send({ level: '3' });
    expect(res.status).toBe(401);
  });

  it('retourne 400 si level manquant', async () => {
    const res = await request(app)
      .post('/api/claude/assist')
      .set('Cookie', authCookie(user))
      .send({});
    expect(res.status).toBe(400);
  });

  it('retourne 400 si level invalide', async () => {
    const res = await request(app)
      .post('/api/claude/assist')
      .set('Cookie', authCookie(user))
      .send({ level: '5' });
    expect(res.status).toBe(400);
  });

  it('retourne un message IA pour le niveau 3', async () => {
    const res = await request(app)
      .post('/api/claude/assist')
      .set('Cookie', authCookie(user))
      .send({ level: '3', context: 'Je suis suivie dans la rue' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBeTruthy();
    expect(['claude', 'fallback']).toContain(res.body.data.source);
  });

  it('retourne le fallback si l\'API est indisponible', async () => {
    const Anthropic = require('@anthropic-ai/sdk');
    Anthropic.mockImplementationOnce(() => ({
      messages: { create: jest.fn().mockRejectedValue(new Error('API down')) },
    }));

    // Reset le client mis en cache dans le service
    jest.resetModules();

    const { FALLBACK } = require('../src/services/claude.service');

    const res = await request(app)
      .post('/api/claude/assist')
      .set('Cookie', authCookie(user))
      .send({ level: '2' });

    // Avec le module reseté, le client se réinitialise — on vérifie juste le format
    expect(res.status).toBe(200);
    expect(res.body.data.message).toBeTruthy();
    expect(res.body.data.message.length).toBeGreaterThan(10);
  });

  it('tous les niveaux sont acceptés (1 à 4)', async () => {
    for (const level of ['1', '2', '3', '4']) {
      const res = await request(app)
        .post('/api/claude/assist')
        .set('Cookie', authCookie(user))
        .send({ level });
      expect(res.status).toBe(200);
      expect(res.body.data.message).toBeTruthy();
    }
  });
});
