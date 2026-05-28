import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import { HS, ICONS } from '../tokens';
import { Icon, Button, Card, Input, Eyebrow, H2, BottomNav, PageShell, ScrollArea, Toast } from '../components/ui/index.jsx';
import { PlaceSearchInput } from '../components/PlaceSearchInput.jsx';
import { useGPS } from '../hooks/useGPS';

// Custom user location marker icon
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iIzIxOTZGMyIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const DANGER_TYPES = [
  { v: 'harcelement_verbal',  l: 'Harcèlement verbal' },
  { v: 'agression_physique',  l: 'Agression physique' },
  { v: 'agression_sexuelle',  l: 'Agression sexuelle' },
  { v: 'vol',                 l: 'Vol' },
  { v: 'suivi',               l: 'Suivi' },
  { v: 'detour_force',        l: 'Détour forcé' },
  { v: 'autre',               l: 'Autre' },
];

// Animation style for GPS loading pulse
const pulseStyle = `
  @keyframes gps-pulse {
    0% { r: 4; opacity: 0.8; }
    50% { r: 8; opacity: 0.4; }
    100% { r: 4; opacity: 0.8; }
  }
  .gps-pulse circle {
    animation: gps-pulse 1.5s ease-in-out infinite;
  }
`;

const STATUS_STYLE = {
  verified: { bg: HS.safeSoft,   color: HS.safe,   label: '✓ Vérifié' },
  pending:  { bg: HS.warnSoft,   color: HS.warn,   label: '⏳ En attente' },
  refuted:  { bg: HS.dangerSoft, color: HS.danger,  label: '✗ Réfuté' },
};

