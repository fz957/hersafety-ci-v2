import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const LIGHT_THEME = {
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

  // Font
  font:  '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif',
  serif: '"DM Serif Display", "Playfair Display", serif',
};

export const DARK_THEME = {
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

  // Font
  font:  '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif',
  serif: '"DM Serif Display", "Playfair Display", serif',
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // Récupérer depuis localStorage, ou utiliser le mode clair par défaut
    const saved = localStorage.getItem('hersafety_theme');
    return saved ? saved === 'dark' : false;
  });

  useEffect(() => {
    localStorage.setItem('hersafety_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
