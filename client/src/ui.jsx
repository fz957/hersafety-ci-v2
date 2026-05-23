// HerSafety CI — design tokens & shared components
// Palette: Dark Chocolate · Aloewood · Milk Tea · Sakura · Misty Rose
// Light, warm, girly. No black backgrounds.

const HS = {
  // Backgrounds
  bg: '#FBF1EA',         // warm cream (misty rose / off-white)
  bgSoft: '#F5E1D5',     // softer cream
  surface: '#FFFFFF',    // white card
  surface2: '#F8E7DD',   // pink-tinted card
  surfaceDeep: '#443025',// dark chocolate for inverted cards

  // Borders
  border: 'rgba(68,48,37,0.10)',
  borderStrong: 'rgba(236,156,157,0.45)',

  // Brand
  chocolate: '#443025',  // dark chocolate — primary text & strong CTA
  aloewood: '#7F5836',   // brown
  milkTea: '#AA7F66',    // tan
  sakura: '#EC9C9D',     // pink ←★ accent
  sakuraDeep: '#D67E80', // deeper pink
  mistyRose: '#F2D4CA',  // very pale pink

  // Aliases used across screens
  primary: '#443025',
  primaryDeep: '#2A1A11',
  accent: '#EC9C9D',
  accentSoft: '#F8DDD9',
  accentLight: '#F2D4CA',

  // Text on cream
  text: '#2A1A11',
  textDim: 'rgba(42,26,17,0.72)',
  textMute: 'rgba(42,26,17,0.5)',
  textFaint: 'rgba(42,26,17,0.3)',

  // Text on chocolate (inverted)
  textOnDark: '#FBF1EA',
  textOnDarkDim: 'rgba(251,241,234,0.78)',

  // Semantic
  danger: '#B23A48',      // warm rosy red
  dangerSoft: '#F6D7DB',
  safe: '#5C7F4F',        // sage green
  safeSoft: '#D6E2CF',
  warn: '#C97B3B',        // warm amber
  warnSoft: '#F4DCC4',

  font: '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif',
  serif: '"DM Serif Display", "Playfair Display", serif',
};
window.HS = HS;

// ─── Logo ────────────────────────────────────────────────────
function Logo({ size = 22, withText = true, color, accent = HS.sakura }) {
  const c = color || HS.chocolate;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size * 1.15} viewBox="0 0 22 26" fill="none">
        <path d="M11 1 L21 4 V13 C21 19 16.5 23.5 11 25 C5.5 23.5 1 19 1 13 V4 Z"
              fill={accent} stroke={accent} strokeWidth="1.6" strokeLinejoin="round" opacity="0.95"/>
        <path d="M11 9 C9.6 7.2 6 7.8 6 11 C6 13.6 9 15.6 11 17 C13 15.6 16 13.6 16 11 C16 7.8 12.4 7.2 11 9 Z"
              fill={c}/>
      </svg>
      {withText && (
        <span style={{
          fontFamily: HS.font, fontWeight: 700, fontSize: size * 0.78,
          color: c, letterSpacing: -0.3,
        }}>
          HerSafety<span style={{ color: HS.sakuraDeep, fontWeight: 800 }}>·CI</span>
        </span>
      )}
    </div>
  );
}

