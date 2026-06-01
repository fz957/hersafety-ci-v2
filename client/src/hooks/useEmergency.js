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
      const res = await api.post('/api/alerts', { level: String(level), ...extras });
      const alert = res.data.data.alert;
      setActiveAlert(alert);
      if (['3', '4'].includes(String(level))) {
        navigate('/emergency', { state: { alert, level: String(level) } });
      }
      return alert;
    } catch (err) {
      console.error('[useEmergency] Alert creation error:', err.message);
      alert(`❌ Erreur alerte: ${err.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const resolveAlert = useCallback(() => setActiveAlert(null), []);

  return { loading, activeAlert, triggerAlert, resolveAlert };
}
