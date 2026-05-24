const express = require('express');
const Joi     = require('joi');

const { requireAuth } = require('../middlewares/auth');

const router = express.Router();
router.use(requireAuth);

// Cache mémoire simple — DISABLED for testing, will re-enable later
const cache = new Map();
const CACHE_TTL = 0; // Disabled during debugging

function getCached(key) {
  return null; // Always skip cache
}

function setCache(key, data) {
  // Cache disabled - don't store
}

const AMENITY_TO_TYPE = {
  police:       'police',
  gendarmerie:  'gendarmerie',
  pharmacy:     'pharmacie',
  fire_station: 'pompiers',
  hospital:     'hopital',
};

// Fallback safe places for Abidjan area - UPDATED with real coordinates
// Distributed across all districts so there's always something close
const FALLBACK_PLACES = [
  // Bietry (rue pierre Amedee area - user location)
  { id: 6, type: 'police', name: 'Poste Police Bietry', lat: 5.2757, lng: -3.9761, address: 'Bietry, Abidjan', phone: '+225 22 51 00 00' },
  { id: 7, type: 'pharmacie', name: 'Pharmacie Bietry', lat: 5.2780, lng: -3.9745, address: 'Bietry, Abidjan', phone: '+225 22 51 20 00' },
  { id: 11, type: 'pompiers', name: 'Caserne Pompiers Bietry', lat: 5.2730, lng: -3.9780, address: 'Bietry, Abidjan', phone: '+225 22 51 30 00' },

  // Cocody (Central Abidjan)
  { id: 1, type: 'police', name: 'Poste Police Cocody', lat: 5.3382, lng: -4.0143, address: 'Cocody, Abidjan', phone: '+225 22 41 42 00' },
  { id: 2, type: 'hospital', name: 'Hôpital CHU Cocody', lat: 5.3276, lng: -4.0393, address: 'Cocody, Abidjan', phone: '+225 22 48 40 00' },
  { id: 3, type: 'pharmacie', name: 'Pharmacie Cocody', lat: 5.3350, lng: -4.0250, address: 'Cocody, Abidjan', phone: '+225 22 48 10 00' },

  // Plateau (City center)
  { id: 4, type: 'police', name: 'Poste Police Plateau', lat: 5.3405, lng: -4.0397, address: 'Plateau, Abidjan', phone: '+225 20 21 30 00' },
  { id: 5, type: 'hospital', name: 'Hôpital Général Plateau', lat: 5.3350, lng: -4.0450, address: 'Plateau, Abidjan', phone: '+225 20 21 80 00' },

  // Treichville (South Abidjan)
  { id: 8, type: 'gendarmerie', name: 'Gendarmerie Treichville', lat: 5.3200, lng: -4.0500, address: 'Treichville, Abidjan', phone: '+225 22 50 60 00' },
  { id: 9, type: 'hospital', name: 'Hôpital Treichville', lat: 5.3150, lng: -4.0550, address: 'Treichville, Abidjan', phone: '+225 22 50 40 00' },

  // Port-Bouët (Port area)
  { id: 10, type: 'pompiers', name: 'Caserne Pompiers Port-Bouët', lat: 5.2521, lng: -3.9687, address: 'Port-Bouët, Abidjan', phone: '+225 27 33 50 00' },
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

// Fetch real places from OpenStreetMap using Nominatim API
async function fetchNominatim(lat, lng, radius) {
  const searches = [
    { query: 'police+station', type: 'police' },
    { query: 'pharmacy+abidjan', type: 'pharmacy' },
    { query: 'hospital+abidjan', type: 'hospital' },
    { query: 'fire+station', type: 'fire_station' }
  ];
  const allPlaces = [];

  // Larger bounding box to find results (0.15 degrees ≈ 16km)
  const bbox = `${lng - 0.15},${lat - 0.15},${lng + 0.15},${lat + 0.15}`;

  // Search for each type of amenity using natural language
  for (const search of searches) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?` +
        `q=${search.query}&format=json&limit=50&` +
        `viewbox=${bbox}&bounded=0&countrycodes=ci&accept-language=fr`;

      console.log(`[Nominatim] Searching: ${search.query}`);

      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'HerSafety-CI/1.0' }
      });

      if (!response.ok) {
        console.log(`[Nominatim] ${search.query}: HTTP ${response.status}`);
        continue;
      }

      const results = await response.json();
      console.log(`[Nominatim] ${search.query}: found ${results.length} results`);

      if (results.length > 0) {
        const places = results
          .filter(p => p.lat && p.lon && p.class === 'amenity')
          .slice(0, 10) // Take top 10 for each type
          .map(p => ({
            id:      `${p.osm_id}-${p.osm_type}`,
            type:    AMENITY_TO_TYPE[p.type] || search.type,
            name:    p.name || p.display_name.split(',')[0],
            lat:     parseFloat(p.lat),
            lng:     parseFloat(p.lon),
            address: p.display_name.split(',').slice(1, 3).join(',').trim() || '',
            phone:   null,
            source:  'osm'
          }));

        console.log(`[Nominatim] Added ${places.length} places from ${search.query}`);
        allPlaces.push(...places);
      }
    } catch (err) {
      console.error(`[Nominatim] Error: ${search.query} -`, err.message);
    }
  }

  if (allPlaces.length === 0) {
    console.log(`[Nominatim] No places found after searching, returning null`);
    return null;
  }

  // Remove duplicates by location
  const unique = allPlaces.reduce((acc, p) => {
    const exists = acc.find(x => Math.abs(x.lat - p.lat) < 0.001 && Math.abs(x.lng - p.lng) < 0.001);
    return exists ? acc : [...acc, p];
  }, []);

  // Calculate distances and sort by closest
  const withDistance = unique
    .map(p => ({
      ...p,
      distance: getDistance(lat, lng, p.lat, p.lng)
    }));

  const sorted = withDistance.sort((a, b) => a.distance - b.distance);
  const result = sorted.slice(0, 3).map(({ distance, ...p }) => p);

  console.log(`[Nominatim] User at ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  console.log(`[Nominatim] Total places: ${allPlaces.length}, unique: ${unique.length}`);
  console.log(`[Nominatim] Top 3:`, result.map((p, i) => `${i+1}. ${p.name} (${p.distance.toFixed(2)}km)`));

  return result;
}

// GET /api/places?lat=X&lng=Y&radius=1000
router.get('/', async (req, res) => {
  const { error, value } = querySchema.validate(req.query);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { lat, lng, radius } = value;
  console.log(`\n[GET /api/places] INCOMING REQUEST: lat=${lat}, lng=${lng}, radius=${radius}`);

  const cacheKey = `${lat}_${lng}_${radius}`;

  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[GET /api/places] Cache hit`);
    return res.json({ success: true, data: cached, source: 'cache' });
  }
  console.log(`[GET /api/places] Cache miss, fetching fresh data`);

  try {
    // Try Nominatim first (real OpenStreetMap data)
    let places = await fetchNominatim(lat, lng, radius);

    if (!places || places.length === 0) {
      console.log('[GET /api/places] Nominatim returned no results, using fallback');
      places = null; // Will trigger fallback below
    }

    if (places && places.length > 0) {
      setCache(cacheKey, places);
      return res.json({ success: true, data: places, source: 'nominatim' });
    }
  } catch (err) {
    console.error('[GET /api/places] Nominatim error:', err.message);
  }

  // Fallback: Use hardcoded places if Nominatim fails
  {

    // Sort fallback places by DISTANCE ONLY - closest 3 first, regardless of type
    const withDistance = FALLBACK_PLACES
      .map(p => ({ ...p, distance: getDistance(lat, lng, p.lat, p.lng) }));

    const sorted = withDistance.sort((a, b) => a.distance - b.distance);

    console.log(`[Fallback] User at ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    console.log(`[Fallback] All fallback places with distances:`,
      sorted.map(p => `${p.name} (${p.type}) = ${p.distance.toFixed(2)}km`));

    const sortedPlaces = sorted
      .slice(0, 3)
      .map(({ distance, ...p }) => p); // Remove distance field

    console.log(`[Fallback] Returning:`, sortedPlaces.map(p => `${p.name} (${p.type})`));

    setCache(cacheKey, sortedPlaces);
    return res.json({ success: true, data: sortedPlaces, source: 'fallback' });
  }
});

module.exports = router;
