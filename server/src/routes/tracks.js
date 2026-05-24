const express = require('express');
const Joi     = require('joi');

const knex              = require('../db/knex');
const { requireAuth }   = require('../middlewares/auth');
const { requireTenant } = require('../middlewares/tenant');

const router = express.Router();
router.use(requireAuth, requireTenant);

// ─── GET /api/tracks ─────────────────────────────────────────────────────────
// List all tracks for the current user

router.get('/', async (req, res) => {
  const { userId, organizationId } = req.user;

  try {
    const tracks = await knex('tracks')
      .where({ user_id: userId, organization_id: organizationId })
      .orderBy('created_at', 'desc');

    return res.json({ success: true, data: tracks });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur chargement trajets' });
  }
});

// ─── POST /api/tracks ─────────────────────────────────────────────────────────

const startSchema = Joi.object({
  destination_label:    Joi.string().max(500).optional(),
  checkin_interval_min: Joi.number().integer().min(1).max(60).default(10),
  location_lat:         Joi.number().min(-90).max(90).optional(),
  location_lng:         Joi.number().min(-180).max(180).optional(),
});

const checkinSchema = Joi.object({
  location_lat: Joi.number().min(-90).max(90).optional(),
  location_lng: Joi.number().min(-180).max(180).optional(),
});

// ─── POST /api/tracks ─────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { error, value } = startSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { userId, organizationId } = req.user;

  try {
    // Interrompt tout trajet actif existant avant d'en démarrer un nouveau
    await knex('tracks')
      .where({ user_id: userId, organization_id: organizationId, status: 'active' })
      .update({ status: 'interrupted', ended_at: new Date() });

    const initialWaypoints = value.location_lat && value.location_lng
      ? JSON.stringify([{ lat: value.location_lat, lng: value.location_lng, at: new Date().toISOString() }])
      : JSON.stringify([]);

    const [track] = await knex('tracks')
      .insert({
        user_id:              userId,
        organization_id:      organizationId,
        destination_label:    value.destination_label,
        checkin_interval_min: value.checkin_interval_min,
        waypoints:            knex.raw('?::jsonb', [initialWaypoints]),
      })
      .returning('*');

    return res.status(201).json({ success: true, data: track });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur démarrage trajet' });
  }
});

// ─── PATCH /api/tracks/:id/checkin ───────────────────────────────────────────

router.patch('/:id/checkin', async (req, res) => {
  const { error, value } = checkinSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { userId, organizationId } = req.user;

  try {
    const track = await knex('tracks')
      .where({ id: req.params.id, user_id: userId, organization_id: organizationId, status: 'active' })
      .first();

    if (!track) {
      return res.status(404).json({ success: false, error: 'Trajet introuvable ou déjà terminé' });
    }

    const [checkin] = await knex('checkins')
      .insert({
        track_id:        track.id,
        user_id:         userId,
        organization_id: organizationId,
        response:        'ok',
        responded_at:    new Date(),
        location_lat:    value.location_lat,
        location_lng:    value.location_lng,
      })
      .returning('*');

    // Ajoute le point GPS aux waypoints si fourni
    if (value.location_lat && value.location_lng) {
      const waypoint = JSON.stringify([{
        lat: value.location_lat,
        lng: value.location_lng,
        at:  new Date().toISOString(),
      }]);
      await knex.raw(
        'UPDATE tracks SET waypoints = waypoints || ?::jsonb WHERE id = ?',
        [waypoint, track.id]
      );
    }

    return res.json({ success: true, data: checkin });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur check-in' });
  }
});

// ─── PATCH /api/tracks/:id ───────────────────────────────────────────────────
// Update location waypoint (called every 10 seconds during tracking)

const updateSchema = Joi.object({
  location_lat: Joi.number().min(-90).max(90).required(),
  location_lng: Joi.number().min(-180).max(180).required(),
});

router.patch('/:id', async (req, res) => {
  const { error, value } = updateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { userId, organizationId } = req.user;

  try {
    const track = await knex('tracks')
      .where({ id: req.params.id, user_id: userId, organization_id: organizationId, status: 'active' })
      .first();

    if (!track) {
      return res.status(404).json({ success: false, error: 'Trajet introuvable ou déjà terminé' });
    }

    // Add waypoint to track
    const waypoints = track.waypoints ? JSON.parse(track.waypoints) : [];
    waypoints.push({
      lat: value.location_lat,
      lng: value.location_lng,
      at: new Date().toISOString(),
    });

    const [updated] = await knex('tracks')
      .where({ id: req.params.id })
      .update({
        waypoints: knex.raw('?::jsonb', [JSON.stringify(waypoints)]),
        updated_at: new Date(),
      })
      .returning('*');

    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur mise à jour position' });
  }
});

// ─── PATCH /api/tracks/:id/end ────────────────────────────────────────────────

router.patch('/:id/end', async (req, res) => {
  const { userId, organizationId } = req.user;

  try {
    const [track] = await knex('tracks')
      .where({ id: req.params.id, user_id: userId, organization_id: organizationId, status: 'active' })
      .update({ status: 'completed', ended_at: new Date() })
      .returning('*');

    if (!track) {
      return res.status(404).json({ success: false, error: 'Trajet introuvable ou déjà terminé' });
    }

    return res.json({ success: true, data: track });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur fin de trajet' });
  }
});

module.exports = router;
