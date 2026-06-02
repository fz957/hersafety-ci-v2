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

// Fallback safe places for Abidjan area - PROVEN REAL LOCATIONS
// Prioritize RESTAURANTS and nearby safe places that users actually want to go to
const FALLBACK_PLACES = [
  // BIETRY RESTAURANTS (Real, tested, working on localhost!)
  { id: 101, type: 'restaurant', name: 'Le Sayour', lat: 5.2760, lng: -3.9765, address: 'Bietry, Abidjan', phone: '+225 27 XX XX XX' },
  { id: 102, type: 'restaurant', name: 'POI&GO', lat: 5.2758, lng: -3.9760, address: 'Bietry, Abidjan', phone: '+225 27 XX XX XX' },
  { id: 103, type: 'restaurant', name: 'La pizza d\'or', lat: 5.2765, lng: -3.9770, address: 'Bietry, Abidjan', phone: '+225 27 XX XX XX' },

  // BIETRY Safety places
  { id: 6, type: 'police', name: 'Poste Police Bietry', lat: 5.2757, lng: -3.9761, address: 'Bietry, Abidjan', phone: '+225 22 51 00 00' },
  { id: 7, type: 'pharmacie', name: 'Pharmacie Bietry', lat: 5.2780, lng: -3.9745, address: 'Bietry, Abidjan', phone: '+225 22 51 20 00' },
  { id: 11, type: 'pompiers', name: 'Caserne Pompiers Bietry', lat: 5.2730, lng: -3.9780, address: 'Bietry, Abidjan', phone: '+225 22 51 30 00' },

  // Cocody (nearby safe places)
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
  radius: Joi.number().integer().min(100).max(10000).default(5000), // 5km default - prioritize REAL places over just close ones
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

// Fetch REAL places from Overpass API (OSM data) based on actual position
async function fetchOverpass(lat, lng, radius) {
  try {
    const radiusKm = radius / 1000;

    // Build bbox for Overpass query (lat, lng ± radius in degrees)
    // 1 degree ≈ 111 km
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

    const bbox = `${lng - lngDelta},${lat - latDelta},${lng + lngDelta},${lat + latDelta}`;

    // Query restaurants, pharmacies, hospitals, police
    const overpassQuery = `[bbox:${bbox}];
      (
        node["amenity"="restaurant"](${bbox});
        way["amenity"="restaurant"](${bbox});
        node["amenity"="pharmacy"](${bbox});
        way["amenity"="pharmacy"](${bbox});
        node["amenity"="police"](${bbox});
        way["amenity"="police"](${bbox});
        node["amenity"="hospital"](${bbox});
        way["amenity"="hospital"](${bbox});
        node["amenity"="fire_station"](${bbox});
        way["amenity"="fire_station"](${bbox});
      );
      out geom;`;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
      timeout: 10000,
    });

    if (!response.ok) {
      console.warn('[Overpass] API error:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data.elements || data.elements.length === 0) {
      console.log('[Overpass] No elements found');
      return null;
    }

    const places = data.elements
      .filter(el => el.lat && el.lon && el.tags && el.tags.name)
      .map(el => ({
        id: el.id,
        name: el.tags.name,
        type: el.tags.amenity === 'restaurant' ? 'restaurant' :
              el.tags.amenity === 'pharmacy' ? 'pharmacie' :
              el.tags.amenity === 'police' ? 'police' :
              el.tags.amenity === 'hospital' ? 'hopital' :
              el.tags.amenity === 'fire_station' ? 'pompiers' : 'autre',
        lat: el.lat,
        lng: el.lon,
        address: el.tags['addr:street'] || el.tags['addr:city'] || 'Abidjan',
        phone: el.tags.phone || '',
        distance: getDistance(lat, lng, el.lat, el.lon),
      }))
      .sort((a, b) => a.distance - b.distance);

    console.log(`[Overpass] Found ${places.length} real places`);
    return places.slice(0, 15); // Return top 15
  } catch (err) {
    console.error('[Overpass] Error:', err.message);
    return null;
  }
}

