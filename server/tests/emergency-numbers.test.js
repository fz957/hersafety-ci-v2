require('dotenv').config();
const request = require('supertest');
const app     = require('../src/app');
const { knex } = require('./setup');

beforeAll(async () => {
  await knex.migrate.latest();
});

afterAll(async () => {
  await knex.destroy();
});

describe('GET /api/emergency-numbers', () => {
  it('retourne les numéros sans authentification', async () => {
    const res = await request(app).get('/api/emergency-numbers');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('retourne les 5 numéros nationaux de Côte d\'Ivoire', async () => {
    const res = await request(app).get('/api/emergency-numbers');

    expect(res.body.data.length).toBeGreaterThanOrEqual(5);

    const numbers = res.body.data.map((n) => n.number);
    expect(numbers).toContain('110');
    expect(numbers).toContain('111');
    expect(numbers).toContain('180');
    expect(numbers).toContain('185');
    expect(numbers).toContain('1308');
  });

  it('retourne les numéros dans l\'ordre d\'affichage', async () => {
    const res = await request(app).get('/api/emergency-numbers');

    const orders = res.body.data.map((n) => n.display_order);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders).toEqual(sorted);
  });

  it('ne retourne pas les numéros inactifs', async () => {
    await knex('emergency_numbers').insert({
      name: 'Numéro désactivé', number: '999', type: 'autre',
      is_national: true, is_active: false, display_order: 99,
    });

    const res = await request(app).get('/api/emergency-numbers');
    const numbers = res.body.data.map((n) => n.number);
    expect(numbers).not.toContain('999');

    await knex('emergency_numbers').where({ number: '999' }).delete();
  });
});
