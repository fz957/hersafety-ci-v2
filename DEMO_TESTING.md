# 🎯 HerSafety CI — Map Demo Testing Guide

## ✅ What's Ready Now

Your map now has **4 demo locations** with color-coded safety markers:

### Demo Data Created
```
🔴 UNSAFE (Red - 2+ incidents)
   └─ Marché Adjamé (5.355, -4.028)
      • Agression physique
      • Vol
      
🟠 MEDIUM RISK (Orange - 1+ incident)
   ├─ Adjamé (5.352, -4.03) - Suivi
   ├─ Plateau (5.3405, -4.0397) - Harcèlement verbal
   └─ Yopougon (5.3452, -4.0718) - Suivi
```

---

## 🚀 How to Test

### Step 1: Start the Development Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```
✅ You should see: `Server running on port 5000`

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```
✅ You should see: `VITE v5.x.x ready in xxx ms`

---

### Step 2: Open the Application

1. Open **http://localhost:5173** in your browser
2. Login with any existing account (or register a new one)
3. Navigate to **Dashboard**
4. Look for the **"Carte de sécurité"** section

---

### Step 3: View the Safety Map

You should now see:

#### **Map Elements:**
1. **🔵 Blue Marker** = Your GPS position
   - Shows real-time location
   - Coordinates displayed at top
   - Auto-centers on your position

2. **🔴 Red Circle** = Marché Adjamé (UNSAFE)
   - Larger circle = more incidents (2 in this case)
   - Click to see details: Agression & Vol
   - Coordinates: 5.355, -4.028

3. **🟠 Orange Circles** = Medium Risk Zones
   - Adjamé (Suivi)
   - Plateau (Harcèlement)
   - Yopougon (Suivi)
   - Click any to see incident types

4. **Legend** showing:
   - 🔵 Your Position (✓ if GPS active)
   - 🔴 Dangerous zones (1)
   - 🟠 Medium risk zones (3)

---

### Step 4: Test Location Search

1. **Find the search box:** "🔍 Chercher un endroit..."

2. **Try these searches:**
   ```
   Type: "plateau"
   Result: 3 locations with colors
   
   Type: "cocody"
   Result: 3 locations including Université Félix Houphouët
   
   Type: "adjame" (or "adjamé")
   Result: 3 Adjamé-area locations
   ```

3. **When you select a location:**
   - Search box fills with location name
   - **Green circle (🟢)** appears at that location
   - Map **re-centers on your GPS position** (if available)
   - You see both your position AND the searched location
   - Pop-up shows location details:
     - Name
     - Area/District
     - Safety level with color
     - Description

---

### Step 5: Interact with Markers

1. **Click any colored circle** on the map
2. A popup appears showing:
   - Incident category (Dangereuse/Risque modéré/Localisation cherchée)
   - Place name
   - Address
   - Number of incidents
   - Types of dangers (Agression, Vol, etc.)

3. **Click your blue marker** to see:
   - "📍 Vous êtes ici" tooltip
   - Your precise coordinates

---

## 📊 Complete Feature Checklist

### Map Display ✅
- [x] Red circles for unsafe zones (2+ incidents)
- [x] Orange circles for medium risk (1 incident)
- [x] Green circle for searched locations
- [x] Blue marker for user position
- [x] Marker sizes scale with incident count
- [x] Circle colors match safety levels

### GPS Tracking ✅
- [x] User position shows as blue marker
- [x] Coordinates displayed at top
- [x] Auto-updates every 30 seconds
- [x] "Vous êtes ici" tooltip on position marker
- [x] Works with/without GPS enabled

### Location Search ✅
- [x] Search input appears above map
- [x] Real-time suggestions (2+ chars)
- [x] Shows location name + area + safety level
- [x] Shows distance from current position
- [x] Clear button (✕) to reset
- [x] Escape key closes suggestions
- [x] Search works without accents ("adjame" → "Adjamé")
- [x] Click suggestion selects location

### Map Behavior on Search ✅
- [x] Green circle appears on searched location
- [x] Map re-centers on user's GPS position (not search location)
- [x] User position marker stays visible
- [x] Can see both positions simultaneously
- [x] Map bounds show both your position and searched location

### Data Display ✅
- [x] Incident counts visible
- [x] Danger types listed (Agression, Vol, Harcèlement, Suivi)
- [x] Verified status shown
- [x] Location names and addresses displayed
- [x] Safety ratings color-coded

### Legend ✅
- [x] 🔵 Position indicator
- [x] 🔴 Dangerous count (1)
- [x] 🟠 Medium risk count (3)
- [x] Updates in real-time

---

## 🎨 Color Reference

| Color | Meaning | Size |
|-------|---------|------|
| 🔴 Red (#B71C1C) | Very Dangerous - 2+ verified incidents | Large (varies by count) |
| 🟠 Orange (#FF8F00) | Medium Risk - 1 incident or pending | Medium |
| 🟢 Green (#2E7D32) | Searched Location | 15 pixel radius |
| 🔵 Blue (#2196F3) | Your GPS Position | Fixed marker |

---

## 📱 Testing on Different Devices

### Desktop (Chrome/Firefox/Safari)
- Full map functionality
- Search with keyboard
- Click popups visible
- All features working

### Mobile (iPhone/Android)
- Touch-friendly circles
- Search input keyboard
- Scroll to see full map
- GPS tracking works
- Touch to open popups

---

## 🐛 Troubleshooting

### Map not showing circles?
1. Check if demo data was created: `http://localhost:5000/api/reports/generate-demo-data`
2. Verify API response has locations
3. Check browser console (F12) for errors
4. Refresh page (Ctrl+R)

### Search not working?
1. Type at least 2 characters
2. Try without accents ("adjame" not "adjàmé")
3. Check Network tab (F12) for 400/500 errors
4. Verify `/api/locations/search` responds

### GPS marker not showing?
1. Grant location permission when prompted
2. Check browser supports Geolocation API
3. On desktop, browser may use approximate location
4. On mobile, enable location services

### Map not centering correctly?
1. Clear browser cache
2. Refresh page
3. Verify GPS permission is granted
4. Check coordinates in API response

---

## 🔄 API Endpoints Being Used

```
GET /api/reports/categorized-locations?lat=X&lng=Y&radius=5000
  → Returns colored circles for map
  
GET /api/locations/search?query=...&lat=X&lng=Y&radius=20000
  → Returns location suggestions
  
GET /api/reports/generate-demo-data
  → Creates demo incidents
```

---

## ✨ Next Steps (Optional)

1. **Add more demo locations** across Côte d'Ivoire
2. **Real-time incident creation** - Users can report new dangers
3. **Heatmaps** - Show danger density by area
4. **Safe routes** - Suggest safer paths
5. **Notifications** - Alert users entering danger zones

---

## 📞 Quick Reference Commands

### Create Demo Data
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/reports/generate-demo-data" -UseBasicParsing
```

### Test Location Search
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/locations/search?query=plateau" -UseBasicParsing
```

### Test Categorized Locations
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/reports/categorized-locations?lat=5.35&lng=-4.03&radius=5000" -UseBasicParsing
```

---

**Ready to test? Go to http://localhost:5173 and explore the safety map!** 🗺️

*Last Updated: May 24, 2026*  
*Status: ✅ All features implemented and tested*
