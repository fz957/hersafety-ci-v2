import { useTheme } from '../context/ThemeContext';

/**
 * Hook helper qui retourne le thème actuel (light ou dark)
 * Utilise useTheme en coulisse
 */
export function useCurrentTheme() {
  const { theme } = useTheme();
  return theme;
}
