const express = require('express');
const Joi = require('joi');
const knex = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');
const { requireTenant } = require('../middlewares/tenant');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Dossier pour stocker les enregistrements audio
const AUDIO_DIR = path.join(__dirname, '../../uploads/emergency-audio');

// POST /api/emergency-history - Créer un nouvel enregistrement d'urgence
router.post('/', requireAuth, requireTenant, async (req, res) => {
  const schema = Joi.object({
    level: Joi.string().valid('1', '2', '3', '4').required(),
    trigger_type: Joi.string().optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    location_name: Joi.string().optional(),
    contacts_alerted: Joi.array().optional(),
    sms_sent: Joi.array().optional(),
    notes: Joi.string().optional(),
    status: Joi.string().valid('active', 'resolved', 'false_alarm').default('active'),
    audio_base64: Joi.string().optional(), // Audio en base64
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const { level, trigger_type, latitude, longitude, location_name, contacts_alerted, sms_sent, notes, status, audio_base64 } = value;
    const userId = req.user.userId;
    const orgId = req.organization.id;

    // Sauvegarder le fichier audio s'il existe
    let audioFilePath = null;
    let audioDuration = null;

    if (audio_base64) {
      // Créer le dossier s'il n'existe pas
      try {
        await fs.mkdir(AUDIO_DIR, { recursive: true });
      } catch (err) {
        console.error('Erreur création dossier:', err);
      }

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const filename = `emergency_${userId}_${timestamp}.webm`;
      audioFilePath = path.join(AUDIO_DIR, filename);

      // Décoder et sauvegarder l'audio
      const audioBuffer = Buffer.from(audio_base64, 'base64');
      await fs.writeFile(audioFilePath, audioBuffer);

      // Calcul approximatif de la durée (webm, ~50KB par seconde)
      audioDuration = Math.round(audioBuffer.length / 50000);

      console.log('[EmergencyHistory] Audio sauvegardé:', filename, `(${audioDuration}s)`);
    }

    // Insérer dans la BDD
    const insertResult = await knex('emergency_history').insert({
      user_id: userId,
      organization_id: orgId,
      level,
      trigger_type,
      latitude,
      longitude,
      location_name,
      contacts_alerted: Array.isArray(contacts_alerted) ? JSON.stringify(contacts_alerted) : null,
      sms_sent: Array.isArray(sms_sent) ? JSON.stringify(sms_sent) : null,
      notes,
      status,
      audio_file_path: audioFilePath ? `/uploads/emergency-audio/${path.basename(audioFilePath)}` : null,
      audio_duration_seconds: audioDuration,
      created_at: knex.fn.now(),
    }).returning('id');

    // Extract ID from result (could be array or object depending on DB)
    const id = Array.isArray(insertResult) ? insertResult[0]?.id || insertResult[0] : insertResult?.id || insertResult;
    console.log(`[EmergencyHistory] Emergency sauvegardé: ${id}`);

    return res.json({
      success: true,
      data: {
        id,
        level,
        location_name,
        audio_path: audioFilePath ? `/uploads/emergency-audio/${path.basename(audioFilePath)}` : null,
        created_at: new Date().toISOString(),
      }
    });
  } catch (err) {
    console.error('[EmergencyHistory] Erreur:', err);
    return res.status(500).json({ success: false, error: 'Erreur sauvegarde urgence' });
  }
});

// GET /api/emergency-history - Récupérer l'historique des urgences
router.get('/', requireAuth, requireTenant, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const orgId = req.organization?.id;

    if (!userId || !orgId) {
      return res.status(400).json({ success: false, error: 'userId ou orgId manquant' });
    }

    const emergencies = await knex('emergency_history')
      .where('user_id', userId)
      .where('organization_id', orgId)
      .orderBy('created_at', 'desc')
      .limit(100);

    // Parser les JSON
    const parsed = emergencies.map(e => {
      try {
        return {
          ...e,
          contacts_alerted: e.contacts_alerted ? JSON.parse(e.contacts_alerted) : [],
          sms_sent: e.sms_sent ? JSON.parse(e.sms_sent) : [],
        };
      } catch (parseErr) {
        console.error('[EmergencyHistory] Erreur parsing JSON pour emergency', e.id, parseErr);
        return {
          ...e,
          contacts_alerted: [],
          sms_sent: [],
        };
      }
    });

    return res.json({
      success: true,
      data: {
        emergencies: parsed,
        count: parsed.length,
      }
    });
  } catch (err) {
    console.error('[EmergencyHistory] Erreur récupération:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération historique' });
  }
});

// GET /api/emergency-history/:id - Récupérer un enregistrement spécifique
router.get('/:id', requireAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const orgId = req.organization.id;

    const emergency = await knex('emergency_history')
      .where('id', id)
      .where('user_id', userId)
      .where('organization_id', orgId)
      .first();

    if (!emergency) {
      return res.status(404).json({ success: false, error: 'Enregistrement non trouvé' });
    }

    // Parser les JSON
    try {
      emergency.contacts_alerted = emergency.contacts_alerted ? JSON.parse(emergency.contacts_alerted) : [];
      emergency.sms_sent = emergency.sms_sent ? JSON.parse(emergency.sms_sent) : [];
    } catch (parseErr) {
      console.error('[EmergencyHistory] Erreur parsing JSON pour emergency', emergency.id, parseErr);
      emergency.contacts_alerted = [];
      emergency.sms_sent = [];
    }

    return res.json({ success: true, data: emergency });
  } catch (err) {
    console.error('[EmergencyHistory] Erreur:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération' });
  }
});

// PATCH /api/emergency-history/:id - Mettre à jour le statut
router.patch('/:id', requireAuth, requireTenant, async (req, res) => {
  const schema = Joi.object({
    status: Joi.string().valid('active', 'resolved', 'false_alarm'),
    notes: Joi.string().optional(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const { id } = req.params;
    const { status, notes } = value;
    const userId = req.user.userId;
    const orgId = req.organization.id;

    // Vérifier l'accès
    const emergency = await knex('emergency_history')
      .where('id', id)
      .where('user_id', userId)
      .where('organization_id', orgId)
      .first();

    if (!emergency) {
      return res.status(404).json({ success: false, error: 'Enregistrement non trouvé' });
    }

    // Mettre à jour
    await knex('emergency_history')
      .where('id', id)
      .update({
        status: status || emergency.status,
        notes: notes !== undefined ? notes : emergency.notes,
        resolved_at: status === 'resolved' ? knex.fn.now() : null,
        updated_at: knex.fn.now(),
      });

    return res.json({ success: true, data: { id, status } });
  } catch (err) {
    console.error('[EmergencyHistory] Erreur mise à jour:', err);
    return res.status(500).json({ success: false, error: 'Erreur mise à jour' });
  }
});

module.exports = router;
