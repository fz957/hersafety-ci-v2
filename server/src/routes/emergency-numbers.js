const express = require('express');
const knex    = require('../db/knex');

const router = express.Router();

// GET /api/emergency-numbers — public, aucune auth requise
router.get('/', async (req, res) => {
  try {
    const numbers = await knex('emergency_numbers')
      .where({ is_active: true })
      .orderBy('display_order', 'asc');

    return res.json({ success: true, data: numbers });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur récupération numéros d\'urgence' });
  }
});

module.exports = router;
