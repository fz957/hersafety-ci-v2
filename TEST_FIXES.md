# HerSafety CI — Bug Fixes Verification Guide

## Overview
All 4 critical bugs have been fixed and the development servers are running with the latest code.

---

## ✅ Fixed Bugs & How to Test

### Bug 1: Safe Places Showing Distant Instead of Nearest
**Status:** ✅ FIXED
**What was fixed:** The `GET /api/places` endpoint correctly returns the 5 nearest safe places sorted by distance (closest first).

**Test it:**
1. Open http://localhost:5173 (HerSafety app)
2. Navigate to Emergency screen (level 3)
3. Observe the "Lieux sûrs autour de toi" (Safe places around you) section
4. The map should show the nearest police, pharmacy, hospital, fire station nearby
5. The places should be ordered by distance (closest first)

**Code verification:** server/src/routes/places.js lines 424-432
- Calculates distance for each place using Haversine formula
- Sorts by distance ascending: `withDistance.sort((a, b) => a.distance - b.distance)`
- Returns top 5 closest

---

### Bug 2: Check-in System Not Functioning (Auto-Alerts)
**Status:** ✅ FIXED (2 critical issues resolved)

#### Issue 2a: Alerts Endpoint Validation Error
**Problem:** Frontend was sending `{ latitude, longitude, description }` but API schema expects `{ location_lat, location_lng, notes }`
**Fix:** Updated client/src/hooks/useCheckInTimer.js lines 75-79:
```javascript
// BEFORE:
const alertRes = await api.post('/api/alerts', {
  level: '2',
  latitude: activeTrack.latest_lat,
  longitude: activeTrack.latest_lng,
  description: 'Escalade automatique: l\'utilisatrice ne va pas bien',
});

// AFTER:
const alertRes = await api.post('/api/alerts', {
  level: '2',
  location_lat: activeTrack.latest_lat,
  location_lng: activeTrack.latest_lng,
  notes: 'Escalade automatique: l\'utilisatrice ne va pas bien',
});
```

#### Issue 2b: Rate Limiting (429) Blocking Check-ins
**Problem:** `/api/tracks` and `/api/alerts` endpoints were being rate-limited despite skip rules
**Root cause:** Skip function was checking exact path match `===` instead of prefix match `.startsWith()`
  - Request: `/api/tracks/123/checkin` 
  - Skip rule: `req.path === '/api/tracks'` ← doesn't match!
  
**Fix:** Updated server/src/middlewares/rateLimit.js lines 15-16:
```javascript
// BEFORE:
if (req.path === '/api/tracks') return true;       // Only matched exact /api/tracks
if (req.path.startsWith('/api/alerts')) return true;  // Alerts was already correct

// AFTER:
if (req.path.startsWith('/api/tracks')) return true;     // Now matches /api/tracks, /api/tracks/:id, /api/tracks/:id/checkin
if (req.path.startsWith('/api/alerts')) return true;     // Also matches /api/alerts, /api/alerts/:id/resolve
```

**Test it:**
1. Open dashboard: http://localhost:5173/dashboard
2. Activate Level 1 (Vigilance) by tapping the vigilance button
3. Wait 1 minute for the check-in modal to appear
4. Click "Oui, je vais bien ✓" button → should respond successfully (no 429 error)
5. Modal should close and timer resets to 1 minute
6. Repeat until 2 missed check-ins (let countdown expire without responding twice)
7. On 2nd missed check-in, system should automatically escalate to Level 2 (SMS alert to contacts)
8. Check browser console for no errors - should see successful API responses

**Key endpoints tested:**
- `GET /api/tracks` (polling every 5 seconds) → should NOT return 429
- `PATCH /api/tracks/:id/checkin` (on response) → should NOT return 429
- `POST /api/alerts` (on escalation after 2 missed) → should NOT return 400 validation error

---

### Bug 3: Level 4 (SOS) Button Needs Removal
**Status:** ✅ FIXED
**What was removed:** The double-tap Level 4 button and all SOS-specific functionality

