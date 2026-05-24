const express = require('express');
const Joi     = require('joi');

const { requireAuth } = require('../middlewares/auth');

const router = express.Router();
router.use(requireAuth);

// Cache mémoire simple — TTL 5 minutes
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

const AMENITY_TO_TYPE = {
  police:       'police',
  gendarmerie:  'gendarmerie',
  pharmacy:     'pharmacie',
  fire_station: 'pompiers',
  hospital:     'hopital',
};

const querySchema = Joi.object({
  lat:    Joi.number().min(-90).max(90).required(),
  lng:    Joi.number().min(-180).max(180).required(),
  radius: Joi.number().integer().min(100).max(5000).default(1000),
});

async function fetchOverpass(lat, lng, radius) {
  const amenities = Object.keys(AMENITY_TO_TYPE).join('|');
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"~"^(${amenities})$"](around:${radius},${lat},${lng});
      way["amenity"~"^(${amenities})$"](around:${radius},${lat},${lng});
    );
    out center;
  `;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `data=${encodeURIComponent(query)}`,
    signal:  AbortSignal.timeout(12000),
  });

  if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);

  const json = await response.json();
  return (json.elements || []).map((el) => ({
    id:      el.id,
    type:    AMENITY_TO_TYPE[el.tags?.amenity] || 'autre',
    name:    el.tags?.name || el.tags?.amenity || 'Lieu sûr',
    lat:     el.type === 'way' ? el.center?.lat : el.lat,
    lng:     el.type === 'way' ? el.center?.lon : el.lon,
    address: el.tags?.['addr:full'] || el.tags?.['addr:street'] || null,
    phone:   el.tags?.phone || el.tags?.['contact:phone'] || null,
  })).filter((p) => p.lat && p.lng);
}

// GET /api/places?lat=X&lng=Y&radius=1000
router.get('/', async (req, res) => {
  const { error, value } = querySchema.validate(req.query);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { lat, lng, radius } = value;
  const cacheKey = `${lat}_${lng}_${radius}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ success: true, data: cached, source: 'cache' });
  }

  try {
    let places = await fetchOverpass(lat, lng, radius);

    // Élargit automatiquement le rayon à 2 km si aucun résultat
    if (places.length === 0 && radius < 2000) {
      const widerKey = `${lat}_${lng}_2000`;
      const widerCached = getCached(widerKey);
      places = widerCached ?? await fetchOverpass(lat, lng, 2000);
      if (!widerCached) setCache(widerKey, places);
    }

    setCache(cacheKey, places);
    return res.json({ success: true, data: places, source: 'overpass' });
  } catch (err) {
    console.error('[GET /api/places] Error:', err.message);
    return res.status(502).json({ success: false, error: 'Service cartographique indisponible' });
  }
});

module.exports = router;
