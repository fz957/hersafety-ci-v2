import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SideNav, BottomNav, Spinner, HS } from './components/ui/index.jsx';
import api from './services/api';
import { setupFCM } from './services/firebase.js';

// Hook : détecte si on est sur desktop (>= 768px) — recalculé au resize
function useIsDesktop() {
  const [ok, setOk] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const fn = () => setOk(window.innerWidth >= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return ok;
}

// Pages publiques
import Landing    from './pages/Landing.jsx';
import Login      from './pages/Login.jsx';
import Register   from './pages/Register.jsx';

// Pages protégées
import Dashboard  from './pages/Dashboard.jsx';
import OnboardingEmergency from './pages/OnboardingEmergency.jsx';
import OnboardingPhone from './pages/OnboardingPhone.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Emergency  from './pages/Emergency.jsx';
import Tracking   from './pages/Tracking.jsx';
import Community  from './pages/Community.jsx';
import Reports    from './pages/Reports.jsx';
import Chat       from './pages/Chat.jsx';
import History    from './pages/History.jsx';

// Admin
import AdminDashboard   from './pages/admin/AdminDashboard.jsx';
import AdminUsers       from './pages/admin/AdminUsers.jsx';
import AdminTestimonies from './pages/admin/AdminTestimonies.jsx';
import AdminReports     from './pages/admin/AdminReports.jsx';
import SuperAdminOrgs   from './pages/admin/SuperAdminOrgs.jsx';

// ─── Écran de chargement ──────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: HS.bg, flexDirection: 'column', gap: 16, zIndex: 100,
    }}>
      <svg width="32" height="37" viewBox="0 0 22 26" fill="none">
        <path d="M11 1 L21 4 V13 C21 19 16.5 23.5 11 25 C5.5 23.5 1 19 1 13 V4 Z"
          fill={HS.sakura} stroke={HS.sakura} strokeWidth="1.6" strokeLinejoin="round" opacity="0.95"/>
        <path d="M11 9 C9.6 7.2 6 7.8 6 11 C6 13.6 9 15.6 11 17 C13 15.6 16 13.6 16 11 C16 7.8 12.4 7.2 11 9 Z"
          fill={HS.chocolate}/>
      </svg>
      <Spinner size={28} color={HS.sakura} />
    </div>
  );
}

// ─── AppLayout — layout principal pour les pages authentifiées ────────────────
function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const isDesktop = useIsDesktop();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: HS.bg }}>

      {/* ── SIDEBAR — desktop seulement ── */}
      {isDesktop && <SideNav user={user} onLogout={logout} />}

      {/* ── CONTENU PRINCIPAL ── */}
      <main style={{
        flex: 1,
        minHeight: '100vh',
        overflowX: 'hidden',
        // Sur desktop, le contenu est centré avec une largeur maximale
        maxWidth: isDesktop ? 900 : '100%',
        margin: isDesktop ? '0 auto' : 0,
      }}>
        {children}
      </main>

      {/* ── BOTTOM NAV — mobile seulement ── */}
      {!isDesktop && <BottomNav user={user} />}
    </div>
  );
}

// ─── Page accès refusé ───────────────────────────────────────────────────────
function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: HS.bg, padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
      <div style={{ fontFamily: HS.serif, fontSize: 28, color: HS.chocolate, marginBottom: 8 }}>
        Accès refusé
      </div>
      <div style={{ fontSize: 14, color: HS.textMute, marginBottom: 28, lineHeight: 1.6 }}>
        Cette section est réservée aux administrateurs.<br />
        Tu n'as pas les droits nécessaires.
      </div>
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          background: HS.chocolate, color: HS.textOnDark,
          border: 'none', borderRadius: 14, padding: '14px 28px',
          fontSize: 14, fontWeight: 700, fontFamily: HS.font, cursor: 'pointer',
        }}
      >
        Retour à l'accueil
      </button>
    </div>
  );
}

// ─── Gardes de routes ─────────────────────────────────────────────────────────
function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  // Super-admin uniquement
  if (superAdminOnly && user.role !== 'superadmin') return <AccessDenied />;
  // Admin ou superadmin uniquement — les utilisatrices voient une page claire
  if (adminOnly && user.role === 'user') return <AccessDenied />;
  // Inversement : les admins/superadmins n'ont pas accès aux fonctionnalités clientes
  const isAdmin = user.role === 'admin' || user.role === 'superadmin';
  if (!adminOnly && !superAdminOnly && isAdmin) return <Navigate to="/admin" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return children;
  // Déjà connecté → admin va sur /admin, utilisatrice sur /dashboard
  const isAdmin = user.role === 'admin' || user.role === 'superadmin';
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
}

// ─── Firebase Initializer ─────────────────────────────────────────────────────
function FirebaseInitializer() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      setupFCM(api)
        .then(result => {
          if (result.success) {
            console.log('✓ FCM setup complete');
          } else {
            console.warn('⚠ FCM setup incomplete:', result.error);
          }
        })
        .catch(err => console.error('FCM setup error:', err));
    }
  }, [user]);

  return null;
}

// ─── Routes ───────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <>
      <FirebaseInitializer />
      <Routes>
      {/* Publiques */}
      <Route path="/"         element={<Landing />} />
      <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

      {/* Protégées — enveloppées dans AppLayout */}
      <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/onboarding-emergency" element={<ProtectedRoute><OnboardingEmergency /></ProtectedRoute>} />
      <Route path="/onboarding-phone" element={<ProtectedRoute><OnboardingPhone /></ProtectedRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/emergency"  element={<ProtectedRoute><Emergency /></ProtectedRoute>} />
      <Route path="/tracking"   element={<ProtectedRoute><Tracking /></ProtectedRoute>} />
      <Route path="/track/:token" element={<Tracking />} /> {/* Public track sharing - no auth required */}
      <Route path="/chat"       element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/community"  element={<ProtectedRoute><Community /></ProtectedRoute>} />
      <Route path="/reports"    element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/history"    element={<ProtectedRoute><History /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin"             element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users"       element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/testimonies" element={<ProtectedRoute adminOnly><AdminTestimonies /></ProtectedRoute>} />
      <Route path="/admin/reports"     element={<ProtectedRoute adminOnly><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/orgs"        element={<ProtectedRoute superAdminOnly><SuperAdminOrgs /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