export default function Reports() {
  const { position } = useGPS({ watch: true });
  const mapRef = useRef(null);

  // Default to Abidjan area (Plateau district) instead of wrong center
  const defaultCenter = { lat: 5.3405, lng: -4.0397 };

  const [tab, setTab]       = useState('map');
  const [reports, setReports] = useState([]);
  const [dangerZones, setDangerZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast]   = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [stats, setStats] = useState({ unsafe: 0, medium: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [form, setForm]     = useState({
    report_type: 'lieu',
    danger_type: 'harcelement_verbal',
    description: '',
    place_name: '',
    place_address: '',
    is_anonymous: true,
  });

  // Auto-update map when position changes - ANIMATE to position
  useEffect(() => {
    if (position && mapRef.current) {
      setMapCenter(position);
      // Smooth animation to new position
      mapRef.current.flyTo([position.lat, position.lng], 13, { duration: 1.5 });
      loadCategorizedLocations(position);
    }
  }, [position]);

  // Load data on mount - ensure we load categorized locations even without GPS
  useEffect(() => {
    setLoading(true);
    const pos = position || defaultCenter;

    // Load categorized locations
    loadCategorizedLocations(pos)
      .catch(err => console.error('Error loading data:', err))
      .finally(() => setLoading(false));
  }, []);

  // Auto-refresh map every 30 seconds for real-time updates
  useEffect(() => {
    if (!position) return;

    const interval = setInterval(() => {
      loadCategorizedLocations(position);
    }, 30000);

    return () => clearInterval(interval);
  }, [position]);

  // Auto-populate form with GPS position when switching to form tab
  useEffect(() => {
    if (tab === 'new' && position && form.report_type === 'lieu' && !form.place_address) {
      // Auto-fill place_name and place_address with GPS coordinates and "Ma position"
      // Only fill if they haven't been manually entered yet
      setForm((f) => ({
        ...f,
        place_name: 'Ma position',
        place_address: `${position.lat.toFixed(4)}°, ${position.lng.toFixed(4)}°`,
      }));
    }
  }, [tab, position, form.report_type]);

  const loadCategorizedLocations = async (pos) => {
    try {
      const response = await api.get('/api/reports/categorized-locations', {
        params: {
          lat: pos.lat,
          lng: pos.lng,
          radius: 50000  // 50 km radius to show all danger zones in the city
        }
      });

      const data = response.data.data || {};
      setDangerZones(data.locations || []);
      setStats({
        unsafe: data.unsafe_count || 0,
        medium: data.medium_count || 0
      });
    } catch (err) {
      console.error('Error loading locations:', err);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      // Try Overpass/OSM search first (all real places)
      const response = await api.get('/api/locations/osm-search', {
        params: {
          query: query,
          lat: position?.lat,
          lng: position?.lng,
          radius: 20000
        }
      });

      const results = response.data.data?.locations || [];
      setSearchSuggestions(results);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Search error:', err);
      setSearchSuggestions([]);
    }
  };

  const handleSelectLocation = (location) => {
    setSelectedLocation(location);
    setSearchQuery(location.name);
    setShowSuggestions(false);

    // Auto-fill form with selected location
    setForm((f) => ({
      ...f,
      place_name: location.name || '',
      place_address: location.area || ''
    }));

    // Fit bounds to show both user position and selected location
    if (position && mapRef.current) {
      const bounds = L.latLngBounds(
        [position.lat, position.lng],
        [location.lat, location.lng]
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'unsafe':
        return '#B71C1C'; // Red
      case 'medium':
        return '#FF8F00'; // Orange
      default:
        return '#757575'; // Gray
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'unsafe':
        return '🚨 Zone dangereuse';
      case 'medium':
        return '⚠️ Risque modéré';
      default:
        return 'Lieu';
    }
  };

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (position && form.report_type === 'lieu') {
        payload.place_lat = position.lat;
        payload.place_lng = position.lng;
      }
      const response = await api.post('/api/reports', payload);
      setToast({ message: 'Signalement soumis ✓ — merci pour ta vigilance.', type: 'success' });

      // Add new report to map immediately with correct category
      if (response.data?.data && position) {
        const newLocation = {
          lat: position.lat,
          lng: position.lng,
          place_name: form.place_name,
          place_address: form.place_address,
          danger_types: [form.danger_type],
          incident_count: 1,
          category: 'medium', // New reports start as medium (1 incident < 3)
          latest_report: new Date().toISOString()
        };
        setDangerZones(prev => [...prev, newLocation]);
      }

      setForm({ report_type: 'lieu', danger_type: 'harcelement_verbal', description: '',
        place_name: '', place_address: '', is_anonymous: true });

      // Auto-refresh map after submission
      if (position) {
        setTimeout(() => {
          loadCategorizedLocations(position);
          setTab('map');
        }, 500);
      } else {
        setTab('map');
      }
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Erreur envoi', type: 'error' });
    }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <PageShell>
      <style>{pulseStyle}</style>
      <div style={{ padding: '54px 20px 16px' }}>
        <Eyebrow>Signalements</Eyebrow>
        <H2 style={{ marginTop: 4, marginBottom: 16 }}>Zones à risque</H2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[{ id: 'map', l: 'Signalements' }, { id: 'new', l: '+ Signaler' }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 18px', borderRadius: 100, fontSize: 13, fontWeight: 700,
              background: tab === t.id ? HS.chocolate : HS.surface,
              color: tab === t.id ? HS.textOnDark : HS.textDim,
              border: tab === t.id ? 'none' : `1px solid ${HS.border}`,
              fontFamily: HS.font,
            }}>{t.l}</button>
          ))}
        </div>
      </div>

      {tab === 'map' ? (
        <>
          {/* ScrollArea for map and content */}
          <ScrollArea style={{ padding: '0 16px 90px' }}>
            {/* Search Box - STICKY at top of scroll */}
            <div style={{
              padding: '10px',
              position: 'sticky',
              top: 0,
              zIndex: 999,
              overflow: 'visible',
              background: 'transparent',
              marginBottom: '16px',
            }}>
              <div style={{ position: 'relative', overflow: 'visible' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="🔍 Chercher une zone..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
                  style={{
                    flex: 1,
                    padding: '8px 14px',
                    borderRadius: 20,
                    border: 'none',
                    background: '#FFFFFF',
                    color: '#333',
                    fontSize: 13,
                    outline: 'none',
                    transition: 'all 0.2s',
                    fontFamily: HS.font,
                    height: '36px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowSuggestions(false);
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchSuggestions([]);
                      setShowSuggestions(false);
                      setSelectedLocation(null);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: 'none',
                      color: HS.textMute,
                      padding: '8px 12px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontFamily: HS.font,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Search Suggestions */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'rgba(13, 13, 13, 0.95)',
                  border: `1px solid ${HS.border}`,
                  borderRadius: 8,
                  marginTop: 4,
                  maxHeight: 300,
                  overflowY: 'auto',
                  zIndex: 99999,
                }}>
                  {searchSuggestions.map((loc, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectLocation(loc)}
                      style={{
                        padding: '10px 12px',
                        borderBottom: idx < searchSuggestions.length - 1 ? `1px solid ${HS.border}` : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      <div style={{
                        fontWeight: 600,
                        color: loc.safety_info?.color || HS.text,
                        fontSize: 13,
                      }}>
                        {loc.name}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: HS.textMute,
                        marginTop: 2,
                      }}>
                        {loc.area} • {loc.safety_info?.label}
                        {loc.distance !== undefined && ` • ${loc.distance.toFixed(1)} km`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
            <>
              {/* Map */}
              <div style={{ marginBottom: 20, marginTop: 16 }}>
              <div style={{
                height: 400,
                borderRadius: 14,
                overflow: 'hidden',
                border: `1px solid ${HS.border}`,
                position: 'relative',
              }}>
                {loading && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.2)',
                    zIndex: 10,
                    fontSize: 14,
                    color: HS.textDim,
                  }}>
                    ⏳ Chargement de la carte…
                  </div>
                )}

                <MapContainer
                  ref={mapRef}
                  center={[mapCenter.lat, mapCenter.lng]}
                  zoom={13}
                  style={{ width: '100%', height: '100%' }}
                  attributionControl={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* User Position Marker */}
                  {position && (
                    <Marker
                      position={[position.lat, position.lng]}
                      icon={userIcon}
                      title="Votre position"
                    >
                      <Tooltip direction="top" offset={[0, -10]} permanent>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>
                          📍 Vous êtes ici
                        </div>
                      </Tooltip>
                    </Marker>
                  )}

                  {/* Incident Markers */}
                  {dangerZones && dangerZones.length > 0 ? (
                    dangerZones.map((location, idx) => {
                      // Validate coordinates before rendering
                      if (!location.lat || !location.lng || isNaN(location.lat) || isNaN(location.lng)) {
                        console.warn('Invalid location coordinates:', location);
                        return null;
                      }

                      const color = getCategoryColor(location.category);
                      const size = Math.max(10, Math.min(30, (location.incident_count || 1) * 4));

                      return (
                        <CircleMarker
                          key={`${location.lat}-${location.lng}-${idx}`}
                          center={[location.lat, location.lng]}
                          radius={size}
                          fillColor={color}
                          fillOpacity={0.7}
                          stroke
                          weight={2}
                          color={color}
                          opacity={0.9}
                        >
                          <Popup>
                            <div style={{ padding: 8, minWidth: 220, fontSize: 13 }}>
                              <div style={{
                                fontWeight: 700,
                                color: color,
                                marginBottom: 6,
                              }}>
                                {getCategoryLabel(location.category)}
                              </div>

                              {location.place_name && (
                                <div style={{
                                  fontWeight: 600,
                                  color: HS.chocolate,
                                  marginBottom: 4,
                                }}>
                                  {location.place_name}
                                </div>
                              )}

                              {location.place_address && (
                                <div style={{
                                  fontSize: 11,
                                  color: HS.textMute,
                                  marginBottom: 6,
                                }}>
                                  📍 {location.place_address}
                                </div>
                              )}

                              {location.incident_count && (
                                <div style={{
                                  fontSize: 11,
                                  color: HS.textDim,
                                  marginBottom: 6,
                                  paddingBottom: 6,
                                  borderBottom: `1px solid ${HS.border}`,
                                }}>
                                  <strong>{location.incident_count}</strong> signalement{location.incident_count > 1 ? 's' : ''} {location.category === 'unsafe' ? 'vérifié' : 'en attente'}
                                </div>
                              )}

                              {location.danger_types && location.danger_types.length > 0 && (
                                <div style={{
                                  fontSize: 10,
                                  color: HS.textMute,
                                  marginTop: 6,
                                }}>
                                  <strong>Types:</strong> {location.danger_types.join(', ')}
                                </div>
                              )}

                              <button
                                onClick={() => setTab('new')}
                                style={{
                                  marginTop: 10, width: '100%', padding: '6px 8px', borderRadius: 6,
                                  background: HS.chocolate, color: HS.bg, border: 'none',
                                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                  fontFamily: HS.font,
                                }}>
                                Signaler aussi
                              </button>
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    })
                  ) : null}

                  {/* Selected Location from Search - Green circle */}
                  {selectedLocation && selectedLocation.lat && selectedLocation.lng && !isNaN(selectedLocation.lat) && !isNaN(selectedLocation.lng) && (
                    <CircleMarker
                      center={[selectedLocation.lat, selectedLocation.lng]}
                      radius={15}
                      fillColor="#4CAF50"
                      fillOpacity={0.8}
                      stroke
                      weight={3}
                      color="#2E7D32"
                      opacity={1}
                    >
                      <Popup>
                        <div style={{ padding: 8, minWidth: 220, fontSize: 13 }}>
                          <div style={{
                            fontWeight: 700,
                            color: '#2E7D32',
                            marginBottom: 6,
                          }}>
                            🔍 Localisation cherchée
                          </div>

                          {selectedLocation.name && (
                            <div style={{
                              fontWeight: 600,
                              color: HS.chocolate,
                              marginBottom: 4,
                              fontSize: 14,
                            }}>
                              {selectedLocation.name}
                            </div>
                          )}

                          {selectedLocation.area && (
                            <div style={{
                              fontSize: 11,
                              color: HS.textMute,
                              marginBottom: 4,
                            }}>
                              📍 {selectedLocation.area}
                            </div>
                          )}

                          {selectedLocation.safety_info && (
                            <div style={{
                              fontSize: 12,
                              color: selectedLocation.safety_info.color,
                              fontWeight: 600,
                              marginTop: 6,
                              paddingTop: 6,
                              borderTop: `1px solid ${HS.border}`,
                            }}>
                              Sécurité: {selectedLocation.safety_info.label}
                            </div>
                          )}

                          {selectedLocation.description && (
                            <div style={{
                              fontSize: 10,
                              color: HS.textMute,
                              marginTop: 6,
                              fontStyle: 'italic',
                            }}>
                              {selectedLocation.description}
                            </div>
                          )}
                        </div>
                      </Popup>
                    </CircleMarker>
                  )}
                </MapContainer>
              </div>
            </div>

            {/* Stats Section */}
            {!loading && dangerZones.length > 0 && (
              <div style={{ marginTop: 24, marginBottom: 20 }}>
                <Eyebrow style={{ marginBottom: 12 }}>📊 Situation</Eyebrow>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Card style={{ padding: 16, background: HS.safeSoft, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: HS.safe }}>{stats.unsafe}</div>
                    <div style={{ fontSize: 12, color: HS.textMute, marginTop: 4, fontWeight: 600 }}>🚨 Haute risque</div>
                  </Card>
                  <Card style={{ padding: 16, background: HS.warnSoft, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: HS.warn }}>{stats.medium}</div>
                    <div style={{ fontSize: 12, color: HS.textMute, marginTop: 4, fontWeight: 600 }}>⚠️ Modéré</div>
                  </Card>
                </div>
              </div>
            )}
            </>
          </ScrollArea>
        </>
        ) : (
          <ScrollArea style={{ padding: '16px 16px 90px' }}>
            <form onSubmit={submit}>
            <Card style={{ padding: 18 }}>
              <Eyebrow style={{ marginBottom: 14 }}>Nouveau signalement</Eyebrow>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* GPS Position Display */}
                {position ? (
                  <div style={{
                    background: 'rgba(33, 150, 243, 0.1)',
                    border: `1px solid #2196F3`,
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 12,
                    color: HS.textDim,
                    lineHeight: 1.4,
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: '#2196F3' }}>📍 Ta position GPS</div>
                    <div>{position.lat.toFixed(4)}° N, {position.lng.toFixed(4)}° E</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>±{Math.round(position.accuracy)}m de précision</div>
                  </div>
                ) : (
                  <div style={{
                    background: 'rgba(255, 152, 0, 0.1)',
                    border: `1px solid #FF9800`,
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 12,
                    color: HS.warn,
                  }}>
                    ⏳ Localisation en cours...
                  </div>
                )}

                {/* Localisation avec autocomplete Photon */}
                <PlaceSearchInput
                  label="📍 Nom du lieu"
                  placeholder="Marché Adjamé, Gare Routière, Cocody…"
                  value={form.place_name}
                  onChange={setF('place_name')}
                  onSelectLocation={(loc) => {
                    setForm((f) => ({
                      ...f,
                      place_name: loc.name || '',
                      place_address: loc.area || ''
                    }));
                  }}
                  userPosition={position}
                  icon={<Icon d={ICONS.pin} size={18} />}
                />

                <Input label="Commune / Quartier" placeholder="Ex: Adjamé, Cocody, Yopougon…" value={form.place_address} onChange={setF('place_address')} />

                {/* Danger */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 8,
                    letterSpacing: 0.6, textTransform: 'uppercase' }}>Type de danger</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {DANGER_TYPES.map((d) => (
                      <button key={d.v} type="button" onClick={() => setForm((f) => ({ ...f, danger_type: d.v }))}
                        style={{ padding: '7px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                          background: form.danger_type === d.v ? HS.danger : HS.surface,
                          color: form.danger_type === d.v ? '#fff' : HS.textDim,
                          border: `1px solid ${form.danger_type === d.v ? HS.danger : HS.border}`,
                          fontFamily: HS.font }}>
                        {d.l}
                      </button>
                    ))}
                  </div>
                </div>

                <Input label="Description" placeholder="Décris l'incident…" value={form.description}
                  onChange={setF('description')} multiline required />

                {/* Anonymat */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <span onClick={() => setForm((f) => ({ ...f, is_anonymous: !f.is_anonymous }))}
                    style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      background: form.is_anonymous ? HS.chocolate : 'transparent',
                      border: form.is_anonymous ? 'none' : `1.5px solid ${HS.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {form.is_anonymous && <Icon d={ICONS.check} size={13} color={HS.bg} />}
                  </span>
                  <span style={{ fontSize: 13, color: HS.textDim }}>Signalement anonyme</span>
                </label>

                <Button type="submit" variant="danger"
                  icon={<Icon d={ICONS.flag} size={18} color="#fff" />}>
                  Envoyer le signalement
                </Button>
              </div>
            </Card>
            </form>
          </ScrollArea>
        )}

      <BottomNav />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </PageShell>
  );
}
