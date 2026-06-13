const express = require('express');
const Joi     = require('joi');

const wsService = require('../services/websocket.service');
const knex              = require('../db/knex');
const { requireAuth }   = require('../middlewares/auth');
const { requireAdmin }  = require('../middlewares/admin');

const router = express.Router();
router.use(requireAuth);

// Logger helper - only logs in development mode
const isDev = process.env.NODE_ENV === 'development';
const log = (...args) => isDev && console.log(...args);

const DANGER_TYPES = ['harcelement_verbal', 'agression_physique', 'agression_sexuelle', 'vol', 'suivi', 'detour_force', 'autre'];

const createSchema = Joi.object({
  is_anonymous:         Joi.boolean().default(true),
  category:             Joi.string().valid(...DANGER_TYPES).required(),
  title:                Joi.string().trim().max(255).required(),
  content:              Joi.string().trim().max(5000).required(),
  location_label:       Joi.string().max(500).optional(),
  trigger_warning_level: Joi.string().valid('none', 'low', 'moderate', 'severe').default('none'),
});

const moderateSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  notes:  Joi.string().max(500).optional(),
});

// ─── GET /api/testimonies ─────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit = Math.min(50, parseInt(req.query.limit || '20', 10));
  const { userId } = req.user;

  try {
    // Montrer: tous les témoignages approuvés + les témoignages pending de l'utilisateur (SHARED COMMUNITY)
    const testimonies = await knex('testimonies')
      .leftJoin('users', 'testimonies.user_id', 'users.id')
      .where((builder) => {
        builder
          .where('testimonies.status', 'approved')
          .orWhere((subBuilder) => {
            subBuilder.where('testimonies.status', 'pending').where('testimonies.user_id', userId);
          });
      })
      .select(
        'testimonies.id', 'testimonies.is_anonymous', 'testimonies.display_name',
        'testimonies.category', 'testimonies.title', 'testimonies.content', 'testimonies.location_label',
        'testimonies.trigger_warning_level', 'testimonies.support_count', 'testimonies.status', 'testimonies.created_at',
        'testimonies.user_id', 'testimonies.flagged',
        'users.full_name as user_name'
      )
      .orderBy('testimonies.created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    // Ajouter comment_count et user_liked pour chaque testimony
    const testimoniesWithMeta = await Promise.all(
      testimonies.map(async (t) => {
        // Compter commentaires depuis testimony_comments (pas content_comments!)
        const commentResult = await knex('testimony_comments')
          .where({ testimony_id: t.id })
          .count('id as cnt')
          .first();

        // Vérifier si utilisateur a liké
        const userLiked = userId ? await knex('testimony_reactions')
          .where({ testimony_id: t.id, user_id: userId })
          .first() : null;

        return {
          ...t,
          comment_count: parseInt(commentResult?.cnt || 0),
          user_liked: !!userLiked
        };
      })
    );

    return res.json({ success: true, data: testimoniesWithMeta });
  } catch (err) {
    console.error('Testimonies get error:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération témoignages' });
  }
});

// ─── POST /api/testimonies ────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { userId } = req.user;

  try {
    let display_name = null;
    if (value.is_anonymous) {
      const result = await knex.raw('SELECT generate_anonymous_name() AS name');
      display_name = result.rows[0].name;
    }

    const [testimony] = await knex('testimonies')
      .insert({
        user_id:              userId,
        is_anonymous:         value.is_anonymous,
        display_name,
        category:             value.category,
        title:                value.title,
        content:              value.content,
        location_label:       value.location_label,
        trigger_warning_level: value.trigger_warning_level,
        status:               'approved',
      })
      .returning([
        'id', 'is_anonymous', 'display_name',
        'category', 'title', 'content', 'location_label', 'trigger_warning_level', 'status', 'created_at',
        'user_id', // Inclure pour client-side ownership check
      ]);

    return res.status(201).json({ success: true, data: testimony });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur création témoignage' });
  }
});

// ─── GET /api/testimonies/notifications — User's notification feed ────────────────

