const express = require('express');
const Joi     = require('joi');

const { requireAuth }     = require('../middlewares/auth');
const { requireTenant }   = require('../middlewares/tenant');
const { getAssistMessage } = require('../services/claude.service');

const router = express.Router();
router.use(requireAuth, requireTenant);

const assistSchema = Joi.object({
  level:   Joi.string().valid('1', '2', '3', '4').required(),
  context: Joi.string().max(300).optional(),
});

// POST /api/claude/assist
router.post('/assist', async (req, res) => {
  const { error, value } = assistSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  // La clé API ne quitte jamais le serveur
  const result = await getAssistMessage({ level: value.level, context: value.context });

  return res.json({ success: true, data: result });
});

module.exports = router;
