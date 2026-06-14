const jwt = require('jsonwebtoken');

/**
 * Vérifie le JWT dans le cookie httpOnly "token" OU dans Authorization header.
 * Injecte req.user = { userId, organizationId, role } si valide.
 * Fallback pour mobile où les cookies cross-domain ne marchent pas toujours.
 */
function requireAuth(req, res, next) {
  let token = req.cookies?.token;

  // Fallback: vérifier Authorization header (Bearer token)
  // Utile pour mobile/PWA où les cookies cross-domain ne passent pas toujours
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Enlever "Bearer "
    }
  }

  if (!token) {
    console.warn('[Auth] ❌ No token in cookie or Authorization header');
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
    res.clearCookie('token');
    console.warn('[Auth] ❌ Token invalid or expired:', err.message);
    return res.status(401).json({ success: false, error: 'Session expirée ou invalide' });
  }
}

module.exports = { requireAuth };