router.get('/notifications', async (req, res) => {
  const { userId } = req.user;

  try {
    // 1. Likes on user's testimonies
    const testimonyLikes = await knex('testimony_reactions')
      .join('testimonies', 'testimony_reactions.testimony_id', '=', 'testimonies.id')
      .join('users', 'testimony_reactions.user_id', '=', 'users.id')
      .where('testimonies.user_id', userId)
      .select(
        'testimony_reactions.id as notification_id',
        'testimonies.id as testimony_id',
        'testimonies.title',
        'users.id as actor_id',
        'users.full_name as actor_name',
        'testimony_reactions.created_at',
        knex.raw(`'testimony_like' as type`)
      )
      .orderBy('testimony_reactions.created_at', 'desc');

    // 2. Comments on user's testimonies
    const testimonyComments = await knex('testimony_comments')
      .join('testimonies', 'testimony_comments.testimony_id', '=', 'testimonies.id')
      .join('users', 'testimony_comments.user_id', '=', 'users.id')
      .where('testimonies.user_id', userId)
      .select(
        'testimony_comments.id as notification_id',
        'testimonies.id as testimony_id',
        'testimonies.title',
        'users.id as actor_id',
        'users.full_name as actor_name',
        'testimony_comments.content as comment_content',
        'testimony_comments.created_at',
        knex.raw(`'testimony_comment' as type`)
      )
      .orderBy('testimony_comments.created_at', 'desc');

    // 3. Likes on user's comments
    const commentLikes = await knex('comment_likes')
      .join('testimony_comments', 'comment_likes.comment_id', '=', 'testimony_comments.id')
      .join('users', 'comment_likes.user_id', '=', 'users.id')
      .where('testimony_comments.user_id', userId)
      .select(
        'comment_likes.id as notification_id',
        'testimony_comments.testimony_id',
        knex.raw(`(SELECT title FROM testimonies WHERE id = testimony_comments.testimony_id) as title`),
        'users.id as actor_id',
        'users.full_name as actor_name',
        'comment_likes.created_at',
        knex.raw(`'comment_like' as type`)
      )
      .orderBy('comment_likes.created_at', 'desc');

    // 4. Likes on user's articles
    const articleLikes = await knex('reactions')
      .join('articles', 'reactions.content_id', '=', 'articles.id')
      .join('users', 'reactions.user_id', '=', 'users.id')
      .where({ 'reactions.content_type': 'article', 'articles.user_id': userId })
      .select(
        'reactions.id as notification_id',
        knex.raw(`articles.id as testimony_id`),
        'articles.title',
        'users.id as actor_id',
        'users.full_name as actor_name',
        'reactions.created_at',
        knex.raw(`'testimony_like' as type`)
      )
      .orderBy('reactions.created_at', 'desc');

    // 5. Likes on user's photos
    const photoLikes = await knex('reactions')
      .join('photos', 'reactions.content_id', '=', 'photos.id')
      .join('users', 'reactions.user_id', '=', 'users.id')
      .where({ 'reactions.content_type': 'photo', 'photos.user_id': userId })
      .select(
        'reactions.id as notification_id',
        knex.raw(`photos.id as testimony_id`),
        'photos.description as title',
        'users.id as actor_id',
        'users.full_name as actor_name',
        'reactions.created_at',
        knex.raw(`'testimony_like' as type`)
      )
      .orderBy('reactions.created_at', 'desc');

    // 6. Likes on user's videos
    const videoLikes = await knex('reactions')
      .join('videos', 'reactions.content_id', '=', 'videos.id')
      .join('users', 'reactions.user_id', '=', 'users.id')
      .where({ 'reactions.content_type': 'video', 'videos.user_id': userId })
      .select(
        'reactions.id as notification_id',
        knex.raw(`videos.id as testimony_id`),
        'videos.description as title',
        'users.id as actor_id',
        'users.full_name as actor_name',
        'reactions.created_at',
        knex.raw(`'testimony_like' as type`)
      )
      .orderBy('reactions.created_at', 'desc');

    // 7. Comments on user's articles
    const articleCommentsRaw = await knex('content_comments')
      .join('articles', 'content_comments.content_id', '=', 'articles.id')
      .join('users', 'content_comments.user_id', '=', 'users.id')
      .where({ 'content_comments.content_type': 'article', 'articles.user_id': userId })
      .select(
        'content_comments.id as notification_id',
        'content_comments.content_id as testimony_id',
        'content_comments.comment_text as title',
        'users.id as actor_id',
        'users.full_name as user_full_name',
        'content_comments.is_anonymous',
        'content_comments.display_name',
        'content_comments.created_at',
        knex.raw(`'content_comment' as type`)
      )
      .orderBy('content_comments.created_at', 'desc');

    const articleComments = articleCommentsRaw.map(c => ({
      ...c,
      actor_name: c.is_anonymous ? c.display_name : c.user_full_name
    }));

    // Comments on user's photos
    const photoCommentsRaw = await knex('content_comments')
      .join('photos', 'content_comments.content_id', '=', 'photos.id')
      .join('users', 'content_comments.user_id', '=', 'users.id')
      .where({ 'content_comments.content_type': 'photo', 'photos.user_id': userId })
      .select(
        'content_comments.id as notification_id',
        'content_comments.content_id as testimony_id',
        'content_comments.comment_text as title',
        'users.id as actor_id',
        'users.full_name as user_full_name',
        'content_comments.is_anonymous',
        'content_comments.display_name',
        'content_comments.created_at',
        knex.raw(`'content_comment' as type`)
      )
      .orderBy('content_comments.created_at', 'desc');

    const photoComments = photoCommentsRaw.map(c => ({
      ...c,
      actor_name: c.is_anonymous ? c.display_name : c.user_full_name
    }));

    // Comments on user's videos
    const videoCommentsRaw = await knex('content_comments')
      .join('videos', 'content_comments.content_id', '=', 'videos.id')
      .join('users', 'content_comments.user_id', '=', 'users.id')
      .where({ 'content_comments.content_type': 'video', 'videos.user_id': userId })
      .select(
        'content_comments.id as notification_id',
        'content_comments.content_id as testimony_id',
        'content_comments.comment_text as title',
        'users.id as actor_id',
        'users.full_name as user_full_name',
        'content_comments.is_anonymous',
        'content_comments.display_name',
        'content_comments.created_at',
        knex.raw(`'content_comment' as type`)
      )
      .orderBy('content_comments.created_at', 'desc');

    const videoComments = videoCommentsRaw.map(c => ({
      ...c,
      actor_name: c.is_anonymous ? c.display_name : c.user_full_name
    }));

    // 8. Likes on user's comments (on articles, photos, videos)
    const contentCommentLikes = await knex('content_comment_likes')
      .join('content_comments', 'content_comment_likes.comment_id', '=', 'content_comments.id')
      .join('users', 'content_comment_likes.user_id', '=', 'users.id')
      .where('content_comments.user_id', userId)
      .select(
        'content_comment_likes.id as notification_id',
        'content_comments.content_id as testimony_id',
        'content_comments.comment_text as title',
        'users.id as actor_id',
        'users.full_name as actor_name',
        'content_comment_likes.created_at',
        knex.raw(`'content_comment_like' as type`)
      )
      .orderBy('content_comment_likes.created_at', 'desc');

    // 9. Replies on user's comments
    const commentReplies = await knex('comment_replies')
      .join('content_comments', 'comment_replies.comment_id', '=', 'content_comments.id')
      .join('users', 'comment_replies.user_id', '=', 'users.id')
      .where('content_comments.user_id', userId)
      .select(
        'comment_replies.id as notification_id',
        'content_comments.content_id as testimony_id',
        'comment_replies.reply_text as title',
        'users.id as actor_id',
        'users.full_name as actor_name',
        'comment_replies.created_at',
        knex.raw(`'comment_reply' as type`)
      )
      .orderBy('comment_replies.created_at', 'desc');

    // 10. Likes on user's replies
    const replyLikes = await knex('comment_reply_likes')
      .join('comment_replies', 'comment_reply_likes.reply_id', '=', 'comment_replies.id')
      .join('users', 'comment_reply_likes.user_id', '=', 'users.id')
      .where('comment_replies.user_id', userId)
      .select(
        'comment_reply_likes.id as notification_id',
        knex.raw(`(SELECT content_id FROM content_comments WHERE id = comment_replies.comment_id) as testimony_id`),
        'comment_replies.reply_text as title',
        'users.id as actor_id',
        'users.full_name as actor_name',
        'comment_reply_likes.created_at',
        knex.raw(`'comment_reply_like' as type`)
      )
      .orderBy('comment_reply_likes.created_at', 'desc');

    // Merge all notifications and sort by date
    const allNotifications = [
      ...testimonyLikes,
      ...testimonyComments,
      ...commentLikes,
      ...articleLikes,
      ...photoLikes,
      ...videoLikes,
      ...articleComments,
      ...photoComments,
      ...videoComments,
      ...contentCommentLikes,
      ...commentReplies,
      ...replyLikes,
    ]
      .map(notif => {
        // Format the display message based on type
        let displayMessage = '';
        const textPreview = notif.title ? `"${notif.title.substring(0, 50)}${notif.title.length > 50 ? '...' : ''}"` : '';

        switch (notif.type) {
          case 'testimony_like':
            displayMessage = `${notif.actor_name} a aimé votre témoignage`;
            break;
          case 'testimony_comment':
            displayMessage = `${notif.actor_name} a commenté votre témoignage avec: ${textPreview}`;
            break;
          case 'comment_like':
            displayMessage = `${notif.actor_name} a aimé votre commentaire`;
            break;
          case 'content_comment':
            displayMessage = `${notif.actor_name} a commenté votre publication avec: ${textPreview}`;
            break;
          case 'content_comment_like':
            displayMessage = `${notif.actor_name} a aimé votre commentaire`;
            break;
          case 'comment_reply':
            displayMessage = `${notif.actor_name} a répondu à votre commentaire avec: ${textPreview}`;
            break;
          case 'comment_reply_like':
            displayMessage = `${notif.actor_name} a aimé votre réponse`;
            break;
          default:
            displayMessage = `${notif.actor_name} a interagi avec votre contenu`;
        }
        return { ...notif, display_message: displayMessage };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({ success: true, data: allNotifications });
  } catch (err) {
    console.error('Notifications fetch error:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération notifications' });
  }
});

// ─── PATCH /api/testimonies/:id — admin seulement ────────────────────────────

router.patch('/:id', requireAdmin, async (req, res) => {
  const { error, value } = moderateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const [testimony] = await knex('testimonies')
      .where({ id: req.params.id })
      .where('status', 'pending')
      .update({
        status:       value.action === 'approve' ? 'approved' : 'rejected',
        moderated_by: req.user.userId,
        moderated_at: new Date(),
        updated_at:   new Date(),
      })
      .returning('*');

    if (!testimony) {
      return res.status(404).json({ success: false, error: 'Témoignage introuvable ou déjà modéré' });
    }

    return res.json({ success: true, data: testimony });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur modération témoignage' });
  }
});

