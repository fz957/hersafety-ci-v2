const knex = require('../db/knex');

/**
 * Vérifie que l'organization_id du token correspond à une organisation
 * active et approuvée en base. Doit être utilisé après requireAuth.
 * Injecte req.organization pour les routes qui en ont besoin.
 */
async function requireTenant(req, res, next) {
  const { organizationId } = req.user;

  if (!organizationId) {
    return res.status(403).json({ success: false, error: 'Organisation manquante dans le token' });
  }

  try {
    const org = await knex('organizations')
      .where({ id: organizationId, is_active: true, is_approved: true })
      .first();

    if (!org) {
      return res.status(403).json({ success: false, error: 'Organisation inactive ou non approuvée' });
    }

    req.organization = org;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur vérification tenant' });
  }
}

module.exports = { requireTenant };
