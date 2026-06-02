import { useState, useEffect } from 'react';

export function useGPS({ watch = false } = {}) {
  const [position, setPosition] = useState(null);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(true);

  // FALLBACK: Bietry (Abidjan) - where real restaurants like "Le Sayour" are located
  const FALLBACK_POSITION = { lat: 5.2757, lng: -3.9761, accuracy: 1000, isFallback: true };

  // Check if coordinates are in Côte d'Ivoire zone (roughly 4.0-5.5°N, -8.5--2.5°W)
  const isValidCoordinates = (lat, lng) => {
    return lat >= 4.0 && lat <= 5.5 && lng >= -8.5 && lng <= -2.5;
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('[GPS] GPS non disponible - utilisation fallback Bietry');
      setPosition(FALLBACK_POSITION);
      setError('GPS non disponible');
      setLoading(false);
      return;
    }

    // Faster timeout - don't wait too long
    const opts = { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 };

    const onSuccess = (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;

      // If coordinates are in Côte d'Ivoire, use them
      if (isValidCoordinates(lat, lng)) {
        console.log(`[GPS] Position valide: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`);
        setPosition({ lat, lng, accuracy, isFallback: false });
      } else {
        // Otherwise use Bietry (Abidjan) as fallback
        console.warn(`[GPS] Coordonnées invalides (${lat.toFixed(4)}°, ${lng.toFixed(4)}°). Utilisation fallback Bietry.`);
        setPosition(FALLBACK_POSITION);
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
        message = 'Timeout GPS - utilisation de votre dernière position connue';
      }

      console.warn(`[GPS] Erreur: ${message} (code ${err.code})`);
      // Always use Bietry fallback if GPS fails
      setPosition(FALLBACK_POSITION);
      setError(null); // Don't show error to user - just use fallback
      setLoading(false);
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
