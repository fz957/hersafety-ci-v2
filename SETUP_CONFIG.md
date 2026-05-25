# Configuration Setup — HerSafety CI

Le `.env` est créé avec des defaults de développement. Tu dois compléter 3 secrets:

## 1️⃣ Firebase Service Account (Backend)

**Obtenir la clé:**
1. Va sur [Firebase Console](https://console.firebase.google.com) → Select "safety-510e8" project
2. ⚙️ Settings → Project Settings
3. Service Accounts tab
4. "Generate New Private Key" → Download JSON
5. Copie le contenu du fichier JSON

**Intégrer:**
1. Renomme `firebase-service-account.json.template` → `firebase-service-account.json`
2. Remplace tout le contenu par le JSON téléchargé
3. Save

**Vérifier:**
```bash
cat firebase-service-account.json | head -5  # Doit voir "type": "service_account"
```

---

## 2️⃣ Firebase VAPID Key (Frontend)

**Obtenir la clé:**
1. Firebase Console → Messaging
2. "Web configuration"
3. Copie la "Web API Key" (ressemble à `ABcd_XyZ...`)

**Intégrer dans .env:**
```bash
VITE_FIREBASE_VAPID_KEY=ABcd_XyZ...
```

---

## 3️⃣ Email (Mailtrap pour dev)

**Créer compte gratuit:**
1. Va sur [Mailtrap.io](https://mailtrap.io) → Sign up FREE
2. Crée un inbox (ex: "HerSafety Dev")
3. Va dans Settings → SMTP Settings
4. Tu vois:
   ```
   User: 1234567890abcdef
   Pass: 1234567890abcdef
   ```

**Intégrer dans .env:**
```bash
MAILTRAP_USER=1234567890abcdef
MAILTRAP_PASSWORD=1234567890abcdef
```

---

## ✅ Vérifier tout est prêt:

```bash
# 1. DB migrations
npm run migrate

# 2. Démarre backend
cd server && npm run dev

# 3. Démarre frontend (autre terminal)
cd client && npm run dev
```

**Test complet:**
1. Ouvre http://localhost:5173
2. Crée un compte
3. Ajoute un contact avec email
4. Mailtrap reçoit le verification email
5. Clique le lien dans Mailtrap
6. Déclenche alerte → Mailtrap reçoit notification email ✓

---

## 🔒 Production (plus tard)

Change simplement:
```bash
# .env
EMAIL_PROVIDER=gmail  # ou sendgrid
EMAIL_USER=real@gmail.com
EMAIL_PASSWORD=real-app-password

APP_MODE=production
```

C'est tout! Code reste identique.
