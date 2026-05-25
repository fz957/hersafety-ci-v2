import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Routes publiques — un 401 ici est attendu (utilisatrice non connectée),
// on ne redirige PAS.
const PUBLIC_ENDPOINTS = [
  '/api/users/me',        // vérification de session au démarrage
  '/api/auth/login',      // tentative de connexion
  '/api/auth/register',   // inscription
  '/api/auth/refresh',    // renouvellement du token
  '/api/emergency-numbers', // lecture publique
];

function isPublicEndpoint(url = '') {
  return PUBLIC_ENDPOINTS.some((p) => url.includes(p));
}

// Pages publiques — ne pas rediriger même si une autre requête revient 401
const PUBLIC_PATHS = ['/', '/login', '/register'];

function isPublicPage() {
  return PUBLIC_PATHS.includes(window.location.pathname);
}

// Intercepteur réponse
// Redirige vers /login sur 401 UNIQUEMENT si :
//  • l'endpoint n'est pas une vérification de session / route publique
//  • la page courante n'est pas déjà une page publique
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !isPublicEndpoint(error.config?.url) &&
      !isPublicPage()
    ) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
