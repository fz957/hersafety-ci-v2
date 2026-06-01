const express = require('express');
const Joi = require('joi');

const { requireAuth } = require('../middlewares/auth');
const { getAdminAssistMessage } = require('../services/claude.service');
const adminIntelligence = require('../services/admin-intelligence.service');

const router = express.Router();
router.use(requireAuth);

// Schéma de validation
const assistSchema = Joi.object({
  mode: Joi.string().valid('summary', 'alerts', 'reports', 'moderation', 'anomalies', 'chat').required(),
  question: Joi.string().max(1000).optional(),
  conversationHistory: Joi.array().optional(),
});

/**
 * POST /api/admin-assist
 * Endpoint pour les requêtes d'assistant IA pour admin
 */
router.post('/', async (req, res) => {
  const { error, value } = assistSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { mode, question = '', conversationHistory = [] } = value;

  try {
    // Récupérer les données nécessaires selon le mode
    let data = {};

    switch (mode) {
      case 'summary':
        data = await adminIntelligence.generateDailyReport();
        break;

      case 'alerts':
        data = await adminIntelligence.getAlertsData();
        break;

      case 'reports':
        data = await adminIntelligence.getReportsData();
        break;

      case 'moderation':
        const community = await adminIntelligence.getCommunityData();
        data = {
          ...community,
          message: 'Données de modération disponibles'
        };
        break;

      case 'anomalies':
        data = await adminIntelligence.detectAnomalies();
        break;

      case 'chat':
        // Chat libre - pas besoin de données complexes
        data = {};
        break;

      default:
        data = {};
    }

    // Appeler le service IA
    const aiResponse = await getAdminAssistMessage({
      mode,
      data,
      question,
      conversationHistory,
    });

    return res.json({
      success: true,
      data: {
        message: aiResponse.message,
        mode: mode,
        source: aiResponse.source,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[Admin Assistant] Erreur:', err);
    return res.status(500).json({
      success: false,
      error: 'Erreur traitement assistant IA',
    });
  }
});

/**
 * GET /api/admin-assist/data/:type
 * Endpoint pour récupérer les données brutes (sans IA)
 * Types: alerts, reports, community, anomalies, daily-report
 */
router.get('/data/:type', async (req, res) => {
  const { type } = req.params;

  try {
    let data = {};

    switch (type) {
      case 'alerts':
        data = await adminIntelligence.getAlertsData();
        break;
      case 'reports':
        data = await adminIntelligence.getReportsData();
        break;
      case 'community':
        data = await adminIntelligence.getCommunityData();
        break;
      case 'anomalies':
        data = await adminIntelligence.detectAnomalies();
        break;
      case 'daily-report':
        data = await adminIntelligence.generateDailyReport();
        break;
      default:
        return res.status(400).json({ success: false, error: 'Type de données invalide' });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error('[Admin Assistant Data] Erreur:', err);
    return res.status(500).json({ success: false, error: 'Erreur récupération données' });
  }
});

module.exports = router;
