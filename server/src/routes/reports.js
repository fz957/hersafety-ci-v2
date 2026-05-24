const express = require('express');
const Joi     = require('joi');

const knex              = require('../db/knex');
const { requireAuth }   = require('../middlewares/auth');
const { requireTenant } = require('../middlewares/tenant');
const { requireAdmin }  = require('../middlewares/admin');

const router = express.Router();

// ─── GET /api/reports/generate-demo-data — Public endpoint for test data ────────

router.get('/generate-demo-data', async (req, res) => {
  try {
    // Get all organizations
    const orgs = await knex('organizations').select('id').limit(1);

    if (orgs.length === 0) {
      return res.status(400).json({ success: false, error: 'No organizations found' });
    }

    const orgId = orgs[0].id;

    // Get a user from this org
    const user = await knex('users').where('organization_id', orgId).select('id').first();

    if (!user) {
      return res.status(400).json({ success: false, error: 'No users found in organization' });
    }

    const testReports = [
      {
        user_id: user.id,
        organization_id: orgId,
        is_anonymous: true,
        report_type: 'lieu',
        danger_type: 'agression_physique',
        description: 'Agression observée - situation dangereuse',
        place_name: 'Marché Adjamé',
        place_address: 'Adjamé, Abidjan',
        place_lat: 5.3550,
        place_lng: -4.0280,
        status: 'verified',
        verified_by: user.id,
        verified_at: new Date(),
      },
      {
        user_id: user.id,
        organization_id: orgId,
        is_anonymous: true,
        report_type: 'lieu',
        danger_type: 'vol',
        description: 'Pickpockets actifs - nombreux vols à la tire',
        place_name: 'Marché Adjamé',
        place_address: 'Adjamé, Abidjan',
        place_lat: 5.3550,
        place_lng: -4.0280,
        status: 'verified',
        verified_by: user.id,
        verified_at: new Date(),
      },
      {
        user_id: user.id,
        organization_id: orgId,
        is_anonymous: true,
        report_type: 'lieu',
        danger_type: 'harcelement_verbal',
        description: 'Harcèlement verbal fréquent dans la zone',
        place_name: 'Plateau',
        place_address: 'Plateau, Abidjan',
        place_lat: 5.3405,
        place_lng: -4.0397,
        status: 'verified',
        verified_by: user.id,
        verified_at: new Date(),
      },
      {
        user_id: user.id,
        organization_id: orgId,
        is_anonymous: true,
        report_type: 'lieu',
        danger_type: 'suivi',
        description: 'Zone à éviter le soir - suivi signalé',
        place_name: 'Yopougon',
        place_address: 'Yopougon, Abidjan',
        place_lat: 5.3452,
        place_lng: -4.0718,
        status: 'verified',
        verified_by: user.id,
        verified_at: new Date(),
      },
      {
        user_id: user.id,
        organization_id: orgId,
        is_anonymous: true,
        report_type: 'lieu',
        danger_type: 'agression_physique',
        description: 'Incident de sécurité signalé',
        place_name: 'Adjamé',
        place_address: 'Adjamé, Abidjan',
        place_lat: 5.3520,
        place_lng: -4.0300,
        status: 'verified',
        verified_by: user.id,
        verified_at: new Date(),
      },
    ];

    // Delete existing demo data first
    await knex('reports')
      .where('organization_id', orgId)
      .whereIn('place_name', ['Marché Adjamé', 'Plateau', 'Yopougon', 'Adjamé', 'Cocody'])
      .delete();

    // Insert test data
    const created = await knex('reports')
      .insert(testReports)
      .returning('*');

    return res.json({
      success: true,
      data: {
        message: `✅ Created ${created.length} demo reports for organization`,
        count: created.length,
        organization: orgId
      }
    });
  } catch (err) {
    console.error('Generate demo data error:', err);
    return res.status(500).json({ success: false, error: 'Erreur création données démo' });
  }
});

