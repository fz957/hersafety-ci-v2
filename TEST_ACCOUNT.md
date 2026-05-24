# 🧪 TEST ACCOUNT & DATA

## Quick Test Setup

### Test Account Created ✅
- **Email:** test@test.com  
- **Organization:** Test Org (auto-created)
- **Role:** User

### Test Data Created ✅
4 signalements (reports) added to the map:

| Lieu | Type | Status | Latitude | Longitude |
|------|------|--------|----------|-----------|
| Marché Adjamé | Agression | ✅ Verified | 6.8350 | -5.2900 |
| Marché Adjamé | Vol | ✅ Verified | 6.8350 | -5.2900 |
| Plateau Abidjan | Harcèlement | ✅ Verified | 6.8405 | -5.2950 |
| Cocody Abidjan | Suivi | ⏳ Pending | 6.8280 | -5.2750 |

## How to Test

### Step 1: Register via UI
1. Open http://localhost:5173
2. Click "Créer un compte" (Register)
3. Fill in:
   - **Nom:** Your name
   - **Email:** Any email you want
   - **Mot de passe:** Any password (min 8 chars)
4. Click "S'inscrire"

### Step 2: Complete Onboarding
1. **Add emergency numbers** (required):
   - 110 (Police)
   - 111 (Pompiers)
2. **Add 2+ emergency contacts**:
   - Click + Ajouter
   - Add contact names/numbers
3. Click "Continuer"

### Step 3: Go to Dashboard
1. You should be redirected automatically
2. Grant GPS permission when prompted
3. See "Carte de sécurité" with:
   - 🔵 Blue marker = Your location
   - 🔴 Red circle = Marché Adjamé (2 verified reports)
   - 🟠 Orange circle = Plateau (1 report)

### Step 4: Interact with Map
1. Click on any red/orange marker
2. See incident details:
   - Place name
   - Address
   - Number of reports
   - Types of dangers

---

## 🔄 Real-Time Tracking Features

✅ **Your Position Updates Every 30 Seconds**
- GPS auto-tracks your movement
- Map centers on your location
- Coordinates shown at top

✅ **Incident Markers Update**
- New reports appear automatically (after admin verification)
- Markers grow larger with more incidents
- Color changes: Pending (orange) → Verified (red)

✅ **Live Statistics**
- "Dangereuse (2)" = 2 red zones
- "Risque modéré (1)" = 1 orange zone
- Updates in real-time

---

## 📍 Current Map Display

**Markers Near You:**
- 🔴 **Marché Adjamé** (RED - 2 verified)
  - Agression physique + Vol
  - 0.5 km from Abidjan center

- 🟠 **Plateau Abidjan** (ORANGE - 1 verified)
  - Harcèlement verbal
  - 1.2 km from center

- 🟠 **Cocody Abidjan** (ORANGE - 1 pending)
  - Suivi
  - 0.8 km from center

---

## 🧪 Additional Testing

### Test GPS Permission Denial
1. Refresh page
2. Deny GPS permission
3. Should show: "Localisation en attente..."
4. Map centers on Abidjan default (6.8276, -5.2893)

### Test Network Error
1. Stop backend server: `Ctrl+C`
2. Try to load map
3. Should show: "Erreur chargement carte"
4. Restart server to recover

### Test Empty Map
1. Navigate to a different location (if possible)
2. Map will load with no incidents nearby
3. Shows: "Zones sûres ✓ Aucun signalement..."

---

## 💡 Pro Tips

- **Map auto-centers on you** - No need to search
- **Markers clickable** - Click for details
- **Updates every 30 seconds** - Real-time data
- **Works offline** - GPS doesn't need internet
- **Mobile-friendly** - Full responsive design

---

## ✅ What You Should See

```
┌─────────────────────────────────────┐
│ ✓ 6.8276° · -5.2893°        🔄 Now │
│                                     │
│ Legend: 🔵 Position ✓               │
│         🔴 Dangereuse (2)           │
│         🟠 Risque modéré (1)        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │                      🟠     │   │
│  │   🔴 🔴                     │   │
│  │     🔵 (you are here)       │   │
│  │                            │   │
│  └─────────────────────────────┘   │
│                                     │
│ Click on markers to see details     │
│ Auto-updates every 30 seconds       │
└─────────────────────────────────────┘
```

---

## 🔐 Security Note

- Test account is **only for this organization**
- Real incidents in your area **won't be visible** to test users in other orgs
- Each organization sees **only its own reports**
- This is multi-tenant isolation in action

---

## 📱 Mobile Testing

If testing on mobile:
1. Use device's location services
2. Map will update as you move
3. Real-time GPS tracking enabled
4. See which areas are safe/dangerous near you

---

**Ready to test? Go to http://localhost:5173 and register!** 🚀
