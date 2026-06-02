import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export function useEmergency() {
  const [loading, setLoading]         = useState(false);
  const [activeAlert, setActiveAlert] = useState(null);
  const navigate                      = useNavigate();

  const triggerAlert = useCallback(async (level, extras = {}) => {
    setLoading(true);
    try {
      // Pour niveaux 3 et 4, naviguer IMMÉDIATEMENT sans attendre l'API
      if (['3', '4'].includes(String(level))) {
        navigate('/emergency', { state: { level: String(level) } });
      }

      // Créer l'alerte en background (timeout 5s max)
      const alertPromise = api.post('/api/alerts', { level: String(level), ...extras });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API timeout')), 5000)
      );

      try {
        const res = await Promise.race([alertPromise, timeoutPromise]);
        const alert = res.data.data.alert;
        setActiveAlert(alert);
        return alert;
      } catch (err) {
        console.warn('[useEmergency] Alert creation background error:', err.message);
        // Ne pas bloquer - on a déjà navigué vers Emergency
        return null;
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const resolveAlert = useCallback(() => setActiveAlert(null), []);

  return { loading, activeAlert, triggerAlert, resolveAlert };
}
