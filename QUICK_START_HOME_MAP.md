# 🗺️ Home/Map Feature — Quick Start Guide

## What Just Happened?

You now have a **real-time safety map** on your Dashboard that shows:
- 🔴 **Red zones** = Dangerous areas (2+ reports)
- 🟠 **Orange zones** = Medium risk (1 report or pending)
- 🔵 **Blue dot** = Your current location

The map **updates automatically** when users report incidents via the "Signaler" section.

---

## 🚀 How to Test It Right Now

### Step 1: Open the App
```
Open: http://localhost:5173
Log in with your account
Navigate to Dashboard
```

### Step 2: Grant GPS Permission
When asked: **"Allow location access?"** → Click **Yes**
- Shows your position on map
- Enables GPS-based reporting

### Step 3: See the "Carte de Sécurité" Section
At the top of Dashboard (above "Comment tu te sens ?"):
- Map shows Abidjan area
- Legend shows: Dangereuse (count), Risque modéré (count), Sûre

### Step 4: Add a Test Report
```
1. Click "Signaler" menu → Reports page
2. Click "+ Signaler" tab
3. Select "📍 Lieu dangereux"
4. Fill form:
   - Nom du lieu: "Test Market"
   - Adresse: "Adjamé, Abidjan"
   - Type: "Agression physique"
   - Description: "This is a test report"
   - Check "Anonyme"
5. Click "Envoyer le signalement"
```

### Step 5: Admin Verification (Optional)
If you're an admin:
```
1. Navigate to /admin
2. Go to "Reports" tab
3. Find your test report (status: pending)
4. Click verify
5. Change status to "verified"
```

### Step 6: See Your Report on the Map
```
1. Go back to Dashboard
2. New marker appears on map
3. Click the marker to see:
   - Place name
   - Address
   - "1 signalement vérifié"
   - "Voir les détails" button
```

---

## 📊 What the Colors Mean

| Color | Meaning | Example |
|-------|---------|---------|
| 🔴 Red | Confirmed danger | 3 assault reports at same location |
| 🟠 Orange | Under watch | New report waiting for verification |
| 🔵 Blue | You are here | Your GPS location |
| ⚪ None | Safe | Area with no incident reports |

---

## ✨ Key Features

### Automatic Categorization
- **0 reports** → Map shows "Zones sûres ✓"
- **1 report** → Orange zone (if verified)
- **2+ reports** → Red zone (confirmed danger)

### Real Data From Your Community
The map shows **actual incidents reported by users**:
- Harcèlement verbal (verbal harassment)
- Agression physique (physical assault)
- Agression sexuelle (sexual assault)
- Vol (theft)
- Suivi (stalking)
- Détour forcé (forced detour)

### Interactive Markers
Click any marker to see:
- Place name
- Full address
- Number of reports
- Types of dangers
- Link to full report details

### GPS Integration
- Shows your current position
- Auto-detects location for reports
- Filters results within 5km radius
- Calculates distance to danger zones

---

## 🔄 Real-Time Updates

**When a new report is submitted:**
1. User: Reports incident → Status: **pending**
2. Admin: Verifies report → Status: **verified**
3. All users: Next dashboard load shows **new marker on map**

**When reports are verified:**
- Location appears in **red** (if 2+ incidents)
- Location appears in **orange** (if 1 incident)

---

## 💡 Tips & Tricks

### To Submit an Accurate Report
```
1. Enable GPS before reporting
2. Report while at the location (for accuracy)
3. Fill in detailed description
4. Mark as "Anonyme" for privacy
5. Submit immediately
```

### To See More Details
```
1. Click any marker on the map
2. Click "Voir les détails"
3. View full incident reports
4. Read what other users reported
```

### To Find Safe Locations
```
1. Look at the map legend
2. Avoid red zones (confirmed danger)
3. Be cautious in orange zones (pending reports)
4. Green will show safe places (coming soon)
```

---

## 🆘 Troubleshooting

### "Map not loading"
- Check GPS permission in browser settings
- Refresh page
- Zoom out if you're viewing too close

### "No locations showing"
- You may be in a safe area (no reports yet) ✓
- Try zooming out to see broader area
- Submit a test report to see it appear

### "Map centered on wrong location"
- Browser didn't detect your location
- Map defaults to Abidjan center
- Click location permission icon and try again

### "Report not showing on map"
- Report status is "pending" (not yet verified)
- Wait for admin to verify it
- Refresh page after verification

---

## 📱 Mobile vs Desktop

### Mobile (Phone)
```
✓ Better GPS accuracy
✓ Easier to report on the go
✓ Full-screen map view
✓ Touch-friendly markers
✓ Auto-location capture
```

### Desktop (Computer)
```
✓ Easier to browse reports
✓ Full admin controls
✓ Better for verification
⚠ Manual location entry for reports
```

---

## 🎯 Best Practices

### For Users
1. **Always enable GPS** - More accurate reporting
2. **Be descriptive** - Help others understand the danger
3. **Report immediately** - Fresh reports are more useful
4. **Check before traveling** - See what areas have reports

### For Community Leaders
1. **Verify reports promptly** - Shows on map when verified
2. **Use admin dashboard** - Manage all reports
3. **Communicate with users** - Explain verification decisions
4. **Monitor trends** - Track dangerous areas over time

---

## 📞 Need Help?

If something isn't working:
1. Check browser console (F12) for errors
2. Verify GPS permission is granted
3. Ensure both servers are running:
   - Backend: `http://localhost:5000`
   - Frontend: `http://localhost:5173`
4. Clear browser cache and reload

---

## 🎉 You're All Set!

The home/map feature is **live and ready to use**. Start by:
1. Opening the Dashboard
2. Allowing GPS access
3. Submitting a test report
4. Watching it appear on the map

Your community's real-time safety data is now visible to everyone!

---

**Questions or issues?** Check `HOME_MAP_FEATURE.md` for detailed technical documentation.
