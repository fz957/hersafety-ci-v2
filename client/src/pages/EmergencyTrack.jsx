import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { HS } from '../tokens';

// Default icon for markers
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function EmergencyTrack() {
  const { emergencyId } = useParams();
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  const [position, setPosition] = useState(null);
  const [emergency, setEmergency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Fetch emergency data with public access
  useEffect(() => {
    const fetchEmergency = async () => {
      try {
        setLoading(true);
        // Try with token if provided
        const token = searchParams.get('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const response = await fetch(
          `${apiUrl}/api/emergency-history/${emergencyId}/public${token ? `?token=${token}` : ''}`,
          { credentials: 'omit' }
        );

        if (!response.ok) {
          setError('Accès refusé ou urgence introuvable');
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (data.success) {
          setEmergency(data.data);
          if (data.data.latitude && data.data.longitude) {
            setPosition({ lat: data.data.latitude, lng: data.data.longitude });
          }
          setLastUpdate(new Date());
        }
      } catch (err) {
        console.error('[EmergencyTrack] Fetch error:', err);
        setError('Erreur de connexion');
      } finally {
        setLoading(false);
      }
    };

    fetchEmergency();
  }, [emergencyId, searchParams]);

  // Poll for position updates every 2 seconds
  useEffect(() => {
    if (!emergencyId) return;

    const token = searchParams.get('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${apiUrl}/api/emergency-history/${emergencyId}/public${token ? `?token=${token}` : ''}`,
          { credentials: 'omit' }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.latitude && data.data.longitude) {
            setPosition({ lat: data.data.latitude, lng: data.data.longitude });
            setLastUpdate(new Date());
          }
        }
      } catch (err) {
        console.error('[EmergencyTrack] Poll error:', err);
      }
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [emergencyId, searchParams]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: HS.dark,
        color: HS.white,
        fontSize: 16
      }}>
        ⏳ Chargement de la position...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: HS.dark,
        color: HS.sakura,
        fontSize: 16,
        flexDirection: 'column',
        gap: 20
      }}>
        <div>⚠️ {error}</div>
        <div style={{ fontSize: 12, color: HS.white }}>
          Si le lien a expiré, contactez l'utilisatrice directement
        </div>
      </div>
    );
  }

  const displayPosition = position || { lat: 5.2757, lng: -3.9761 };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: HS.dark,
      color: HS.white
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        backgroundColor: HS.sakura,
        textAlign: 'center',
        fontWeight: 700,
        fontSize: 14
      }}>
        🚨 SUIVI EN DIRECT — HerSafety
      </div>

      {/* Info bar + Call button */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#1a1a1a',
        borderBottom: `1px solid ${HS.border}`,
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12
      }}>
        <div style={{ flex: 1 }}>
          <div>
            {emergency?.user?.full_name ? (
              <span><strong>{emergency.user.full_name}</strong> — Niveau {emergency.level}</span>
            ) : (
              <span>Suivi de position — Niveau {emergency?.level || '?'}</span>
            )}
          </div>
          {lastUpdate && (
            <div style={{ color: HS.gray, marginTop: 4 }}>
              Mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
            </div>
          )}
        </div>

        {/* Call button */}
        {emergency?.user?.phone && (
          <a
            href={`tel:${emergency.user.phone}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#1B5E20',
              color: 'white',
              padding: '10px 16px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 12,
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            ☎️ Appeler
          </a>
        )}
      </div>

      {/* Map */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MapContainer
          center={displayPosition}
          zoom={14}
          style={{ width: '100%', height: '100%' }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Current position marker (red dot) */}
          {position && (
            <CircleMarker
              center={{ lat: position.lat, lng: position.lng }}
              radius={10}
              fillColor={HS.sakura}
              fillOpacity={0.9}
              stroke
              weight={2}
              color={HS.sakuraDeep}
            >
              <Popup>
                <div style={{ fontSize: 12 }}>
                  <strong>📍 Position actuelle</strong>
                  <div>{position.lat.toFixed(4)}°, {position.lng.toFixed(4)}°</div>
                </div>
              </Popup>
            </CircleMarker>
          )}
        </MapContainer>
      </div>

      {/* Footer info */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#1a1a1a',
        borderTop: `1px solid ${HS.border}`,
        fontSize: 12,
        color: HS.gray,
        textAlign: 'center'
      }}>
        <div>💚 Un contact de confiance suit ta position</div>
        <div style={{ marginTop: 4 }}>N'hésite pas à appeler les urgences: 110, 111, 180</div>
      </div>
    </div>
  );
}
