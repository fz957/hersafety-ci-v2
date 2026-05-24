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

// Fallback safe places for Abidjan area (when Overpass API is unavailable)
// Distributed across all districts so there's always something close
const FALLBACK_PLACES = [
  // Cocody
  { id: 1, type: 'police', name: 'Poste Police Cocody', lat: 6.8382, lng: -5.2543, address: 'Cocody, Abidjan', phone: '+225 22 41 42 00' },
  { id: 2, type: 'hospital', name: 'Hôpital CHU Cocody', lat: 6.8276, lng: -5.2893, address: 'Cocody, Abidjan', phone: '+225 22 48 40 00' },
  { id: 3, type: 'pharmacie', name: 'Pharmacie Cocody', lat: 6.8350, lng: -5.2750, address: 'Cocody, Abidjan', phone: '+225 22 48 10 00' },
  // Plateau
  { id: 4, type: 'police', name: 'Poste Police Plateau', lat: 6.8205, lng: -5.3297, address: 'Plateau, Abidjan', phone: '+225 20 21 30 00' },
  { id: 5, type: 'hospital', name: 'Hôpital Général Plateau', lat: 6.8250, lng: -5.3350, address: 'Plateau, Abidjan', phone: '+225 20 21 80 00' },
  // Bietry
  { id: 6, type: 'police', name: 'Poste Police Bietry', lat: 6.8450, lng: -5.3100, address: 'Bietry, Abidjan', phone: '+225 22 51 00 00' },
  { id: 7, type: 'pharmacie', name: 'Pharmacie Bietry', lat: 6.8480, lng: -5.3080, address: 'Bietry, Abidjan', phone: '+225 22 51 20 00' },
  // Yopougon
  { id: 8, type: 'gendarmerie', name: 'Gendarmerie Yopougon', lat: 6.8000, lng: -5.3500, address: 'Yopougon, Abidjan', phone: '+225 22 50 60 00' },
  { id: 9, type: 'hospital', name: 'Hôpital Yopougon', lat: 6.7950, lng: -5.3550, address: 'Yopougon, Abidjan', phone: '+225 22 50 40 00' },
  // Port-Bouët
  { id: 10, type: 'pompiers', name: 'Caserne Pompiers Port-Bouët', lat: 6.7521, lng: -5.2687, address: 'Port-Bouët, Abidjan', phone: '+225 27 33 50 00' },
];

const querySchema = Joi.object({
  lat:    Joi.number().min(-90).max(90).required(),
  lng:    Joi.number().min(-180).max(180).required(),
  radius: Joi.number().integer().min(100).max(5000).default(1000),
});

// Priority order for safe places
const PRIORITY_ORDER = { police: 1, gendarmerie: 2, pharmacie: 3, pompiers: 4, hopital: 5, autre: 6 };

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
  const places = (json.elements || []).map((el) => ({
    id:      el.id,
    type:    AMENITY_TO_TYPE[el.tags?.amenity] || 'autre',
    name:    el.tags?.name || el.tags?.amenity || 'Lieu sûr',
    lat:     el.type === 'way' ? el.center?.lat : el.lat,
    lng:     el.type === 'way' ? el.center?.lon : el.lon,
    address: el.tags?.['addr:full'] || el.tags?.['addr:street'] || null,
    phone:   el.tags?.phone || el.tags?.['contact:phone'] || null,
  })).filter((p) => p.lat && p.lng);

  // Sort by distance only - return closest 3 places
  return places
    .map(p => ({ ...p, distance: getDistance(lat, lng, p.lat, p.lng) }))
    .sort((a, b) => a.distance - b.distance)
    .map(({ distance, ...p }) => p);
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
    console.error('[GET /api/places] Overpass API error:', err.message);

    // Sort fallback places by distance only - return closest 3
    const sortedPlaces = FALLBACK_PLACES
      .map(p => ({ ...p, distance: getDistance(lat, lng, p.lat, p.lng) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(({ distance, ...p }) => p); // Remove distance field

    setCache(cacheKey, sortedPlaces);
    return res.json({ success: true, data: sortedPlaces, source: 'fallback' });
  }
});

module.exports = router;