// ─── GET /api/reports/categorized-locations ────────────────────────────────────
// Public endpoint - no auth required for reading verified locations

router.get('/categorized-locations', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseInt(req.query.radius || '5000', 10); // in meters

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ success: false, error: 'Invalid lat/lng' });
  }

  try {
    // Get danger zones (unsafe - red): verified reports with 2+ incidents
    const unsafeZones = await knex('reports')
      .where({ status: 'verified', report_type: 'lieu' })
      .whereNotNull('place_lat')
      .whereNotNull('place_lng')
      .select(
        knex.raw('ROUND(CAST(place_lat AS numeric), 4)::float as lat'),
        knex.raw('ROUND(CAST(place_lng AS numeric), 4)::float as lng'),
        'place_address',
        'place_name',
        knex.raw('COUNT(*) as incident_count'),
        knex.raw('array_agg(DISTINCT danger_type ORDER BY danger_type)::text[] as danger_types'),
        knex.raw("'verified' as status")
      )
      .groupBy('place_address', 'place_name', knex.raw('ROUND(CAST(place_lat AS numeric), 4)'), knex.raw('ROUND(CAST(place_lng AS numeric), 4)'))
      .havingRaw('COUNT(*) >= 2')
      .orderBy(knex.raw('COUNT(*)'), 'desc');

    // Get medium risk zones (orange): ALL reports (verified, pending, refuted) with 1+ incidents
    const mediumRiskZones = await knex('reports')
      .where({ report_type: 'lieu' })
      .whereNotNull('place_lat')
      .whereNotNull('place_lng')
      .where(function(q) {
        q.where({ status: 'verified' })
          .orWhere({ status: 'pending' })
          .orWhere({ status: 'refuted' });
      })
      .select(
        knex.raw('ROUND(CAST(place_lat AS numeric), 4)::float as lat'),
        knex.raw('ROUND(CAST(place_lng AS numeric), 4)::float as lng'),
        'place_address',
        'place_name',
        'status',
        knex.raw('COUNT(*) as incident_count'),
        knex.raw('array_agg(DISTINCT danger_type ORDER BY danger_type)::text[] as danger_types')
      )
      .groupBy('place_address', 'place_name', 'status', knex.raw('ROUND(CAST(place_lat AS numeric), 4)'), knex.raw('ROUND(CAST(place_lng AS numeric), 4)'))
      .havingRaw('COUNT(*) >= 1');

    // Format: calculate distance and filter by radius
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

    // Filter unsafe zones by radius and add distance
    const unsafeWithDistance = unsafeZones
      .map((z) => ({
        ...z,
        category: 'unsafe',
        color: '#B71C1C', // red
        distance: getDistance(lat, lng, z.lat, z.lng)
      }))
      .filter((z) => z.distance <= (radius / 1000));

    // Filter medium risk zones by radius (exclude unsafe ones already in the list)
    const unsafeCoords = unsafeWithDistance.map(z => `${z.lat.toFixed(4)}_${z.lng.toFixed(4)}`);
    const mediumWithDistance = mediumRiskZones
      .filter(z => !unsafeCoords.includes(`${z.lat.toFixed(4)}_${z.lng.toFixed(4)}`))
      .map((z) => {
        // Color based on status
        let color = '#FF8F00'; // orange by default
        if (z.status === 'refuted') {
          color = '#9E9E9E'; // gray for refuted
        } else if (z.status === 'pending') {
          color = '#FBC02D'; // yellow for pending
        }

        return {
          ...z,
          category: 'medium',
          color: color,
          distance: getDistance(lat, lng, z.lat, z.lng)
        };
      })
      .filter((z) => z.distance <= (radius / 1000));

    // Safe places: will be returned but marked as safe (not from danger reports)
    const locations = [
      ...unsafeWithDistance.sort((a, b) => b.incident_count - a.incident_count),
      ...mediumWithDistance.sort((a, b) => b.incident_count - a.incident_count)
    ];

    return res.json({
      success: true,
      data: {
        locations,
        unsafe_count: unsafeWithDistance.length,
        medium_count: mediumWithDistance.length,
        center: { lat, lng },
        radius: radius
      }
    });
  } catch (err) {
    console.error('Categorized locations error:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération emplacements catégorisés' });
  }
});