// ─── POST /api/testimonies/:id/like — Toggle like ────────────────────────────

const likeSchema = Joi.object({
  /* Pas de body requis */
});

router.post('/:testimonyId/like', async (req, res) => {
  const { testimonyId } = req.params;
  const { userId } = req.user;

  try {
    // Vérifier que le témoignage existe dans l'org (approuvé OU pending pour le créateur)
    const testimony = await knex('testimonies')
      .where({ id: testimonyId })
      .where((builder) => {
        builder
          .where('status', 'approved')
          .orWhere((subBuilder) => {
            subBuilder.where('status', 'pending').where('user_id', userId);
          });
      })
      .first();

    if (!testimony) {
      return res.status(404).json({ success: false, error: 'Témoignage introuvable' });
    }

    // Vérifier si l'utilisateur a déjà liké
    const existingReaction = await knex('testimony_reactions')
      .where({ testimony_id: testimonyId, user_id: userId })
      .first();

    if (existingReaction) {
      // Supprimer le like (unlike)
      await knex('testimony_reactions')
        .where({ testimony_id: testimonyId, user_id: userId })
        .del();

      const newCount = Math.max(0, testimony.support_count - 1);
      await knex('testimonies').where({ id: testimonyId }).update({ support_count: newCount });

      return res.json({
        success: true,
        data: { testimony_id: testimonyId, liked: false, support_count: newCount },
      });
    } else {
      // Ajouter un like
      await knex('testimony_reactions').insert({
        testimony_id: testimonyId,
        user_id: userId,
        reaction: 'support',
      });

      const newCount = testimony.support_count + 1;
      await knex('testimonies').where({ id: testimonyId }).update({ support_count: newCount });

      return res.json({
        success: true,
        data: { testimony_id: testimonyId, liked: true, support_count: newCount },
      });
    }
  } catch (err) {
    console.error('Like error:', err);
    return res.status(500).json({ success: false, error: 'Erreur like' });
  }
});

