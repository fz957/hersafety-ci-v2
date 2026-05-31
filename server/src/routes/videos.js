const express = require('express');
const knex = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

// GET /api/videos - NO ORG FILTER
router.get('/', async (req, res) => {
  try {
    const videos = await knex('videos')
      .where({ status: 'approved' })
      .select('id', 'url', 'description', 'category', 'created_at', 'support_count', 'flagged', 'user_id')
      .orderBy('created_at', 'desc');

    // Ajouter le nombre de commentaires pour chaque vidéo
    const videosWithComments = await Promise.all(
      videos.map(async (v) => {
        const commentCount = await knex('comments')
          .where({ content_type: 'video', content_id: v.id })
          .count('id as cnt')
          .first();
        return {
          ...v,
          comment_count: parseInt(commentCount?.cnt || 0, 10),
          support_count: v.support_count || 0
        };
      })
    );

    return res.json({ success: true, data: videosWithComments });
  } catch (err) {
    console.error('Get videos error:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération vidéos' });
  }
});

// GET /api/videos/:id/comments - NO ORG FILTER
router.get('/:id/comments', async (req, res) => {
  const { id } = req.params;

  try {
    const comments = await knex('comments')
      .where({ content_type: 'video', content_id: id })
      .select('id', 'display_name', 'content', 'likes_count', 'created_at')
      .orderBy('created_at', 'desc');

    return res.json({ success: true, data: comments });
  } catch (err) {
    console.error('Get video comments error:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération commentaires' });
  }
});

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

module.exports = router;
