import { useEffect, useState } from 'react';
import api from '../services/api';

/**
 * Hook pour récupérer les POIs (Points of Interest) depuis le backend
 * Le backend utilise Foursquare ou fallback à des lieux sûrs statiques
 * RAISON: Overpass API doesn't allow CORS from browser, so we proxy through backend
 * Cherche: pharmacies, police, gendarmerie, hôpitaux, pompiers, restaurants
 */
export function useOverpassPOIs(lat, lng, radiusKm = 10) {
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!lat || !lng) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    console.log('[Places API] Récupérant POIs autour de', lat.toFixed(4), lng.toFixed(4));

    // Call backend /api/places instead of Overpass (no CORS issues)
    api.get('/api/places', {
      params: {
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
        radius: Math.round(radiusKm * 1000) // Convert km to meters
      }
    })
      .then(response => {
        if (!isMounted) return;

        const places = response.data.data || [];
        console.log(`[Places API] Trouvé ${places.length} lieux sûrs`);

        // Transform to match expected format
        const pois = places.map(place => ({
          id: place.id,
          type: place.type,
          name: place.name,
          lat: place.lat,
          lng: place.lng,
          address: place.address || place.description,
          phone: place.phone
        }));

        setPois(pois);
      })
      .catch(err => {
        if (isMounted) {
          console.error('[Places API] Erreur:', err.message);
          setError(err.message);
          // Still set empty array so map doesn't break
          setPois([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [lat, lng, radiusKm]);

  return { pois, loading, error };
}
