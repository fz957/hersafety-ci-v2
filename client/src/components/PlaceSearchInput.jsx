import { useState } from 'react';
import { HS, ICONS } from '../tokens';
import { Icon } from './ui/index.jsx';
import api from '../services/api';

/**
 * PlaceSearchInput - Autocomplete input for location search
 * Similar to Delivera - searches ALL real places via Photon API
 *
 * Props:
 * - label: Label text
 * - placeholder: Placeholder text
 * - value: Current input value
 * - onChange: Callback when text changes
 * - onSelectLocation: Callback when a location is selected
 * - userPosition: { lat, lng } for proximity search (optional)
 * - icon: Icon component (optional)
 */
export function PlaceSearchInput({
  label,
  placeholder = 'Chercher un lieu...',
  value = '',
  onChange,
  onSelectLocation,
  userPosition = null,
  icon = null,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimer, setSearchTimer] = useState(null);

  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange?.(e);

    // Clear previous timer
    if (searchTimer) clearTimeout(searchTimer);

    // Auto-search after typing
    if (newValue.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce search 300ms
    const timer = setTimeout(() => {
      searchPlaces(newValue);
    }, 300);
    setSearchTimer(timer);
  };

  const searchPlaces = async (query) => {
    try {
      const response = await api.get('/api/locations/osm-search', {
        params: {
          query: query,
          lat: userPosition?.lat,
          lng: userPosition?.lng,
        }
      });

      const results = response.data.data?.locations || [];
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (err) {
      console.error('Place search error:', err);
      setSuggestions([]);
    }
  };

  const handleSelectLocation = (location) => {
    onSelectLocation?.(location);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {label && (
          <label style={{
            fontSize: 12,
            fontWeight: 700,
            color: HS.textDim,
            letterSpacing: 0.6,
            textTransform: 'uppercase'
          }}>
            {label}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={value}
            onChange={handleChange}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
            placeholder={placeholder}
            style={{
              flex: 1,
              padding: '10px 14px',
              paddingLeft: icon ? '38px' : '14px',
              borderRadius: 10,
              border: `1px solid ${HS.border}`,
              background: HS.surface,
              color: HS.text,
              fontSize: 13,
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          {icon && (
            <div style={{
              position: 'absolute',
              left: 10,
              color: HS.textDim,
              pointerEvents: 'none',
            }}>
              {icon}
            </div>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: HS.surface,
          border: `1px solid ${HS.border}`,
          borderRadius: 8,
          marginTop: 4,
          maxHeight: 300,
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {suggestions.map((loc, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectLocation(loc)}
              style={{
                padding: '10px 12px',
                borderBottom: idx < suggestions.length - 1 ? `1px solid ${HS.border}` : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: HS.text }}>
                📍 {loc.name}
              </div>
              {loc.area && (
                <div style={{ fontSize: 11, color: HS.textMute, marginTop: 2 }}>
                  {loc.area}
                  {loc.description && ` • ${loc.description}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
