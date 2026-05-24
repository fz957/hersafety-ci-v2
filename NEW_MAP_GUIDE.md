# 🗺️ Nouvelle Carte Unifiée — Guide d'Utilisation

## Changements Effectués ✅

### Avant
```
Dashboard → "Carte de sécurité" (HomeMap)
   ├─ Recherche location ✓
   ├─ Cercles colorés ✓
   ├─ Position GPS ✓
   └─ Mais pas de recentrage correct

Reports → Carte simple
   ├─ Juste les zones dangereuses
   ├─ Pas de recherche
   └─ Pas d'interaction
```

### Après
```
Dashboard
   ❌ HomeMap SUPPRIMÉ
   
Reports → **CARTE COMPLÈTE** ✨
   ✅ Recherche de locations
   ✅ Cercles colorés (red/orange)
   ✅ Green circle (location cherchée)
   ✅ Blue marker (ta position)
   ✅ **FIT BOUNDS** (montre les 2 positions)
   ✅ Auto-mise à jour (30 secondes)
```

---

## Comment Ça Marche

### 1️⃣ **Ouvre la Page Reports**

```
Clique sur l'onglet "Signalements" dans la navigation
ou 
Vas à http://localhost:5173/reports
```

Tu verras:
- Search box en haut: "🔍 Chercher un endroit..."
- Map grande (400px de hauteur)
- Liste des signalements en bas

### 2️⃣ **Vois ta Position + Zones Dangereuses**

La map affiche:
- **🔵 Blue marker** = Toi (GPS)
- **🔴 Red circles** = Danger (2+ incidents)
- **🟠 Orange circles** = Medium risk (1 incident)

Taille des cercles = nombre d'incidents
- Plus gros = plus d'incidents

### 3️⃣ **Cherche une Location**

```
Type: "plateau"
↓
Vois 3 suggestions avec:
  • Nom
  • Sécurité (couleur)
  • Distance (km)
↓
Clique pour sélectionner
```

### 4️⃣ **Vois le Fit Bounds**

Quand tu cliques sur une suggestion:
- 🟢 Green circle apparaît
- Map zoom automatiquement
- Tu vois **À LA FOIS**:
  - 🔵 Toi (blue marker)
  - 🟢 Location cherchée (green circle)
  - 🔴🟠 Autres zones (red/orange)
- Distance visible entre toi et la location

---

## Explication Technique: Fit Bounds

**Avant:**
```javascript
mapRef.current.setView([location.lat, location.lng], 15)
// Centre uniquement sur la location cherchée
// Toi, tu disparais
```

**Après:**
```javascript
const bounds = L.latLngBounds(
  [position.lat, position.lng],      // Toi
  [location.lat, location.lng]        // Location cherchée
);
mapRef.current.fitBounds(bounds, { 
  padding: [50, 50], 
  maxZoom: 14 
});
// Montre les DEUX positions en même temps
// Map zoom automatiquement pour les montrer
```

---

## Exemple Complet

### Scénario: Tu es à Plateau, tu cherches Marché Adjamé

```
1. Tu ouvres Reports
   ↓ Map charge
   
2. Tu vois:
   🔵 Toi (ton GPS position)
   🔴 Marché Adjamé (danger zone, rouge)
   🟠 Plateau (medium zone, orange)
   
3. Tu tapes "marche"
   ↓ Suggestions apparaissent
   
4. Tu cliques "Marché du Plateau"
   ↓ Fit bounds active
   
5. Tu vois:
   🔵 Toi (blue marker, où tu es)
   🟢 Marché du Plateau (green circle, où tu as cherché)
   🟠 Autres zones (orange circles)
   ↓ Distance entre toi et le marché visible
   
6. Tu cliques sur le green circle
   ↓ Popup montre:
      - Nom: Marché du Plateau
      - Sécurité: 🟠 Dangereux
      - Description
```

---

## API Utilisées

```
GET /api/reports/categorized-locations
  → Cercles rouges/orange sur la map
  
GET /api/locations/search?query=...
  → Suggestions de recherche
  
GET /api/reports/generate-demo-data
  → Crée 5 incidents de démo
```

---

## Différence Avec L'Ancienne Map d'Urgence

