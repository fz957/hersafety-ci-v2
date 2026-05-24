# HerSafety CI — Home/Map Feature Documentation

## Overview
Implemented a new **Home/Map** feature on the Dashboard that displays categorized safety locations with real data from user-submitted reports.

## Features

### 1. **Real Location Categorization**
Locations are automatically categorized based on user-submitted signalements:

- **🚨 Unsafe (Red)**: Locations with 2+ verified incident reports
  - Represents high-risk areas
  - Circle size increases with incident count
  - Shows all danger types reported

- **⚠️ Medium Risk (Orange)**: Locations with pending or single verified reports
  - Represents areas being monitored
  - Smaller circles than unsafe zones
  - Allows community to flag potential dangers

- **✓ Safe (Green)**: Real places (police, hospitals, pharmacies, fire stations)
  - Currently served by `/api/places` endpoint
  - Uses Nominatim/Foursquare for real location data
  - Can be extended to show verified safe locations

### 2. **Interactive Map Display**
- Shows current user location (blue marker with white border)
- Displays all categorized locations within 5km radius
- Click markers to see:
  - Place name and address
  - Incident count and verification status
  - Types of dangers reported
  - Link to detailed reports

### 3. **Legend & Statistics**
- Color-coded legend showing location categories
- Live count of unsafe and medium-risk locations
- "Zones sûres ✓" message when no danger reports exist

## Backend Implementation

### New API Endpoint
```
GET /api/reports/categorized-locations?lat=X&lng=Y&radius=5000
```

**Parameters:**
- `lat` (required): User latitude (-90 to 90)
- `lng` (required): User longitude (-180 to 180)
- `radius` (optional): Search radius in meters (default: 5000)

**Response:**
```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "lat": 6.8276,
        "lng": -5.2893,
        "place_name": "Marché Adjamé",
        "place_address": "Adjamé, Abidjan",
        "incident_count": 3,
        "danger_types": ["agression_physique", "vol"],
        "category": "unsafe",
        "color": "#B71C1C",
        "distance": 0.5
      }
    ],
    "unsafe_count": 2,
    "medium_count": 1,
    "center": { "lat": 6.8276, "lng": -5.2893 },
    "radius": 5000
  }
}
```

### Database Queries

**Unsafe Zones (Red):**
- Filters: `status='verified'`, `report_type='lieu'`, location coordinates
- Groups by: rounded lat/lng (4 decimals)
- Having: `COUNT(*) >= 2` (threshold for unsafe)

**Medium Risk Zones (Orange):**
- Filters: `status IN ('verified', 'pending')`, `report_type='lieu'`
- Groups by: rounded lat/lng (4 decimals)
- Having: `COUNT(*) >= 1`
- Excludes: locations already in unsafe list

### Distance Calculation
Uses Haversine formula to:
- Calculate distance from user to each location
- Filter locations beyond search radius
- Sort by distance for closest results

## Frontend Implementation

### HomeMap Component
**File:** `client/src/components/maps/HomeMap.jsx`

**Features:**
- Uses React Leaflet for map display
- Uses Nominatim/OSM for base map tiles
- Real-time position tracking via `useGPS` hook
- Auto-loads categorized locations on mount
- Shows loading state while fetching data

**Props:**
- None (uses context from GPS and API)

**State:**
- `locations`: Categorized location array
- `loading`: Loading state
- `mapCenter`: Map center coordinates
- `stats`: Statistics (unsafe, medium, safe counts)

### Dashboard Integration
**File:** `client/src/pages/Dashboard.jsx`

Added new section before "Comment tu te sens ?" buttons:
```jsx
<div style={{ marginBottom: 16 }}>
  <Eyebrow style={{ marginBottom: 12 }}>Carte de sécurité</Eyebrow>
  <HomeMap />
</div>
```

## User Experience Flow

1. **Dashboard loads**
   - User sees new "Carte de sécurité" section with map
   - GPS position is requested (if not already granted)
   - Map loads centered on user's current location

2. **Map display**
   - Blue marker shows user's current position
   - Red circles show dangerous zones with count
   - Orange circles show medium-risk areas
   - Legend shows color meanings and counts

3. **Interaction**
   - User clicks on any marker
   - Popup shows details: name, address, incident count, danger types
   - User can click "Voir les détails" to navigate to Reports page

## Integration with Reports System

The home map **feeds directly from the Reports/Signalements system**:

1. User submits a report via "Signaler" tab in Reports page
2. Report is saved with location (lat/lng)
3. Admin verifies the report
4. Once verified (or pending), location appears on home map
5. Map category is determined automatically based on report count

### Report Types Supported:
- **Lieu dangereux** (Dangerous location): Primary source for map
- **Chauffeur/VTC** (Driver/Ride app): Not shown on map (no location data)

## Technical Details

### Distance Filtering
- Only locations within 5km radius are displayed
- Uses Haversine formula: `R * 2 * atan2(sqrt(a), sqrt(1-a))`
- Results in accurate driving/walking distances

### Rounding Strategy
- Database: Rounds coordinates to 4 decimals (≈11 meters precision)
- JavaScript: Full precision for distance calculation
- Prevents data duplication while maintaining accuracy

### Performance Optimization
- Single query per request (not N+1)
- Database-level grouping and aggregation
- Efficient array filtering in JavaScript
- Lazy loads only when component mounts

## Future Enhancements

1. **Safe Places on Map**
   - Integrate `/api/places` to show green markers
   - Show nearest police, hospitals, pharmacies

2. **Clustering**
   - Group nearby locations at high zoom levels
   - Reduce visual clutter for large areas

3. **Filtering**
   - Toggle location types on/off
   - Filter by incident type
   - Date range selection

4. **Analytics**
   - Most dangerous streets/areas
   - Incident trends over time
   - Safety score by neighborhood

5. **Mobile PWA Integration**
   - Background location tracking
   - Offline map data
   - Push notifications for nearby dangers

## Testing

### API Testing
```bash
# Get categorized locations around Abidjan center
curl "http://localhost:5000/api/reports/categorized-locations?lat=6.8276&lng=-5.2893&radius=5000" \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

### Frontend Testing
1. Open Dashboard page
2. Grant GPS permissions
3. Verify map loads with current location
4. Submit test reports via Reports page
5. Verify reports appear on map after admin verification

### Edge Cases
- No reports submitted yet: Shows "Zones sûres ✓ message
- GPS unavailable: Map centers on Abidjan default (6.8276, -5.2893)
- Invalid coordinates: Returns 400 error
- Authentication required: Returns 401 Unauthorized

## Security

- All location data filtered by `organization_id` (multi-tenant isolation)
- Requires authentication (`requireAuth` middleware)
- Requires tenant context (`requireTenant` middleware)
- No sensitive report details exposed in map view
- Verified reports only (pending reports don't identify reporter)

## Files Modified/Created

| File | Changes | Status |
|------|---------|--------|
| `server/src/routes/reports.js` | Added `/categorized-locations` endpoint | ✅ Created |
| `client/src/components/maps/HomeMap.jsx` | New map component with legend | ✅ Created |
| `client/src/pages/Dashboard.jsx` | Imported and integrated HomeMap | ✅ Modified |

## Deployment Notes

- No database migrations needed (uses existing `reports` table)
- No new dependencies required (Leaflet already in use)
- Backward compatible (doesn't break existing endpoints)
- Works with existing multi-tenant architecture
- Ready for Render deployment
