# 🔧 Configuration des Ports — HerSafety CI

## 🚨 Problème: "Connection refused" ou "ERR_CONNECTION_REFUSED"

Cause: **Ports non synchronisés** entre le client et le serveur

---

## ✅ Solution: Vérifier la synchronisation

### **Avant de démarrer les serveurs, TOUJOURS exécuter:**
```bash
node scripts/verify-ports.js
```

Le script vérifiera:
- ✓ `root/.env` PORT
- ✓ `server/.env` PORT
- ✓ `server/.env` APP_URL
- ✓ `client/.env.development` VITE_API_URL

---

## 📋 Configuration Actuelle (May 30, 2026)

| Fichier | Clé | Valeur | Port |
|---------|-----|--------|------|
| `root/.env` | PORT | 5001 | ✓ |
| `root/.env` | APP_URL | http://localhost:5001 | ✓ |
| `server/.env` | PORT | 5001 | ✓ |
| `server/.env` | APP_URL | http://localhost:5001 | ✓ |
| `client/.env.development` | VITE_API_URL | http://localhost:5001 | ✓ |

**Tous les ports sont synchronisés ✅**

---

## 🔄 Si tu changes le PORT

**Scenario: Changer de 5001 à 3000**

### 1️⃣ Édite `root/.env`:
```diff
- PORT=5001
+ PORT=3000

- APP_URL=http://localhost:5001
+ APP_URL=http://localhost:3000
```

### 2️⃣ Édite `server/.env`:
```diff
- PORT=5001
+ PORT=3000

- APP_URL=http://localhost:5001
+ APP_URL=http://localhost:3000
```

### 3️⃣ Édite `client/.env.development`:
```diff
- VITE_API_URL=http://localhost:5001
+ VITE_API_URL=http://localhost:3000
```

### 4️⃣ Vérifie la synchronisation:
```bash
node scripts/verify-ports.js
```

### 5️⃣ Redémarrage complet:
```bash
# Tuer tous les processus Node
taskkill /IM node.exe /F

# Redémarrer (dans deux terminaux différents)
cd server && npm run dev
cd client && npm run dev
```

---

## 🐛 Erreurs courantes

### ❌ "Failed to load resource: net::ERR_CONNECTION_REFUSED"
**Cause:** Client essaie de se connecter à un port différent que celui du serveur

**Fix:**
1. Vérifier: `node scripts/verify-ports.js`
2. Corriger les ports incohérents
3. Tuer et redémarrer les serveurs

### ❌ "Error: listen EADDRINUSE: address already in use :::5001"
**Cause:** Processus Node ancien toujours actif sur le port

**Fix:**
```bash
# Tuer tous les processus Node
taskkill /IM node.exe /F

# Attendre 3 secondes
timeout /t 3

# Redémarrer
cd server && npm run dev
```

### ❌ Email service crash: "Maximum call stack size exceeded"
**Cause:** Logger helper avec boucle infinie

**Fix:** 
- ✅ Déjà corrigé (May 30, 2026)
- Vérifier que `email.service.js` ligne 10 a:
  ```javascript
  const log = (...args) => isDev && console.log(...args);
  ```

---

## 📚 Documentation CLAUDE.md

Section complète ajoutée: **§13. Configuration des Ports**

Voir: CLAUDE.md ligne ~495

---

## 🚀 Démarrage rapide

```bash
# Vérifier les ports
node scripts/verify-ports.js

# Si tout est OK, démarrer:
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend  
cd client && npm run dev

# Application disponible: http://localhost:5175
```

---

## 💾 Fichiers concernés

- `.env` — Configuration globale
- `server/.env` — Override serveur
- `client/.env.development` — Configuration frontend
- `scripts/verify-ports.js` — Vérification automatique
- `scripts/start-dev.sh` — Script de démarrage (bash)

---

## ✨ Résumé

✅ **PORT Configuration Fixed** (May 30, 2026)
- Changed from mixed 5000/5004 to unified **5001**
- Created `verify-ports.js` script to prevent future mismatches
- Updated CLAUDE.md with configuration documentation
- All files synchronized and tested

**Next time:** Run `node scripts/verify-ports.js` before starting!
