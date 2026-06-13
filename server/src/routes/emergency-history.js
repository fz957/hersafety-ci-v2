const express = require('express');
const Joi = require('joi');
const knex = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');
const fs = require('fs').promises;
const path = require('path');
const { sendAlertEmail, sendAlertConfirmationEmail } = require('../services/email.service');

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

    console.log('[EmergencyHistory] RECEIVED DATA:', { level, latitude, longitude, location_name, final_latitude, final_longitude, final_location_name });

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

    // Helper: Reverse geocoding to get place name from coordinates (using Nominatim)
    const getPlaceName = async (lat, lng) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        if (data.address) {
          // Priorité: adresse vraie (rue, quartier, ville) - PAS les amenities (restaurants, shops)
          return data.address.road ||
                 data.address.residential ||
                 data.address.neighbourhood ||
                 data.address.suburb ||
                 data.address.city ||
                 data.address.town ||
                 data.address.village ||
                 data.address.county ||
                 `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
        }
        return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
      } catch (err) {
        console.log('[EmergencyHistory] Reverse geocoding failed:', err.message);
        return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
      }
    };

    // Récupérer le VRAI NOM du lieu d'activation via reverse geocoding
    let finalLocationName = 'Position actuelle';
    if (latitude && longitude) {
      const realName = await getPlaceName(latitude, longitude);
      console.log('[EmergencyHistory] Reverse geocoding activation:', { lat: latitude, lng: longitude }, 'result:', realName);
      finalLocationName = realName; // Toujours utiliser le résultat du reverse geocoding
    }

    // Récupérer le VRAI NOM du lieu de refuge via reverse geocoding
    let realFinalLocationName = 'Dernière position';
    if (final_latitude && final_longitude) {
      const finalName = await getPlaceName(final_latitude, final_longitude);
      console.log('[EmergencyHistory] Reverse geocoding final location:', { lat: final_latitude, lng: final_longitude }, 'result:', finalName);
      realFinalLocationName = finalName; // Toujours utiliser le résultat du reverse geocoding
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
      location_name: finalLocationName,
      final_latitude,
      final_longitude,
      final_location_name: realFinalLocationName,
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

    // SEND EMAILS IN BACKGROUND for levels 2, 3, 4
    if (['2', '3', '4'].includes(level)) {
      (async () => {
        try {
          console.log('[EmergencyHistory] Background email task started, id:', id);
          // Récupérer l'utilisateur
          const sender = await knex('users').where({ id: userId }).first();

          // Récupérer les contacts
          const contacts = await knex('contacts').where({ user_id: userId });

          console.log(`[EmergencyHistory] Sending emails to ${contacts.length} contacts`);

          if (contacts.length > 0 && sender) {
            // Format time for email
            const timeFormatted = new Date().toLocaleString('fr-FR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            });

            // Build email HTML with ACTUAL VALUES
            const emailHTML = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background: #f5f5f5;">
  <div style="background: white; padding: 20px; border-radius: 8px;">
    <h2 style="color: #C2185B; margin-bottom: 16px;">🚨 ALERTE D'URGENCE — HerSafety</h2>

    <p style="font-size: 16px; margin-bottom: 12px;">
      <strong>${sender.full_name || 'Une femme'}</strong> a besoin de toi!
    </p>

    <p style="font-size: 16px; margin-bottom: 12px;">
      Elle a déclenché une alerte de niveau <strong>${level}</strong>
    </p>

    <div style="background: #f9f9f9; padding: 12px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 8px 0;"><strong>📍 Localisation:</strong> ${location_name || 'Non disponible'}</p>
      <p style="margin: 8px 0;"><strong>⏰ Heure:</strong> ${timeFormatted}</p>
    </div>

    <div style="margin: 20px 0; padding: 12px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
      <p style="margin: 0; font-weight: bold;">📞 Actions:</p>
      <ul style="margin: 8px 0; padding-left: 20px;">
        <li>Appelle-la immédiatement</li>
        <li>Contacte les services (110)</li>
        <li>Aide-la si possible</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 20px 0; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
      ${sender.phone ? `<a href="tel:${sender.phone}" style="display: inline-block; background: #1B5E20; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
        ☎️ Appeler immédiatement
      </a>` : ''}
      <a href="${process.env.FRONTEND_URL}/track/${id}" style="display: inline-block; background: #C2185B; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
        🗺️ Voir sa position en direct
      </a>
    </div>

    <p style="font-size: 18px; text-align: center; color: #C2185B; margin: 20px 0; font-weight: bold;">
      Elle compte sur toi! 🛡️
    </p>

    <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
      © HerSafety - Plateforme de sécurité personnelle
    </p>
  </div>
</div>
            `;

            // Send emails to all contacts
            for (const contact of contacts) {
              if (contact.email) {
                try {
                  console.log(`[EmergencyHistory] Sending email to ${contact.email}...`);

                  // Get real place name from coordinates
                  let locationName = 'Position actuelle';
                  if (latitude && longitude) {
                    locationName = await getPlaceName(latitude, longitude);
                    console.log(`[EmergencyHistory] Place name resolved: ${locationName}`);
                  }

                  const emailResult = await sendAlertEmail(contact.email, {
                    subject: `🚨 ALERTE URGENCE - ${sender.full_name || 'Utilisatrice'}`,
                    senderName: sender.full_name || 'Utilisatrice',
                    senderEmail: sender.email,
                    alertLevel: level,
                    locationLabel: locationName,
                    locationLat: latitude,
                    locationLng: longitude,
                    createdAt: new Date(),
                    html: emailHTML,
                    message: emailHTML,
                  });
                  console.log(`[EmergencyHistory] Email result for ${contact.email}:`, emailResult);
                } catch (err) {
                  console.error('[EmergencyHistory] Error sending email:', err.message);
                }
              }
            }

            // Send confirmation email to sender
            if (sender && sender.email) {
              try {
                await sendAlertConfirmationEmail(sender.email, sender.full_name, level, contacts.length, location_name);
              } catch (err) {
                console.error('[EmergencyHistory] Error sending confirmation:', err.message);
              }
            }
          }
        } catch (err) {
          console.error('[EmergencyHistory] Background email process error:', err.message);
        }
      })();
    }

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

