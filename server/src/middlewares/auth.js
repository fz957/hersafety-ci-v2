const jwt = require('jsonwebtoken');

/**
 * Vérifie le JWT dans le cookie httpOnly "token".
 * Injecte req.user = { userId, organizationId, role } si valide.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Non authentifié' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId:         payload.userId,
      organizationId: payload.organizationId,
      role:           payload.role,
    };
    next();
  } catch (err) {
    // Token expiré ou falsifié — on efface le cookie côté client
    res.clearCookie('token');
    return res.status(401).json({ success: false, error: 'Session expirée ou invalide' });
  }
}

module.exports = { requireAuth };
