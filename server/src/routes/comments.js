const express = require('express');
const Joi = require('joi');
const knex = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');
const wsService = require('../services/websocket.service');
const { sendAdminCommentNotification } = require('../services/email.service');

const router = express.Router();

// TEST ENDPOINT
router.get('/test-route', (req, res) => {
  return res.json({ success: true, message: 'TEST ROUTE WORKS - Render is updated!' });
});

// ─── GET /api/comments/count — Compter les commentaires ────────────────────
// Usage: /api/comments/count?content_type=testimony&content_id=UUID

router.get('/count', async (req, res) => {
  const { content_type, content_id } = req.query;

  if (!content_type || !content_id) {
    return res.status(400).json({ success: false, error: 'content_type et content_id requis' });
  }

  try {
    const result = await knex('content_comments')
      .where({ content_type, content_id })
      .count('id as count')
      .first();

    return res.json({ success: true, data: { count: parseInt(result?.count || 0) } });
  } catch (err) {
    console.error('[Comments] Count error:', err);
    return res.status(500).json({ success: false, error: 'Erreur comptage commentaires' });
  }
});

// ─── POST /api/comments — Ajouter un commentaire ───────────────────────────

const generateAnonName = () => {
  const adjectives = ['Brave', 'Forte', 'Sage', 'Noble', 'Libre', 'Courageuse', 'Lumière', 'Étoile', 'Aile', 'Flamme', 'Voix', 'Cœur', 'Âme', 'Pluie', 'Vent'];
  const nouns = ['Guerrière', 'Reine', 'Lotus', 'Phénix', 'Aurore', 'Harmonie', 'Victoire', 'Sagesse', 'Liberté', 'Éspoir', 'Fleur', 'Aube', 'Écho', 'Vague', 'Couleur'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 999);
  return `${adj}${noun}${num}`;
};

const commentSchema = Joi.object({
  content_type: Joi.string().valid('article', 'photo', 'video').required(),
  content_id: Joi.string().uuid().required(),
  comment_text: Joi.string().min(1).max(2000).required(),
  is_anonymous: Joi.boolean().default(false),
});

router.post('/', requireAuth, async (req, res) => {
  const { error, value } = commentSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { userId } = req.user;

  try {
    // Whitelist des tables pour éviter SQL injection
    const ALLOWED_TABLES = {
      'article': 'articles',
      'photo': 'photos',
      'video': 'videos',
      'testimony': 'testimonies'
    };
    const tableName = ALLOWED_TABLES[value.content_type];

    if (!tableName) {
      return res.status(400).json({ success: false, error: `Type de contenu invalide: ${value.content_type}` });
    }

    // Vérifier que le contenu existe
    const content = await knex(tableName)
      .where({ id: value.content_id })
      .first();

    if (!content) {
      return res.status(404).json({ success: false, error: `${value.content_type} introuvable` });
    }

    // Générer pseudonyme anonyme si demandé
    let displayName = null;
    if (value.is_anonymous) {
      displayName = generateAnonName();
    }

    // Créer le commentaire
    const [comment] = await knex('content_comments')
      .insert({
        content_type: value.content_type,
        content_id: value.content_id,
        user_id: userId,
        comment_text: value.comment_text,
        is_anonymous: value.is_anonymous,
        display_name: displayName,
      })
      .returning('*');

    console.log('[Comments] Created comment:', { id: comment?.id, content_type: value.content_type, content_id: value.content_id });

    // Récupérer les infos de l'auteur
    const user = await knex('users').where({ id: userId }).first();

    // Envoyer notification à l'admin si les notifications sont activées
    if (user && user.organization_id) {
      const admin = await knex('users')
        .where({ organization_id: user.organization_id, role: 'admin' })
        .where('email_notifications_enabled', '!=', false)
        .first();

      if (admin && admin.email) {
        await sendAdminCommentNotification(
          admin.email,
          comment,
          user.full_name || 'Utilisatrice',
          value.content_type
        );
      }
    }

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

    // Notifier tous les clients via WebSocket
    wsService.notifyCommentDeleted(comment.content_type, comment.content_id, id);

    return res.json({ success: true, data: { id } });
  } catch (err) {
    console.error('[Comments] Error deleting comment:', err);
    return res.status(500).json({ success: false, error: 'Erreur suppression commentaire' });
  }
});

// ─── POST /api/comments/:id/like — Liker un commentaire ──────────────────────

router.post('/like/:id', requireAuth, async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;

  console.log('[Comments] ✓ LIKE ENDPOINT CALLED', { userId, commentId: id });

  try {
    const comment = await knex('content_comments').where({ id }).first();

    if (!comment) {
      console.log('[Comments] Comment not found:', id);
      return res.status(404).json({ success: false, error: 'Commentaire introuvable' });
    }

    // Vérifier si déjà liké
    const existingLike = await knex('content_comment_likes')
      .where({ comment_id: id, user_id: userId })
      .first();

    if (existingLike) {
      console.log('[Comments] Removing like:', { userId, commentId: id });
      // Contrairement au like, on supprime
      await knex('content_comment_likes')
        .where({ comment_id: id, user_id: userId })
        .delete();

      return res.json({ success: true, data: { comment_id: id, liked: false } });
    } else {
      console.log('[Comments] Adding like:', { userId, commentId: id });
      // Ajouter le like
      await knex('content_comment_likes').insert({
        comment_id: id,
        user_id: userId,
      });

      console.log('[Comments] Like added successfully');
      return res.json({ success: true, data: { comment_id: id, liked: true } });
    }
  } catch (err) {
    console.error('[Comments] Error liking comment:', err.message);
    return res.status(500).json({ success: false, error: 'Erreur like commentaire' });
  }
});