// ─── GET /api/testimonies/:id/like — Check if user liked ──────────────────────

router.get('/:testimonyId/like', async (req, res) => {
  const { testimonyId } = req.params;
  const { userId } = req.user;

  try {
    const reaction = await knex('testimony_reactions')
      .where({ testimony_id: testimonyId, user_id: userId })
      .first();

    return res.json({ success: true, data: { liked: !!reaction } });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur vérification like' });
  }
});


// ─── POST /api/testimonies/:id/comments — Add comment ────────────────────────

const commentCreateSchema = Joi.object({
  content: Joi.string().trim().min(1).max(500).required(),
  is_anonymous: Joi.boolean().default(false),
});

router.post('/:testimonyId/comments', async (req, res) => {
  const { error, value } = commentCreateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { testimonyId } = req.params;
  const { userId } = req.user;

  try {
    console.log('[POST /testimonies/:id/comments] Adding comment:', { testimonyId, userId, isAnonymous: value.is_anonymous });

    // Vérifier que le témoignage existe (approuvé OU pending pour le créateur)
    const testimony = await knex('testimonies')
      .where({ id: testimonyId })
      .where((builder) => {
        builder
          .where('status', 'approved')
          .orWhere((subBuilder) => {
            subBuilder.where('status', 'pending').where('user_id', userId);
          });
      })
      .first();

    if (!testimony) {
      return res.status(404).json({ success: false, error: 'Témoignage introuvable' });
    }

    // Vérifier si l'utilisateur a déjà un commentaire
    const existingComment = await knex('testimony_comments')
      .where({ testimony_id: testimonyId, user_id: userId })
      .first();

    let display_name = null;
    if (value.is_anonymous) {
      const result = await knex.raw('SELECT generate_anonymous_name() AS name');
      display_name = result.rows[0].name;
    }

    let comment;
    if (existingComment) {
      // Mettre à jour le commentaire existant
      await knex('testimony_comments')
        .where({ id: existingComment.id })
        .update({
          content: value.content,
          is_anonymous: value.is_anonymous,
          display_name,
          updated_at: knex.fn.now(),
        });

      comment = await knex('testimony_comments')
        .where({ id: existingComment.id })
        .first();

      return res.status(200).json({
        success: true,
        data: {
          id: comment.id,
          user_id: comment.user_id,
          is_anonymous: comment.is_anonymous,
          display_name: comment.display_name,
          content: comment.content,
          created_at: comment.created_at,
          is_owner: true,
        },
      });
    }

    // Créer un nouveau commentaire
    const [newComment] = await knex('testimony_comments')
      .insert({
        testimony_id: testimonyId,
        user_id: userId,
        content: value.content,
        is_anonymous: value.is_anonymous,
        display_name,
      })
      .returning('*');

    // Incrémenter le compteur de commentaires
    await knex('testimonies')
      .where({ id: testimonyId })
      .increment('comment_count', 1);

    return res.status(201).json({
      success: true,
      data: {
        id: newComment.id,
        user_id: newComment.user_id,
        is_anonymous: newComment.is_anonymous,
        display_name: newComment.display_name,
        content: newComment.content,
        created_at: newComment.created_at,
        is_owner: true,
      },
    });
  } catch (err) {
    console.error('Comment create error:', err);
    return res.status(500).json({ success: false, error: 'Erreur création commentaire' });
  }
});

