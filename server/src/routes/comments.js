const express = require('express');
const Joi = require('joi');
const knex = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

// ─── POST /api/comments — Ajouter un commentaire ───────────────────────────

const commentSchema = Joi.object({
  content_type: Joi.string().valid('article', 'photo', 'video').required(),
  content_id: Joi.string().uuid().required(),
  comment_text: Joi.string().min(1).max(2000).required(),
});

router.post('/', requireAuth, async (req, res) => {
  const { error, value } = commentSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { userId } = req.user;

  try {
    // Vérifier que le contenu existe
    const content = await knex(value.content_type + 's')
      .where({ id: value.content_id })
      .first();

    if (!content) {
      return res.status(404).json({ success: false, error: `${value.content_type} introuvable` });
    }

    // Créer le commentaire
    const [comment] = await knex('content_comments')
      .insert({
        content_type: value.content_type,
        content_id: value.content_id,
        user_id: userId,
        comment_text: value.comment_text,
      })
      .returning('*');

    // Récupérer les infos de l'auteur
    const user = await knex('users').where({ id: userId }).first();

    return res.status(201).json({
      success: true,
      data: {
        ...comment,
        user: { id: user.id, full_name: user.full_name },
      },
    });
  } catch (err) {
    console.error('[Comments] Error creating comment:', err);
    return res.status(500).json({ success: false, error: 'Erreur création commentaire' });
  }
});

// ─── DELETE /api/comments/:id — Supprimer un commentaire ────────────────────

router.delete('/:id', requireAuth, async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;

  try {
    const comment = await knex('content_comments').where({ id }).first();

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Commentaire introuvable' });
    }

    // Vérifier que c'est l'auteur du commentaire
    if (comment.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Pas autorisé' });
    }

    // Supprimer le commentaire (les likes sont supprimés en cascade)
    await knex('content_comments').where({ id }).delete();

    return res.json({ success: true, data: { id } });
  } catch (err) {
    console.error('[Comments] Error deleting comment:', err);
    return res.status(500).json({ success: false, error: 'Erreur suppression commentaire' });
  }
});

// ─── POST /api/comments/:id/like — Liker un commentaire ──────────────────────

router.post('/:id/like', requireAuth, async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;

  try {
    const comment = await knex('content_comments').where({ id }).first();

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Commentaire introuvable' });
    }

    // Vérifier si déjà liké
    const existingLike = await knex('content_comment_likes')
      .where({ comment_id: id, user_id: userId })
      .first();

    if (existingLike) {
      // Contrairement au like, on supprime
      await knex('content_comment_likes')
        .where({ comment_id: id, user_id: userId })
        .delete();

      return res.json({ success: true, data: { comment_id: id, liked: false } });
    } else {
      // Ajouter le like
      await knex('content_comment_likes').insert({
        comment_id: id,
        user_id: userId,
      });

      return res.json({ success: true, data: { comment_id: id, liked: true } });
    }
  } catch (err) {
    console.error('[Comments] Error liking comment:', err);
    return res.status(500).json({ success: false, error: 'Erreur like commentaire' });
  }
});

// ─── GET /api/comments?content_type=article&content_id=xxx ──────────────────

router.get('/', async (req, res) => {
  const { content_type, content_id } = req.query;

  if (!content_type || !content_id) {
    return res.status(400).json({ success: false, error: 'content_type et content_id requis' });
  }

  try {
    const comments = await knex('content_comments')
      .join('users', 'content_comments.user_id', '=', 'users.id')
      .where({ content_type, content_id })
      .select(
        'content_comments.id',
        'content_comments.comment_text',
        'content_comments.created_at',
        'users.id as user_id',
        'users.full_name as user_name',
        'content_comments.user_id as author_id'
      )
      .orderBy('content_comments.created_at', 'asc');

    // Ajouter le count de likes pour chaque commentaire
    const commentsWithLikes = await Promise.all(
      comments.map(async (comment) => {
        const likeCount = await knex('content_comment_likes')
          .where({ comment_id: comment.id })
          .count('* as count')
          .first();

        return {
          ...comment,
          like_count: likeCount?.count || 0,
        };
      })
    );

    return res.json({ success: true, data: commentsWithLikes });
  } catch (err) {
    console.error('[Comments] Error fetching comments:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération commentaires' });
  }
});

module.exports = router;
