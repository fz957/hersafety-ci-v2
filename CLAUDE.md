\# HerSafety CI — CLAUDE.md v3.0

\# Stack : Node.js + Express + Knex + PostgreSQL + React

\# Architecture : Multi-tenant



\## 1. Contexte du projet



HerSafety CI est une plateforme SaaS multi-tenant de sécurité personnelle pour femmes

en Côte d'Ivoire. Elle est déployée par des organisations (ONG, entreprises, universités)

pour protéger leurs membres, employées ou étudiantes lors de leurs déplacements.



Chaque organisation = un tenant isolé. Une utilisatrice d'une ONG ne voit jamais

les données d'une utilisatrice d'une entreprise.



\## 2. Stack technique EXACTE



\- Backend : Node.js + Express.js

\- ORM : Knex.js

\- Base de données : PostgreSQL (Docker local en dev, VPS en prod)

\- Frontend : React (Vite)

\- Authentification : JWT avec cookies httpOnly

\- Tests : Jest + Supertest (couverture >= 70%)

\- Déploiement : Docker + nginx + PM2 sur VPS

\- CI/CD : GitHub Actions

\- HTTPS : Let's Encrypt via nginx



\## 3. Architecture multi-tenant



\- Organization = le tenant (ONG, entreprise, université)

\- Admin tenant = responsable de l'organisation

\- Super admin = gère toutes les organisations

\- User = appartient à UNE seule organisation

\- Toutes les tables métier ont une colonne organization\_id

\- Toutes les requêtes Knex filtrent TOUJOURS par organization\_id

\- Middleware requireTenant vérifie l'appartenance à chaque requête



Types d'organisations : ONG, entreprises, universités



\## 4. Structure des dossiers



hersafety-ci-v2/

&#x20; server/

&#x20;   src/

&#x20;     app.js

&#x20;     server.js

&#x20;     db/

&#x20;       knex.js

&#x20;       migrations/

&#x20;     middlewares/

&#x20;       auth.js

&#x20;       tenant.js

&#x20;       admin.js

&#x20;       rateLimit.js

&#x20;     routes/

&#x20;       auth.js

&#x20;       users.js

&#x20;       organizations.js

&#x20;       alerts.js

&#x20;       contacts.js

&#x20;       tracks.js

&#x20;       places.js

&#x20;       sms.js

&#x20;       claude.js

&#x20;       testimonies.js

&#x20;       reports.js

&#x20;       admin.js

&#x20;     services/

&#x20;       sms.service.js

&#x20;       claude.service.js

&#x20;       places.service.js

&#x20;   tests/

&#x20;     auth.test.js

&#x20;     tenant.test.js

&#x20;     alerts.test.js

&#x20;     contacts.test.js

&#x20;   package.json

&#x20; client/

&#x20;   src/

&#x20;     main.jsx

&#x20;     App.jsx

&#x20;     pages/

&#x20;       Landing.jsx

&#x20;       Login.jsx

&#x20;       Register.jsx

&#x20;       Onboarding.jsx

&#x20;       Dashboard.jsx

&#x20;       Emergency.jsx

&#x20;       Tracking.jsx

&#x20;       Community.jsx

&#x20;       Reports.jsx

&#x20;       admin/

&#x20;         AdminDashboard.jsx

&#x20;         AdminUsers.jsx

&#x20;         AdminOrgs.jsx

&#x20;         AdminTestimonies.jsx

&#x20;         AdminReports.jsx

&#x20;     components/

&#x20;       ui/

&#x20;       emergency/

&#x20;       dashboard/

&#x20;     hooks/

&#x20;       useAuth.js

&#x20;       useGPS.js

&#x20;       useEmergency.js

&#x20;     services/

&#x20;       api.js

&#x20;       auth.js

&#x20;   package.json

&#x20; docs/

&#x20;   PRD.md

&#x20;   PLAN.md

&#x20; nginx/

&#x20;   nginx.conf

&#x20; docker-compose.yml

&#x20; .github/

&#x20;   workflows/

&#x20;     ci.yml

&#x20; CLAUDE.md

&#x20; .gitignore

&#x20; README.md



\## 5. Authentification JWT httpOnly



\- Token JWT dans cookie httpOnly uniquement - jamais localStorage

\- Expiration : 24h

\- Refresh token : 7 jours

\- Cookie contient : userId, organizationId, role

\- Middleware requireAuth sur toutes les routes protégées

\- Blocage après 5 tentatives échouées (table login\_attempts)



\## 6. Niveaux d'urgence



\- Niveau 1 Vigilance : tap -> GPS + check-ins 10 min

\- Niveau 2 Malaise : tap -> SMS discret contacts

\- Niveau 3 Danger : appui long 3 sec -> SMS + GPS + écran urgence

\- Niveau 4 SOS : double pression -> même + appel auto 110 (simulé en dev)

\- Niveaux 3 et 4 : MÊME écran affiché



\## 7. Écran urgence (niveaux 3 et 4)



1\. Assistant IA Claude - message rassurant + guidage respiratoire

2\. Numéros urgence : 110, 111, 180, 185, 1308 - bouton Appeler 1 tap

3\. 2-3 lieux sûrs OpenStreetMap - Y aller + Appeler

4\. Apps VTC deep link destination pré-remplie

