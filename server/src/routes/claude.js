const express = require('express');
const Joi     = require('joi');

const { requireAuth }     = require('../middlewares/auth');
const { getAssistMessage } = require('../services/claude.service');

const router = express.Router();
router.use(requireAuth);

const assistSchema = Joi.object({
  level:                 Joi.string().valid('1', '2', '3', '4').required(),
  context:               Joi.any().optional(), // Accept any context type (string or object)
  conversationHistory:   Joi.array().items(
    Joi.object({
      role:    Joi.string().valid('user', 'assistant').required(),
      content: Joi.string().max(2000).required(),
    })
  ).optional(),
  mode:                  Joi.string().valid('default', 'evaluator', 'evaluator_continuity').optional().default('default'),
});

// POST /api/claude/assist
router.post('/assist', async (req, res) => {
  const { error, value } = assistSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  // La clé API ne quitte jamais le serveur
  const result = await getAssistMessage({
    level: value.level,
    context: value.context,
    conversationHistory: value.conversationHistory || [],
    mode: value.mode || 'default',
  });

  return res.json({ success: true, data: result });
});

module.exports = router;
