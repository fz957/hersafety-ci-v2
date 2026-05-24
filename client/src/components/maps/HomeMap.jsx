import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import api from '../../services/api';
import { HS } from '../../tokens';
import { useGPS } from '../../hooks/useGPS';

// Custom user location marker icon
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iIzIxOTZGMyIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

export function HomeMap() {
  const { position } = useGPS({ watch: true }); // Enable continuous tracking
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 6.8276, lng: -5.2893 });
  const [stats, setStats] = useState({ unsafe: 0, medium: 0 });
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null); // For search result display
  const mapRef = useRef(null);

  // Load categorized locations when position changes
  useEffect(() => {
    if (!position) {
      setError('GPS en attente...');
      return;
    }

    setError(null);
    setMapCenter(position);
    loadLocations(position);

    // Real-time polling every 30 seconds
    const interval = setInterval(() => {
      loadLocations(position);
    }, 30000);

    return () => clearInterval(interval);
  }, [position]);

  const loadLocations = async (pos) => {
    try {
      setLoading(true);
      console.log('📍 Loading locations from:', pos.lat, pos.lng);

      const response = await api.get('/api/reports/categorized-locations', {
        params: {
          lat: pos.lat,
          lng: pos.lng,
          radius: 5000
        }
      });

      const data = response.data.data || {};
      console.log('✓ Loaded locations:', data.locations?.length);

      setLocations(data.locations || []);
      setStats({
        unsafe: data.unsafe_count || 0,
        medium: data.medium_count || 0
      });
      setLastUpdate(new Date().toLocaleTimeString());
      setError(null);
    } catch (err) {
      console.error('❌ Error loading locations:', err);
      setError('Erreur chargement carte: ' + (err.response?.data?.error || err.message));
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  // Search for locations by name or area
  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await api.get('/api/locations/search', {
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

  // Handle location selection from search
  const handleSelectLocation = (location) => {
    setSelectedLocation(location);
    setSearchQuery(location.name);
    setShowSuggestions(false);

    // Recentre sur la position actuelle de l'utilisateur
    if (position && mapRef.current) {
      mapRef.current.setView([position.lat, position.lng], 14);
    } else if (mapRef.current) {
      // Si pas de GPS, centre sur la location cherchée
      mapRef.current.setView([location.lat, location.lng], 15);
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

  return (
    <div>
      {/* Search Box */}
      <div style={{
        position: 'relative',
        marginBottom: 12,
      }}>
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}>
          <input
            type="text"
            placeholder="🔍 Chercher un endroit (ex: Marché Adjamé)..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${HS.border}`,
              background: 'rgba(255,255,255,0.05)',
              color: HS.text,
              fontSize: 14,
              outline: 'none',
              transition: 'all 0.2s',
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
              }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: HS.textMute,
                padding: '8px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
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
            zIndex: 100,
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
                <div style={{
                  fontSize: 10,
                  color: HS.textDim,
                  marginTop: 2,
                }}>
                  {loc.description}
                </div>
              </div>
            ))}
          </div>
        )}

        {showSuggestions && searchQuery.trim().length >= 2 && searchSuggestions.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'rgba(13, 13, 13, 0.95)',
            border: `1px solid ${HS.border}`,
            borderRadius: 8,
            marginTop: 4,
            padding: '12px',
            textAlign: 'center',
            color: HS.textMute,
            fontSize: 13,
            zIndex: 100,
          }}>
            Aucun lieu trouvé
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div style={{
        padding: 12,
        background: error ? 'rgba(183, 28, 28, 0.1)' : 'rgba(27, 94, 32, 0.1)',
        borderRadius: 8,
        marginBottom: 12,
        fontSize: 11,
        color: error ? HS.danger : HS.safe,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          {error ? (
            <span>⚠️ {error}</span>
          ) : position ? (
            <span>✓ {position.lat.toFixed(4)}° · {position.lng.toFixed(4)}°</span>
          ) : (
            <span>🔄 Localisation en cours...</span>
          )}
        </div>
        {lastUpdate && !error && (
          <div style={{ color: HS.textMute }}>
            🔄 {lastUpdate}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: 16,
        padding: 12,
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        marginBottom: 16,
        flexWrap: 'wrap',
        fontSize: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#2196F3',
          }} />
          <span style={{ color: HS.textDim }}>Position ({position ? '✓' : '…'})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#B71C1C',
          }} />
          <span style={{ color: HS.textDim }}>Dangereuse ({stats.unsafe})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#FF8F00',
          }} />
          <span style={{ color: HS.textDim }}>Risque modéré ({stats.medium})</span>
        </div>
      </div>

      {/* Map */}
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
          center={mapCenter}
          zoom={13}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* User Position Marker - Always Show */}
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
          {locations && locations.length > 0 ? (
            locations.map((location, idx) => {
              const color = getCategoryColor(location.category);
              const size = Math.max(8, Math.min(25, (location.incident_count || 1) * 3));

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
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })
          ) : null}

          {/* Selected Location from Search - Show as green circle */}
          {selectedLocation && (
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

      {/* No Data Message */}
      {!loading && locations.length === 0 && !error && position && (
        <div style={{
          textAlign: 'center',
          padding: 20,
          color: HS.textMute,
          fontSize: 13,
          marginTop: 12,
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🌸</div>
          Zones sûres ✓ Aucun signalement pour le moment.
        </div>
      )}

      {/* Error Message */}
      {error && position && (
        <div style={{
          marginTop: 12,
          padding: 12,
          background: 'rgba(183, 28, 28, 0.1)',
          borderRadius: 8,
          color: HS.danger,
          fontSize: 12,
          border: `1px solid ${HS.danger}`,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>❌ Erreur</div>
          <div>{error}</div>
        </div>
      )}
    </div>
  );
}
