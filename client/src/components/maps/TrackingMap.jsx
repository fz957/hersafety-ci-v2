import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
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

export function TrackingMap({ userPosition, track, checkins }) {
  // Position par défaut (Abidjan) si GPS non disponible
  const defaultPos = { lat: 6.8276, lng: -5.2893 };
  const pos = userPosition || defaultPos;

  const center = [pos.lat, pos.lng];

  // Vérifie que le track a des coordonnées valides
  const trackHasLocation = track && (track.location_lat || track.place_lat) && (track.location_lng || track.place_lng);
  const trackLat = track?.location_lat || track?.place_lat;
  const trackLng = track?.location_lng || track?.place_lng;

  const trackPath = (trackHasLocation && trackLat && trackLng) ? [
    [trackLat, trackLng],
    [pos.lat, pos.lng],
  ] : [];

  return (
    <div style={{ height: '280px', borderRadius: 16, marginBottom: 16, overflow: 'hidden', position: 'relative' }}>
      <MapContainer center={center} zoom={userPosition ? 15 : 13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* Position actuelle ou par défaut */}
        <Marker position={center} icon={defaultIcon}>
          <Popup>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>
              Ta position
            </div>
          </Popup>
        </Marker>

        {/* Point de départ du trajet */}
        {trackHasLocation && trackLat && trackLng && (
          <>
            <Marker
              position={[trackLat, trackLng]}
              icon={L.icon({
                iconUrl: markerIcon,
                shadowUrl: markerShadow,
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
                className: 'start-marker',
              })}
            >
              <Popup>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>
                  Point de départ
                </div>
              </Popup>
            </Marker>

            {/* Ligne du trajet */}
            {trackPath.length > 1 && (
              <Polyline
                positions={trackPath}
                color="#EC9C9D"
                weight={3}
                opacity={0.7}
                dashArray="5, 5"
              />
            )}
          </>
        )}
      </MapContainer>
    </div>
  );
}
