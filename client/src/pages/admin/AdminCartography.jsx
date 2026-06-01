import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import AdminSidebar from '../../components/admin/AdminSidebar.jsx';
import { ICONS } from '../../tokens';
import { Icon } from '../../components/ui/index.jsx';
import api from '../../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function AdminCartography() {
  const { theme } = useTheme();
  const [map, setMap] = useState(null);
  const [safePlaces, setSafePlaces] = useState([]);
  const [dangerZones, setDangerZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reverse geocoding avec Photon pour obtenir les vrais noms des lieux
  const getPlaceName = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&limit=1`
      );
      const data = await response.json();
      if (data.features && data.features[0]) {
        return data.features[0].properties.name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  // Charger les données et enrichir avec les noms de lieux
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Lieux sûrs
        const placesRes = await api.get('/api/places');
        const places = placesRes.data.data || [];

        // Enrichir avec les noms Photon
        const enrichedPlaces = await Promise.all(
          places.map(async (place) => {
            if (place.latitude && place.longitude && !place.name) {
              const photonName = await getPlaceName(place.latitude, place.longitude);
              return { ...place, name: photonName };
            }
            return place;
          })
        );
        setSafePlaces(enrichedPlaces);

        // Zones dangereuses (signalements vérifiés)
        const reportsRes = await api.get('/api/admin/reports?status=verified');
        const reports = reportsRes.data.data || [];

        // Garder le nom stocké EN PRIORITÉ (place_name est le vrai nom enregistré)
        // Ne faire du reverse geocoding QUE si le nom manque
        const enrichedReports = await Promise.all(
          reports.map(async (report) => {
            // Si place_name est vide ET on a des coordonnées, faire du reverse geocoding
            if (!report.place_name && report.place_lat && report.place_lng) {
              const photonName = await getPlaceName(report.place_lat, report.place_lng);
              return { ...report, place_name: photonName };
            }
            // Sinon garder le place_name existant (c'est le nom correct enregistré par l'utilisateur)
            return report;
          })
        );
        setDangerZones(enrichedReports);
      } catch (err) {
        console.error('Error fetching map data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Initialiser la carte
  useEffect(() => {
    if (loading || !document.getElementById('map')) return;

    const m = L.map('map').setView([6.8276, -5.2893], 10); // Abidjan center

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(m);

    // Marqueurs lieux sûrs (vert)
    safePlaces.forEach(place => {
      if (place.latitude && place.longitude) {
        L.circleMarker([place.latitude, place.longitude], {
          radius: 8,
          fillColor: '#5C7F4F',
          color: '#1B5E20',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.7,
        })
          .bindPopup(`<strong>✓ Lieu sûr</strong><br>${place.name || 'Sans nom'}`)
          .addTo(m);
      }
    });

    // Marqueurs zones dangereuses (rouge)
    dangerZones.forEach(zone => {
      if (zone.place_lat && zone.place_lng) {
        L.circleMarker([zone.place_lat, zone.place_lng], {
          radius: 10,
          fillColor: '#B23A48',
          color: '#8B0000',
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.6,
        })
          .bindPopup(`<strong>⚠ Danger</strong><br>${zone.place_name || 'Sans nom'}<br>${zone.danger_type || ''}`)
          .addTo(m);
      }
    });

    setMap(m);

    return () => m.remove();
  }, [safePlaces, dangerZones, loading]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: theme.bg }}>
      <AdminSidebar activeTab="cartography" />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 32px', borderBottom: `1px solid ${theme.border}` }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: theme.chocolate, margin: 0 }}>
            Cartographie
          </h1>
          <p style={{ fontSize: 12, color: theme.textMute, margin: '8px 0 0 0' }}>
            {loading ? 'Chargement...' : `${safePlaces.length} lieux sûrs · ${dangerZones.length} zones dangereuses`}
          </p>
        </div>

        {/* Carte */}
        <div id="map" style={{ flex: 1, background: '#f0f0f0' }} />
      </main>
    </div>
  );
}
