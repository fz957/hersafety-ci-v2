require('dotenv').config();
const request = require('supertest');
const app     = require('../src/app');
const { createTestOrg, createTestUser, authCookie, cleanupOrg, knex } = require('./setup');

let org, user;

const MOCK_OVERPASS = {
  elements: [
    { id: 1, type: 'node', lat: 5.352, lon: -4.008, tags: { amenity: 'police', name: 'Commissariat Plateau' } },
    { id: 2, type: 'node', lat: 5.355, lon: -4.010, tags: { amenity: 'hospital', name: 'CHU de Cocody', phone: '+22527220000' } },
    { id: 3, type: 'way',  center: { lat: 5.349, lon: -4.005 }, tags: { amenity: 'pharmacy', name: 'Pharmacie Centrale' } },
  ],
};

beforeAll(async () => {
  await knex.migrate.latest();
  org  = await createTestOrg();
  user = await createTestUser(org.id);
  global.fetch = jest.fn();
});

afterAll(async () => {
  await cleanupOrg(org.id);
  await knex.destroy();
  delete global.fetch;
});

beforeEach(() => {
  jest.clearAllMocks();
  // Vide le cache entre tests (accès au module pour réinitialiser)
  jest.resetModules();
});

// ─── GET /api/places ──────────────────────────────────────────────────────────

describe('GET /api/places', () => {
  it('retourne 401 sans cookie', async () => {
    const res = await request(app).get('/api/places?lat=5.352&lng=-4.008');
    expect(res.status).toBe(401);
  });

  it('retourne 400 si lat ou lng manquant', async () => {
    const res = await request(app)
      .get('/api/places?lat=5.352')
      .set('Cookie', authCookie(user));
    expect(res.status).toBe(400);
  });

  it('retourne 400 si radius hors plage', async () => {
    const res = await request(app)
      .get('/api/places?lat=5.352&lng=-4.008&radius=99999')
      .set('Cookie', authCookie(user));
    expect(res.status).toBe(400);
  });

  it('retourne les lieux depuis Overpass et normalise les types', async () => {
    global.fetch.mockResolvedValueOnce({
      ok:   true,
      json: async () => MOCK_OVERPASS,
    });

    const res = await request(app)
      .get('/api/places?lat=5.352&lng=-4.008&radius=1000')
      .set('Cookie', authCookie(user));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(3);

    const commissariat = res.body.data.find((p) => p.name === 'Commissariat Plateau');
    expect(commissariat.type).toBe('police');
    expect(commissariat.lat).toBeCloseTo(5.352);

    const pharmacie = res.body.data.find((p) => p.name === 'Pharmacie Centrale');
    expect(pharmacie.type).toBe('pharmacie');
    expect(pharmacie.lat).toBeCloseTo(5.349); // center d'un way
  });

  it('retourne 502 si Overpass est indisponible', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const res = await request(app)
      .get('/api/places?lat=5.352&lng=-4.008&radius=500')
      .set('Cookie', authCookie(user));

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
  });

  it('élargit à 2km et rappelle Overpass si résultat vide', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ elements: [] }) })  // rayon 500 → vide
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_OVERPASS });       // rayon 2000 → résultats

    const res = await request(app)
      .get('/api/places?lat=5.352&lng=-4.008&radius=500')
      .set('Cookie', authCookie(user));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