### Emergency Page (inchangée)
```
- Affiche lieux SÛRS (police, pharmacie, hopital)
- Boutons d'appel rapide
- Pour les situations d'urgence
- Aucune recherche
```

### Reports Page (NOUVELLE, complète)
```
- Affiche ZONES DANGEREUSES (incidents)
- Recherche par nom/location
- Circles tailles variables
- Fit bounds sur recherche
- Pour connaître les zones à éviter
- Pour signaler des incidents
```

---

## Checklist Visuelle

Quand tu ouvres Reports → Map, tu dois voir:

- [ ] Search box en haut
- [ ] Map avec cercles (pas vide)
- [ ] Blue marker (ta position)
- [ ] Red circle (Marché Adjamé)
- [ ] Orange circles (autres zones)
- [ ] Popup info quand tu cliques

Quand tu cherches "plateau":

- [ ] Suggestions apparaissent
- [ ] "Plateau" en première suggestion
- [ ] Clique dessus
- [ ] Green circle apparaît
- [ ] Map fait zoom (fit bounds)
- [ ] Blue marker + green circle visibles
- [ ] Distance entre toi et plateau visible

---

## Problèmes Courants & Solutions

### Map vide (aucun cercle)
```
Solution:
1. Curl http://localhost:5000/api/reports/generate-demo-data
2. Refresh la page
3. Les 5 incidents devraient apparaître
```

### Green circle ne s'affiche pas
```
Solution:
1. Rafraîchis la page
2. Vérifies que tu as cliqué sur une suggestion
3. Check browser console (F12) pour les erreurs
```

### Map ne zoom pas sur fit bounds
```
Solution:
1. Vérifie que ta position (position GPS) est active
2. Vérifie que la location a des coordonnées valides
3. Essaie une autre location
```

### Position GPS vide
```
Solution:
1. Accorde la permission GPS au navigateur
2. Sur desktop, ça utilise la géolocalisation approx
3. Sur mobile, active "Location Services"
```

---

## Code Clés

### Fit Bounds (la nouveauté)
```javascript
const handleSelectLocation = (location) => {
  // Crée bounds qui incluent 2 points
  const bounds = L.latLngBounds(
    [position.lat, position.lng],      // Toi
    [location.lat, location.lng]        // Là où tu cherches
  );
  
  // Zoom automatique pour montrer les deux
  mapRef.current.fitBounds(bounds, {
    padding: [50, 50],  // 50px padding
    maxZoom: 14          // Pas de zoom ultra
  });
};
```

### Color Coding
```javascript
const getCategoryColor = (category) => {
  switch (category) {
    case 'unsafe':   return '#B71C1C'; // 🔴 Red
    case 'medium':   return '#FF8F00'; // 🟠 Orange
    default:         return '#757575'; // Grey
  }
};
```

---

## Prochains Ajouts (Optionnels)

1. **Heatmap** - Voir concentration de dangers
2. **Filtres** - Filtrer par type de danger
3. **Sauvegarde** - Favoris de locations
4. **Notifications** - Alerte à proximité de danger
5. **Routes sûres** - Suggestions de chemin

---

## Test Rapide (60 secondes)

```bash
# 1. Vérifie backend
curl http://localhost:5000/api/test

# 2. Créé démo data
curl http://localhost:5000/api/reports/generate-demo-data

# 3. Ouvre app
http://localhost:5173

# 4. Va à Reports (click l'onglet)

# 5. Tu devrais voir:
# - Map avec cercles
# - Blue marker (toi)
# - Red/orange circles (danger zones)

# 6. Test recherche:
# - Type "plateau" dans search
# - Clique suggestion
# - Green circle + fit bounds = SUCCÈS!
```

---

## Résumé des Changes

| Avant | Après |
|-------|-------|
| Dashboard: HomeMap simple | Dashboard: Rien (enlevé) |
| Reports: Carte basique | Reports: Carte complète |
| Pas fit bounds | Fit bounds implémenté |
| Pas cohérence visuelle | Cohérence Dashboard + Reports |

---

**Tous les changements sont en place!** ✨

Vas tester à: http://localhost:5173 → Reports

Enjoy! 🗺️

---

*Updated: May 24, 2026*  
*Status: Ready for Testing*
