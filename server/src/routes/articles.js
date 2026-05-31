const express = require('express');
const knex = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

// GET /api/articles - NO ORG FILTER
router.get('/', async (req, res) => {
  try {
    const articles = await knex('articles')
      .where({ status: 'approved' })
      .select('id', 'title', 'content', 'category', 'created_at', 'support_count', 'flagged', 'user_id')
      .orderBy('created_at', 'desc');

    // Ajouter le nombre de commentaires pour chaque article
    const articlesWithComments = await Promise.all(
      articles.map(async (a) => {
        const commentCount = await knex('comments')
          .where({ content_type: 'article', content_id: a.id })
          .count('id as cnt')
          .first();
        return {
          ...a,
          comment_count: parseInt(commentCount?.cnt || 0, 10),
          support_count: a.support_count || 0
        };
      })
    );

    return res.json({ success: true, data: articlesWithComments });
  } catch (err) {
    console.error('Get articles error:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération articles' });
  }
});

// GET /api/articles/:id/comments - NO ORG FILTER
router.get('/:id/comments', async (req, res) => {
  const { id } = req.params;

  try {
    const comments = await knex('comments')
      .where({ content_type: 'article', content_id: id })
      .select('id', 'display_name', 'content', 'likes_count', 'created_at')
      .orderBy('created_at', 'desc');

    return res.json({ success: true, data: comments });
  } catch (err) {
    console.error('Get article comments error:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération commentaires' });
  }
});

// POST /api/articles - Create article
router.post('/', requireAuth, async (req, res) => {
  const { title, content, category } = req.body;
  const { userId } = req.user;

  if (!title || !content) {
    return res.status(400).json({ success: false, error: 'Titre et contenu requis' });
  }

  try {
    const [article] = await knex('articles')
      .insert({
        user_id: userId,
        title: title.trim(),
        content: content.trim(),
        category: category || 'autre',
        status: 'approved',
        flagged: false,
        support_count: 0,
      })
      .returning('*');

    return res.status(201).json({ success: true, data: article });
  } catch (err) {
    console.error('Create article error:', err);
    return res.status(500).json({ success: false, error: 'Erreur création article' });
  }
});

// DELETE /api/articles/:id - Delete article
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const article = await knex('articles').where({ id }).first();

    if (!article) {
      return res.status(404).json({ success: false, error: 'Article introuvable' });
    }

    // Supprimer les commentaires associés
    await knex('comments').where({ content_type: 'article', content_id: id }).del();

    // Supprimer l'article
    await knex('articles').where({ id }).del();

    return res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error('Delete article error:', err);
    return res.status(500).json({ success: false, error: 'Erreur suppression article' });
  }
});

// POST /api/articles/:id/flag - Flag an article
router.post('/:id/flag', async (req, res) => {
  const { id } = req.params;

  try {
    const article = await knex('articles').where({ id }).first();

    if (!article) {
      return res.status(404).json({ success: false, error: 'Article introuvable' });
    }

    if (article.flagged) {
      return res.status(400).json({ success: false, error: 'Cet article a déjà été signalé' });
    }

    await knex('articles').where({ id }).update({ flagged: true });

    return res.json({ success: true, data: { flagged: true } });
  } catch (err) {
    console.error('Flag article error:', err);
    return res.status(500).json({ success: false, error: 'Erreur signalement article' });
  }
});

// POST /api/articles/:id/like — Toggle like
router.post('/:id/like', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  try {
    const article = await knex('articles').where({ id }).first();

    if (!article) {
      return res.status(404).json({ success: false, error: 'Article introuvable' });
    }

    // Vérifier si l'utilisateur a déjà liké
    const existingReaction = await knex('reactions')
      .where({ content_type: 'article', content_id: id, user_id: userId })
      .first();

    if (existingReaction) {
      // Supprimer le like (unlike)
      await knex('reactions')
        .where({ content_type: 'article', content_id: id, user_id: userId })
        .del();

      const newCount = Math.max(0, article.support_count - 1);
      await knex('articles').where({ id }).update({ support_count: newCount });

      return res.json({
        success: true,
        data: { article_id: id, liked: false, support_count: newCount },
      });
    } else {
      // Ajouter un like
      await knex('reactions').insert({
        content_type: 'article',
        content_id: id,
        user_id: userId,
        reaction: 'support',
      });

      const newCount = article.support_count + 1;
      await knex('articles').where({ id }).update({ support_count: newCount });

      return res.json({
        success: true,
        data: { article_id: id, liked: true, support_count: newCount },
      });
    }
  } catch (err) {
    console.error('Like article error:', err);
    return res.status(500).json({ success: false, error: 'Erreur like' });
  }
});

module.exports = router;