// ─── DELETE /api/testimonies/:id/comments/:commentId ───────────────────────────

router.delete('/:testimonyId/comments/:commentId', async (req, res) => {
  const { testimonyId, commentId } = req.params;
  const { userId } = req.user;

  try {
    // Vérifier que le commentaire appartient à l'utilisateur
    const comment = await knex('testimony_comments')
      .where({
        id: commentId,
        testimony_id: testimonyId,
        user_id: userId,
      })
      .first();

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Commentaire introuvable ou non propriétaire' });
    }

    // Supprimer le commentaire
    await knex('testimony_comments').where({ id: commentId }).del();

    // Décrémenter le compteur
    await knex('testimonies')
      .where({ id: testimonyId })
      .decrement('comment_count', 1);

    return res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur suppression commentaire' });
  }
});

// ─── POST /api/testimonies/:id/comments/:commentId/like — Like comment ──────────

router.post('/:testimonyId/comments/:commentId/like', async (req, res) => {
  const { testimonyId, commentId } = req.params;
  const { userId } = req.user;

  try {
    const existingLike = await knex('comment_likes')
      .where({ comment_id: commentId, user_id: userId })
      .first();

    if (existingLike) {
      await knex('comment_likes')
        .where({ comment_id: commentId, user_id: userId })
        .del();
      return res.json({ success: true, data: { liked: false } });
    } else {
      await knex('comment_likes').insert({
        comment_id: commentId,
        user_id: userId,
      });
      return res.json({ success: true, data: { liked: true } });
    }
  } catch (err) {
    console.error('Comment like error:', err);
    return res.status(500).json({ success: false, error: 'Erreur like commentaire' });
  }
});

