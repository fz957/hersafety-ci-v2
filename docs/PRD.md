\# HerSafety CI — PRD v3.0

\# Capstone : Engineering with Claude Code — Juin 2026



\## Pitch



HerSafety CI est une plateforme SaaS multi-tenant de sécurité personnelle

pour femmes en Côte d'Ivoire. Des organisations (ONG, entreprises, universités)

souscrivent et déploient l'app pour leurs membres, employées ou étudiantes.



\## Contexte



43% des femmes victimes de harcèlement sexuel à Abidjan en 2024.

920 viols déclarés la même année. HerSafety CI répond à ce besoin

via des organisations partenaires qui garantissent l'accès.



\## Architecture multi-tenant



Chaque organisation = un tenant isolé.

\- ONG de protection des femmes

\- Entreprises (pour leurs employées)

\- Universités (pour leurs étudiantes)



Isolation totale : un utilisateur d'un tenant ne voit jamais

les données d'un autre tenant.



\## Personas



Awa, 24 ans, étudiante — Université FHB

Son université a souscrit. Rentre seule le soir.

Utilise niveau 1 au quotidien, niveau 3 si danger.



Mariam, 34 ans, commerçante — ONG partenaire

Travaille au marché d'Adjamé. A été harcelée.

Utilise niveaux 2 et 3.



Kadiatou, 28 ans — Employée entreprise partenaire

Partage ses expériences anonymement sur la plateforme communautaire.



Mme Koné — Admin tenant ONG

Gère les comptes de son organisation.

Dashboard stats et modération.



Super Admin (développeuse)

Gère toutes les organisations.

Stats globales. Approuve inscriptions.



\## Fonctionnalités



\### PRIORITÉ 1 — MVP



F1 - Landing page publique avec mode démo

F2 - Authentification JWT httpOnly, blocage 5 tentatives

F3 - Contacts de confiance (max 5, Android API ou saisie manuelle)

F4 - Dashboard 4 niveaux, badge MODE TEST en dev

F5 - Niveaux urgence (tap / tap / appui 3s / double pression)

F6 - Assistant IA Claude côté serveur uniquement

F7 - Surveillance trajet GPS + check-ins 10 min



\### PRIORITÉ 2



F8 - Écran urgence niveaux 3 et 4 (même interface)

&#x20;    Bloc 1 : assistant IA

&#x20;    Bloc 2 : numéros 110/111/180/185/1308

&#x20;    Bloc 3 : lieux sûrs OpenStreetMap rayon 1km

&#x20;    Bloc 4 : VTC deep links Yango/Bolt/InDriver

&#x20;    Bouton escalade niveau supérieur



F9 - Alertes SMS Africa's Talking (sandbox dev, réel prod)

F10 - Lieux sûrs OpenStreetMap rayon 1km élargi à 2km

F11 - Transport VTC deep links



\### PRIORITÉ 3 — COMMUNAUTÉ



F12 - Témoignages anonymes ou non, modération admin

F13 - Signalements lieux et chauffeurs, carte zones dangereuses



\### PRIORITÉ 4



F14 - Enregistrement audio (nécessite app native)



\## Interface admin tenant



role = admin, même organization\_id

Dashboard stats, gestion utilisatrices, modération témoignages



\## Interface super admin



role = superadmin uniquement

Toutes les organisations, stats globales, approbations



\## Exigences techniques capstone



\- Tests Jest + Supertest >= 70% couverture

\- Isolation cross-tenant testée

\- Docker + nginx + PM2 sur VPS

\- GitHub Actions CI/CD

\- HTTPS Let's Encrypt

\- Repo GitHub public avec README



\## Hors-scope v1



Mobile Money, audio natif, géoloc contacts temps réel,

app native, multi-langue

