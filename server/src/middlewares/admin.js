/**
 * requireAdmin  — role admin ou superadmin requis.
 * requireSuperAdmin — superadmin uniquement (gestion multi-tenant globale).
 * Doit être utilisé après requireAuth.
 */

function requireAdmin(req, res, next) {
  const { role } = req.user;

  if (role !== 'admin' && role !== 'superadmin') {
    return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs' });
  }

  next();
}

function requireSuperAdmin(req, res, next) {
  const { role } = req.user;

  if (role !== 'superadmin') {
    return res.status(403).json({ success: false, error: 'Accès réservé au super administrateur' });
  }

  next();
}

module.exports = { requireAdmin, requireSuperAdmin };
