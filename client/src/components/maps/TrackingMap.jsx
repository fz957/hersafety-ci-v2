import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Green flag for starting point
const startIcon = L.divIcon({
  html: `<div style="background-color: #1B5E20; width: 30px; height: 40px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">🚩</div>`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -40],
  className: 'custom-icon'
});

// Component to update map view when userPosition changes
function MapUpdater({ userPosition }) {
  const map = useMap();
  useEffect(() => {
    if (userPosition) {
      map.setView([userPosition.lat, userPosition.lng], 15);
    }
  }, [userPosition, map]);
  return null;
}

export function TrackingMap({ userPosition, track, checkins }) {
  // Position par défaut (Abidjan) si GPS non disponible
  const defaultPos = { lat: 6.8276, lng: -5.2893 };
  const pos = userPosition || defaultPos;

  const center = [pos.lat, pos.lng];

  // Construire la route à partir des waypoints du track
  const waypoints = track?.waypoints && Array.isArray(track.waypoints) ? track.waypoints : [];
  const trackPath = waypoints.length > 0
    ? waypoints.map(wp => [wp.lat, wp.lng])
    : [];

  return (
    <div style={{ height: '280px', borderRadius: 16, marginBottom: 16, overflow: 'hidden', position: 'relative' }}>
      <MapContainer center={center} zoom={userPosition ? 15 : 13} style={{ height: '100%', width: '100%' }} attributionControl={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Update map view when position changes */}
        <MapUpdater userPosition={userPosition} />

        {/* Position actuelle ou par défaut */}
        <Marker position={center} icon={defaultIcon}>
          <Popup>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>
              Ta position
            </div>
          </Popup>
        </Marker>

        {/* Ligne du trajet (tous les waypoints) */}
        {trackPath.length > 1 && (
          <Polyline
            positions={trackPath}
            color="#C2185B"
            weight={4}
            opacity={0.8}
          />
        )}

        {/* Point de départ du trajet - GREEN FLAG */}
        {waypoints.length > 0 && (
          <Marker
            position={[waypoints[0].lat, waypoints[0].lng]}
            icon={startIcon}
          >
            <Popup>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>
                Point de départ
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
