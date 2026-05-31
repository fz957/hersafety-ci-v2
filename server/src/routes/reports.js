const express = require('express');
const Joi = require('joi');
const knex = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/admin');

const router = express.Router();
router.use(requireAuth);

const reportSchema = Joi.object({
  report_type: Joi.string().valid('lieu').required(),
  danger_type: Joi.string().optional(),
  place_name: Joi.string().optional(),
  place_address: Joi.string().optional(),
  place_lat: Joi.number().optional(),
  place_lng: Joi.number().optional(),
  is_anonymous: Joi.boolean().optional(),
  description: Joi.string().max(1000).optional(),
});

// POST /api/reports — Soumettre un signalement
router.post('/', async (req, res) => {
  const { error, value } = reportSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { userId, organizationId } = req.user;

  try {
    const [report] = await knex('reports')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        report_type: value.report_type,
        danger_type: value.danger_type,
        place_name: value.place_name,
        place_address: value.place_address,
        place_lat: value.place_lat,
        place_lng: value.place_lng,
        is_anonymous: value.is_anonymous,
        description: value.description,
        status: 'pending',
      })
      .returning('*');

    return res.status(201).json({ success: true, data: report });
  } catch (err) {
    console.error('Report error:', err);
    return res.status(500).json({ success: false, error: 'Erreur signalement' });
  }
});

// GET /api/reports/danger-zones — Tous les zones dangereuses (AVANT GET / qui requireAdmin!)
router.get('/danger-zones', async (req, res) => {
  const { organizationId } = req.user;

  try {
    const reports = await knex('reports')
      .where({ organization_id: organizationId, report_type: 'lieu', status: 'verified' })
      .select('*')
      .orderBy('created_at', 'desc');

    // Format reports with lat/lng for frontend compatibility
    const zones = reports.map(r => ({
      ...r,
      lat: parseFloat(r.place_lat),
      lng: parseFloat(r.place_lng),
    })).filter(z => z.lat && z.lng); // Only include zones with valid coordinates

    return res.json({ success: true, data: zones });
  } catch (err) {
    console.error('Danger zones error:', err);
    return res.status(500).json({ success: false, error: 'Erreur chargement zones' });
  }
});

// GET /api/reports/categorized-locations — Zones par catégorie avec stats (AVANT GET / qui requireAdmin!)
router.get('/categorized-locations', async (req, res) => {
  const { organizationId } = req.user;
  const lat = parseFloat(req.query.lat) || 5.3405;
  const lng = parseFloat(req.query.lng) || -4.0397;
  const radius = parseFloat(req.query.radius) || 50000;

  try {
    // Récupérer les reports vérifiés du type 'lieu'
    const reports = await knex('reports')
      .where({ organization_id: organizationId, report_type: 'lieu', status: 'verified' })
      .select('*');

    // Grouper par location (lat, lng) et compter les incidents
    const locationMap = {};
    reports.forEach(r => {
      if (!r.place_lat || !r.place_lng) return; // Skip reports without location

      const key = `${r.place_lat},${r.place_lng}`;
      if (!locationMap[key]) {
        locationMap[key] = {
          lat: parseFloat(r.place_lat),
          lng: parseFloat(r.place_lng),
          place_name: r.place_name,
          place_address: r.place_address,
          danger_types: [],
          incident_count: 0,
          category: 'medium', // default
          latest_report: r.created_at
        };
      }

      locationMap[key].incident_count += 1;
      if (r.danger_type && !locationMap[key].danger_types.includes(r.danger_type)) {
        locationMap[key].danger_types.push(r.danger_type);
      }
      // Track latest report date
      if (r.created_at > locationMap[key].latest_report) {
        locationMap[key].latest_report = r.created_at;
      }
    });

    // Convert to array and compute category based on incident count
    const locations = Object.values(locationMap)
      .map(loc => ({
        ...loc,
        category: loc.incident_count >= 3 ? 'unsafe' : 'medium'
      }))
      .sort((a, b) => b.incident_count - a.incident_count); // Sort by incident count descending

    // Count by category
    const unsafe = locations.filter(l => l.category === 'unsafe').length;
    const medium = locations.filter(l => l.category === 'medium').length;

    return res.json({
      success: true,
      data: {
        locations: locations,
        unsafe_count: unsafe,
        medium_count: medium,
        total_count: locations.length
      }
    });
  } catch (err) {
    console.error('Categorized locations error:', err);
    return res.status(500).json({ success: false, error: 'Erreur chargement catégories' });
  }
});

// GET /api/reports — Admin: voir tous les signalements
router.get('/', requireAdmin, async (req, res) => {
  const { organizationId } = req.user;
  const status = req.query.status || 'pending';

  try {
    const reports = await knex('reports')
      .where({ organization_id: organizationId, status })
      .select('*')
      .orderBy('created_at', 'desc');

    return res.json({ success: true, data: reports });
  } catch (err) {
    console.error('Reports get error:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération signalements' });
  }
});

// PATCH /api/reports/:id — Admin: marquer comme vérifié/refuté
router.patch('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { userId, organizationId } = req.user;

  if (!['pending', 'verified', 'refuted'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Status invalide' });
  }

  try {
    const [report] = await knex('reports')
      .where({ id})
      .update({
        status,
        verified_at: new Date(),
        verified_by: userId,
      })
      .returning('*');

    if (!report) {
      return res.status(404).json({ success: false, error: 'Signalement introuvable' });
    }

    return res.json({ success: true, data: report });
  } catch (err) {
    console.error('Report update error:', err);
    return res.status(500).json({ success: false, error: 'Erreur mise à jour signalement' });
  }
});

module.exports = router;
