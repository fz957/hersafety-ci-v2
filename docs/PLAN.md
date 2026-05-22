# HerSafety CI — PLAN.md v1.0

# Capstone : Engineering with Claude Code — Juin 2026

## Vue d'ensemble

Ce document décrit le plan de développement étape par étape pour HerSafety CI.
Il suit la méthodologie du cours : CLAUDE.md d'abord, puis passes Critic et Architect,
puis développement feature par feature avec tests.

\---

## Stack retenue

* Backend : Node.js + Express + Knex + PostgreSQL
* Frontend : React (Vite)
* Auth : JWT cookies httpOnly
* Tests : Jest + Supertest
* Deploy : Docker + nginx + PM2 + VPS
* CI/CD : GitHub Actions

\---

## Schéma multi-tenant

Toutes les tables métier contiennent organization\_id.
Le middleware tenant.js injecte et vérifie organization\_id sur chaque requête.

### Tables principales

organizations — tenants (ONG, entreprises, universités)
users — appartiennent à une organization
contacts — contacts de confiance d'un user
alerts — alertes déclenchées par un user
tracks — sessions de surveillance trajet
checkins — check-ins pendant un trajet
safe\_places — lieux sûrs manuels par org
emergency\_numbers — numéros urgence (globaux)
sms\_logs — logs des SMS envoyés
testimonies — témoignages communauté
testimony\_reactions — réactions aux témoignages
reports — signalements lieux et chauffeurs
login\_attempts — tentatives de connexion (anti brute force)
system\_logs — logs système pour admin

\---

## Phase 1 — Setup et authentification (Semaine 1)

### Étape 1.1 — Initialisation projet

* Créer monorepo avec /server et /client
* Configurer Docker Compose (app + postgres)
* Configurer Knex avec migrations
* Configurer Jest + Supertest
* Configurer GitHub Actions CI

### Étape 1.2 — Migrations base de données

* Migration organizations
* Migration users
* Migration contacts
* Migration emergency\_numbers (données initiales)
* Migration login\_attempts

### Étape 1.3 — Authentification

* POST /api/auth/register (avec code organisation)
* POST /api/auth/login (JWT httpOnly)
* POST /api/auth/logout
* POST /api/auth/refresh
* Middleware requireAuth
* Middleware requireTenant
* Middleware requireAdmin
* Tests : auth.test.js, tenant.test.js

### Étape 1.4 — Frontend auth

* Landing page React
* Page Login
* Page Register
* Hook useAuth
* Service api.js (Axios avec credentials)

\---

## Phase 2 — Core sécurité (Semaine 2)

### Étape 2.1 — Contacts de confiance

* Migrations contacts
* Routes /api/contacts (GET, POST, DELETE)
* Tests contacts.test.js
* Composant ContactManager (Android API + saisie manuelle)
* Page Onboarding

### Étape 2.2 — Dashboard et niveaux urgence

* Composant Dashboard avec 4 boutons
* Hook useEmergency (logique niveaux)
* Feedback visuel (vibration + couleur)
* Badge MODE TEST

### Étape 2.3 — Alertes et SMS

* Migration alerts, sms\_logs
* Route POST /api/alerts
* Route POST /api/sms/alert
* Service sms.service.js (Africa's Talking sandbox)
* Tests alerts.test.js

### Étape 2.4 — Assistant IA Claude

* Route POST /api/claude/assist
* Service claude.service.js
* Message fallback si API indisponible
* Composant AIAssistant

\---

## Phase 3 — Écran urgence et trajet (Semaine 3)

### Étape 3.1 — Lieux sûrs OpenStreetMap

* Route GET /api/places
* Service places.service.js (Overpass API)
* Cache 5 minutes
* Rayon 1km → 2km si vide
* Composant SafePlacesList

### Étape 3.2 — Écran urgence complet

* Page Emergency (niveaux 3 et 4)
* Bloc IA + numéros + lieux + VTC
* Deep links Yango/Bolt/InDriver
* Bouton escalade

### Étape 3.3 — Surveillance trajet

* Migration tracks, checkins
* Routes /api/tracks
* Hook useGPS
* Check-ins automatiques toutes les 10 min
* Alerte après 2 check-ins sans réponse
* Tests tracks.test.js

\---

## Phase 4 — Communauté et admin (Semaine 4)

### Étape 4.1 — Témoignages

* Migration testimonies, testimony\_reactions
* Routes /api/testimonies (CRUD + modération)
* Page Community
* Composant TestimonyCard

### Étape 4.2 — Signalements

* Migration reports
* Routes /api/reports
* Page Reports
* Carte zones dangereuses

### Étape 4.3 — Interface admin tenant

* Routes /api/admin/\* (protégées role=admin)
* Pages admin/\* (dashboard, users, testimonies, reports)
* Isolation par organization\_id

### Étape 4.4 — Super admin

* Routes /api/superadmin/\*
* Pages superadmin/\* (organisations, stats globales)

\---

## Phase 5 — Déploiement (Semaine 5)

### Étape 5.1 — Docker production

* Dockerfile server
* Dockerfile client (build statique)
* docker-compose.prod.yml
* Variables d'environnement production

### Étape 5.2 — VPS + nginx

* Provisionner VPS (DigitalOcean/Hetzner)
* Installer Docker + nginx + PM2
* Configurer nginx reverse proxy
* Let's Encrypt HTTPS

### Étape 5.3 — CI/CD GitHub Actions

* Workflow : tests à chaque push
* Workflow : deploy sur merge main
* Badges README

### Étape 5.4 — Finalisation capstone

* README complet avec captures d'écran
* Tests >= 70% couverture vérifiée
* Demo live préparée
* Repo GitHub public

\---

## Tests prioritaires

1. Isolation cross-tenant : user org A ne voit pas données org B
2. Auth : routes protégées refusent sans token valide
3. Brute force : blocage après 5 tentatives
4. Alerts : création alerte déclenche SMS sandbox
5. Contacts : max 5 par utilisatrice
6. Tracks : check-in met à jour le trajet
7. Admin : user normal ne peut pas accéder à /admin
8. Témoignages : pending avant approbation admin

\---

## Numéros urgence Côte d'Ivoire (données initiales)

Police nationale : 110
Gendarmerie nationale : 111
Sapeurs-pompiers : 180
SAMU : 185
Ligne VBG Ministère Femme : 1308

