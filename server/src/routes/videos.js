const express = require('express');
const knex = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

// GET /api/videos - NO ORG FILTER
router.get('/', requireAuth, async (req, res) => {
  const { userId } = req.user || {};

  try {
    const videos = await knex('videos')
      .where({ status: 'approved' })
      .select('id', 'url', 'description', 'category', 'created_at', 'support_count', 'flagged', 'user_id')
      .orderBy('created_at', 'desc');

    // Ajouter le nombre de commentaires et user_liked pour chaque vidéo
    const videosWithComments = await Promise.all(
      videos.map(async (v) => {
        // Compter dans content_comments (nouvelle table)
        const allComments = await knex('content_comments')
          .where({ content_type: 'video', content_id: v.id });

        // Vérifier si l'utilisateur a aimé cette vidéo
        const userLiked = userId ? await knex('reactions')
          .where({ content_type: 'video', content_id: v.id, user_id: userId })
          .first() : null;

        return {
          ...v,
          comment_count: allComments.length,
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

// DELETE /api/videos/:id - Delete video
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const video = await knex('videos').where({ id }).first();

    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    }

    // Supprimer les commentaires associés
    await knex('comments').where({ content_type: 'video', content_id: id }).del();

    // Supprimer la vidéo
    await knex('videos').where({ id }).del();

    return res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error('Delete video error:', err);
    return res.status(500).json({ success: false, error: 'Erreur suppression vidéo' });
  }
});

// POST /api/videos/:id/flag - Flag a video
router.post('/:id/flag', async (req, res) => {
  const { id } = req.params;

  try {
    const video = await knex('videos').where({ id }).first();

    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    }

    if (video.flagged) {
      return res.status(400).json({ success: false, error: 'Cette vidéo a déjà été signalée' });
    }

    await knex('videos').where({ id }).update({ flagged: true });

    return res.json({ success: true, data: { flagged: true } });
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
