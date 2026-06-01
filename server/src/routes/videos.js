const express = require('express');
const knex = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');
const wsService = require('../services/websocket.service');

const router = express.Router();

// GET /api/videos - SHARED COMMUNITY CONTENT (NO ORG FILTER)
router.get('/', requireAuth, async (req, res) => {
  const { userId } = req.user || {};

  try {
    const videos = await knex('videos')
      .leftJoin('users', 'videos.user_id', 'users.id')
      .where({ 'videos.status': 'approved' })
      .select('videos.id', 'videos.url', 'videos.description', 'videos.category', 'videos.created_at', 'videos.support_count', 'videos.flagged', 'videos.user_id', 'users.full_name as user_name')
      .orderBy('videos.created_at', 'desc');

    // Ajouter le nombre de commentaires et user_liked pour chaque vidéo
    const videosWithComments = await Promise.all(
      videos.map(async (v) => {
        // Compter commentaires depuis content_comments
        const commentResult = await knex('content_comments')
          .where({ content_type: 'video', content_id: v.id })
          .count('id as cnt')
          .first();

        // Vérifier si l'utilisateur a aimé cette vidéo
        const userLiked = userId ? await knex('reactions')
          .where({ content_type: 'video', content_id: v.id, user_id: userId })
          .first() : null;

        return {
          ...v,
          comment_count: parseInt(commentResult?.cnt || 0),
          support_count: v.support_count || 0,
          user_liked: !!userLiked
        };
      })
    );

    return res.json({ success: true, data: videosWithComments });
  } catch (err) {
    console.error('Get videos error:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération vidéos' });
  }
});

// NOTE: Comments are now managed via /api/comments endpoint (works for all content types)
// This old endpoint has been removed to avoid confusion with obsolete comments table

// POST /api/videos - Create video
router.post('/', requireAuth, async (req, res) => {
  const { url, description, category } = req.body;
  const { userId } = req.user;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL de vidéo requise' });
  }

  try {
    const [video] = await knex('videos')
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

    return res.status(201).json({ success: true, data: video });
  } catch (err) {
    console.error('Create video error:', err);
    return res.status(500).json({ success: false, error: 'Erreur création vidéo' });
  }
});

// DELETE /api/videos/:id - Delete video (admin or owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  try {
    const video = await knex('videos').where({ id }).first();

    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    }

    // Only admin or owner can delete
    const user = await knex('users').where({ id: userId }).first();
    if (video.user_id !== userId && user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    // Supprimer les commentaires associés
    await knex('comments').where({ content_type: 'video', content_id: id }).del();
    await knex('content_comments').where({ content_type: 'video', content_id: id }).del();

    // Supprimer la vidéo
    await knex('videos').where({ id }).del();

    // Notifier tous les clients via WebSocket
    wsService.broadcast('POST_DELETED', { contentType: 'video', contentId: id });

    return res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error('Delete video error:', err);
    return res.status(500).json({ success: false, error: 'Erreur suppression vidéo' });
  }
});

// POST /api/videos/:id/flag - Toggle flag (signaler/désignaler)
router.post('/:id/flag', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const video = await knex('videos').where({ id }).first();

    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    }

    const newFlaggedState = !video.flagged;
    await knex('videos').where({ id }).update({ flagged: newFlaggedState });

    return res.json({ success: true, data: { flagged: newFlaggedState } });
  } catch (err) {
    console.error('Flag video error:', err);
    return res.status(500).json({ success: false, error: 'Erreur signalement vidéo' });
  }
});

// POST /api/videos/:id/like — Toggle like
router.post('/:id/like', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  try {
    const video = await knex('videos').where({ id }).first();

    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    }

    // Vérifier si l'utilisateur a déjà liké
    const existingReaction = await knex('reactions')
      .where({ content_type: 'video', content_id: id, user_id: userId })
      .first();

    if (existingReaction) {
      // Supprimer le like (unlike)
      await knex('reactions')
        .where({ content_type: 'video', content_id: id, user_id: userId })
        .del();

      // Utiliser decrement() atomique
      await knex('videos').where({ id }).decrement('support_count', 1);

      const updated = await knex('videos').where({ id }).first();
      return res.json({
        success: true,
        data: { video_id: id, liked: false, support_count: Math.max(0, updated.support_count) },
      });
    } else {
      // Ajouter un like
      await knex('reactions').insert({
        content_type: 'video',
        content_id: id,
        user_id: userId,
        reaction: 'support',
      });

      // Utiliser increment() atomique
      await knex('videos').where({ id }).increment('support_count', 1);

      const updated = await knex('videos').where({ id }).first();
      return res.json({
        success: true,
        data: { video_id: id, liked: true, support_count: updated.support_count },
      });
    }
  } catch (err) {
    console.error('Like video error:', err);
    return res.status(500).json({ success: false, error: 'Erreur like' });
  }
});

module.exports = router;
