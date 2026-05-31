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

    const opts = { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 };

    const onSuccess = (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;

      // If coordinates are in Côte d'Ivoire, use them
      if (isValidCoordinates(lat, lng)) {
        setPosition({ lat, lng, accuracy });
      } else {
        // Otherwise use Plateau Abidjan as fallback (demo location)
        console.warn(`[GPS] Coordonnées invalides (${lat.toFixed(4)}°, ${lng.toFixed(4)}°). Utilisation fallback Plateau.`);
        setPosition({ lat: 5.3405, lng: -4.0397, accuracy: accuracy || 100 });
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
        // Timeout - utiliser Abidjan comme fallback au lieu de bloquer
        console.warn('[GPS] Timeout GPS - utilisation fallback Abidjan');
        setPosition({ lat: 5.3405, lng: -4.0397, accuracy: 1000 });
        setError(null);
        setLoading(false);
        return;
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
