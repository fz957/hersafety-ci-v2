import { useEffect, useState } from 'react';

/**
 * Hook pour récupérer les POIs (Points of Interest) depuis Overpass API
 * Cherche: pharmacies, police, gendarmerie, hôpitaux, pompiers, restaurants
 */
export function useOverpassPOIs(lat, lng, radiusKm = 10) {
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!lat || !lng) return;

    const controller = new AbortController();
    let isMounted = true;

    setLoading(true);
    setError(null);

    // Overpass QL query pour chercher les POIs utiles en cas d'urgence
    const radiusDegrees = radiusKm / 111; // Approximation: 1 degree ≈ 111km
    const bbox = `${lat - radiusDegrees},${lng - radiusDegrees},${lat + radiusDegrees},${lng + radiusDegrees}`;

    const overpassQuery = `[bbox:${bbox}];
(
  node["amenity"="pharmacy"];
  node["amenity"="police"];
  node["amenity"="gendarmerie"];
  node["amenity"="hospital"];
  node["amenity"="clinic"];
  node["amenity"="fire_station"];
  node["amenity"="restaurant"];
  node["amenity"="cafe"];
  way["amenity"="pharmacy"];
  way["amenity"="police"];
  way["amenity"="hospital"];
  way["amenity"="fire_station"];
);
out center;`;

    console.log('[Overpass] Cherchant POIs autour de', lat.toFixed(4), lng.toFixed(4));

    const timeoutId = setTimeout(() => controller.abort(), 8000);

    fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
      signal: controller.signal
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(xml => {
        if (!isMounted) return;

        // Parse OSM XML response
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');

        if (doc.getElementsByTagName('parsererror').length > 0) {
          throw new Error('Erreur parsing OSM XML');
        }

        const elements = [];

        // Parse nodes
        doc.querySelectorAll('node').forEach(node => {
          const lat = parseFloat(node.getAttribute('lat'));
          const lng = parseFloat(node.getAttribute('lon'));
          const name = node.querySelector('tag[k="name"]')?.getAttribute('v') || 'POI sans nom';
          const amenity = node.querySelector('tag[k="amenity"]')?.getAttribute('v') || 'autre';

          if (lat && lng && name) {
            elements.push({
              id: `node-${node.getAttribute('id')}`,
              type: getTypeFromAmenity(amenity),
              name,
              lat,
              lng,
              amenity
            });
          }
        });

        // Parse ways (centers)
        doc.querySelectorAll('way').forEach(way => {
          const centerNode = way.querySelector('center');
          if (centerNode) {
            const lat = parseFloat(centerNode.getAttribute('lat'));
            const lng = parseFloat(centerNode.getAttribute('lon'));
            const name = way.querySelector('tag[k="name"]')?.getAttribute('v') || 'POI sans nom';
            const amenity = way.querySelector('tag[k="amenity"]')?.getAttribute('v') || 'autre';

            if (lat && lng && name) {
              elements.push({
                id: `way-${way.getAttribute('id')}`,
                type: getTypeFromAmenity(amenity),
                name,
                lat,
                lng,
                amenity
              });
            }
          }
        });

        console.log(`[Overpass] Trouvé ${elements.length} POIs`);
        if (isMounted) setPois(elements);
      })
      .catch(err => {
        if (isMounted && err.name !== 'AbortError') {
          console.error('[Overpass] Erreur:', err.message);
          setError(err.message);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [lat, lng, radiusKm]);

  return { pois, loading, error };
}

/**
 * Convertir amenity OSM en type HerSafety
 */
function getTypeFromAmenity(amenity) {
  const mapping = {
    pharmacy: 'pharmacie',
    police: 'police',
    gendarmerie: 'gendarmerie',
    hospital: 'hopital',
    clinic: 'hopital',
    fire_station: 'pompiers',
    restaurant: 'restaurant',
    cafe: 'restaurant'
  };
  return mapping[amenity] || 'autre';
}
