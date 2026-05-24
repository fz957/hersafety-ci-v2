#!/bin/bash
set -e

echo "🚀 HerSafety — Starting Development Environment with ngrok"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
  echo -e "${YELLOW}⚠️  ngrok not found. Installing...${NC}"
  # Download ngrok (macOS/Linux)
  curl -s https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip -o /tmp/ngrok.zip
  unzip -o /tmp/ngrok.zip -d /usr/local/bin
  chmod +x /usr/local/bin/ngrok
  rm /tmp/ngrok.zip
fi

# Install client dependencies
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd client
npm install --legacy-peer-deps 2>/dev/null || npm install
cd ..

# Install server dependencies
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
cd server
npm install 2>/dev/null || npm install
cd ..

# Start frontend
echo -e "${GREEN}✅ Starting Vite frontend on localhost:5173...${NC}"
cd client
npm run dev &
FRONTEND_PID=$!
cd ..

# Start backend
echo -e "${GREEN}✅ Starting Node backend on localhost:5000...${NC}"
cd server
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for frontend to be ready
sleep 3

# Start ngrok tunnel to frontend
echo -e "${GREEN}✅ Starting ngrok tunnel...${NC}"
ngrok http 5173 &
NGROK_PID=$!

sleep 2

# Get ngrok public URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | cut -d'"' -f4 | head -1)

echo ""
echo -e "${GREEN}=================================================="
echo "🎉 HerSafety Development Environment Ready!"
echo "=================================================="
echo ""
echo -e "📱 ${YELLOW}Mobile Testing URL:${NC} ${BLUE}${NGROK_URL}${NC}"
echo ""
echo -e "🖥️  ${YELLOW}Local URLs:${NC}"
echo -e "   Frontend: ${BLUE}http://localhost:5173${NC}"
echo -e "   Backend API: ${BLUE}http://localhost:5000/api${NC}"
echo ""
echo -e "✨ ${YELLOW}Features:${NC}"
echo "   ✅ Emergency calls with confirmation modal"
echo "   ✅ VTC deep links with confirmation modal"
echo "   ✅ AI psychologist with conversation history"
echo "   ✅ Check-in system (every 10 min)"
echo "   ✅ Community likes & comments"
echo "   ✅ Danger zones map"
echo ""
echo -e "💡 ${YELLOW}Testing on Mobile:${NC}"
echo "   1. Open ${NGROK_URL} on your phone"
echo "   2. Register or login"
echo "   3. Click Niveau 3 (emergency)"
echo "   4. Try clicking emergency numbers or VTC buttons"
echo "   5. Modals will ask for confirmation before calling"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Cleanup function
cleanup() {
  echo ""
  echo -e "${YELLOW}🛑 Stopping services...${NC}"
  kill $FRONTEND_PID $BACKEND_PID $NGROK_PID 2>/dev/null || true
  echo -e "${GREEN}✅ All services stopped${NC}"
}

trap cleanup EXIT

# Keep script running
wait