// Auth required from here on
router.use(requireAuth, requireTenant);

const DANGER_TYPES = ['harcelement_verbal', 'agression_physique', 'agression_sexuelle', 'vol', 'suivi', 'detour_force', 'autre'];

const createSchema = Joi.object({
  is_anonymous:      Joi.boolean().default(true),
  report_type:       Joi.string().valid('lieu', 'chauffeur').required(),
  danger_type:       Joi.string().valid(...DANGER_TYPES).required(),
  description:       Joi.string().trim().max(5000).required(),
  incident_date:     Joi.date().max('now').optional(),
  // Champs lieu
  place_name:        Joi.string().max(255).optional(),
  place_address:     Joi.string().max(500).optional(),
  place_lat:         Joi.number().min(-90).max(90).optional(),
  place_lng:         Joi.number().min(-180).max(180).optional(),
  // Champs chauffeur/VTC
  vehicle_plate:     Joi.string().max(20).optional(),
  vtc_app:           Joi.string().max(100).optional(),
});

const verifySchema = Joi.object({
  action:            Joi.string().valid('verify', 'refute').required(),
  verification_note: Joi.string().max(500).optional(),
});

// ─── GET /api/reports/danger-zones ────────────────────────────────────────────
// Zones dangereuses groupées par localisation (pour carte)

router.get('/danger-zones', async (req, res) => {
  try {
    const dangerZones = await knex('reports')
      .where({ organization_id: req.user.organizationId, status: 'verified', report_type: 'lieu' })
      .whereNotNull('place_lat')
      .whereNotNull('place_lng')
      .select(
        knex.raw('ROUND(CAST(place_lat AS numeric), 4)::float as lat'),
        knex.raw('ROUND(CAST(place_lng AS numeric), 4)::float as lng'),
        'place_address',
        'place_name',
        knex.raw('COUNT(*) as incident_count'),
        knex.raw('array_agg(DISTINCT danger_type ORDER BY danger_type)::text[] as danger_types')
      )
      .groupBy('place_address', 'place_name', knex.raw('ROUND(CAST(place_lat AS numeric), 4)'), knex.raw('ROUND(CAST(place_lng AS numeric), 4)'))
      .havingRaw('COUNT(*) > 0')
      .orderBy(knex.raw('COUNT(*)'), 'desc');

    return res.json({ success: true, data: dangerZones });
  } catch (err) {
    console.error('Danger zones error:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération zones dangereuses' });
  }
});

// ─── GET /api/reports ─────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit = Math.min(500, parseInt(req.query.limit || '100', 10));

  try {
    const reports = await knex('reports')
      .where({ organization_id: req.user.organizationId })
      // Include ALL statuses: verified, pending, refuted
      // Don't filter by status - show everything
      .select(
        'id', 'organization_id', 'is_anonymous', 'report_type', 'danger_type',
        'place_name', 'place_address', 'place_lat', 'place_lng',
        'vtc_app', 'description', 'incident_date', 'status', 'created_at'
        // vehicle_plate et user_id exclus pour préserver l'anonymat
      )
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return res.json({ success: true, data: reports });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur récupération signalements' });
  }
});

// ─── POST /api/reports ────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const [report] = await knex('reports')
      .insert({
        user_id:         req.user.userId,
        organization_id: req.user.organizationId,
        status:          'pending',
        ...value,
      })
      .returning([
        'id', 'organization_id', 'is_anonymous', 'report_type', 'danger_type',
        'description', 'status', 'created_at',
      ]);

    return res.status(201).json({ success: true, data: report });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur création signalement' });
  }
});

// ─── POST /api/reports/create-test-data — Create test reports for demo ─────────

