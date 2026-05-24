# HerSafety CI — Women's Personal Safety Platform

A multi-tenant SaaS application for women's personal safety in Côte d'Ivoire. Combines AI guidance, emergency alerts, community reporting, and real-time tracking.

**Tech Stack**: Node.js + Express + PostgreSQL + React + Vite | Docker | GitHub Actions | Render

---

## Features (v2 - Demo Ready)

✅ **AI Psychologist Assistant** — Claude AI with conversation history for empathetic guidance  
✅ **Check-in System** — Automatic safety check-ins every 10 minutes with auto-escalation  
✅ **Emergency Screen** — One-tap calling, safe places map, VTC deep links, emergency numbers  
✅ **Community Interaction** — Likes and comments on testimonies for peer support  
✅ **Danger Zone Mapping** — Leaflet map showing incident hotspots  
✅ **Enforced Onboarding** — 4-step flow with phone verification via SMS OTP  
✅ **Multi-Tenant Architecture** — Complete data isolation per organization  

---

## Quick Start

### Development

```bash
# Backend
cd server
npm install
cp .env.example .env  # Configure database and API keys
npm run migrate
npm run dev

# Frontend (new terminal)
cd client
npm install
npm run dev
```

**URLs**:
- Frontend: http://localhost:5173
- API: http://localhost:5000
- DB: localhost:5432 (postgres/postgres)

### Production (Docker)

```bash
docker-compose up
# Frontend: http://localhost
# API: http://localhost/api
```

---

## Environment Variables

### Server (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/hersafety
NODE_ENV=development
APP_MODE=development
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
PORT=5000

JWT_SECRET=<random-32-char-string>
JWT_REFRESH_SECRET=<random-32-char-string>
JWT_EXPIRES_IN=24h

ANTHROPIC_API_KEY=<your-api-key>
AFRICASTALKING_API_KEY=<your-key>
AFRICASTALKING_USERNAME=<your-username>
```

### Client (Vite)
```
VITE_API_URL=http://localhost:5000/api  # or production URL
```

---

## Deployment on Render

### Step 1: Connect GitHub
1. Sign up at [render.com](https://render.com)
2. Go to Dashboard → New → Web Service
3. Connect your GitHub repo

### Step 2: Create services (Render auto-detects from render.yaml)

Render will automatically create:
- **PostgreSQL** database (starter tier)
- **Backend** Node service
- **Frontend** static site (from Vite build)

### Step 3: Set Environment Variables in Render Dashboard

For each service, configure:

**Backend service**:
- `DATABASE_URL` — auto-provided by Render's PostgreSQL service
- `JWT_SECRET` — generate random string: `openssl rand -base64 32`
- `JWT_REFRESH_SECRET` — different random string
- `ANTHROPIC_API_KEY` — from Anthropic console
- `AFRICASTALKING_API_KEY` — from Africa's Talking
- `AFRICASTALKING_USERNAME` — your username
- `APP_MODE` — "production"

**Frontend service**:
- `VITE_API_URL` — set to `https://hersafety-backend.onrender.com/api`

### Step 4: Deploy

Once all env vars are set, Render auto-deploys on push to main:

```bash
git push origin main
```

Monitor deployment:
- Go to Render Dashboard → Select service → Logs

### Step 5: Verify

```bash
# Check backend
curl https://hersafety-backend.onrender.com/api/health
# Should return: { "ok": true }

# Visit frontend
https://hersafety-frontend.onrender.com
```

---

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login (sets httpOnly JWT cookie)
- `POST /api/auth/logout` — Logout
- `POST /api/auth/verify-phone/send` — Send OTP for phone verification
- `POST /api/auth/verify-phone/confirm` — Verify OTP code

### Users
- `GET /api/users/me` — Get current user
- `PATCH /api/users/me` — Update profile

### Emergency
- `GET /api/emergency-numbers` — List emergency numbers
- `GET /api/places?lat=X&lng=Y&radius=1000` — Safe places nearby

### Tracking
- `POST /api/tracks` — Start level 1 vigilance tracking
- `PATCH /api/tracks/:id/checkin` — Check-in during tracking
- `PATCH /api/tracks/:id/end` — End tracking

### Alerts
- `POST /api/alerts` — Create alert (levels 2-4)
- `POST /api/sms/alert` — Send SMS to contacts

### Community
- `GET /api/testimonies` — List testimonies
- `POST /api/testimonies` — Create testimony
- `POST /api/testimonies/:id/like` — Like/unlike
- `GET /api/testimonies/:id/comments` — List comments
- `POST /api/testimonies/:id/comments` — Add comment

### Reports
- `GET /api/reports` — List verified reports
- `POST /api/reports` — Create danger report
- `GET /api/reports/danger-zones` — Grouped danger zones for map

---

## Testing

```bash
cd server
npm test                # Run all tests
npm run test:coverage   # With coverage report
```

Target: **≥70% coverage** (enforced by CI)

---

## Database

**Migrations** (auto-run on deploy):
```bash
npm run migrate          # Apply all pending migrations
npm run migrate:latest   # Ensure latest
npm run migrate:rollback # Undo last batch
```

---

## Architecture

### Multi-Tenant Isolation
- Each organization is a tenant (ONG, corporate, university)
- All tables have `organization_id` column
- API filters all queries by user's organization
- Zero data leakage between tenants

### Security
- JWT in httpOnly cookies only (never localStorage)
- Bcrypt password hashing (cost 12)
- Rate limiting: 10 req/min/IP
- Brute force protection: 5 login attempts = 15 min block
- Input validation with Joi
- SQL injection prevention via Knex query builder

### Performance
- Lazy-loaded map components (Leaflet)
- Message pagination (testimonies, comments)
- DB indexes on frequently queried columns
- Gzip compression via nginx

---

## Git Workflow

```bash
# Feature branch
git checkout -b feat/new-feature

# Commit with Co-Authors
git commit -m "Feature description

Co-Authored-By: Claude <claude@anthropic.com>"

# Push
git push origin feat/new-feature

# Create PR on GitHub
```

---

## Troubleshooting

### Backend won't start
```bash
# Check DB connection
psql $DATABASE_URL -c "SELECT 1"

# Run migrations
npm run migrate

# Check logs
npm run dev  # See error details
```

### Maps aren't loading
- Leaflet/OpenStreetMap slow? Maps are disabled by default in production
- Uncomment API call in `client/src/pages/Emergency.jsx`

### SMS not sending in production
- Ensure `AFRICASTALKING_API_KEY` is valid
- Check `APP_MODE=production` env var
- Africa's Talking has daily rate limits

### Phone verification OTP not received
- In dev mode: check console logs (code printed there)
- In prod: verify `AFRICASTALKING_*` credentials
- OTP expires in 5 minutes

---

## Team

Built with ❤️ for women's safety.

**Contributors**: Claude (AI Assistant)  
**Deliverable Date**: May 24, 2026  
**Sprint**: 2-day MVP delivery

---

## License

Private project. All rights reserved.
