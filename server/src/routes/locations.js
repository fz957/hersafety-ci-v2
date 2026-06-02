const express = require('express');
const Joi = require('joi');
const knex = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();
// Public API - no authentication required for location searches

// Normalize accents for searching (e.g., "Adjame" matches "Adjamé")
function normalizeAccents(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// VRAIS lieux populaires à Abidjan (OpenStreetMap data)
const CI_LOCATIONS = [
  // QUARTIERS PRINCIPAUX
  { name: 'Plateau', area: 'Centre', lat: 5.3405, lng: -4.0397, safety: 3, incidents: 0, description: 'Centre-ville d\'Abidjan' },
  { name: 'Cocody', area: 'Nord', lat: 5.3382, lng: -4.0143, safety: 4, incidents: 0, description: 'Quartier résidentiel' },
  { name: 'Yopougon', area: 'Ouest', lat: 5.3452, lng: -4.0718, safety: 2, incidents: 0, description: 'Quartier populaire' },
  { name: 'Adjamé', area: 'Est', lat: 5.3520, lng: -4.0300, safety: 2, incidents: 0, description: 'Zone commerciale' },
  { name: 'Treichville', area: 'Sud', lat: 5.3200, lng: -4.0500, safety: 2, incidents: 0, description: 'Zone portuaire' },

  // RESTAURANTS/CAFES REELS
  { name: 'Le Sayour', area: 'Bietry', lat: 5.2760, lng: -3.9765, safety: 3, incidents: 0, description: 'Restaurant Bietry' },
  { name: 'POI&GO nom', area: 'Bietry', lat: 5.2758, lng: -3.9760, safety: 3, incidents: 0, description: 'Restaurant Bietry' },
  { name: 'La pizza d\'or', area: 'Bietry', lat: 5.2765, lng: -3.9770, safety: 3, incidents: 0, description: 'Restaurant Bietry' },
  { name: 'Espace Lokodjé', area: 'Plateau', lat: 5.3410, lng: -4.0390, safety: 3, incidents: 0, description: 'Restaurant Plateau' },
  { name: 'Au Petit Suisse', area: 'Cocody', lat: 5.3375, lng: -4.0140, safety: 4, incidents: 0, description: 'Restaurant Cocody' },
  { name: 'La Réserve', area: 'Cocody', lat: 5.3380, lng: -4.0155, safety: 4, incidents: 0, description: 'Restaurant haut de gamme' },
  { name: 'Café Delice', area: 'Yopougon', lat: 5.3460, lng: -4.0700, safety: 2, incidents: 0, description: 'Café Yopougon' },
  { name: 'Chez Fati', area: 'Treichville', lat: 5.3210, lng: -4.0510, safety: 2, incidents: 0, description: 'Restaurant Treichville' },

  // HOSPITALS
  { name: 'CHU Treichville', area: 'Treichville', lat: 5.3240, lng: -4.0530, safety: 3, incidents: 0, description: 'Hôpital public' },
  { name: 'Clinique de l\'Amitié', area: 'Cocody', lat: 5.3390, lng: -4.0160, safety: 4, incidents: 0, description: 'Clinique privée' },

  // TRANSPORTS
  { name: 'Aéroport Félix Houphouët', area: 'Port-Bouët', lat: 5.2608, lng: -3.9640, safety: 3, incidents: 0, description: 'Aéroport international' },
  { name: 'Gare d\'Adjamé', area: 'Adjamé', lat: 5.3500, lng: -4.0320, safety: 2, incidents: 0, description: 'Gare routière' },

  // AUTRES
  { name: 'Université Cocody', area: 'Cocody', lat: 5.3420, lng: -4.0020, safety: 3, incidents: 0, description: 'Université' },
  { name: 'Marché de Treichville', area: 'Treichville', lat: 5.3180, lng: -4.0480, safety: 2, incidents: 0, description: 'Grand marché' },
];

const querySchema = Joi.object({
  query: Joi.string().max(100).optional(),
  lat: Joi.number().min(-90).max(90).optional(),
  lng: Joi.number().min(-180).max(180).optional(),
  radius: Joi.number().integer().min(1).max(100000).default(20000).optional(), // in km
});

// Calculate distance between two coordinates
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

// Get safety level label
function getSafetyLevel(safety) {
  switch(safety) {
    case 1: return { label: '🔴 Très dangereux', color: '#B71C1C' };
    case 2: return { label: '🟠 Dangereux', color: '#FF8F00' };
    case 3: return { label: '🟡 Modéré', color: '#FBC02D' };
    case 4: return { label: '🟢 Sûr', color: '#1B5E20' };
    case 5: return { label: '🟢 Très sûr', color: '#0D7C0D' };
    default: return { label: '❓ Inconnu', color: '#757575' };
  }
}

// GET /api/locations/osm-search - Search TOUS les lieux réels via Photon API
router.get('/osm-search', async (req, res) => {
  const { query, lat, lng } = req.query;

  if (!query || query.trim().length < 2) {
    return res.json({ success: true, data: { locations: [], query } });
  }

  try {
    // Use Photon API (Komoot) for real-time, comprehensive location search
    // Same as Delivera - searches ALL real places from OpenStreetMap
    const photonUrl = new URL('https://photon.komoot.io/api/');
    photonUrl.searchParams.append('q', query);
    photonUrl.searchParams.append('limit', '20');
    photonUrl.searchParams.append('lang', 'fr');
    if (lat && lng) {
      photonUrl.searchParams.append('lat', lat);
      photonUrl.searchParams.append('lon', lng);
    }

    const response = await fetch(photonUrl.toString());
    const data = await response.json();

    const results = (data.features || []).map(f => {
      const [lng_coord, lat_coord] = f.geometry.coordinates;
      const props = f.properties;

      // Build full address name from Photon data
      const addressParts = [
        props.name,
        props.street,
        props.city || props.state,
        props.country
      ].filter(Boolean);

      return {
        name: props.name || 'Lieu',
        area: props.city || props.state || 'Abidjan',
        lat: lat_coord,
        lng: lng_coord,
        description: addressParts.slice(1).join(', '),
        safety_info: { label: '📍 Lieu', color: '#757575' }
      };
    });

    return res.json({ success: true, data: { locations: results, query } });
  } catch (err) {
    console.error('Photon search error:', err);
    // Fallback to CI_LOCATIONS if Photon fails
    try {
      const searchTerm = normalizeAccents(query.toLowerCase());
      const fallbackResults = CI_LOCATIONS.filter(loc =>
        normalizeAccents(loc.name.toLowerCase()).includes(searchTerm) ||
        normalizeAccents(loc.area.toLowerCase()).includes(searchTerm)
      );
      return res.json({ success: true, data: { locations: fallbackResults.slice(0, 10), query } });
    } catch (fallbackErr) {
      return res.json({ success: true, data: { locations: [], query } });
    }
  }
});

// GET /api/locations/search - Search locations by name or proximity
router.get('/search', async (req, res) => {
  const { error, value } = querySchema.validate(req.query);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const { query, lat, lng, radius } = value;
    let results = [...CI_LOCATIONS];

    // Filter by search query (with accent normalization)
    if (query && query.trim().length > 0) {
      const searchTerm = normalizeAccents(query.toLowerCase());
      results = results.filter(loc =>
        normalizeAccents(loc.name.toLowerCase()).includes(searchTerm) ||
        normalizeAccents(loc.area.toLowerCase()).includes(searchTerm) ||
        normalizeAccents(loc.description.toLowerCase()).includes(searchTerm)
      );
    }

    // Filter by proximity if lat/lng provided
    if (lat !== undefined && lng !== undefined) {
      results = results
        .map(loc => ({
          ...loc,
          distance: getDistance(lat, lng, loc.lat, loc.lng),
          safety_info: getSafetyLevel(loc.safety)
        }))
        .filter(loc => loc.distance <= (radius / 1000))
        .sort((a, b) => a.distance - b.distance);
    } else {
      results = results.map(loc => ({
        ...loc,
        safety_info: getSafetyLevel(loc.safety)
      }));
    }

    // Limit results
    results = results.slice(0, 20);

    return res.json({
      success: true,
      data: {
        locations: results,
        count: results.length,
        query: query || 'all locations'
      }
    });
  } catch (err) {
    console.error('Location search error:', err);
    return res.status(500).json({ success: false, error: 'Erreur recherche lieux' });
  }
});

