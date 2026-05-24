import { useState, useEffect } from 'react';

export function useGPS({ watch = false } = {}) {
  const [position, setPosition] = useState(null);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('GPS non disponible sur cet appareil');
      setLoading(false);
      return;
    }

    const opts = { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 };

    const onSuccess = (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // Fallback: Si GPS retourne des coordonnées hors d'Abidjan (zone attendue: 6.5-7.0°N, -5.5--5.0°W)
      // utiliser Bietry pour les tests
      const isInAbidjanZone = lat >= 6.5 && lat <= 7.0 && lng >= -5.5 && lng <= -5.0;

      if (!isInAbidjanZone) {
        console.warn(`[GPS] Coordonnées hors zone (${lat.toFixed(2)}°, ${lng.toFixed(2)}°). Utilisation Bietry par défaut.`);
        // Bietry fallback position
        setPosition({ lat: 6.8450, lng: -5.3100, accuracy: 50, source: 'fallback-bietry' });
      } else {
        setPosition({ lat, lng, accuracy: pos.coords.accuracy });
      }
      setLoading(false);
    };
    const onError = (err) => {
      let message = err.message;
      if (err.code === 1) {
        message = 'Permission GPS refusée - veuillez autoriser la localisation';
      } else if (err.code === 2) {
        message = 'Position non disponible - vérifiez votre GPS';
      } else if (err.code === 3) {
        message = 'Délai dépassé - le GPS prend du temps';
      }
      setError(message);
      setLoading(false);
      console.error('GPS Error:', message, err);
    };

    if (watch) {
      const id = navigator.geolocation.watchPosition(onSuccess, onError, opts);
      return () => navigator.geolocation.clearWatch(id);
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, opts);
    }
  }, [watch]);

  return { position, error, loading };
}
