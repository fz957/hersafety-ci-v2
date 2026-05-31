const express = require('express');
const knex = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

// GET /api/photos - NO ORG FILTER
router.get('/', requireAuth, async (req, res) => {
  const { userId } = req.user || {};

  try {
    const photos = await knex('photos')
      .where({ status: 'approved' })
      .select('id', 'url', 'description', 'category', 'created_at', 'support_count', 'flagged', 'user_id')
      .orderBy('created_at', 'desc');

    // Ajouter le nombre de commentaires et user_liked pour chaque photo
    const photosWithComments = await Promise.all(
      photos.map(async (p) => {
        // Compter dans content_comments (nouvelle table)
        const allComments = await knex('content_comments')
          .where({ content_type: 'photo', content_id: p.id });

        // Vérifier si l'utilisateur a aimé cette photo
        const userLiked = userId ? await knex('reactions')
          .where({ content_type: 'photo', content_id: p.id, user_id: userId })
          .first() : null;

        return {
          ...p,
          comment_count: allComments.length,
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
