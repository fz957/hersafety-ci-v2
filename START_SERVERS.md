# 🚀 How to Start HerSafety CI Servers

## Quick Start (2 Steps)

### Option 1: Run Both Servers Together (Recommended)

**From project root directory:**

```bash
npm run dev:all
```

This will start:
- ✅ Backend on http://localhost:5000
- ✅ Frontend on http://localhost:5173
- ✅ Both in watch mode (auto-reload on file changes)

---

### Option 2: Run Servers Separately

**Terminal 1 - Backend:**
```bash
cd server
npm install  # Only first time
npm run dev
```

Wait until you see:
```
✓ Server running on port 5000
```

**Terminal 2 - Frontend:**
```bash
cd client
npm install  # Only first time
npm run dev
```

Wait until you see:
```
VITE v5.x.x ready in xxx ms
```

---

## Verify Everything is Working

### Check Backend
```bash
curl http://localhost:5000/api/test
```

Should return:
```json
{"test":"OK","timestamp":"...","rateLimit":"DISABLED"}
```

### Check Frontend
Open browser to: **http://localhost:5173**

You should see the HerSafety CI login page.

### Create Demo Data
```bash
curl "http://localhost:5000/api/reports/generate-demo-data"
```

Should return:
```json
{"success":true,"data":{"message":"✅ Created 5 demo reports","count":5}}
```

---

## Troubleshooting

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::5000`

**Solution:**
```bash
# Find process on port 5000
netstat -ano | findstr ":5000"

# Kill the process (Windows)
taskkill /PID <PID> /F
```

### Modules Not Found

**Error:** `Cannot find module 'express'`

**Solution:**
```bash
cd server
npm install
```

### VITE Error

**Error:** `Error: ENOENT: no such file or directory`

**Solution:**
```bash
cd client
npm install
npm run dev
```

---

## Production Build

### Build Frontend
```bash
cd client
npm run build
```

Creates optimized build in `client/dist/`

### Start Backend for Production
```bash
cd server
npm run migrate  # Run migrations
npm start
```

---

## Environment Variables

Create `.env` file in `server/` directory:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hersafety
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
ANTHROPIC_API_KEY=your-api-key
AFRICASTALKING_API_KEY=your-api-key
AFRICASTALKING_USERNAME=your-username
APP_MODE=development
PORT=5000
FRONTEND_URL=http://localhost:5173
```

---

## Docker Alternative

### Using Docker Compose

```bash
docker-compose up -d
```

This starts:
- Backend container
- Frontend container
- PostgreSQL database

View logs:
```bash
docker-compose logs -f
```

Stop everything:
```bash
docker-compose down
```

---

## Development Tips

### Enable Hot Reload
Both servers support file watching:
- Backend: Nodemon auto-restarts on changes
- Frontend: Vite hot module replacement (HMR)

Just save files and they auto-reload!

### Debug Mode
```bash
# Backend with debugging
node --inspect server/src/server.js
```

Open `chrome://inspect` to debug.

### Database Management
```bash
# Run migrations
cd server
npm run migrate

# Reset database
npm run reset
```

---

## First Time Setup

If you're setting up for the first time:

```bash
# 1. Clone and install dependencies
npm install

# 2. Create .env file with your keys
cp .env.example .env
# Edit .env with your values

# 3. Create database
npm run setup

# 4. Create demo data
curl "http://localhost:5000/api/reports/generate-demo-data"

# 5. Start servers
npm run dev:all

# 6. Open browser
# http://localhost:5173
```

---

## Common Commands

| Command | What it does |
|---------|-------------|
| `npm run dev:all` | Start both servers |
| `npm run dev` | Start backend only (from server/) |
| `npm run build` | Build frontend production (from client/) |
| `npm test` | Run tests |
| `npm run migrate` | Run database migrations |

---

## Quick Test Checklist

- [ ] Backend running on 5000
- [ ] Frontend running on 5173
- [ ] Login works
- [ ] Dashboard loads
- [ ] GPS permission prompt appears
- [ ] "Carte de sécurité" section visible
- [ ] Red/orange circles on map
- [ ] Blue marker shows position
- [ ] Search box works
- [ ] Click circles shows popups

---

**Ready? Start the servers and go to http://localhost:5173!** 🎉