// ─── GET /api/testimonies/:id/comments/:commentId/like — Check if user liked comment ──

router.get('/:testimonyId/comments/:commentId/like', async (req, res) => {
  const { commentId } = req.params;
  const { userId } = req.user;

  try {
    const like = await knex('comment_likes')
      .where({ comment_id: commentId, user_id: userId })
      .first();

    return res.json({ success: true, data: { liked: !!like } });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur vérification like' });
  }
});

// ─── DELETE /api/testimonies/:id — Propriétaire ou admin ──────────────────────────

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  log('DELETE /api/testimonies/:id', { id, userId });

  try {
    const testimony = await knex('testimonies')
      .where({ id })
      .first();

    log('Found testimony:', testimony?.id, 'user_id:', testimony?.user_id, 'userId:', userId);

    if (!testimony) {
      log('Testimony not found');
      return res.status(404).json({ success: false, error: 'Témoignage introuvable' });
    }

    // Vérifier: propriétaire OU admin
    const isOwner = testimony.user_id === userId;
    const isAdmin = req.user.role === 'admin';

    log('isOwner:', isOwner, 'isAdmin:', isAdmin);

    if (!isOwner && !isAdmin) {
      log('Not authorized to delete');
      return res.status(403).json({ success: false, error: 'Non autorisé' });
    }

    // Supprimer les commentaires associés
    await knex('testimony_comments').where({ testimony_id: id }).del();
    await knex('comments').where({ content_type: 'testimony', content_id: id }).del();

    // Supprimer les réactions
    await knex('testimony_reactions').where({ testimony_id: id }).del();

    // Supprimer le témoignage
    await knex('testimonies').where({ id }).del();

    // Notifier tous les clients via WebSocket
    wsService.broadcast('POST_DELETED', { contentType: 'testimony', contentId: id });

    return res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error('Delete testimony error:', err);
    return res.status(500).json({ success: false, error: 'Erreur suppression témoignage' });
  }
});

// ─── GET /api/testimonies/:id/comments ─────────────────────────────────────────

router.get('/:id/comments', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  try {
    // Read from testimony_comments (not content_comments which is for article/photo/video)
    const comments = await knex('testimony_comments')
      .join('users', 'testimony_comments.user_id', '=', 'users.id')
      .where({ testimony_id: id })
      .select(
        'testimony_comments.id',
        'testimony_comments.content as comment_text',
        'testimony_comments.created_at',
        'users.id as user_id',
        'users.full_name as user_name',
        'testimony_comments.user_id as author_id'
      )
      .orderBy('testimony_comments.created_at', 'asc');

    // Add like_count and user_liked for each comment
    const commentsWithLikes = comments.map((c) => ({
      ...c,
      like_count: 0,
      user_liked: false,
      replies: []
    }));

    return res.json({ success: true, data: commentsWithLikes });
  } catch (err) {
    console.error('Get comments error:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération commentaires' });
  }
});

// ─── POST /api/testimonies/:id/flag — Toggle flag (signaler/désignaler) ──────

router.post('/:id/flag', async (req, res) => {
  const { id } = req.params;

  try {
    const testimony = await knex('testimonies').where({ id }).first();

    if (!testimony) {
      return res.status(404).json({ success: false, error: 'Témoignage introuvable' });
    }

    const newFlaggedState = !testimony.flagged;
    await knex('testimonies').where({ id }).update({ flagged: newFlaggedState });

    return res.json({ success: true, data: { flagged: newFlaggedState } });
  } catch (err) {
    console.error('Flag testimony error:', err);
    return res.status(500).json({ success: false, error: 'Erreur signalement témoignage' });
  }
});

module.exports = router;
