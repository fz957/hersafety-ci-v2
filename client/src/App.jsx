import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SideNav, BottomNav, Spinner, HS } from './components/ui/index.jsx';
import api from './services/api';
// Firebase disabled - using Gmail for notifications instead
// import { setupFCM } from './services/firebase.js';

// ─── Global error handler — Empêche les erreurs non-gérées de bloquer le rendu ──
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('WebSocket')) {
    console.warn('[Global Error Handler] WebSocket error caught:', event.message);
    event.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason?.message || String(reason);

  // Catch WebSocket errors and other security errors that shouldn't crash the app
  if (message.includes('WebSocket') || message.includes('SecurityError')) {
    console.warn('[Global Error Handler] Unhandled rejection caught:', message);
    event.preventDefault();
    return;
  }
});

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
import VerifyEmail from './pages/VerifyEmail.jsx';

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
import Settings   from './pages/Settings.jsx';
import Notifications from './pages/Notifications.jsx';

// Admin (superadmin only)
import AdminDashboard   from './pages/admin/AdminDashboard.jsx';
import AdminAlerts      from './pages/admin/AdminAlerts.jsx';
import AdminUsers       from './pages/admin/AdminUsers.jsx';
import AdminTestimonies from './pages/admin/AdminTestimonies.jsx';
import AdminModeration  from './pages/admin/AdminModeration.jsx';
import AdminReports     from './pages/admin/AdminReports.jsx';
import AdminCartography from './pages/admin/AdminCartography.jsx';
import AdminAdmins      from './pages/admin/AdminAdmins.jsx';
import AdminSettings    from './pages/admin/AdminSettings.jsx';

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
  const { theme } = useTheme();
  const isDesktop = useIsDesktop();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: theme.bg }}>

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
function ProtectedRoute({ children, superAdminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  // Super-admin uniquement
  if (superAdminOnly && user.role !== 'superadmin') return <AccessDenied />;
  // Inversement : les superadmins n'ont pas accès aux fonctionnalités clientes
  if (!superAdminOnly && user.role === 'superadmin') return <Navigate to="/admin" replace />;
  // Admin pages have their own layout (AdminSidebar), don't wrap in AppLayout
  if (superAdminOnly) return children;
  return <AppLayout>{children}</AppLayout>;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return children;
  // Déjà connecté → superadmin va sur /admin, utilisatrice sur /dashboard
  return <Navigate to={user.role === 'superadmin' ? '/admin' : '/dashboard'} replace />;
}

// ─── Firebase Initializer ─────────────────────────────────────────────────────
// DISABLED - Firebase removed, using Gmail notifications instead
// function FirebaseInitializer() {
//   const { user } = useAuth();
//
//   useEffect(() => {
//     if (user) {
//       setupFCM(api)
//         .then(result => {
//           if (result.success) {
//             console.log('✓ FCM setup complete');
//           } else {
//             console.warn('⚠ FCM setup incomplete:', result.error);
//           }
//         })
//         .catch(err => console.error('FCM setup error:', err));
//     }
//   }, [user]);
//
//   return null;
// }

// ─── Routes ───────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <>
      {/* Firebase Initializer disabled */}
      {/* <FirebaseInitializer /> */}
      <Routes>
      {/* Publiques */}
      <Route path="/"         element={<Landing />} />
      <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/verify-email" element={<VerifyEmail />} />

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
      <Route path="/settings"   element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

      {/* Admin (superadmin only - no tenant admins) */}
      <Route path="/admin"             element={<ProtectedRoute superAdminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/alerts"      element={<ProtectedRoute superAdminOnly><AdminAlerts /></ProtectedRoute>} />
      <Route path="/admin/users"       element={<ProtectedRoute superAdminOnly><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/moderation"  element={<ProtectedRoute superAdminOnly><AdminModeration /></ProtectedRoute>} />
      <Route path="/admin/testimonies" element={<ProtectedRoute superAdminOnly><AdminTestimonies /></ProtectedRoute>} />
      <Route path="/admin/reports"     element={<ProtectedRoute superAdminOnly><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/cartography" element={<ProtectedRoute superAdminOnly><AdminCartography /></ProtectedRoute>} />
      <Route path="/admin/admins"      element={<ProtectedRoute superAdminOnly><AdminAdmins /></ProtectedRoute>} />
      <Route path="/admin/settings"    element={<ProtectedRoute superAdminOnly><AdminSettings /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

