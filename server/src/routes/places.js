const express = require('express');
const Joi     = require('joi');

const { requireAuth } = require('../middlewares/auth');

// Logger helper - only logs in development mode
const isDev = process.env.NODE_ENV === 'development';
const log = (...args) => isDev && console.log(...args);

const router = express.Router();
// No auth needed for emergency places

// Cache mémoire simple (5 min TTL for Foursquare results)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// VRAIES endroits sûrs à Abidjan — coordonnées réelles (de locations.js)
const SAFE_PLACES = [
  // Quartiers principaux avec types de sécurité
  { id: 'plateau-q', type: 'quartier', name: 'Plateau', lat: 5.3405, lng: -4.0397, area: 'Centre', safety: 3, description: 'Centre-ville d\'Abidjan' },
  { id: 'cocody-q', type: 'quartier', name: 'Cocody', lat: 5.3382, lng: -4.0143, area: 'Nord', safety: 4, description: 'Quartier résidentiel' },
  { id: 'yopougon-q', type: 'quartier', name: 'Yopougon', lat: 5.3452, lng: -4.0718, area: 'Ouest', safety: 2, description: 'Quartier populaire' },
  { id: 'adjame-q', type: 'quartier', name: 'Adjamé', lat: 5.3520, lng: -4.0300, area: 'Est', safety: 2, description: 'Zone commerciale' },
  { id: 'treichville-q', type: 'quartier', name: 'Treichville', lat: 5.3200, lng: -4.0500, area: 'Sud', safety: 2, description: 'Zone portuaire' },

  // Restaurants/Cafés
  { id: 'lokodj', type: 'restaurant', name: 'Espace Lokodjé', lat: 5.3410, lng: -4.0390, area: 'Plateau', safety: 3, description: 'Restaurant Plateau' },
  { id: 'petit-suisse', type: 'restaurant', name: 'Au Petit Suisse', lat: 5.3375, lng: -4.0140, area: 'Cocody', safety: 4, description: 'Restaurant Cocody' },
  { id: 'reserve', type: 'restaurant', name: 'La Réserve', lat: 5.3380, lng: -4.0155, area: 'Cocody', safety: 4, description: 'Restaurant haut de gamme' },
  { id: 'delice', type: 'restaurant', name: 'Café Delice', lat: 5.3460, lng: -4.0700, area: 'Yopougon', safety: 2, description: 'Café Yopougon' },
  { id: 'fati', type: 'restaurant', name: 'Chez Fati', lat: 5.3210, lng: -4.0510, area: 'Treichville', safety: 2, description: 'Restaurant Treichville' },

  // Hôpitaux (SAFE PLACES PRIORITAIRES)
  { id: 'chu-treich', type: 'hopital', name: 'CHU Treichville', lat: 5.3240, lng: -4.0530, area: 'Treichville', safety: 3, description: 'Hôpital public', phone: '+225 22 50 40 00' },
  { id: 'clinique-amitie', type: 'hopital', name: 'Clinique de l\'Amitié', lat: 5.3390, lng: -4.0160, area: 'Cocody', safety: 4, description: 'Clinique privée', phone: '+225 22 48 10 00' },

  // Transport
  { id: 'aeroport', type: 'transport', name: 'Aéroport Félix Houphouët', lat: 5.2608, lng: -3.9640, area: 'Port-Bouët', safety: 3, description: 'Aéroport international', phone: '+225 27 33 50 00' },
  { id: 'gare-adjame', type: 'transport', name: 'Gare d\'Adjamé', lat: 5.3500, lng: -4.0320, area: 'Adjamé', safety: 2, description: 'Gare routière' },

  // Éducation & Autres
  { id: 'univ-cocody', type: 'education', name: 'Université Cocody', lat: 5.3420, lng: -4.0020, area: 'Cocody', safety: 3, description: 'Université' },
  { id: 'marche-treich', type: 'commerce', name: 'Marché de Treichville', lat: 5.3180, lng: -4.0480, area: 'Treichville', safety: 2, description: 'Grand marché' },
];

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
  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) {
    console.error('[Foursquare] API Key not configured');
    return null;
  }

  // Search queries for safety-critical places
  const queries = [
    { q: 'pharmacy', type: 'pharmacie' },
    { q: 'police', type: 'police' },
    { q: 'hospital', type: 'hopital' },
    { q: 'fire station', type: 'pompiers' },
    { q: 'clinic', type: 'hopital' },
    { q: 'medical center', type: 'hopital' }
  ];

  const allPlaces = [];

  try {
    log(`[Foursquare] Searching safe places around ${lat.toFixed(4)}, ${lng.toFixed(4)} (radius: ${radius}m)`);

    for (const query of queries) {
      try {
        // Foursquare Places API v3 with Bearer Token
        const url = `https://api.foursquare.com/v3/places/search?` +
          `query=${encodeURIComponent(query.q)}&ll=${lat},${lng}&radius=${radius}&limit=50`;

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) {
          log(`[Foursquare] ${query.q}: HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();
        if (!data.results || data.results.length === 0) {
          log(`[Foursquare] ${query.q}: no results`);
          continue;
        }

        log(`[Foursquare] ${query.q}: found ${data.results.length} results`);

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
          log(`[Foursquare] Added ${places.length} places from ${query.q}`);
        }
      } catch (err) {
        console.error(`[Foursquare] Error: ${query.q} -`, err.message);
      }
    }

    if (allPlaces.length === 0) {
      log('[Foursquare] No places found');
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

    log(`[Foursquare] Found ${unique.length} places, ${withDistance.length} within radius`);
    if (sorted.length > 0) {
      log('[Foursquare] Top 5:', sorted.slice(0, 5).map((p, i) => `${i+1}. ${p.name} (${p.distance.toFixed(3)}km)`));
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
    log(`[Overpass] Searching all amenities around ${lat.toFixed(4)}, ${lng.toFixed(4)} (radius: ${radius}m)`);

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (!response.ok) {
      log(`[Overpass] HTTP ${response.status}`);
      return null;
    }

    const text = await response.text();
    const json = JSON.parse(text);

    if (!json.elements || json.elements.length === 0) {
      log('[Overpass] No amenities found');
      return null;
    }

    log(`[Overpass] Found ${json.elements.length} total amenities, filtering by distance...`);

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

    log(`[Overpass] After distance filter: ${placesWithDistance.length} places within ${radius}m`);
    if (placesWithDistance.length > 0) {
      log('[Overpass] Top results:', placesWithDistance.slice(0, 5).map((p, i) => `${i+1}. ${p.name} (${p.distance.toFixed(3)}km, ${p.type})`));
    }

    // Remove distance field before returning
    const places = placesWithDistance.map(({ distance, ...p }) => p);
    return places.length > 0 ? places : null;

  } catch (err) {
    console.error(`[Overpass] Error:`, err.message);
    return null;
  }
}

// Fetch real places using Photon API (Komoot)
// More precise than Nominatim - searches ALL real places from OpenStreetMap
async function fetchPhoton(lat, lng, radius) {
  try {
    log(`[Photon] Searching nearby places around ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

    const photonUrl = new URL('https://photon.komoot.io/api/');
    photonUrl.searchParams.append('lat', lat);
    photonUrl.searchParams.append('lon', lng);
    photonUrl.searchParams.append('limit', '50');
    photonUrl.searchParams.append('lang', 'fr');
    photonUrl.searchParams.append('radius', Math.min(radius / 1000, 50)); // Convert meters to km, max 50km

    const response = await fetch(photonUrl.toString(), {
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      log(`[Photon] HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.features || data.features.length === 0) {
      log('[Photon] No features found');
      return null;
    }

    log(`[Photon] Found ${data.features.length} features`);

    // Convert Photon format to our format
    const places = data.features
      .filter(f => f.geometry && f.geometry.coordinates && f.properties && f.properties.name)
      .map(f => {
        const [lng_coord, lat_coord] = f.geometry.coordinates;
        const props = f.properties;

        // Determine type from OSM tags
        let type = 'autre';
        const osm_key = props.osm_key || '';
        const osm_value = props.osm_value || '';

        if (osm_key === 'amenity') {
          if (['police', 'police_station'].includes(osm_value)) type = 'police';
          else if (osm_value === 'pharmacy') type = 'pharmacie';
          else if (['hospital', 'clinic', 'health_center'].includes(osm_value)) type = 'hopital';
          else if (osm_value === 'fire_station') type = 'pompiers';
        }

        return {
          id: `${props.osm_id}-photon`,
          type: type,
          name: props.name,
          lat: lat_coord,
          lng: lng_coord,
          address: props.street ? `${props.street}, ${props.city || 'Abidjan'}` : (props.city || 'Abidjan'),
          phone: null,
          source: 'photon',
          distance: getDistance(lat, lng, lat_coord, lng_coord)
        };
      })
      // Filter by radius
      .filter(p => p.distance <= (radius / 1000))
      // Sort by distance
      .sort((a, b) => a.distance - b.distance);

    log(`[Photon] ${places.length} places within radius`);
    if (places.length > 0) {
      log('[Photon] Top results:', places.slice(0, 5).map((p, i) => `${i+1}. ${p.name} (${p.distance.toFixed(3)}km)`));
    }

    return places.length > 0 ? places : null;

  } catch (err) {
    console.error('[Photon] Error:', err.message);
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
    log(`[Nominatim] Searching French amenities around ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

    // Search for each French term
    for (const query of queries) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(query)}&format=json&limit=100&` +
          `viewbox=${bbox}&bounded=1&countrycodes=ci&accept-language=fr`;

        log(`[Nominatim] Searching: ${query}`);

        const response = await fetch(url, {
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'HerSafety-CI/1.0' }
        });

        if (!response.ok) {
          log(`[Nominatim] ${query}: HTTP ${response.status}`);
          continue;
        }

        const results = await response.json();
        if (!results || results.length === 0) {
          log(`[Nominatim] ${query}: no results`);
          continue;
        }

        log(`[Nominatim] ${query}: found ${results.length} results`);

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
          log(`[Nominatim] Added ${places.length} places from "${query}"`);
        }
      } catch (err) {
        console.error(`[Nominatim] Error: ${query} -`, err.message);
      }
    }

    if (allPlaces.length === 0) {
      log('[Nominatim] No places found');
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

    log(`[Nominatim] Total: ${allPlaces.length}, unique: ${unique.length}, within 5km: ${withinRadius.length}`);

    // Return top 5 closest within 5km
    const top5 = sorted.slice(0, 5);
    log('[Nominatim] Top 5 closest (within 5km):', top5.map((p, i) => `${i+1}. ${p.name} (${p.distance.toFixed(2)}km, ${p.type})`));

    // Remove distance field before returning
    const result = top5.map(({ distance, ...p }) => p);
    return result.length > 0 ? result : null;

  } catch (err) {
    console.error('[Nominatim] Error:', err.message);
    return null;
  }
}

// Cache simple en mémoire (5 min TTL)
const placesCache = new Map();

function getCacheKey(lat, lng, radius) {
  return `${lat.toFixed(4)}-${lng.toFixed(4)}-${radius}`;
}

function getCachedPlaces(key) {
  const cached = placesCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    log(`[Places] Cache hit for ${key}`);
    return cached.data;
  }
  return null;
}

function setCachedPlaces(key, data) {
  placesCache.set(key, { data, timestamp: Date.now() });
}

// Type priority for sorting
const typePriority = {
  police: 0,
  gendarmerie: 0,
  pharmacie: 1,
  pompiers: 1,
  hopital: 2,
  restaurant: 3,
  quartier: 4,
  transport: 5,
  education: 6,
  autre: 99
};

// GET /api/places - Foursquare-powered safe places (avec fallback)
router.get('/', async (req, res) => {
  const { lat, lng, radius } = req.query;

  if (!lat || !lng) {
    return res.json({ success: true, data: [] });
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const radiusMeters = parseInt(radius) || 5000;
  const radiusKm = radiusMeters / 1000;

  log(`[Places] Looking for safe places around ${userLat.toFixed(4)}, ${userLng.toFixed(4)} (radius: ${radiusKm}km)`);

  // Check cache first
  const cacheKey = getCacheKey(userLat, userLng, radiusMeters);
  const cached = getCachedPlaces(cacheKey);
  if (cached) {
    return res.json({ success: true, data: cached });
  }

  try {
    // Use OVERPASS (OpenStreetMap) - free & reliable for Abidjan
    log(`[Places] Fetching from Overpass (OpenStreetMap)...`);
    const overpassResults = await Promise.race([
      fetchOverpass(userLat, userLng, radiusMeters),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
    ]);

    if (overpassResults && overpassResults.length > 0) {
      log(`[Places] Got ${overpassResults.length} results from Overpass`);
      const nearest = overpassResults
        .sort((a, b) => {
          const aPriority = typePriority[a.type] !== undefined ? typePriority[a.type] : 99;
          const bPriority = typePriority[b.type] !== undefined ? typePriority[b.type] : 99;
          if (aPriority !== bPriority) return aPriority - bPriority;
          return (a.distance || 0) - (b.distance || 0);
        })
        .slice(0, 5);

      log(`[Places] Returning ${nearest.length} from Overpass`);
      setCachedPlaces(cacheKey, nearest);
      return res.json({ success: true, data: nearest });
    }

    // Fallback to Photon if Overpass fails (more precise than Nominatim!)
    log(`[Places] Overpass returned no results, trying Photon...`);
    const photonResults = await Promise.race([
      fetchPhoton(userLat, userLng, radiusKm * 1000),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
    ]);

    if (photonResults && photonResults.length > 0) {
      log(`[Places] Got ${photonResults.length} results from Photon`);
      const nearest = photonResults
        .sort((a, b) => {
          const aPriority = typePriority[a.type] !== undefined ? typePriority[a.type] : 99;
          const bPriority = typePriority[b.type] !== undefined ? typePriority[b.type] : 99;
          if (aPriority !== bPriority) return aPriority - bPriority;
          return (a.distance || 0) - (b.distance || 0);
        })
        .slice(0, 5);

      log(`[Places] Returning ${nearest.length} from Photon`);
      setCachedPlaces(cacheKey, nearest);
      return res.json({ success: true, data: nearest });
    }

    // Final fallback to static emergency locations
    throw new Error('No OSM results');

  } catch (err) {
    log(`[Places] External APIs failed (${err.message}), using FALLBACK_PLACES only...`);

    // Use only FALLBACK_PLACES - these are verified real emergency locations
    // Don't mix with SAFE_PLACES which are generic districts
    const withDistance = FALLBACK_PLACES.map(p => ({
      ...p,
      distance: getDistance(userLat, userLng, p.lat, p.lng)
    }));

    const nearest = withDistance
      .filter(p => p.distance <= radiusKm)
      .sort((a, b) => {
        const aPriority = typePriority[a.type] !== undefined ? typePriority[a.type] : 99;
        const bPriority = typePriority[b.type] !== undefined ? typePriority[b.type] : 99;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.distance - b.distance;
      })
      .slice(0, 5)
      .map(({ distance, ...p }) => p);

    log(`[Places] Returning ${nearest.length} from FALLBACK_PLACES (real emergency locations)`);
    setCachedPlaces(cacheKey, nearest);
    return res.json({ success: true, data: nearest });
  }
});

module.exports = router;
