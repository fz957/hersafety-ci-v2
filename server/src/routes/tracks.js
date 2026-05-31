const express = require('express');
const Joi     = require('joi');
const crypto  = require('crypto');

const knex              = require('../db/knex');
const { requireAuth }   = require('../middlewares/auth');
const { sendTrackNotification } = require('../services/email.service');

const router = express.Router();

// ─── PUBLIC ROUTE: GET /api/tracks/share/:token ───────────────────────────────
// Permet aux contacts de voir la position d'un trajet en direct (sans auth)

router.get('/share/:token', async (req, res) => {
  try {
    const track = await knex('tracks')
      .where({ share_token: req.params.token, status: 'active' })
      .first();

    if (!track) {
      return res.status(404).json({ success: false, error: 'Trajet introuvable ou terminé' });
    }

    // Obtenir les infos de l'utilisateur pour le nom
    const user = await knex('users').where({ id: track.user_id }).first();

    return res.json({
      success: true,
      data: {
        id: track.id,
        userName: user ? user.full_name : 'Utilisateur',
        destination_label: track.destination_label,
        started_at: track.started_at,
        waypoints: track.waypoints ? JSON.parse(track.waypoints) : [],
        status: track.status,
      }
    });
  } catch (err) {
    console.error('Track share error:', err);
    return res.status(500).json({ success: false, error: 'Erreur chargement trajet' });
  }
});

// Routes authentifiées à partir d'ici
router.use(requireAuth);

// ─── GET /api/tracks ─────────────────────────────────────────────────────────
// List all tracks for the current user

router.get('/', async (req, res) => {
  const { userId } = req.user;

  try {
    const tracks = await knex('tracks')
      .where({ user_id: userId})
      .orderBy('started_at', 'desc');

    return res.json({ success: true, data: tracks });
  } catch (err) {
    console.error('[GET /api/tracks] Error:', err.message);
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
  response:     Joi.string().valid('ok', 'no_response').required(),
  location_lat: Joi.number().min(-90).max(90).optional(),
  location_lng: Joi.number().min(-180).max(180).optional(),
}).unknown(false);  // Disallow unknown fields but response IS defined

// ─── POST /api/tracks ─────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { error, value } = startSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { userId } = req.user;

  try {
    // Interrompt tout trajet actif existant avant d'en démarrer un nouveau
    await knex('tracks')
      .where({ user_id: userId, status: 'active' })
      .update({ status: 'interrupted', ended_at: new Date() });

    const initialWaypoints = value.location_lat && value.location_lng
      ? JSON.stringify([{ lat: value.location_lat, lng: value.location_lng, at: new Date().toISOString() }])
      : JSON.stringify([]);

    // Générer un token de partage unique
    const shareToken = crypto.randomBytes(16).toString('hex');

    const [track] = await knex('tracks')
      .insert({
        user_id:              userId,
        organization_id:      organizationId,
        destination_label:    value.destination_label,
        checkin_interval_min: value.checkin_interval_min,
        waypoints:            knex.raw('?::jsonb', [initialWaypoints]),
        share_token:          shareToken,
      })
      .returning('*');

    // Envoyer les notifications aux contacts
    const user = await knex('users').where({ id: userId }).first();
    const contacts = await knex('contacts')
      .where({ user_id: userId});

    if (contacts.length > 0) {
      const shareLink = `${process.env.FRONTEND_URL}/track/${shareToken}`;

      // Envoyer notifications email aux contacts
      for (const contact of contacts) {
        if (contact.email) {
          await sendTrackNotification(contact.email, {
            senderName: user.full_name,
            trackLink: shareLink,
          }).catch(err => console.error('Track notification error:', err.message));
        }
      }

      console.log(`✓ Track notifications sent to ${contacts.length} contacts`);
    }

    return res.status(201).json({ success: true, data: track });
  } catch (err) {
    console.error('Track creation error:', err);
    return res.status(500).json({ success: false, error: 'Erreur démarrage trajet' });
  }
});

// ─── PATCH /api/tracks/:id/checkin ───────────────────────────────────────────

router.patch('/:id/checkin', async (req, res) => {
  console.log('\n=== PATCH /checkin ===');
  console.log('[CHECKIN] Request body:', JSON.stringify(req.body));
  console.log('[CHECKIN] Track ID:', req.params.id);
  console.log('[CHECKIN] User ID:', req.user?.userId);
  console.log('[CHECKIN] Org ID:', req.user?.organizationId);

  const { error, value } = checkinSchema.validate(req.body);
  if (error) {
    console.log('[CHECKIN] ❌ Validation FAILED:', error.details[0].message);
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  console.log('[CHECKIN] ✓ Validation OK:', JSON.stringify(value));

  const { userId } = req.user;

  try {
    const track = await knex('tracks')
      .where({ id: req.params.id, user_id: userId, status: 'active' })
      .first();

    if (!track) {
      console.log('[CHECKIN] ❌ Track not found or not active');
      return res.status(404).json({ success: false, error: 'Trajet introuvable ou déjà terminé' });
    }
    console.log('[CHECKIN] ✓ Track found:', track.id);

    const [checkin] = await knex('checkins')
      .insert({
        track_id:        track.id,
        user_id:         userId,
        organization_id: organizationId,
        response:        value.response,
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
      console.log('[CHECKIN] ✓ Waypoint added');
    }

    console.log('[CHECKIN] ✓ SUCCESS - Check-in recorded:', checkin.id);
    return res.json({ success: true, data: checkin });
  } catch (err) {
    console.error('[CHECKIN] ❌ ERROR:', err.message);
    console.error('[CHECKIN] Stack:', err.stack);
    return res.status(500).json({ success: false, error: 'Erreur check-in: ' + err.message });
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

  const { userId } = req.user;

  try {
    const track = await knex('tracks')
      .where({ id: req.params.id, user_id: userId, status: 'active' })
      .first();

    if (!track) {
      return res.status(404).json({ success: false, error: 'Trajet introuvable ou déjà terminé' });
    }

    // Add waypoint to track
    // waypoints is already an object (from JSONB), not a string
    const waypoints = Array.isArray(track.waypoints) ? track.waypoints : [];
    waypoints.push({
      lat: value.location_lat,
      lng: value.location_lng,
      at: new Date().toISOString(),
    });

    const [updated] = await knex('tracks')
      .where({ id: req.params.id })
      .update({
        waypoints: knex.raw('?::jsonb', [JSON.stringify(waypoints)]),
      })
      .returning('*');

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[PATCH /api/tracks/:id] Error:', err.message);
    return res.status(500).json({ success: false, error: 'Erreur mise à jour position: ' + err.message });
  }
});

// ─── PATCH /api/tracks/:id/end ────────────────────────────────────────────────

router.patch('/:id/end', async (req, res) => {
  const { userId } = req.user;

  try {
    const [track] = await knex('tracks')
      .where({ id: req.params.id, user_id: userId, status: 'active' })
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