// GET /api/emergency-history/:id/public - Récupérer position pour suivi PUBLIC (sans authentification)
router.get('/:id/public', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    const emergency = await knex('emergency_history')
      .where('id', id)
      .first();

    if (!emergency) {
      return res.status(404).json({ success: false, error: 'Alerte non trouvée' });
    }

    // Vérifier le token public (pour la sécurité, on peut valider un token spécifique)
    // Pour maintenant, on accepte les urgences de niveau 2, 3, 4 (alertes envoyées)
    if (!['2', '3', '4'].includes(emergency.level)) {
      return res.status(403).json({ success: false, error: 'Alerte non disponible' });
    }

    // Récupérer infos utilisatrice
    const user = await knex('users').where({ id: emergency.user_id }).first();

    // Retourner uniquement les infos publiques
    return res.json({
      success: true,
      data: {
        id: emergency.id,
        level: emergency.level,
        latitude: emergency.latitude,
        longitude: emergency.longitude,
        location_name: emergency.location_name,
        status: emergency.status,
        created_at: emergency.created_at,
        updated_at: emergency.updated_at,
        user: {
          full_name: user?.full_name || 'Utilisatrice',
          phone: user?.phone || null
        }
      }
    });
  } catch (err) {
    console.error('[EmergencyHistory] Erreur public access:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération' });
  }
});

// PATCH /api/emergency-history/:id - Mettre à jour le statut et la position finale
router.patch('/:id', requireAuth, async (req, res) => {
  const schema = Joi.object({
    status: Joi.string().valid('active', 'resolved', 'false_alarm'),
    notes: Joi.string().optional(),
    final_latitude: Joi.number().min(-90).max(90).optional(),
    final_longitude: Joi.number().min(-180).max(180).optional(),
    final_location_name: Joi.string().optional(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const { id } = req.params;
    const { status, notes, final_latitude, final_longitude, final_location_name } = value;
    const userId = req.user.userId;

    // Vérifier l'accès
    const emergency = await knex('emergency_history')
      .where('id', id)
      .where('user_id', userId)
      .first();

    if (!emergency) {
      return res.status(404).json({ success: false, error: 'Enregistrement non trouvé' });
    }

    // Helper: Reverse geocoding
    const getPlaceName = async (lat, lng) => {
      try {
        const response = await fetch(
          `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&limit=1`
        );
        const data = await response.json();
        if (data.features && data.features[0]) {
          return data.features[0].properties.name || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
        }
        return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
      } catch (err) {
        console.log('[EmergencyHistory] Reverse geocoding failed:', err.message);
        return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
      }
    };

    // Récupérer le vrai nom du lieu de refuge si pas fourni
    let realFinalLocationName = final_location_name;
    if (final_latitude && final_longitude && !final_location_name) {
      realFinalLocationName = await getPlaceName(final_latitude, final_longitude);
    }

    // Mettre à jour
    const updateData = {
      status: status || emergency.status,
      notes: notes !== undefined ? notes : emergency.notes,
      resolved_at: status === 'resolved' ? knex.fn.now() : null,
      updated_at: knex.fn.now(),
    };

    // Ajouter la position finale si fournie
    if (final_latitude !== undefined) updateData.final_latitude = final_latitude;
    if (final_longitude !== undefined) updateData.final_longitude = final_longitude;
    if (realFinalLocationName !== undefined) updateData.final_location_name = realFinalLocationName;

    await knex('emergency_history')
      .where('id', id)
      .update(updateData);

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