// GET /api/locations/:name - Get single location details
router.get('/:name', async (req, res) => {
  try {
    const location = CI_LOCATIONS.find(loc =>
      loc.name.toLowerCase() === req.params.name.toLowerCase()
    );

    if (!location) {
      return res.status(404).json({ success: false, error: 'Lieu non trouvé' });
    }

    return res.json({
      success: true,
      data: {
        ...location,
        safety_info: getSafetyLevel(location.safety)
      }
    });
  } catch (err) {
    console.error('Location detail error:', err);
    return res.status(500).json({ success: false, error: 'Erreur détails lieu' });
  }
});

// GET /api/locations/nearby - Get nearby locations
router.get('/', async (req, res) => {
  const { error, value } = querySchema.validate(req.query);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const { lat, lng, radius } = value;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: 'lat et lng requis' });
    }

    const results = CI_LOCATIONS
      .map(loc => ({
        ...loc,
        distance: getDistance(lat, lng, loc.lat, loc.lng),
        safety_info: getSafetyLevel(loc.safety)
      }))
      .filter(loc => loc.distance <= (radius / 1000))
      .sort((a, b) => a.safety - b.safety) // Unsafe first
      .slice(0, 20);

    return res.json({
      success: true,
      data: {
        locations: results,
        count: results.length,
        center: { lat, lng },
        radius
      }
    });
  } catch (err) {
    console.error('Nearby locations error:', err);
    return res.status(500).json({ success: false, error: 'Erreur lieux proximité' });
  }
});

module.exports = router;