5\. Bouton escalade niveau supérieur



\## 8. Contacts de confiance



\- Maximum 5 contacts par utilisatrice

\- Android : Contact Picker API navigateur

\- iPhone et ordinateur : saisie manuelle

\- SEULS destinataires des alertes SMS



\## 9. Mode développement vs production



Variable : APP\_MODE=development ou production



development :

\- Appels urgence simulés

\- SMS sandbox Africa's Talking uniquement

\- Badge MODE TEST visible



production :

\- Tout est réel

\- Aucun badge



\## 10. Endpoints API principaux



Auth :

\- POST /api/auth/register

\- POST /api/auth/login

\- POST /api/auth/logout

\- POST /api/auth/refresh



Organizations :

\- POST /api/organizations

\- GET /api/organizations

\- PATCH /api/organizations/:id

\- DELETE /api/organizations/:id



Users :

\- GET /api/users/me

\- PATCH /api/users/me

\- GET /api/users (admin)

\- PATCH /api/users/:id/status (admin)



Contacts :

\- GET /api/contacts

\- POST /api/contacts

\- DELETE /api/contacts/:id



Alerts :

\- POST /api/alerts

\- GET /api/alerts

\- PATCH /api/alerts/:id/resolve



Tracks :

\- POST /api/tracks

\- PATCH /api/tracks/:id/checkin

\- PATCH /api/tracks/:id/end



Places :

\- GET /api/places?lat=X\&lng=Y\&radius=1000



SMS :

\- POST /api/sms/alert



Claude IA :

\- POST /api/claude/assist



Testimonies :

\- GET /api/testimonies

\- POST /api/testimonies

\- PATCH /api/testimonies/:id (admin)



Reports :

\- GET /api/reports

\- POST /api/reports

\- PATCH /api/reports/:id/verify (admin)



Emergency Numbers :

\- GET /api/emergency-numbers



\## 11. Sécurité - règles absolues



1\. JWT dans cookies httpOnly uniquement - jamais localStorage

2\. Toutes les routes protégées par requireAuth

3\. Toutes les routes métier filtrées par organization\_id

4\. Clés API côté serveur uniquement

5\. Rate limiting : 10 req/min/IP

6\. Validation inputs avec Joi

7\. Uniquement Knex query builder - pas de SQL dynamique

8\. helmet.js sur toute l'app Express

9\. CORS configuré pour le domaine de l'app uniquement

10\. Logs tentatives connexion échouées

11\. Blocage après 5 tentatives

12\. HTTPS via nginx + Let's Encrypt

13\. Jamais logger position GPS ou numéros de téléphone

14\. Variables env vérifiées au démarrage



\## 12. Tests obligatoires Jest + Supertest



\- Couverture >= 70% sur fichiers métier

\- Isolation cross-tenant : org A ne voit pas données org B

\- Auth : routes protégées refusent sans token

\- Chemins critiques : création alerte, SMS, check-in

\- Rôles : admin peut, user ne peut pas



\## 13. Configuration des Ports (IMPORTANT!)

⚠️ **CRITICAL**: Deux fichiers `.env` doivent rester synchronisés:
- `root/.env` — configuration globale
- `server/.env` — override spécifique au serveur

**Port actuel (5001):**
```
root/.env: PORT=5001, APP_URL=http://localhost:5001
server/.env: PORT=5001, APP_URL=http://localhost:5001
client/.env.development: VITE_API_URL=http://localhost:5001
```

**Si tu changes le PORT:**
1. Change `root/.env` → `PORT=XXXX`
2. Change `server/.env` → `PORT=XXXX` ET `APP_URL=http://localhost:XXXX`
3. Change `client/.env.development` → `VITE_API_URL=http://localhost:XXXX`
4. Redémarrer les deux serveurs: `npm run dev` (server) et `npm run dev` (client)

**Script de vérification (optionnel):**
```bash
node scripts/verify-ports.js
```

\## 14. Variables d'environnement (.env)



DATABASE\_URL=postgresql://postgres:postgres@localhost:5432/hersafety

JWT\_SECRET=

JWT\_REFRESH\_SECRET=

JWT\_EXPIRES\_IN=24h

ANTHROPIC\_API\_KEY=

AFRICASTALKING\_API\_KEY=

AFRICASTALKING\_USERNAME=

APP\_MODE=development

APP\_URL=http://localhost:3000

PORT=5000

FRONTEND\_URL=http://localhost:5173



\## 14. Conventions de code



\- CommonJS (require/module.exports) côté serveur

\- ESM (import/export) côté client React

\- camelCase pour variables et fonctions

\- PascalCase pour composants React

\- UPPER\_SNAKE pour constantes

\- Toujours try/catch

\- Retourner { success, data, error } depuis les API

\- Commentaires en français

\- Pas de console.log en production



\## 15. Design frontend



\- Fond : #0D0D0D

\- Primaire : #C2185B (rose foncé)

\- Secondaire : #880E4F (bordeaux)

\- Accent : #F48FB1 (rose clair)

\- Urgence : #B71C1C (rouge)

\- Sécurité : #1B5E20 (vert)

\- Texte : #FFFFFF

\- Zones de tap minimum 48x48px

\- Utilisable d'une seule main

\- Lisible en plein soleil

