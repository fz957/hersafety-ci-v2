import { useNavigate, useLocation } from 'react-router-dom';
import { HS, ICONS } from '../../tokens';

// ─── Icon ────────────────────────────────────────────────────────────────────
export function Icon({ d, size = 20, color = 'currentColor', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d={d} fill={color} />
    </svg>
  );
}

// ─── Logo ────────────────────────────────────────────────────────────────────
export function Logo({ size = 22, withText = true, color, accent = HS.sakura }) {
  const c = color || HS.chocolate;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size * 1.15} viewBox="0 0 22 26" fill="none">
        <path d="M11 1 L21 4 V13 C21 19 16.5 23.5 11 25 C5.5 23.5 1 19 1 13 V4 Z"
          fill={accent} stroke={accent} strokeWidth="1.6" strokeLinejoin="round" opacity="0.95" />
        <path d="M11 9 C9.6 7.2 6 7.8 6 11 C6 13.6 9 15.6 11 17 C13 15.6 16 13.6 16 11 C16 7.8 12.4 7.2 11 9 Z"
          fill={c} />
      </svg>
      {withText && (
        <span style={{ fontFamily: HS.font, fontWeight: 700, fontSize: size * 0.78, color: c, letterSpacing: -0.3 }}>
          HerSafety<span style={{ color: HS.sakuraDeep, fontWeight: 800 }}>·CI</span>
        </span>
      )}
    </div>
  );
}

// ─── Petal ───────────────────────────────────────────────────────────────────
export function Petal({ size = 14, color = HS.sakura, opacity = 0.5, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ opacity, ...style }}>
      <path d="M10 2 C 12 6, 16 8, 14 12 C 12 16, 8 16, 6 12 C 4 8, 8 6, 10 2 Z" fill={color} />
    </svg>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
export function Avatar({ size = 40, name = 'A', color, ring = false }) {
  const c1 = color || HS.sakura;
  const initial = (name || 'A')[0].toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: `linear-gradient(135deg, ${c1}, ${HS.milkTea})`,
      color: '#fff', fontWeight: 800, fontSize: size * 0.4,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: ring ? `0 0 0 3px ${HS.bg}, 0 0 0 5px ${HS.sakura}` : 'none',
      flexShrink: 0, fontFamily: HS.font,
    }}>{initial}</div>
  );
}

// ─── TestBanner ──────────────────────────────────────────────────────────────
export function TestBanner() {
  // Production mode - no test banner
  return null;
}

// ─── Button ──────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', icon, sub, onClick, style, disabled, type = 'button' }) {
  const variants = {
    primary: { bg: HS.chocolate,    color: HS.textOnDark, border: 'none' },
    accent:  { bg: HS.sakura,       color: HS.chocolate,  border: 'none' },
    soft:    { bg: HS.mistyRose,    color: HS.chocolate,  border: 'none' },
    ghost:   { bg: 'transparent',   color: HS.chocolate,  border: `1.5px solid ${HS.chocolate}` },
    light:   { bg: HS.surface,      color: HS.chocolate,  border: `1px solid ${HS.border}` },
    danger:  { bg: HS.danger,       color: '#fff',        border: 'none' },
    safe:    { bg: HS.safe,         color: '#fff',        border: 'none' },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', minHeight: 56, borderRadius: 18,
        background: disabled ? HS.mistyRose : v.bg,
        color: disabled ? HS.textMute : v.color,
        border: v.border,
        fontFamily: HS.font, fontWeight: 700, fontSize: 15,
        display: 'flex', alignItems: 'center',
        justifyContent: sub ? 'flex-start' : 'center',
        gap: 12, padding: sub ? '12px 18px' : '0 18px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left', transition: 'opacity .15s', ...style,
      }}
    >
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {sub ? (
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{children}</div>
          <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.85 }}>{sub}</div>
        </div>
      ) : children}
    </button>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, style, padded = true, dark = false, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: dark ? HS.chocolate : HS.surface,
        color: dark ? HS.textOnDark : HS.text,
        borderRadius: 22,
        border: dark ? 'none' : `1px solid ${HS.border}`,
        boxShadow: dark
          ? 'none'
          : '0 1px 0 rgba(68,48,37,0.04), 0 8px 24px rgba(68,48,37,0.05)',
        padding: padded ? 16 : 0,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >{children}</div>
  );
}

