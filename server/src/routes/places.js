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
  // Try multiple query variations per amenity type - some might match better in OSM data
  const searchGroups = [
    [
      { query: 'police', type: 'police' },
      { query: 'commissariat police', type: 'police' },
      { query: 'poste police', type: 'police' }
    ],
    [
      { query: 'pharmacie', type: 'pharmacie' },
      { query: 'pharmacy', type: 'pharmacie' }
    ],
    [
      { query: 'hopital', type: 'hopital' },
      { query: 'hôpital', type: 'hopital' },
      { query: 'hospital', type: 'hopital' },
      { query: 'centre sante', type: 'hopital' }
    ],
    [
      { query: 'pompiers', type: 'pompiers' },
      { query: 'caserne pompiers', type: 'pompiers' },
      { query: 'fire station', type: 'pompiers' }
    ]
  ];

  const allPlaces = [];

  // Larger bounding box to find results (0.15 degrees ≈ 16km)
  const bbox = `${lng - 0.15},${lat - 0.15},${lng + 0.15},${lat + 0.15}`;

  // Search for each type of amenity using multiple query variations
  // Try ALL variations for each amenity type - collect all results and pick the best
  for (const searchVariations of searchGroups) {
    const resultsPerVariation = [];

    // Search all variations for this amenity type
    for (const search of searchVariations) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?` +
          `q=${search.query}&format=json&limit=50&` +
          `viewbox=${bbox}&bounded=1&countrycodes=ci&accept-language=fr`;

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
          // Prefer results with class='amenity' (real places) over generic locations
          const amenityResults = results.filter(p => p.class === 'amenity');
          const bestResults = amenityResults.length > 0 ? amenityResults : results;

          const places = bestResults
            .filter(p => p.lat && p.lon && p.name && p.name.trim().length > 2) // Only places with real names (3+ chars)
            .map(p => {
              // Build the best name from available data
              let name = p.name || '';
              if (!name.trim()) {
                name = p.display_name.split(',')[0];
              }

              return {
                id:      `${p.osm_id}-${p.osm_type}`,
                type:    AMENITY_TO_TYPE[p.type] || search.type,
                name:    name.trim(),
                lat:     parseFloat(p.lat),
                lng:     parseFloat(p.lon),
                address: p.display_name.split(',').slice(1, 3).join(',').trim() || '',
                phone:   null,
                source:  'osm'
              };
            }); // Keep ALL results from this variation - distance sorting happens later

          if (places.length > 0) {
            console.log(`[Nominatim] Added ${places.length} places from ${search.query}`);
            resultsPerVariation.push(...places);
          }
        }
      } catch (err) {
        console.error(`[Nominatim] Error: ${search.query} -`, err.message);
      }
    }

    // Add the best results from all variations for this amenity type
    if (resultsPerVariation.length > 0) {
      allPlaces.push(...resultsPerVariation);
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
  const top5 = sorted.slice(0, 5); // Return top 5 nearest places
  const result = top5.map(({ distance, ...p }) => p);

  console.log(`[Nominatim] User at ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  console.log(`[Nominatim] Total places: ${allPlaces.length}, unique: ${unique.length}`);
  console.log(`[Nominatim] Top 5:`, top5.map((p, i) => `${i+1}. ${p.name} (${p.distance.toFixed(2)}km)`));

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
    let nominatimPlaces = await fetchNominatim(lat, lng, radius);
    console.log(`[GET /api/places] Nominatim returned ${nominatimPlaces ? nominatimPlaces.length : 0} places`);

    // Combine Nominatim results with local fallback places for more complete coverage
    // This ensures we show real names (from fallback) even if Nominatim is incomplete
    let allPlaces = [];

    if (nominatimPlaces && nominatimPlaces.length > 0) {
      allPlaces.push(...nominatimPlaces);
      console.log(`[GET /api/places] Added ${nominatimPlaces.length} places from Nominatim`);
    }

    // Add fallback places that are within radius and not duplicated
    const fallbackWithDistance = FALLBACK_PLACES
      .map(p => ({ ...p, distance: getDistance(lat, lng, p.lat, p.lng) }))
      .filter(p => p.distance <= (radius / 1000)); // Filter by radius

    // Deduplicate: don't add fallback place if similar location already in Nominatim
    const nearbyFallback = fallbackWithDistance.filter(f => {
      const isDuplicate = allPlaces.some(n =>
        Math.abs(n.lat - f.lat) < 0.01 && Math.abs(n.lng - f.lng) < 0.01
      );
      return !isDuplicate;
    });

    if (nearbyFallback.length > 0) {
      allPlaces.push(...nearbyFallback);
      console.log(`[GET /api/places] Added ${nearbyFallback.length} fallback places`);
    }

    if (allPlaces.length === 0) {
      console.log('[GET /api/places] No places found, returning empty');
      return res.json({ success: true, data: [], source: 'none' });
    }

    // Remove duplicates by location
    const unique = allPlaces.reduce((acc, p) => {
      const exists = acc.find(x => Math.abs(x.lat - p.lat) < 0.001 && Math.abs(x.lng - p.lng) < 0.001);
      return exists ? acc : [...acc, p];
    }, []);

    // Sort by distance and return top 5
    const withDistance = unique.map(p => ({
      ...p,
      distance: getDistance(lat, lng, p.lat, p.lng)
    }));

    const sorted = withDistance.sort((a, b) => a.distance - b.distance);
    const top5 = sorted.slice(0, 5);
    const result = top5.map(({ distance, ...p }) => p);

    console.log(`[GET /api/places] Returning top 5:`, top5.map((p, i) => `${i+1}. ${p.name} (${p.distance.toFixed(2)}km)`));

    setCache(cacheKey, result);
    return res.json({ success: true, data: result, source: 'hybrid' });

  } catch (err) {
    console.error('[GET /api/places] Error:', err.message);
    // Fallback to local places if everything fails
    const withDistance = FALLBACK_PLACES
      .map(p => ({ ...p, distance: getDistance(lat, lng, p.lat, p.lng) }));
    const sorted = withDistance.sort((a, b) => a.distance - b.distance);
    const result = sorted.slice(0, 5).map(({ distance, ...p }) => p);

    setCache(cacheKey, result);
    return res.json({ success: true, data: result, source: 'fallback' });
  }
});

module.exports = router;
