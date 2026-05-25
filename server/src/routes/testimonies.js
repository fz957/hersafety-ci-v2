const express = require('express');
const Joi     = require('joi');

const knex              = require('../db/knex');
const { requireAuth }   = require('../middlewares/auth');
const { requireTenant } = require('../middlewares/tenant');
const { requireAdmin }  = require('../middlewares/admin');

const router = express.Router();
router.use(requireAuth, requireTenant);

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
      .where({ organization_id: req.user.organizationId })
      .where((builder) => {
        builder
          .where('status', 'approved')
          .orWhere((subBuilder) => {
            subBuilder.where('status', 'pending').where('user_id', userId);
          });
      })
      .select(
        'id', 'organization_id', 'is_anonymous', 'display_name',
        'category', 'title', 'content', 'location_label',
        'trigger_warning_level', 'support_count', 'comment_count', 'status', 'created_at'
        // user_id délibérément exclu pour préserver l'anonymat
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

  const { userId, organizationId } = req.user;

  try {
    let display_name = null;
    if (value.is_anonymous) {
      const result = await knex.raw('SELECT generate_anonymous_name() AS name');
      display_name = result.rows[0].name;
    }

    const [testimony] = await knex('testimonies')
      .insert({
        user_id:              userId,
        organization_id:      organizationId,
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
        'id', 'organization_id', 'is_anonymous', 'display_name',
        'category', 'title', 'content', 'location_label', 'trigger_warning_level', 'status', 'created_at',
      ]);

    return res.status(201).json({ success: true, data: testimony });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur création témoignage' });
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
      .where({ id: req.params.id, organization_id: req.user.organizationId })
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
  const { userId, organizationId } = req.user;

  try {
    // Vérifier que le témoignage existe dans l'org (approuvé OU pending pour le créateur)
    const testimony = await knex('testimonies')
      .where({ id: testimonyId, organization_id: organizationId })
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

// ─── GET /api/testimonies/:id/comments — List comments ────────────────────────

const commentListSchema = Joi.object({
  limit: Joi.number().min(1).max(100).default(10),
  offset: Joi.number().min(0).default(0),
});

router.get('/:testimonyId/comments', async (req, res) => {
  const { error, value } = commentListSchema.validate(req.query);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { testimonyId } = req.params;
  const { userId, organizationId } = req.user;

  try {
    // Vérifier que le témoignage existe (approuvé OU pending pour le créateur)
    const testimony = await knex('testimonies')
      .where({ id: testimonyId, organization_id: organizationId })
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

    const comments = await knex('testimony_comments')
      .where({ testimony_id: testimonyId })
      .select('id', 'user_id', 'is_anonymous', 'display_name', 'content', 'created_at')
      .orderBy('created_at', 'asc')
      .limit(value.limit)
      .offset(value.offset);

    // Ajouter un flag pour indiquer si l'utilisateur est le propriétaire
    const commentsWithOwnership = comments.map((c) => ({
      ...c,
      is_owner: c.user_id === userId,
    }));

    return res.json({ success: true, data: commentsWithOwnership });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur récupération commentaires' });
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
  const { userId, organizationId } = req.user;

  try {
    // Vérifier que le témoignage existe (approuvé OU pending pour le créateur)
    const testimony = await knex('testimonies')
      .where({ id: testimonyId, organization_id: organizationId })
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

    // Vérifier que l'utilisateur n'a pas déjà commenté (max 1 comment par utilisateur)
    const existingComment = await knex('testimony_comments')
      .where({ testimony_id: testimonyId, user_id: userId })
      .first();

    if (existingComment) {
      return res.status(409).json({ success: false, error: 'Vous avez déjà commenté ce témoignage' });
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
  const { userId, organizationId } = req.user;

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

// ─── DELETE /api/testimonies/:id — admin seulement ──────────────────────────

router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    const testimony = await knex('testimonies')
      .where({ id, organization_id: organizationId })
      .first();

    if (!testimony) {
      return res.status(404).json({ success: false, error: 'Témoignage introuvable' });
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

module.exports = router;