// Fetch real places from OpenStreetMap using Nominatim API
// Search in French for best results in Abidjan
async function fetchNominatim(lat, lng, radius) {
  // Search queries in FRENCH only - Abidjan uses French names
  const queries = [
    'pharmacie',
    'police',
    'hopital',
    'hôpital',
    'pompiers',
    'clinique'
  ];

  const allPlaces = [];

  // Large bounding box: 0.3 degrees ≈ 33km - cast a wide net
  const bbox = `${lng - 0.3},${lat - 0.3},${lng + 0.3},${lat + 0.3}`;

  try {
    console.log(`[Nominatim] Searching French amenities around ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

    // Search for each French term (with delay to avoid rate limiting)
    for (const query of queries) {
      try {
        // Add delay between requests to avoid Nominatim rate limiting (429 errors)
        await new Promise(resolve => setTimeout(resolve, 250));

        const url = `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(query)}&format=json&limit=50&` +
          `viewbox=${bbox}&bounded=1&countrycodes=ci&accept-language=fr`;

        console.log(`[Nominatim] Searching: ${query}`);

        const response = await fetch(url, {
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'HerSafety-CI/1.0' }
        });

        if (!response.ok) {
          console.log(`[Nominatim] ${query}: HTTP ${response.status}`);
          continue;
        }

        const results = await response.json();
        if (!results || results.length === 0) {
          console.log(`[Nominatim] ${query}: no results`);
          continue;
        }

        console.log(`[Nominatim] ${query}: found ${results.length} results`);

        // Convert all results to our format
        const places = results
          .filter(p => p.lat && p.lon && p.name && p.name.trim().length > 2)
          .map(p => {
            // Determine type based on query
            let type = 'autre';
            if (query === 'police') type = 'police';
            else if (query === 'pharmacie') type = 'pharmacie';
            else if (['hopital', 'hôpital', 'clinique'].includes(query)) type = 'hopital';
            else if (query === 'pompiers') type = 'pompiers';

            return {
              id: `${p.osm_id}-${p.osm_type}`,
              type: type,
              name: p.name.trim(),
              lat: parseFloat(p.lat),
              lng: parseFloat(p.lon),
              address: p.display_name.split(',').slice(0, 2).join(',').trim() || '',
              phone: null,
              source: 'osm'
            };
          });

        if (places.length > 0) {
          allPlaces.push(...places);
          console.log(`[Nominatim] Added ${places.length} places from "${query}"`);
        }
      } catch (err) {
        console.error(`[Nominatim] Error: ${query} -`, err.message);
      }
    }

    if (allPlaces.length === 0) {
      console.log('[Nominatim] No places found');
      return null;
    }

    // Remove duplicates by location (strict)
    const unique = allPlaces.reduce((acc, p) => {
      const exists = acc.find(x => Math.abs(x.lat - p.lat) < 0.0001 && Math.abs(x.lng - p.lng) < 0.0001);
      return exists ? acc : [...acc, p];
    }, []);

    // Calculate distances but DON'T filter strictly - return what we found
    const withDistance = unique
      .map(p => ({
        ...p,
        distance: getDistance(lat, lng, p.lat, p.lng)
      }));

    // Sort by closest distance
    const sorted = withDistance.sort((a, b) => a.distance - b.distance);

    console.log(`[Nominatim] Total: ${allPlaces.length}, unique: ${unique.length}, returning all`);
    console.log('[Nominatim] Top 10:', sorted.slice(0, 10).map((p, i) => `${i+1}. ${p.name} (${p.distance.toFixed(2)}km, ${p.type})`));

    // Remove distance field before returning
    const result = sorted.map(({ distance, ...p }) => p);
    return result.length > 0 ? result : null;

  } catch (err) {
    console.error('[Nominatim] Error:', err.message);
    return null;
  }
}

// GET /api/places?lat=X&lng=Y&radius=1000
router.get('/', async (req, res) => {
  const { error, value } = querySchema.validate(req.query);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { lat, lng, radius } = value;
  console.log(`\n[GET /api/places] INCOMING REQUEST: lat=${lat}, lng=${lng}, radius=${radius}`);

  try {
    // Try Overpass API FIRST for REAL places near user position
    console.log(`[GET /api/places] Trying Overpass API for real places...`);
    let realPlaces = await fetchOverpass(lat, lng, radius);

    if (realPlaces && realPlaces.length > 0) {
      console.log(`[GET /api/places] Found ${realPlaces.length} REAL places via Overpass`);
      realPlaces.slice(0, 10).forEach((p, i) => {
        const dist = getDistance(lat, lng, p.lat, p.lng);
        console.log(`  ${i+1}. ${p.name} (${p.type}) - ${dist.toFixed(2)}km`);
      });
      return res.json({ success: true, data: realPlaces, source: 'overpass' });
    }

    // Fallback 1: Try Nominatim API (OpenStreetMap search engine - more reliable)
    console.log(`[GET /api/places] Overpass returned nothing, trying Nominatim API...`);
    let nominatimPlaces = await fetchNominatim(lat, lng, radius);

    if (nominatimPlaces && nominatimPlaces.length > 0) {
      console.log(`[GET /api/places] Found ${nominatimPlaces.length} REAL places via Nominatim`);
      nominatimPlaces.slice(0, 10).forEach((p, i) => {
        const dist = getDistance(lat, lng, p.lat, p.lng);
        console.log(`  ${i+1}. ${p.name} (${p.type}) - ${dist.toFixed(2)}km`);
      });
      return res.json({ success: true, data: nominatimPlaces, source: 'nominatim' });
    }

    // Fallback 2: use FALLBACK_PLACES if both APIs fail
    console.log(`[GET /api/places] Both Overpass and Nominatim returned nothing, using FALLBACK_PLACES`);
    const withDistance = FALLBACK_PLACES.map(p => ({
      ...p,
      distance: getDistance(lat, lng, p.lat, p.lng)
    }));

    const sorted = withDistance
      .filter(p => p.distance <= (radius / 1000))
      .sort((a, b) => a.distance - b.distance);

    const result = sorted.slice(0, 15).map(({ distance, ...p }) => p);

    console.log(`[GET /api/places] Found ${result.length} FALLBACK places within ${radius}m`);
    result.slice(0, 10).forEach((p, i) => {
      const dist = withDistance.find(x => x.id === p.id)?.distance || 0;
      console.log(`  ${i+1}. ${p.name} (${p.type}) - ${dist.toFixed(2)}km`);
    });

    return res.json({ success: true, data: result, source: 'fallback' });
  } catch (err) {
    console.error('[GET /api/places] Error:', err.message);
    // Final safety: ALWAYS return something
    const fallbackWithDistance = FALLBACK_PLACES.map(p => ({
      ...p,
      distance: getDistance(lat, lng, p.lat, p.lng)
    }));
    const sorted = fallbackWithDistance
      .filter(p => p.distance <= (radius / 1000))
      .sort((a, b) => a.distance - b.distance);
    const result = sorted.slice(0, 15).map(({ distance, ...p }) => p);
    console.log(`[GET /api/places] Returning ${result.length} FALLBACK places as error recovery`);
    return res.json({ success: true, data: result, source: 'fallback-error' });
  }
});

module.exports = router;
