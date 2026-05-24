@echo off
setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║           🌸 HerSafety CI — Démarrage du projet               ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Vérifie que Docker Compose est disponible
docker-compose --version >nul 2>&1
if errorlevel 1 (
  echo ❌ Docker Compose n'est pas installé ou pas accessible.
  echo    Installe Docker Desktop ou ajoute Docker Compose au PATH.
  pause
  exit /b 1
)

REM 1. Tente de démarrer PostgreSQL avec Docker
echo ⏳ Tentative de démarrage de PostgreSQL avec Docker...
docker-compose up -d postgres 2>nul
if errorlevel 1 (
  echo ⚠️  Docker non disponible. Vérifiez que PostgreSQL s'exécute sur localhost:5432
  echo    (Lancez Docker Desktop ou démarrez PostgreSQL manuellement)
  timeout /t 3 /nobreak
) else (
  echo ✅ PostgreSQL en démarrage...
  timeout /t 5 /nobreak
)

REM 2. Lance le serveur Node.js dans une nouvelle fenêtre
echo 🚀 Démarrage du serveur backend...
start "HerSafety CI — Backend" cmd /k "cd server && npm run dev"

REM Attend un peu avant de lancer le client
timeout /t 3 /nobreak

REM 3. Lance le client React dans une nouvelle fenêtre
echo 🚀 Démarrage du client frontend...
start "HerSafety CI — Frontend" cmd /k "cd client && npm run dev"

echo.
echo ✅ Tous les services ont été lancés !
echo.
echo 📱 Frontend  : http://localhost:5173
echo 🖥️  Backend   : http://localhost:5000
echo 🐘 PostgreSQL: localhost:5432
echo.
echo 💡 Conseil : Ferme les fenêtres des terminaux pour arrêter les services.
echo           (Utilise 'docker-compose down' pour arrêter PostgreSQL)
echo.
pause