// ─── GET /api/comments?content_type=article&content_id=xxx ──────────────────

router.get('/', requireAuth, async (req, res) => {
  const { content_type, content_id } = req.query;
  const { userId } = req.user || {};

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
        'content_comments.is_anonymous',
        'content_comments.display_name',
        'users.id as user_id',
        'users.full_name as user_name',
        'content_comments.user_id as author_id'
      )
      .orderBy('content_comments.created_at', 'asc');

    // Utiliser le pseudonyme anonyme si c'était anonyme
    const commentsWithNames = comments.map(c => ({
      ...c,
      user_name: c.is_anonymous ? c.display_name : c.user_name
    }));

    // Ajouter le count de likes et les réponses pour chaque commentaire
    const commentsWithData = await Promise.all(
      commentsWithNames.map(async (comment) => {
        // Récupérer les likes
        const likes = await knex('content_comment_likes')
          .where({ comment_id: comment.id });

        // Vérifier si L'UTILISATEUR COURANT a aimé ce commentaire
        const userLiked = userId ? likes.some(l => l.user_id === userId) : false;

        // Récupérer les réponses au commentaire
        const replies = await knex('comment_replies')
          .join('users', 'comment_replies.user_id', '=', 'users.id')
          .where({ comment_id: comment.id })
          .select(
            'comment_replies.id',
            'comment_replies.reply_text',
            'comment_replies.created_at',
            'users.id as user_id',
            'users.full_name as user_name',
            'comment_replies.user_id as author_id'
          )
          .orderBy('comment_replies.created_at', 'asc');

        // Ajouter le count de likes pour chaque réponse
        const repliesWithLikes = await Promise.all(
          replies.map(async (reply) => {
            const replyLikes = await knex('comment_reply_likes')
              .where({ reply_id: reply.id });

            // Vérifier si l'utilisateur a aimé cette réponse
            const userLikedReply = userId ? replyLikes.some(l => l.user_id === userId) : false;

            return {
              ...reply,
              like_count: replyLikes.length,
              user_liked: userLikedReply,
            };
          })
        );

        return {
          ...comment,
          like_count: likes.length,
          user_liked: userLiked,
          replies: repliesWithLikes,
        };
      })
    );

    return res.json({ success: true, data: commentsWithData });
  } catch (err) {
    console.error('[Comments] Error fetching comments:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération commentaires' });
  }
});

// ─── POST /api/comments/:id/replies — Ajouter une réponse ──────────────────

const replySchema = Joi.object({
  reply_text: Joi.string().min(1).max(2000).required(),
});

router.post('/replies/:id', requireAuth, async (req, res) => {
  const { error, value } = replySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { userId } = req.user;
  const { id: commentId } = req.params;

  try {
    // Vérifier que le commentaire existe
    const comment = await knex('content_comments').where({ id: commentId }).first();

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Commentaire introuvable' });
    }

    // Créer la réponse
    const [reply] = await knex('comment_replies')
      .insert({
        comment_id: commentId,
        user_id: userId,
        reply_text: value.reply_text,
      })
      .returning('*');

    // Récupérer les infos de l'auteur
    const user = await knex('users').where({ id: userId }).first();

    return res.status(201).json({
      success: true,
      data: {
        ...reply,
        user: { id: user.id, full_name: user.full_name },
        like_count: 0,
      },
    });
  } catch (err) {
    console.error('[Comments] Error creating reply:', err);
    return res.status(500).json({ success: false, error: 'Erreur création réponse' });
  }
});

// ─── DELETE /api/comments/replies/:id — Supprimer une réponse ────────────────

router.delete('/replies/:id', requireAuth, async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;

  try {
    const reply = await knex('comment_replies').where({ id }).first();

    if (!reply) {
      return res.status(404).json({ success: false, error: 'Réponse introuvable' });
    }

    // Vérifier que c'est l'auteur de la réponse
    if (reply.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Pas autorisé' });
    }

    // Supprimer la réponse (les likes sont supprimés en cascade)
    await knex('comment_replies').where({ id }).delete();

    return res.json({ success: true, data: { id } });
  } catch (err) {
    console.error('[Comments] Error deleting reply:', err);
    return res.status(500).json({ success: false, error: 'Erreur suppression réponse' });
  }
});

// ─── POST /api/comments/replies/:id/like — Liker une réponse ────────────────

router.post('/replies/like/:id', requireAuth, async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;

  try {
    const reply = await knex('comment_replies').where({ id }).first();

    if (!reply) {
      return res.status(404).json({ success: false, error: 'Réponse introuvable' });
    }

    // Vérifier si déjà liké
    const existingLike = await knex('comment_reply_likes')
      .where({ reply_id: id, user_id: userId })
      .first();

    if (existingLike) {
      // Supprimer le like
      await knex('comment_reply_likes')
        .where({ reply_id: id, user_id: userId })
        .delete();

      return res.json({ success: true, data: { reply_id: id, liked: false } });
    } else {
      // Ajouter le like
      await knex('comment_reply_likes').insert({
        reply_id: id,
        user_id: userId,
      });

      return res.json({ success: true, data: { reply_id: id, liked: true } });
    }
  } catch (err) {
    console.error('[Comments] Error liking reply:', err);
    return res.status(500).json({ success: false, error: 'Erreur like réponse' });
  }
});

// ─── CATCH-ALL ROUTE — Debug all requests ────────────────────────────────────
router.all('/*', (req, res) => {
  console.log('[Comments CATCH-ALL]', { method: req.method, path: req.path, params: req.params });
  return res.status(404).json({ success: false, error: `No route matches ${req.method} ${req.path}` });
});

module.exports = router;