// ─── Input ───────────────────────────────────────────────────────────────────
export function Input({
  label, placeholder, value, onChange, type = 'text',
  icon, hint, multiline = false, name, required, autoComplete,
}) {
  return (
    <label style={{ display: 'block' }}>
      {label && (
        <div style={{
          fontSize: 11, fontWeight: 700, color: HS.textDim,
          marginBottom: 8, letterSpacing: 0.6, textTransform: 'uppercase',
        }}>
          {label}
        </div>
      )}
      <div style={{
        background: HS.surface, borderRadius: 16,
        border: `1.5px solid ${HS.border}`,
        display: 'flex',
        alignItems: multiline ? 'flex-start' : 'center',
        gap: 10,
        padding: multiline ? '14px 14px' : '0 14px',
        minHeight: multiline ? 'auto' : 52,
        transition: 'border-color .15s, box-shadow .15s',
      }}>
        {icon && <span style={{ color: HS.textMute, display: 'flex', marginTop: multiline ? 2 : 0 }}>{icon}</span>}
        {multiline ? (
          <textarea
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            rows={4}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, color: HS.text, fontFamily: HS.font, resize: 'none',
              minHeight: 80,
            }}
          />
        ) : (
          <input
            type={type}
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            autoComplete={autoComplete}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, color: HS.text, fontFamily: HS.font, fontWeight: 500,
            }}
          />
        )}
      </div>
      {hint && <div style={{ fontSize: 11, color: HS.textMute, marginTop: 6 }}>{hint}</div>}
    </label>
  );
}

// ─── Eyebrow ─────────────────────────────────────────────────────────────────
export function Eyebrow({ children, color = HS.sakuraDeep, style }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, letterSpacing: 1.8,
      textTransform: 'uppercase', color, ...style,
    }}>
      {children}
    </div>
  );
}

// ─── H1 ──────────────────────────────────────────────────────────────────────
export function H1({ children, style }) {
  return (
    <div style={{
      fontFamily: HS.serif, fontWeight: 400, fontSize: 36,
      lineHeight: 1.05, letterSpacing: -0.8, color: HS.chocolate, ...style,
    }}>
      {children}
    </div>
  );
}

// ─── H2 ──────────────────────────────────────────────────────────────────────
export function H2({ children, style }) {
  return (
    <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: -0.3, color: HS.chocolate, ...style }}>
      {children}
    </div>
  );
}

// ─── BackButton ──────────────────────────────────────────────────────────────
export function BackButton({ to }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => to ? navigate(to) : navigate(-1)}
      style={{
        background: HS.surface, border: `1px solid ${HS.border}`,
        width: 40, height: 40, borderRadius: 12,
        color: HS.chocolate, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Icon d={ICONS.back} size={18} />
    </button>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ size = 24, color = HS.sakura }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray="32" strokeDashoffset="10" strokeLinecap="round" />
    </svg>
  );
}