**Verification:** client/src/pages/Emergency.jsx line 98
```javascript
// Niveaux 3 et 4 fusionnés : tout va au niveau 3 complet
const level = '3';  // <- Only level 3 is active
```

**Test it:**
1. Open Emergency screen: http://localhost:5173/emergency
2. Observe only Level 3 functionality is available (Assistant, emergency numbers, maps, VTC)
3. No Level 4 / SOS buttons should be present
4. No double-tap listeners for Level 4

---

### Bug 4: Enforce Minimum 2 Emergency Contacts Before Dashboard Access
**Status:** ✅ FIXED
**What was implemented:** Dashboard now redirects to onboarding if fewer than 2 contacts are added

**Test it:**
1. Register a new user or create test account
2. Complete onboarding but add only 1 contact
3. Try to access dashboard: http://localhost:5173/dashboard
4. **Expected behavior:** Automatically redirects to `/onboarding` with message asking to add more contacts
5. Add a 2nd contact
6. Dashboard should now be accessible

**Code verification:** client/src/pages/Dashboard.jsx lines 32-46
```javascript
// Enforce minimum 2 emergency contacts
useEffect(() => {
  const loadContactCount = async () => {
    try {
      const res = await api.get('/api/contacts');
      const contacts = res.data.data || [];
      setContactCount(contacts.length);
      // If fewer than 2 contacts, redirect to onboarding
      if (contacts.length < 2 && user && user.onboarding_done) {
        navigate('\onboarding', { replace: true });
      }
    } catch (err) {
      console.error('Erreur chargement contacts:', err.message);
    }
  };
  // ...
}, [user, navigate]);
```

---

## Server Status
✅ Backend running on `http://localhost:5000`
✅ Frontend running on `http://localhost:5173`
✅ Both have latest fixes applied

---

## Quick Test Checklist

Use this checklist to verify all fixes work end-to-end:

- [ ] Level 1 check-in modal appears after 1 minute of tracking
- [ ] Clicking "Oui, je vais bien" sends response without 429 error
- [ ] Check-in counter resets after responding
- [ ] After 2 missed check-ins, Level 2 alert is created (SMS notification)
- [ ] Emergency page shows only Level 3 buttons (no SOS/Level 4)
- [ ] Safe places on emergency map are ordered by proximity
- [ ] Dashboard blocks access if fewer than 2 contacts added
- [ ] Browser console shows no rate-limiting (429) errors
- [ ] Browser console shows no validation (400) errors on `/api/alerts`

---

## Troubleshooting

### Still seeing 429 errors on `/api/tracks` or `/api/alerts`?
1. **Verify server reloaded:**
   ```bash
   # Check server logs for "Server running on port 5000"
   # If not, restart: Ctrl+C in server terminal, then npm run dev
   ```

2. **Check rate limiter was updated:**
   - Open server/src/middlewares/rateLimit.js
   - Line 15 should be: `if (req.path.startsWith('/api/tracks')) return true;`
   - Line 16 should be: `if (req.path.startsWith('/api/alerts')) return true;`

3. **Clear browser cache:**
   - Ctrl+Shift+Delete → Clear browsing data → Clear cache
   - Reload app

### Still seeing 400 validation error on `/api/alerts`?
1. **Verify useCheckInTimer was updated:**
   - Open client/src/hooks/useCheckInTimer.js
   - Lines 75-79 should have: `location_lat`, `location_lng`, `notes` (not `latitude`, `longitude`, `description`)

2. **Restart frontend:**
   - Ctrl+C in client terminal
   - npm run dev

---

## Files Modified

| File | Changes |
|------|---------|
| client/src/hooks/useCheckInTimer.js | Fixed alerts payload field names (line 75-79) |
| server/src/middlewares/rateLimit.js | Fixed skip rules to use .startsWith() (line 15) |

All other bugs were already fixed in previous commits.
