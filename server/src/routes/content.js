const express = require('express');
const knex = require('../db/knex');
const { requireAuth } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/admin');

const router = express.Router();

// ─── GET /api/testimonies/pending (admin only) ─────────────────────────────────
router.get('/testimonies/pending', requireAuth, requireAdmin, async (req, res) => {
  try {
    const testimonies = await knex('testimonies')
      .where({ status: 'pending' })
      .orderBy('created_at', 'asc')
      .limit(50);

    return res.json({ success: true, data: testimonies });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur récupération contenus' });
  }
});

// ─── PATCH /api/testimonies/:id/status (admin only) ────────────────────────────
router.patch('/testimonies/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.body;

  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Statut invalide' });
  }

  try {
    const [testimony] = await knex('testimonies')
      .where({ id: req.params.id })
      .update({ status })
      .returning('*');

    if (!testimony) {
      return res.status(404).json({ success: false, error: 'Témoignage introuvable' });
    }

    return res.json({ success: true, data: testimony });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur mise à jour' });
  }
});

module.exports = router;