// ─── SideNav (desktop uniquement) ────────────────────────────────────────────
export function SideNav({ user, onLogout }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuper = user?.role === 'superadmin';

  const active = pathname.startsWith('/admin/users')       ? 'admin-users'
    : pathname.startsWith('/admin/testimonies')            ? 'admin-test'
    : pathname.startsWith('/admin/reports')                ? 'admin-rep'
    : pathname.startsWith('/admin/orgs')                   ? 'admin-orgs'
    : pathname.startsWith('/admin')                        ? 'admin'
    : pathname.startsWith('/community')                    ? 'comm'
    : pathname.startsWith('/tracking')                     ? 'map'
    : pathname.startsWith('/reports')                      ? 'reports'
    : 'home';

  const links = isAdmin
    ? [
        { id: 'admin',       label: 'Tableau de bord', path: '/admin',             icon: ICONS.gear },
        { id: 'admin-users', label: 'Utilisatrices',   path: '/admin/users',       icon: ICONS.user },
        { id: 'admin-test',  label: 'Témoignages',     path: '/admin/testimonies', icon: ICONS.heart },
        { id: 'admin-rep',   label: 'Signalements',    path: '/admin/reports',     icon: ICONS.flag },
        ...(isSuper ? [{ id: 'admin-orgs', label: 'Organisations', path: '/admin/orgs', icon: ICONS.pin }] : []),
      ]
    : [
        { id: 'home',    label: 'Accueil',   path: '/dashboard',  icon: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V11z' },
        { id: 'chat',    label: 'Lyra',      path: '/chat',       icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z' },
        { id: 'comm',    label: 'Sœurs',     path: '/community',  icon: ICONS.heart },
        { id: 'map',     label: 'Trajet',    path: '/tracking',   icon: ICONS.map },
        { id: 'reports', label: 'Signaler',  path: '/reports',    icon: ICONS.flag },
      ];

  return (
    <aside style={{
      width: 260, minHeight: '100vh', flexShrink: 0,
      background: HS.surface,
      borderRight: `1px solid ${HS.border}`,
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, alignSelf: 'flex-start', height: '100vh',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '28px 24px 20px' }}>
        <Logo size={22} />
      </div>

      {/* SOS — réservé aux utilisatrices */}
      {!isAdmin && (
        <div style={{ padding: '0 16px 8px' }}>
          <button
            onClick={() => navigate('/emergency')}
            style={{
              width: '100%', padding: '14px', borderRadius: 16,
              background: `linear-gradient(135deg, ${HS.sakura}, ${HS.sakuraDeep})`,
              border: 'none', color: '#fff', fontWeight: 800, fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: HS.font, cursor: 'pointer',
              boxShadow: `0 4px 16px rgba(214,126,128,0.4)`,
            }}>
            <Icon d={ICONS.alert} size={18} color="#fff" />
            SOS — Alerte
          </button>
        </div>
      )}

      {/* Liens de navigation */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {links.map((it) => {
          const on = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => navigate(it.path)}
              style={{
                width: '100%', textAlign: 'left', padding: '12px 24px',
                display: 'flex', alignItems: 'center', gap: 12,
                background: on ? HS.mistyRose : 'transparent',
                border: 'none', borderRadius: on ? '0 12px 12px 0' : 0,
                color: on ? HS.chocolate : HS.textDim, fontWeight: on ? 700 : 500,
                fontSize: 14, fontFamily: HS.font, cursor: 'pointer',
                marginRight: 16,
                transition: 'background .15s',
              }}>
              <Icon d={it.icon} size={20} color={on ? HS.sakuraDeep : HS.textMute} />
              {it.label}
              {on && (
                <div style={{ marginLeft: 'auto', width: 4, height: 4,
                  borderRadius: 2, background: HS.sakuraDeep }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Profil + déconnexion */}
      <div style={{ padding: '16px 24px', borderTop: `1px solid ${HS.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Avatar size={36} name={user?.full_name} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: HS.chocolate,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name || user?.email}
            </div>
            <div style={{ fontSize: 11, color: HS.textMute }}>{user?.organization_name}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{ width: '100%', padding: '8px', borderRadius: 10, border: 'none',
            background: HS.dangerSoft, color: HS.danger, fontSize: 12, fontWeight: 700,
            fontFamily: HS.font, cursor: 'pointer' }}>
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}

// ─── BottomNav (mobile uniquement) ───────────────────────────────────────────
export function BottomNav({ user } = {}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const active = pathname.startsWith('/admin/users')       ? 'admin-users'
    : pathname.startsWith('/admin/testimonies')            ? 'admin-test'
    : pathname.startsWith('/admin/reports')                ? 'admin-rep'
    : pathname.startsWith('/admin')                        ? 'admin'
    : pathname.startsWith('/community')                    ? 'comm'
    : pathname.startsWith('/tracking')                     ? 'map'
    : pathname.startsWith('/reports')                      ? 'reports'
    : 'home';

  const items = isAdmin
    ? [
        { id: 'admin',       label: 'Accueil',     path: '/admin',             icon: ICONS.gear },
        { id: 'admin-users', label: 'Users',       path: '/admin/users',       icon: ICONS.user },
        { id: 'admin-test',  label: 'Témoins',     path: '/admin/testimonies', icon: ICONS.heart },
        { id: 'admin-rep',   label: 'Signaux',     path: '/admin/reports',     icon: ICONS.flag },
      ]
    : [
        { id: 'home',    label: 'Accueil', path: '/dashboard',  icon: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V11z' },
        { id: 'sos',     label: 'SOS',     path: '/emergency',  big: true },
        { id: 'comm',    label: 'Sœurs',   path: '/community',  icon: 'M16 11c1.66 0 3-1.34 3-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
        { id: 'map',     label: 'Trajet',  path: '/tracking',   icon: ICONS.map },
        { id: 'reports', label: 'Signaler',path: '/reports',    icon: ICONS.flag },
      ];

  return (
    <div className="mobile-only" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(251,241,234,0.97)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      borderTop: `1px solid ${HS.border}`,
      padding: '8px 12px 28px',
      alignItems: 'flex-end', justifyContent: 'space-around',
      zIndex: 50,
    }}>
      {items.map((it) => {
        if (it.big) {
          return (
            <button
              key={it.id}
              onClick={() => navigate('/emergency')}
              style={{
                width: 60, height: 60, borderRadius: 30, marginBottom: 14,
                background: `linear-gradient(135deg, ${HS.sakura}, ${HS.sakuraDeep})`,
                border: `3px solid ${HS.bg}`,
                boxShadow: `0 0 0 2px ${HS.sakura}, 0 8px 20px rgba(214,126,128,0.5)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: 1,
              }}
            >SOS</button>
          );
        }
        const on = active === it.id;
        return (
          <button
            key={it.id}
            onClick={() => navigate(it.path)}
            style={{
              background: 'transparent', border: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '6px 8px', minWidth: 48, minHeight: 48,
              color: on ? HS.chocolate : HS.textMute,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path d={it.icon} fill="currentColor" />
            </svg>
            <span style={{ fontSize: 10, fontWeight: on ? 800 : 600 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── PageShell ───────────────────────────────────────────────────────────────
// Contenu d'une page. Flex colonne, min-height viewport.
// Pas de max-width ici — c'est AppLayout qui gère la largeur globale.
export function PageShell({ children, style }) {
  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden',
      background: HS.bg,
      color: HS.text,
      fontFamily: HS.font,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── ScrollArea ──────────────────────────────────────────────────────────────
export function ScrollArea({ children, style }) {
  return (
    <div style={{ flex: 1, WebkitOverflowScrolling: 'touch', ...style }}>
      {children}
    </div>
  );
}

// ─── ContentWrap ─────────────────────────────────────────────────────────────
// Limite la largeur du contenu sur desktop pour la lisibilité.
export function ContentWrap({ children, style, maxWidth = 800 }) {
  return (
    <div style={{ width: '100%', maxWidth, margin: '0 auto', padding: '0 24px', ...style }}>
      {children}
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────
export function Toast({ message, type = 'info', onClose }) {
  const colors = {
    info:    { bg: HS.chocolate, text: HS.textOnDark },
    success: { bg: HS.safe,      text: '#fff' },
    error:   { bg: HS.danger,    text: '#fff' },
    warn:    { bg: HS.warn,      text: '#fff' },
  };
  const c = colors[type] || colors.info;
  return (
    <div className="animate-slide" style={{
      /* fixed sur le viewport, centré dans la colonne */
      position: 'fixed',
      bottom: 100,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: 398,          /* 430 - 32px de marge */
      zIndex: 200,
      background: c.bg, color: c.text, borderRadius: 16,
      padding: '14px 18px', fontSize: 14, fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 8px 32px rgba(68,48,37,0.30)',
    }}>
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', opacity: 0.7 }}>
          <Icon d={ICONS.x} size={16} />
        </button>
      )}
    </div>
  );
}

// Ré-export des tokens pour usage direct dans les pages
export { HS, ICONS };
