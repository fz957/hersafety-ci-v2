const express = require('express');
const knex = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

// GET /api/photos - NO ORG FILTER
router.get('/', async (req, res) => {
  try {
    const photos = await knex('photos')
      .where({ status: 'approved' })
      .select('id', 'url', 'description', 'category', 'created_at', 'support_count', 'flagged', 'user_id')
      .orderBy('created_at', 'desc');

    // Ajouter le nombre de commentaires pour chaque photo
    const photosWithComments = await Promise.all(
      photos.map(async (p) => {
        const commentCount = await knex('comments')
          .where({ content_type: 'photo', content_id: p.id })
          .count('id as cnt')
          .first();
        return {
          ...p,
          comment_count: parseInt(commentCount?.cnt || 0, 10),
          support_count: p.support_count || 0
        };
      })
    );

    return res.json({ success: true, data: photosWithComments });
  } catch (err) {
    console.error('Get photos error:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération photos' });
  }
});

// GET /api/photos/:id/comments - NO ORG FILTER
router.get('/:id/comments', async (req, res) => {
  const { id } = req.params;

  try {
    const comments = await knex('comments')
      .where({ content_type: 'photo', content_id: id })
      .select('id', 'display_name', 'content', 'likes_count', 'created_at')
      .orderBy('created_at', 'desc');

    return res.json({ success: true, data: comments });
  } catch (err) {
    console.error('Get photo comments error:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération commentaires' });
  }
});

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

// DELETE /api/photos/:id - Delete photo
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const photo = await knex('photos').where({ id }).first();

    if (!photo) {
      return res.status(404).json({ success: false, error: 'Photo introuvable' });
    }

    // Supprimer les commentaires associés
    await knex('comments').where({ content_type: 'photo', content_id: id }).del();

    // Supprimer la photo
    await knex('photos').where({ id }).del();

    return res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error('Delete photo error:', err);
    return res.status(500).json({ success: false, error: 'Erreur suppression photo' });
  }
});

// POST /api/photos/:id/flag - Flag a photo
router.post('/:id/flag', async (req, res) => {
  const { id } = req.params;

  try {
    const photo = await knex('photos').where({ id }).first();

    if (!photo) {
      return res.status(404).json({ success: false, error: 'Photo introuvable' });
    }

    if (photo.flagged) {
      return res.status(400).json({ success: false, error: 'Cette photo a déjà été signalée' });
    }

    await knex('photos').where({ id }).update({ flagged: true });

    return res.json({ success: true, data: { flagged: true } });
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

      const newCount = Math.max(0, photo.support_count - 1);
      await knex('photos').where({ id }).update({ support_count: newCount });

      return res.json({
        success: true,
        data: { photo_id: id, liked: false, support_count: newCount },
      });
    } else {
      // Ajouter un like
      await knex('reactions').insert({
        content_type: 'photo',
        content_id: id,
        user_id: userId,
        reaction: 'support',
      });

      const newCount = photo.support_count + 1;
      await knex('photos').where({ id }).update({ support_count: newCount });

      return res.json({
        success: true,
        data: { photo_id: id, liked: true, support_count: newCount },
      });
    }
  } catch (err) {
    console.error('Like photo error:', err);
    return res.status(500).json({ success: false, error: 'Erreur like' });
  }
});

module.exports = router;
