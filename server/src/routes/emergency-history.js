const express = require('express');
const Joi = require('joi');
const knex = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Logger helper - only logs in development mode
const isDev = process.env.NODE_ENV === 'development';
const log = (...args) => isDev && console.log('[EmergencyHistory]', ...args);

// Dossier pour stocker les enregistrements audio
const AUDIO_DIR = path.join(__dirname, '../../uploads/emergency-audio');

// POST /api/emergency-history - Créer un nouvel enregistrement d'urgence
router.post('/', requireAuth, async (req, res) => {
  const schema = Joi.object({
    level: Joi.string().valid('1', '2', '3', '4').required(),
    trigger_type: Joi.string().optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    location_name: Joi.string().optional(),
    final_latitude: Joi.number().min(-90).max(90).optional(),
    final_longitude: Joi.number().min(-180).max(180).optional(),
    final_location_name: Joi.string().optional(),
    contacts_alerted: Joi.array().optional(),
    sms_sent: Joi.array().optional(),
    lyra_messages: Joi.array().optional(), // Messages de conversation avec Lyra
    notes: Joi.string().optional(),
    status: Joi.string().valid('active', 'resolved', 'false_alarm').default('active'),
    audio_base64: Joi.string().optional(), // Audio en base64
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const { level, trigger_type, latitude, longitude, location_name, final_latitude, final_longitude, final_location_name, contacts_alerted, sms_sent, lyra_messages, notes, status, audio_base64 } = value;
    const { userId, organizationId } = req.user;

    // Sauvegarder le fichier audio s'il existe
    let audioFilePath = null;
    let audioDuration = null;

    log('[EmergencyHistory] audio_base64 exists:', !!audio_base64, 'length:', audio_base64?.length);

    if (audio_base64) {
      // Créer le dossier s'il n'existe pas
      try {
        await fs.mkdir(AUDIO_DIR, { recursive: true });
        log('[EmergencyHistory] Audio directory ready:', AUDIO_DIR);
      } catch (err) {
        console.error('Erreur création dossier:', err);
      }

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const filename = `emergency_${userId}_${timestamp}.webm`;
      audioFilePath = path.join(AUDIO_DIR, filename);

      try {
        // Décoder et sauvegarder l'audio
        const audioBuffer = Buffer.from(audio_base64, 'base64');
        await fs.writeFile(audioFilePath, audioBuffer);

        // Calcul approximatif de la durée (webm, ~50KB par seconde)
        audioDuration = Math.round(audioBuffer.length / 50000);

        log('[EmergencyHistory] Audio sauvegardé:', filename, `(${audioDuration}s)`, 'path:', audioFilePath);
      } catch (err) {
        console.error('[EmergencyHistory] Erreur sauvegarde audio:', err.message);
        audioFilePath = null;
      }
    } else {
      log('[EmergencyHistory] Pas d\'audio fourni');
    }

    // Insérer dans la BDD
    // Note: JSON columns in PostgreSQL should store JSON, not stringified strings
    const insertResult = await knex('emergency_history').insert({
      user_id: userId,
      organization_id: organizationId,
      level,
      trigger_type,
      latitude,
      longitude,
      location_name,
      final_latitude,
      final_longitude,
      final_location_name,
      contacts_alerted: Array.isArray(contacts_alerted) ? contacts_alerted : [],
      sms_sent: Array.isArray(sms_sent) ? sms_sent : [],
      lyra_messages: Array.isArray(lyra_messages) ? lyra_messages : [],
      notes,
      status,
      audio_file_path: audioFilePath ? `/uploads/emergency-audio/${path.basename(audioFilePath)}` : null,
      audio_base64: audio_base64 || null, // Sauvegarder aussi en base64 pour lecture directe
      audio_duration_seconds: audioDuration,
      created_at: knex.fn.now(),
    }).returning('id');

    // Extract ID from result (could be array or object depending on DB)
    const id = Array.isArray(insertResult) ? insertResult[0]?.id || insertResult[0] : insertResult?.id || insertResult;
    log(`[EmergencyHistory] Emergency sauvegardé: ${id}`);

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
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId manquant' });
    }

    const emergencies = await knex('emergency_history')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(100);

    // JSON columns are already parsed by Knex, no need to parse
    const parsed = emergencies.map(e => ({
      ...e,
      contacts_alerted: Array.isArray(e.contacts_alerted) ? e.contacts_alerted : [],
      sms_sent: Array.isArray(e.sms_sent) ? e.sms_sent : [],
    }));

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
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const emergency = await knex('emergency_history')
      .where('id', id)
      .where('user_id', userId)
      .first();

    if (!emergency) {
      return res.status(404).json({ success: false, error: 'Enregistrement non trouvé' });
    }

    // JSON columns are already parsed by Knex
    emergency.contacts_alerted = Array.isArray(emergency.contacts_alerted) ? emergency.contacts_alerted : [];
    emergency.sms_sent = Array.isArray(emergency.sms_sent) ? emergency.sms_sent : [];

    return res.json({ success: true, data: emergency });
  } catch (err) {
    console.error('[EmergencyHistory] Erreur:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération' });
  }
});

// PATCH /api/emergency-history/:id - Mettre à jour le statut
router.patch('/:id', requireAuth, async (req, res) => {
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

    // Vérifier l'accès
    const emergency = await knex('emergency_history')
      .where('id', id)
      .where('user_id', userId)
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

// DELETE /api/emergency-history/:id/audio - Supprimer UNIQUEMENT le fichier audio
router.delete('/:id/audio', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Vérifier l'accès et récupérer le chemin du fichier
    const emergency = await knex('emergency_history')
      .where('id', id)
      .where('user_id', userId)
      .first();

    if (!emergency) {
      return res.status(404).json({ success: false, error: 'Enregistrement non trouvé' });
    }

    if (!emergency.audio_file_path) {
      return res.status(404).json({ success: false, error: 'Pas d\'enregistrement audio' });
    }

    // Supprimer le fichier du disque
    const audioFilePath = path.join(__dirname, '../../uploads', emergency.audio_file_path.replace('/uploads/', ''));
    try {
      await fs.unlink(audioFilePath);
      log('[EmergencyHistory] Fichier audio supprimé:', audioFilePath);
    } catch (err) {
      console.warn('[EmergencyHistory] Fichier audio introuvable:', err.message);
      // Ne pas fail si le fichier n'existe pas déjà
    }

    // Mettre à jour la base de données (supprimer le chemin et la durée)
    await knex('emergency_history')
      .where('id', id)
      .update({
        audio_file_path: null,
        audio_duration_seconds: null,
        updated_at: knex.fn.now(),
      });

    log(`[EmergencyHistory] Audio supprimé pour l'urgence: ${id}`);

    return res.json({ success: true, data: { id, message: 'Enregistrement audio supprimé' } });
  } catch (err) {
    console.error('[EmergencyHistory] Erreur suppression audio:', err);
    return res.status(500).json({ success: false, error: 'Erreur suppression audio' });
  }
});

module.exports = router;
