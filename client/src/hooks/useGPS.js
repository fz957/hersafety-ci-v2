import { useState, useEffect } from 'react';

export function useGPS({ watch = false } = {}) {
  const [position, setPosition] = useState(null);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(true);

  // Check if coordinates are in Côte d'Ivoire zone (roughly 4.0-5.5°N, -8.5--2.5°W)
  const isValidCoordinates = (lat, lng) => {
    return lat >= 4.0 && lat <= 5.5 && lng >= -8.5 && lng <= -2.5;
  };

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

      // Accept any valid coordinates in Côte d'Ivoire, don't force a specific fallback
      if (!isValidCoordinates(lat, lng)) {
        console.warn(`[GPS] Coordonnées hors Côte d'Ivoire (${lat.toFixed(4)}°, ${lng.toFixed(4)}°). GPS non fiable.`);
        setError('Position en dehors de Côte d\'Ivoire');
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