router.post('/create-test-data', requireAuth, requireTenant, async (req, res) => {
  try {
    // Create test reports for the current organization
    const testReports = [
      {
        user_id: req.user.userId,
        organization_id: req.user.organizationId,
        is_anonymous: true,
        report_type: 'lieu',
        danger_type: 'agression_physique',
        description: 'Agression observée dans ce quartier',
        place_name: 'Marché Adjamé',
        place_address: 'Adjamé, Abidjan',
        place_lat: 5.3550,
        place_lng: -4.0280,
        status: 'verified',
        verified_by: req.user.userId,
        verified_at: new Date(),
      },
      {
        user_id: req.user.userId,
        organization_id: req.user.organizationId,
        is_anonymous: true,
        report_type: 'lieu',
        danger_type: 'vol',
        description: 'Pickpockets actifs en fin d\'après-midi',
        place_name: 'Marché Adjamé',
        place_address: 'Adjamé, Abidjan',
        place_lat: 5.3550,
        place_lng: -4.0280,
        status: 'verified',
        verified_by: req.user.userId,
        verified_at: new Date(),
      },
      {
        user_id: req.user.userId,
        organization_id: req.user.organizationId,
        is_anonymous: true,
        report_type: 'lieu',
        danger_type: 'harcelement_verbal',
        description: 'Zone avec harcèlement verbal fréquent',
        place_name: 'Plateau',
        place_address: 'Plateau, Abidjan',
        place_lat: 5.3405,
        place_lng: -4.0397,
        status: 'verified',
        verified_by: req.user.userId,
        verified_at: new Date(),
      },
      {
        user_id: req.user.userId,
        organization_id: req.user.organizationId,
        is_anonymous: true,
        report_type: 'lieu',
        danger_type: 'suivi',
        description: 'Zone à éviter le soir',
        place_name: 'Yopougon',
        place_address: 'Yopougon, Abidjan',
        place_lat: 5.3452,
        place_lng: -4.0718,
        status: 'verified',
        verified_by: req.user.userId,
        verified_at: new Date(),
      },
      {
        user_id: req.user.userId,
        organization_id: req.user.organizationId,
        is_anonymous: true,
        report_type: 'lieu',
        danger_type: 'agression_physique',
        description: 'Incident de sécurité signalé',
        place_name: 'Cocody',
        place_address: 'Cocody, Abidjan',
        place_lat: 5.3382,
        place_lng: -4.0143,
        status: 'verified',
        verified_by: req.user.userId,
        verified_at: new Date(),
      },
    ];

    // Delete existing test data first
    await knex('reports')
      .where({ organization_id: req.user.organizationId })
      .whereIn('place_name', ['Marché Adjamé', 'Plateau', 'Yopougon', 'Cocody'])
      .delete();

    // Insert test data
    const created = await knex('reports')
      .insert(testReports)
      .returning('*');

    return res.status(201).json({
      success: true,
      data: {
        message: `✅ Created ${created.length} test reports`,
        reports: created
      }
    });
  } catch (err) {
    console.error('Create test data error:', err);
    return res.status(500).json({ success: false, error: 'Erreur création données test' });
  }
});

// ─── PATCH /api/reports/:id/verify — admin seulement ─────────────────────────

router.patch('/:id/verify', requireAdmin, async (req, res) => {
  const { error, value } = verifySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const [report] = await knex('reports')
      .where({ id: req.params.id, organization_id: req.user.organizationId, status: 'pending' })
      .update({
        status:            value.action === 'verify' ? 'verified' : 'refuted',
        verified_by:       req.user.userId,
        verified_at:       new Date(),
        verification_note: value.verification_note,
        updated_at:        new Date(),
      })
      .returning('*');

    if (!report) {
      return res.status(404).json({ success: false, error: 'Signalement introuvable ou déjà traité' });
    }

    return res.json({ success: true, data: report });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur vérification signalement' });
  }
});

module.exports = router;
