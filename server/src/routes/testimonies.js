const express = require('express');
const Joi     = require('joi');

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
    // Montrer: tous les témoignages approuvés + les témoignages pending de l'utilisateur
    const testimonies = await knex('testimonies')
      .where((builder) => {
        builder
          .where('status', 'approved')
          .orWhere((subBuilder) => {
            subBuilder.where('status', 'pending').where('user_id', userId);
          });
      })
      .select(
        'id', 'is_anonymous', 'display_name',
        'category', 'title', 'content', 'location_label',
        'trigger_warning_level', 'support_count', 'comment_count', 'status', 'created_at',
        'user_id', 'flagged' // Inclure pour vérifier propriétaire (anonymat préservé via is_anonymous)
      )
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return res.json({ success: true, data: testimonies });
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
      .where('testimonies.organization_id')
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
      .where('testimonies.organization_id')
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
      .where('testimony_comments.organization_id')
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

    // Merge all notifications and sort by date
    const allNotifications = [
      ...testimonyLikes,
      ...testimonyComments,
      ...commentLikes,
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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


    let display_name = null;
    if (value.is_anonymous) {
      const result = await knex.raw('SELECT generate_anonymous_name() AS name');
      display_name = result.rows[0].name;
    }

    const [comment] = await knex('testimony_comments')
      .insert({
        testimony_id: testimonyId,
        user_id: userId,
        organization_id: organizationId,
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
        id: comment.id,
        user_id: comment.user_id,
        is_anonymous: comment.is_anonymous,
        display_name: comment.display_name,
        content: comment.content,
        created_at: comment.created_at,
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
        organization_id: organizationId,
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

    // Supprimer les réactions
    await knex('testimony_reactions').where({ testimony_id: id }).del();

    // Supprimer le témoignage
    await knex('testimonies').where({ id }).del();

    return res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error('Delete testimony error:', err);
    return res.status(500).json({ success: false, error: 'Erreur suppression témoignage' });
  }
});

// ─── GET /api/testimonies/:id/comments ─────────────────────────────────────────

router.get('/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    const comments = await knex('comments')
      .where({ content_type: 'testimony', content_id: id })
      .select('id', 'display_name', 'content', 'likes_count', 'created_at')
      .orderBy('created_at', 'desc');

    return res.json({ success: true, data: comments });
  } catch (err) {
    console.error('Get comments error:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération commentaires' });
  }
});

// ─── POST /api/testimonies/:id/flag — Flag a testimony ──────────────────────

router.post('/:id/flag', async (req, res) => {
  const { id } = req.params;

  try {
    const testimony = await knex('testimonies').where({ id }).first();

    if (!testimony) {
      return res.status(404).json({ success: false, error: 'Témoignage introuvable' });
    }

    if (testimony.flagged) {
      return res.status(400).json({ success: false, error: 'Ce témoignage a déjà été signalé' });
    }

    await knex('testimonies').where({ id }).update({ flagged: true });

    return res.json({ success: true, data: { flagged: true } });
  } catch (err) {
    console.error('Flag testimony error:', err);
    return res.status(500).json({ success: false, error: 'Erreur signalement témoignage' });
  }
});

module.exports = router;
