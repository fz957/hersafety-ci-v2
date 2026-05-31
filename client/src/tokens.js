// HerSafety CI — design tokens
// Palette: Dark Chocolate · Aloewood · Milk Tea · Sakura · Misty Rose

// Theme clair (défaut)
const LIGHT = {
  // Backgrounds
  bg:           '#FBF1EA',
  bgSoft:       '#F5E1D5',
  surface:      '#FFFFFF',
  surface2:     '#F8E7DD',
  surfaceDeep:  '#443025',

  // Borders
  border:       'rgba(68,48,37,0.10)',
  borderStrong: 'rgba(236,156,157,0.45)',

  // Brand
  chocolate:    '#443025',
  aloewood:     '#7F5836',
  milkTea:      '#AA7F66',
  sakura:       '#EC9C9D',
  sakuraDeep:   '#D67E80',
  mistyRose:    '#F2D4CA',

  // Aliases
  primary:      '#443025',
  primaryDeep:  '#2A1A11',
  accent:       '#EC9C9D',
  accentSoft:   '#F8DDD9',
  accentLight:  '#F2D4CA',

  // Text
  text:         '#2A1A11',
  textDim:      'rgba(42,26,17,0.72)',
  textMute:     'rgba(42,26,17,0.5)',
  textFaint:    'rgba(42,26,17,0.3)',
  textOnDark:   '#FBF1EA',
  textOnDarkDim: 'rgba(251,241,234,0.78)',

  // Semantic
  danger:     '#B23A48',
  dangerSoft: '#F6D7DB',
  safe:       '#5C7F4F',
  safeSoft:   '#D6E2CF',
  warn:       '#C97B3B',
  warnSoft:   '#F4DCC4',

  // Fonts
  font:  '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif',
  serif: '"DM Serif Display", "Playfair Display", serif',
};

// Theme sombre — warm espresso (synchronisé avec ThemeContext)
const DARK = {
  // Backgrounds - deep warm espresso, pas pur noir
  bg:           '#1E1512',
  bgSoft:       '#261B16',
  surface:      '#2B201A',
  surface2:     '#352620',
  surfaceDeep:  '#0F0A07',

  // Borders - subtiles avec sakura
  border:       'rgba(240,169,170,0.14)',
  borderStrong: 'rgba(240,169,170,0.34)',

  // Brand - couleurs chaudes et élégantes
  chocolate:    '#F4E7DC',
  aloewood:     '#C49A7E',
  milkTea:      '#D4AE92',
  sakura:       '#F0A9AA',
  sakuraDeep:   '#EC9C9D',
  mistyRose:    '#3C2A28',

  // Aliases
  primary:      '#F4E7DC',
  primaryDeep:  '#0F0A07',
  accent:       '#F0A9AA',
  accentSoft:   '#3A2826',
  accentLight:  '#3C2A28',

  // Text - chaud et lisible
  text:         '#F4E7DC',
  textDim:      'rgba(244,231,220,0.90)',
  textMute:     'rgba(244,231,220,0.75)',
  textFaint:    'rgba(244,231,220,0.55)',
  textOnDark:   '#2A1E18',
  textOnDarkDim: 'rgba(42,30,24,0.78)',

  // Semantic - contraste optimal
  danger:       '#D85D6A',
  dangerSoft:   '#3A1F22',
  safe:         '#7AA06A',
  safeSoft:     '#26331F',
  warn:         '#D98E4E',
  warnSoft:     '#3A2A1C',

  // Fonts
  font:  '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif',
  serif: '"DM Serif Display", "Playfair Display", serif',
};

// Exporter une fonction qui retourne le thème actuel
export function getHS() {
  const isDark = localStorage.getItem('hersafety_theme') === 'dark';
  return isDark ? DARK : LIGHT;
}

// HS = Proxy dynamic qui lis le thème actif depuis localStorage
export const HS = new Proxy({}, {
  get: (target, prop) => {
    const isDark = localStorage.getItem('hersafety_theme') === 'dark';
    const theme = isDark ? DARK : LIGHT;
    return theme[prop];
  }
});

export const ICONS = {
  shield:  'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
  alert:   'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
  phone:   'M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.05-.24c1.16.39 2.41.6 3.7.6a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.29.21 2.54.6 3.7a1 1 0 0 1-.25 1.05l-2.2 2.2z',
  pin:     'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 0 1 9.5 9 2.5 2.5 0 0 1 12 6.5 2.5 2.5 0 0 1 14.5 9 2.5 2.5 0 0 1 12 11.5z',
  user:    'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  plus:    'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  heart:   'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  comment: 'M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z',
  send:    'M2 21l21-9L2 3v7l15 2-15 2v7z',
  search:  'M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0a4.5 4.5 0 1 1 .01-9.01A4.5 4.5 0 0 1 9.5 14z',
  check:   'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  x:       'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  arrow:   'M10 17l5-5-5-5v10z',
  back:    'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  mail:    'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
  lock:    'M18 8h-1V6a5 5 0 0 0-10 0v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6a3 3 0 1 1 6 0v2H9V6zm3 11a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
  eye:     'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  trash:   'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  edit:    'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  bell:    'M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 1 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
  gear:    'M19.14 12.94a7.81 7.81 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7 7 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7 7 0 0 0-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 9.87a.5.5 0 0 0 .12.61l2.03 1.58a8 8 0 0 0 0 1.88L2.83 15.5a.5.5 0 0 0-.12.61l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.38 1.04.7 1.62.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54a7 7 0 0 0 1.62-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.61l-2.03-1.58zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
  car:     'M18.92 6.01A1.5 1.5 0 0 0 17.5 5h-11a1.5 1.5 0 0 0-1.42 1.01L3 12v8a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h12v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-8l-2.08-5.99zM6.5 16a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm11 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM5 11l1.5-4.5h11L19 11H5z',
  star:    'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  share:   'M18 16.08a3 3 0 0 0-2.42 1.22l-7.05-4.12a3.01 3.01 0 0 0 0-2.36l7-4.08a3 3 0 1 0-.96-2.18 3 3 0 0 0 .04.5L7.55 9.06a3 3 0 1 0 0 5.88l7.12 4.16a3 3 0 1 0 3.33-2.92z',
  loc:     'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.94 3A9 9 0 0 0 13 3.06V1h-2v2.06A9 9 0 0 0 3.06 11H1v2h2.06A9 9 0 0 0 11 20.94V23h2v-2.06A9 9 0 0 0 20.94 13H23v-2h-2.06zM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14z',
  flag:    'M14.4 6 14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z',
  clock:   'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z',
  sparkle: 'M12 2 13.5 8.5 20 10 13.5 11.5 12 18 10.5 11.5 4 10 10.5 8.5z',
  play:    'M8 5v14l11-7L8 5z',
  stop:    'M6 6h12v12H6z',
  map:     'M20 4l-6 2-6-2-6 2v14l6-2 6 2 6-2 6 2V6l-6-2zM10 6l4-1.5v13L10 19V6zm-6 2.5L8 7v13l-4 1.5V8.5zm12 13V8.5L20 7v13l-4 1.5z',
  flower:  'M12 4a2 2 0 0 0-2 2 4 4 0 0 0-4 4 2 2 0 0 0-2 2 2 2 0 0 0 2 2 4 4 0 0 0 4 4 2 2 0 0 0 2 2 2 2 0 0 0 2-2 4 4 0 0 0 4-4 2 2 0 0 0 2-2 2 2 0 0 0-2-2 4 4 0 0 0-4-4 2 2 0 0 0-2-2zm0 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
  logout:  'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
};
