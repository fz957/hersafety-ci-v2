const express = require('express');
const knex = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');
const wsService = require('../services/websocket.service');

const router = express.Router();

// GET /api/photos - SHARED COMMUNITY CONTENT (NO ORG FILTER)
router.get('/', requireAuth, async (req, res) => {
  const { userId } = req.user || {};

  try {
    const photos = await knex('photos')
      .leftJoin('users', 'photos.user_id', 'users.id')
      .where({ 'photos.status': 'approved' })
      .select('photos.id', 'photos.url', 'photos.description', 'photos.category', 'photos.created_at', 'photos.support_count', 'photos.flagged', 'photos.user_id', 'users.full_name as user_name')
      .orderBy('photos.created_at', 'desc');

    // Ajouter le nombre de commentaires et user_liked pour chaque photo
    const photosWithComments = await Promise.all(
      photos.map(async (p) => {
        // Compter commentaires depuis content_comments
        const commentResult = await knex('content_comments')
          .where({ content_type: 'photo', content_id: p.id })
          .count('id as cnt')
          .first();

        // Vérifier si l'utilisateur a aimé cette photo
        const userLiked = userId ? await knex('reactions')
          .where({ content_type: 'photo', content_id: p.id, user_id: userId })
          .first() : null;

        return {
          ...p,
          comment_count: parseInt(commentResult?.cnt || 0),
          support_count: p.support_count || 0,
          user_liked: !!userLiked
        };
      })
    );

    return res.json({ success: true, data: photosWithComments });
  } catch (err) {
    console.error('Get photos error:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération photos' });
  }
});

// NOTE: Comments are now managed via /api/comments endpoint (works for all content types)
// This old endpoint has been removed to avoid confusion with obsolete comments table

// POST /api/photos - Create photo
router.post('/', requireAuth, async (req, res) => {
  const { url, description, category } = req.body;
  const { userId } = req.user;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL de photo requise' });
  }

  try {
    const [photo] = await knex('photos')
      .insert({
        user_id: userId,
        url: url.trim(),
        description: description?.trim() || '',
        category: category || 'autre',
        status: 'approved',
        flagged: false,
        support_count: 0,
        comment_count: 0,
      })
      .returning('*');

    return res.status(201).json({ success: true, data: photo });
  } catch (err) {
    console.error('Create photo error:', err);
    return res.status(500).json({ success: false, error: 'Erreur création photo' });
  }
});

// DELETE /api/photos/:id - Delete photo (admin or owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  try {
    const photo = await knex('photos').where({ id }).first();

    if (!photo) {
      return res.status(404).json({ success: false, error: 'Photo introuvable' });
    }

    // Only admin or owner can delete
    const user = await knex('users').where({ id: userId }).first();
    if (photo.user_id !== userId && user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    // Supprimer les commentaires associés
    await knex('comments').where({ content_type: 'photo', content_id: id }).del();
    await knex('content_comments').where({ content_type: 'photo', content_id: id }).del();

    // Supprimer la photo
    await knex('photos').where({ id }).del();

    // Notifier tous les clients via WebSocket
    wsService.broadcast('POST_DELETED', { contentType: 'photo', contentId: id });

    return res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error('Delete photo error:', err);
    return res.status(500).json({ success: false, error: 'Erreur suppression photo' });
  }
});

// POST /api/photos/:id/flag - Toggle flag (signaler/désignaler)
router.post('/:id/flag', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const photo = await knex('photos').where({ id }).first();

    if (!photo) {
      return res.status(404).json({ success: false, error: 'Photo introuvable' });
    }

    const newFlaggedState = !photo.flagged;
    await knex('photos').where({ id }).update({ flagged: newFlaggedState });

    return res.json({ success: true, data: { flagged: newFlaggedState } });
  } catch (err) {
    console.error('Flag photo error:', err);
    return res.status(500).json({ success: false, error: 'Erreur signalement photo' });
  }
});

// POST /api/photos/:id/like — Toggle like
router.post('/:id/like', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  try {
    const photo = await knex('photos').where({ id }).first();

    if (!photo) {
      return res.status(404).json({ success: false, error: 'Photo introuvable' });
    }

    // Vérifier si l'utilisateur a déjà liké
    const existingReaction = await knex('reactions')
      .where({ content_type: 'photo', content_id: id, user_id: userId })
      .first();

    if (existingReaction) {
      // Supprimer le like (unlike)
      await knex('reactions')
        .where({ content_type: 'photo', content_id: id, user_id: userId })
        .del();

      // Utiliser decrement() atomique
      await knex('photos').where({ id }).decrement('support_count', 1);

      const updated = await knex('photos').where({ id }).first();
      return res.json({
        success: true,
        data: { photo_id: id, liked: false, support_count: Math.max(0, updated.support_count) },
      });
    } else {
      // Ajouter un like
      await knex('reactions').insert({
        content_type: 'photo',
        content_id: id,
        user_id: userId,
        reaction: 'support',
      });

      // Utiliser increment() atomique
      await knex('photos').where({ id }).increment('support_count', 1);

      const updated = await knex('photos').where({ id }).first();
      return res.json({
        success: true,
        data: { photo_id: id, liked: true, support_count: updated.support_count },
      });
    }
  } catch (err) {
    console.error('Like photo error:', err);
    return res.status(500).json({ success: false, error: 'Erreur like' });
  }
});

module.exports = router;
