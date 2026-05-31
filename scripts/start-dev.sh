#!/bin/bash

# 🚀 Script de démarrage qui vérifie les ports avant de lancer les serveurs
# Usage: bash scripts/start-dev.sh
# ou:    ./scripts/start-dev.sh (si exécutable)

echo "🔍 Vérification de la configuration..."
node scripts/verify-ports.js

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Configuration incorrecte. Corrige les ports avant de relancer."
  exit 1
fi

echo ""
echo "🚀 Démarrage des serveurs..."
echo ""

# Démarrer le serveur backend
cd server
echo "📦 Backend sur port $(grep ^PORT= .env | cut -d= -f2)"
npm run dev &
SERVER_PID=$!
sleep 3

# Démarrer le client frontend
cd ../client
echo "🎨 Frontend en cours de démarrage..."
npm run dev &
CLIENT_PID=$!

echo ""
echo "✅ Serveurs lancés!"
echo "   Backend:  http://localhost:$(grep ^PORT= ../server/.env | cut -d= -f2)"
echo "   Frontend: http://localhost:5175"
echo ""
echo "💡 Appuie sur Ctrl+C pour arrêter"
echo ""

# Attendre les signaux
wait
