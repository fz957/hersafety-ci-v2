import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { HS } from '../../tokens';

const TYPE_COLORS = {
  police: '#4A6B8A',
  gendarmerie: '#5C5C8A',
  pompiers: '#C97B3B',
  hopital: '#5C7F4F',
  pharmacie: '#2E7D8C',
  autre: HS.sakuraDeep,
};

function createColoredMarkerIcon(color) {
  const markerHtml = `
    <div style="
      background-color: ${color};
      width: 32px;
      height: 40px;
      border-radius: 50% 50% 0 0;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    ">
      <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
    </div>
  `;
  return L.divIcon({
    html: markerHtml,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
    className: 'custom-marker',
  });
}

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function PlacesMap({ places = [], userPosition }) {
  const defaultPos = { lat: 6.8276, lng: -5.2893 };
  const pos = userPosition || defaultPos;
  const center = [pos.lat, pos.lng];
  const zoom = userPosition ? 14 : 13;

  return (
    <div style={{ height: '280px', borderRadius: 16, marginBottom: 16, overflow: 'hidden', position: 'relative' }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        <Marker position={center} icon={defaultIcon}>
          <Popup>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>
              {userPosition ? 'Tu es ici' : 'Position par défaut'}
            </div>
          </Popup>
        </Marker>

        {Array.isArray(places) && places.map((place, i) => (
          <Marker
            key={i}
            position={[place.latitude || place.lat, place.longitude || place.lng]}
            icon={createColoredMarkerIcon(TYPE_COLORS[place.type] || TYPE_COLORS.autre)}
          >
            <Popup>
              <div style={{ width: 140 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 4 }}>
                  {place.name}
                </div>
                <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>
                  {place.type}
                </div>
                {place.phone && (
                  <a href={`tel:${place.phone}`} style={{ fontSize: 10, color: '#0066cc' }}>
                    {place.phone}
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export function DangerousPlacesMap({ dangerZones = [] }) {
  const center = (Array.isArray(dangerZones) && dangerZones.length > 0)
    ? [dangerZones[0].latitude, dangerZones[0].longitude]
    : [6.8276, -5.2893];

  return (
    <div style={{ height: '320px', borderRadius: 16, marginBottom: 16, overflow: 'hidden', position: 'relative' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {Array.isArray(dangerZones) && dangerZones.map((zone, i) => (
          <Marker
            key={i}
            position={[zone.latitude, zone.longitude]}
            icon={createColoredMarkerIcon('#B71C1C')}
          >
            <Popup>
              <div style={{ width: 160 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#B71C1C', marginBottom: 4 }}>
                  Zone dangereuse
                </div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
                  {zone.zone_description || `Quartier ${zone.area_name}`}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#B71C1C' }}>
                  🚨 {zone.report_count} signalement{zone.report_count > 1 ? 's' : ''}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