// ─── PhoneFrame ──────────────────────────────────────────────
function PhoneFrame({ children, width = 390, height = 844, hideHome = false, frameColor = '#EADBCF' }) {
  return (
    <div style={{
      width, height, borderRadius: 48, overflow: 'hidden',
      background: HS.bg, position: 'relative',
      border: `8px solid ${frameColor}`,
      boxShadow: '0 30px 60px rgba(68,48,37,0.22), inset 0 0 0 1px rgba(68,48,37,0.05)',
      fontFamily: HS.font, color: HS.text,
      boxSizing: 'border-box',
    }}>
      {/* status bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', fontSize: 14, fontWeight: 700, zIndex: 50,
        color: HS.chocolate, pointerEvents: 'none',
      }}>
        <span>9:41</span>
        <div style={{
          position: 'absolute', left: '50%', top: 10, transform: 'translateX(-50%)',
          width: 110, height: 30, background: HS.chocolate, borderRadius: 20,
        }}/>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
            <path d="M1 7h2v3H1zM5 5h2v5H5zM9 3h2v7H9zM13 1h2v9h-2z" fill="currentColor"/>
          </svg>
          <svg width="22" height="11" viewBox="0 0 22 11" fill="none">
            <rect x="1" y="1" width="18" height="9" rx="2.5" stroke="currentColor" opacity="0.5"/>
            <rect x="3" y="3" width="14" height="5" rx="1" fill="currentColor"/>
            <rect x="20" y="4" width="1.5" height="3" rx="0.5" fill="currentColor" opacity="0.5"/>
          </svg>
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {children}
      </div>
      {!hideHome && (
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          width: 134, height: 5, borderRadius: 3, background: HS.chocolate, opacity: 0.65, zIndex: 50,
        }}/>
      )}
    </div>
  );
}

// ─── TestBanner ──────────────────────────────────────────────
function TestBanner() {
  return (
    <div style={{
      background: HS.warn, color: '#fff', padding: '6px 16px',
      fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textAlign: 'center',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingTop: 50,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: HS.mistyRose }}/>
      MODE TEST · DONNÉES SIMULÉES
      <span style={{ width: 6, height: 6, borderRadius: 3, background: HS.mistyRose }}/>
    </div>
  );
}

// ─── Button ──────────────────────────────────────────────────
function Button({ children, variant = 'primary', icon, sub, onClick, style }) {
  const variants = {
    primary: { bg: HS.chocolate, color: HS.textOnDark, border: 'none' },
    accent:  { bg: HS.sakura,    color: HS.chocolate,  border: 'none' },
    soft:    { bg: HS.mistyRose, color: HS.chocolate,  border: 'none' },
    ghost:   { bg: 'transparent', color: HS.chocolate, border: `1.5px solid ${HS.chocolate}` },
    light:   { bg: HS.surface, color: HS.chocolate, border: `1px solid ${HS.border}` },
    danger:  { bg: HS.danger, color: '#fff', border: 'none' },
    safe:    { bg: HS.safe, color: '#fff', border: 'none' },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button onClick={onClick} style={{
      width: '100%', minHeight: 56, borderRadius: 18,
      background: v.bg, color: v.color, border: v.border,
      fontFamily: HS.font, fontWeight: 700, fontSize: 15,
      display: 'flex', alignItems: 'center', justifyContent: sub ? 'flex-start' : 'center',
      gap: 12, padding: sub ? '12px 18px' : '0 18px', cursor: 'pointer',
      textAlign: 'left', ...style,
    }}>
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

// ─── Card ────────────────────────────────────────────────────
function Card({ children, style, padded = true, dark = false }) {
  return (
    <div style={{
      background: dark ? HS.chocolate : HS.surface,
      color: dark ? HS.textOnDark : HS.text,
      borderRadius: 22,
      border: dark ? 'none' : `1px solid ${HS.border}`,
      boxShadow: dark ? 'none' : '0 1px 0 rgba(68,48,37,0.04), 0 8px 24px rgba(68,48,37,0.05)',
      padding: padded ? 16 : 0, ...style,
    }}>{children}</div>
  );
}

// ─── Input ───────────────────────────────────────────────────
function Input({ label, placeholder, value, type = 'text', icon, hint, focused = false, multiline = false }) {
  const ring = focused ? HS.chocolate : HS.border;
  return (
    <label style={{ display: 'block' }}>
      {label && (
        <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 8, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          {label}
        </div>
      )}
      <div style={{
        background: HS.surface, borderRadius: 16,
        border: `1.5px solid ${ring}`,
        boxShadow: focused ? `0 0 0 4px ${HS.mistyRose}` : 'none',
        display: 'flex', alignItems: multiline ? 'flex-start' : 'center', gap: 10,
        padding: multiline ? '14px 14px' : '0 14px', minHeight: multiline ? 'auto' : 52,
        transition: 'box-shadow .15s',
      }}>
        {icon && <span style={{ color: HS.textMute, display: 'flex' }}>{icon}</span>}
        <div style={{
          flex: 1, fontSize: 15,
          color: value ? HS.text : HS.textFaint,
          minHeight: multiline ? 80 : 'auto', fontWeight: value ? 500 : 400,
        }}>
          {value || placeholder}
        </div>
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: HS.textMute, marginTop: 6 }}>{hint}</div>
      )}
    </label>
  );
}

// ─── Bottom nav ──────────────────────────────────────────────
function BottomNav({ active = 'home' }) {
  const items = [
    { id: 'home',  label: 'Accueil',   icon: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V11z' },
    { id: 'sos',   label: 'SOS',       icon: null, big: true },
    { id: 'comm',  label: 'Sœurs',     icon: 'M16 11c1.66 0 3-1.34 3-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
    { id: 'map',   label: 'Carte',     icon: 'M20 4l-6 2-6-2-6 2v14l6-2 6 2 6-2 6 2V6l-6-2zM10 6l4-1.5v13L10 19V6zm-6 2.5L8 7v13l-4 1.5V8.5zm12 13V8.5L20 7v13l-4 1.5z' },
    { id: 'menu',  label: 'Profil',    icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'rgba(251,241,234,0.92)', backdropFilter: 'blur(14px)',
      borderTop: `1px solid ${HS.border}`,
      padding: '8px 12px 28px', display: 'flex', alignItems: 'flex-end',
      justifyContent: 'space-around', zIndex: 30,
    }}>
      {items.map(it => {
        if (it.big) {
          return (
            <button key={it.id} style={{
              width: 60, height: 60, borderRadius: 30, marginBottom: 14,
              background: `linear-gradient(135deg, ${HS.sakura}, ${HS.sakuraDeep})`,
              border: `3px solid ${HS.bg}`, boxShadow: `0 0 0 2px ${HS.sakura}, 0 8px 20px rgba(214,126,128,0.5)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: 1,
            }}>SOS</button>
          );
        }
        const on = active === it.id;
        return (
          <button key={it.id} style={{
            background: 'transparent', border: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '6px 8px', minWidth: 48, minHeight: 48,
            color: on ? HS.chocolate : HS.textMute, cursor: 'pointer',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path d={it.icon} fill="currentColor"/>
            </svg>
            <span style={{ fontSize: 10, fontWeight: on ? 800 : 600 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Icon helper ─────────────────────────────────────────────
function Icon({ d, size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={d} fill={color}/>
    </svg>
  );
}
const ICONS = {
  shield: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
  alert: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
  phone: 'M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.05-.24c1.16.39 2.41.6 3.7.6a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.29.21 2.54.6 3.7a1 1 0 0 1-.25 1.05l-2.2 2.2z',
  pin: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 0 1 9.5 9 2.5 2.5 0 0 1 12 6.5 2.5 2.5 0 0 1 14.5 9 2.5 2.5 0 0 1 12 11.5z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  comment: 'M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z',
  send: 'M2 21l21-9L2 3v7l15 2-15 2v7z',
  search: 'M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0a4.5 4.5 0 1 1 .01-9.01A4.5 4.5 0 0 1 9.5 14z',
  check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  x:     'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  arrow: 'M10 17l5-5-5-5v10z',
  back:  'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  mail:  'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
  lock:  'M18 8h-1V6a5 5 0 0 0-10 0v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6a3 3 0 1 1 6 0v2H9V6zm3 11a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
  eye:   'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  trash: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  edit:  'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  bell:  'M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 1 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
  gear:  'M19.14 12.94a7.81 7.81 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7 7 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7 7 0 0 0-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 9.87a.5.5 0 0 0 .12.61l2.03 1.58a8 8 0 0 0 0 1.88L2.83 15.5a.5.5 0 0 0-.12.61l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.38 1.04.7 1.62.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54a7 7 0 0 0 1.62-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.61l-2.03-1.58zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
  car:   'M18.92 6.01A1.5 1.5 0 0 0 17.5 5h-11a1.5 1.5 0 0 0-1.42 1.01L3 12v8a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h12v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-8l-2.08-5.99zM6.5 16a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm11 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM5 11l1.5-4.5h11L19 11H5z',
  play:  'M8 5v14l11-7L8 5z',
  stop:  'M6 6h12v12H6z',
  star:  'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  share: 'M18 16.08a3 3 0 0 0-2.42 1.22l-7.05-4.12a3.01 3.01 0 0 0 0-2.36l7-4.08a3 3 0 1 0-.96-2.18 3 3 0 0 0 .04.5L7.55 9.06a3 3 0 1 0 0 5.88l7.12 4.16a3 3 0 1 0 3.33-2.92z',
  loc:   'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.94 3A9 9 0 0 0 13 3.06V1h-2v2.06A9 9 0 0 0 3.06 11H1v2h2.06A9 9 0 0 0 11 20.94V23h2v-2.06A9 9 0 0 0 20.94 13H23v-2h-2.06zM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14z',
  flag:  'M14.4 6 14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z',
  ai:    'M12 2 9 9l-7 1 5 5-1 7 6-3 6 3-1-7 5-5-7-1z',
  sparkle: 'M12 2 13.5 8.5 20 10 13.5 11.5 12 18 10.5 11.5 4 10 10.5 8.5z',
  flower: 'M12 4a2 2 0 0 0-2 2 4 4 0 0 0-4 4 2 2 0 0 0-2 2 2 2 0 0 0 2 2 4 4 0 0 0 4 4 2 2 0 0 0 2 2 2 2 0 0 0 2-2 4 4 0 0 0 4-4 2 2 0 0 0 2-2 2 2 0 0 0-2-2 4 4 0 0 0-4-4 2 2 0 0 0-2-2zm0 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
};
window.ICONS = ICONS;

Object.assign(window, { HS, Logo, PhoneFrame, TestBanner, Button, Card, Input, BottomNav, Icon });
