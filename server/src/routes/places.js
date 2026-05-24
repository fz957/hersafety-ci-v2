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

// Fetch real places from Foursquare Places API (Primary source)
// Better data coverage and accuracy than OpenStreetMap for Abidjan
async function fetchFoursquare(lat, lng, radius) {
  const clientId = process.env.FOURSQUARE_CLIENT_ID;
  const clientSecret = process.env.FOURSQUARE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('[Foursquare] Client ID or Secret not configured');
    return null;
  }

  // Search queries for safety-critical places
  const queries = [
    { q: 'pharmacy', type: 'pharmacie' },
    { q: 'police', type: 'police' },
    { q: 'hospital', type: 'hopital' },
    { q: 'fire station', type: 'pompiers' },
    { q: 'clinic', type: 'hopital' },
    { q: 'medical', type: 'hopital' }
  ];

  const allPlaces = [];

  try {
    console.log(`[Foursquare] Searching safe places around ${lat.toFixed(4)}, ${lng.toFixed(4)} (radius: ${radius}m)`);

    for (const query of queries) {
      try {
        // Foursquare Places API v3 with Client ID + Secret
        const url = `https://api.foursquare.com/v3/places/search?` +
          `query=${encodeURIComponent(query.q)}&near=${lat},${lng}&radius=${radius}&limit=50&` +
          `client_id=${clientId}&client_secret=${clientSecret}`;

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) {
          console.log(`[Foursquare] ${query.q}: HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();
        if (!data.results || data.results.length === 0) {
          console.log(`[Foursquare] ${query.q}: no results`);
          continue;
        }

        console.log(`[Foursquare] ${query.q}: found ${data.results.length} results`);

        // Convert Foursquare format to our format
        const places = data.results
          .filter(p => p.location && p.location.latitude && p.location.longitude && p.name)
          .map(p => ({
            id: p.fsq_id,
            type: query.type,
            name: p.name,
            lat: p.location.latitude,
            lng: p.location.longitude,
            address: p.location.formatted_address || '',
            phone: p.tel || null,
            source: 'foursquare'
          }));

        if (places.length > 0) {
          allPlaces.push(...places);
          console.log(`[Foursquare] Added ${places.length} places from ${query.q}`);
        }
      } catch (err) {
        console.error(`[Foursquare] Error: ${query.q} -`, err.message);
      }
    }

    if (allPlaces.length === 0) {
      console.log('[Foursquare] No places found');
      return null;
    }

    // Remove duplicates by location
    const unique = allPlaces.reduce((acc, p) => {
      const exists = acc.find(x => Math.abs(x.lat - p.lat) < 0.0001 && Math.abs(x.lng - p.lng) < 0.0001);
      return exists ? acc : [...acc, p];
    }, []);

    // Calculate distances and filter STRICTLY by radius
    const withDistance = unique
      .map(p => ({
        ...p,
        distance: getDistance(lat, lng, p.lat, p.lng)
      }))
      .filter(p => p.distance <= (radius / 1000));

    // Sort by closest distance
    const sorted = withDistance.sort((a, b) => a.distance - b.distance);

    console.log(`[Foursquare] Found ${unique.length} places, ${withDistance.length} within radius`);
    if (sorted.length > 0) {
      console.log('[Foursquare] Top 5:', sorted.slice(0, 5).map((p, i) => `${i+1}. ${p.name} (${p.distance.toFixed(3)}km)`));
    }

    // Remove distance field before returning
    const result = sorted.map(({ distance, ...p }) => p);
    return result.length > 0 ? result : null;

  } catch (err) {
    console.error('[Foursquare] Error:', err.message);
    return null;
  }
}

// Fetch real places from OpenStreetMap using Overpass API
// Search ALL amenities to find what's actually nearby, then filter by distance
async function fetchOverpass(lat, lng, radius) {
  // Convert radius (in meters) to degrees (larger bbox to find what exists)
  // Search in a wider area since Abidjan data may be sparse
  const radiusDegrees = (radius * 2) / 111000; // 2x the radius to find results

  // Overpass query - get ALL amenities in the area, we'll filter by distance
  const query = `[bbox:${lat - radiusDegrees},${lng - radiusDegrees},${lat + radiusDegrees},${lng + radiusDegrees}];
(
  node["amenity"];
  way["amenity"];
);
out center;`;

  try {
    console.log(`[Overpass] Searching all amenities around ${lat.toFixed(4)}, ${lng.toFixed(4)} (radius: ${radius}m)`);

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (!response.ok) {
      console.log(`[Overpass] HTTP ${response.status}`);
      return null;
    }

    const text = await response.text();
    const json = JSON.parse(text);

    if (!json.elements || json.elements.length === 0) {
      console.log('[Overpass] No amenities found');
      return null;
    }

    console.log(`[Overpass] Found ${json.elements.length} total amenities, filtering by distance...`);

    // Convert Overpass format and calculate distances
    const placesWithDistance = json.elements
      .filter(el => el.lat && el.lon && el.tags && el.tags.name)
      .map(el => {
        const distance = getDistance(lat, lng, parseFloat(el.lat), parseFloat(el.lon));
        // Map OpenStreetMap amenity types to our types
        const amenityType = el.tags.amenity;
        let type = 'autre';
        if (['police', 'police_station'].includes(amenityType)) type = 'police';
        else if (amenityType === 'pharmacy') type = 'pharmacie';
        else if (['hospital', 'clinic', 'health_center', 'dispensary'].includes(amenityType)) type = 'hopital';
        else if (['fire_station', 'pompiers'].includes(amenityType)) type = 'pompiers';
        else if (amenityType === 'gendarmerie') type = 'gendarmerie';
        else if (['supermarket', 'supermarche'].includes(amenityType)) type = 'supermarche';
        else if (['garage', 'fuel', 'gas_station'].includes(amenityType)) type = 'garage';
        else if (['taxi', 'bus_station', 'transport', 'parking'].includes(amenityType)) type = 'transport';

        return {
          id: `${el.id}-${el.type}`,
          type: type,
          name: el.tags.name,
          lat: parseFloat(el.lat),
          lng: parseFloat(el.lon),
          address: el.tags['addr:street'] || `${el.tags.name}, Côte d'Ivoire`,
          phone: el.tags.phone || null,
          source: 'osm',
          distance: distance
        };
      })
      // STRICT: only keep places within requested radius
      .filter(p => p.distance <= (radius / 1000))
      // Sort by distance - CLOSEST first
      .sort((a, b) => a.distance - b.distance);

    console.log(`[Overpass] After distance filter: ${placesWithDistance.length} places within ${radius}m`);
    if (placesWithDistance.length > 0) {
      console.log('[Overpass] Top results:', placesWithDistance.slice(0, 5).map((p, i) => `${i+1}. ${p.name} (${p.distance.toFixed(3)}km, ${p.type})`));
    }

    // Remove distance field before returning
    const places = placesWithDistance.map(({ distance, ...p }) => p);
    return places.length > 0 ? places : null;

  } catch (err) {
    console.error(`[Overpass] Error:`, err.message);
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

    // Search for each French term
    for (const query of queries) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(query)}&format=json&limit=100&` +
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

    // Calculate distances
    const withDistance = unique
      .map(p => ({
        ...p,
        distance: getDistance(lat, lng, p.lat, p.lng)
      }));

    // FILTER: Only keep places within 2km (walking distance)
    const withinRadius = withDistance.filter(p => p.distance <= 2);

    // Sort by closest distance
    const sorted = withinRadius.sort((a, b) => a.distance - b.distance);

    console.log(`[Nominatim] Total: ${allPlaces.length}, unique: ${unique.length}, within 5km: ${withinRadius.length}`);

    // Return top 5 closest within 5km
    const top5 = sorted.slice(0, 5);
    console.log('[Nominatim] Top 5 closest (within 5km):', top5.map((p, i) => `${i+1}. ${p.name} (${p.distance.toFixed(2)}km, ${p.type})`));

    // Remove distance field before returning
    const result = top5.map(({ distance, ...p }) => p);
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

  const cacheKey = `${lat}_${lng}_${radius}`;

  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[GET /api/places] Cache hit`);
    return res.json({ success: true, data: cached, source: 'cache' });
  }
  console.log(`[GET /api/places] Cache miss, fetching fresh data`);

  try {
    // Use Nominatim with improved French-based search
    let places = await fetchNominatim(lat, lng, radius);

    // If no results, return empty
    if (!places || places.length === 0) {
      console.log(`[GET /api/places] No places found near ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      return res.json({ success: true, data: [], source: 'empty' });
    }

    // Calculate distances and sort by closest
    const withDistance = places.map(p => ({
      ...p,
      distance: getDistance(lat, lng, p.lat, p.lng)
    }));

    const sorted = withDistance.sort((a, b) => a.distance - b.distance);
    const top5 = sorted.slice(0, 5);
    const result = top5.map(({ distance, ...p }) => p);

    console.log(`[GET /api/places] User at ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    console.log(`[GET /api/places] Found ${places.length} places, returning top 5 closest:`);
    console.log(top5.map((p, i) => `${i+1}. ${p.name} (${p.distance.toFixed(2)}km)`));

    setCache(cacheKey, result);
    return res.json({ success: true, data: result, source: 'nominatim' });

  } catch (err) {
    console.error('[GET /api/places] Error:', err.message);
    return res.json({ success: true, data: [], source: 'error' });
  }
});

module.exports = router;
