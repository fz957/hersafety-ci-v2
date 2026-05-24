# 🚀 Test HerSafety on Your Phone NOW

## ✅ What's Ready

- ✅ **Real Emergency Calls** — Confirmation modal before `tel:110`
- ✅ **Real VTC Deep Links** — Confirmation modal before opening Yango/Bolt/InDriver
- ✅ **AI Psychologist** — Full conversation history
- ✅ **Check-in System** — Auto modal every 10 minutes
- ✅ **Community** — Likes and comments
- ✅ **Danger Map** — Leaflet visualization
- ✅ **Production Mode** — APP_MODE=production (no simulation)

---

## 🔧 Quick Start (5 minutes)

### Option 1: Simple Script (Recommended)

```bash
# From project root
bash start-dev-with-ngrok.sh
```

This will:
1. Install dependencies
2. Start backend on `localhost:5000`
3. Start frontend on `localhost:5173`
4. Create public ngrok tunnel
5. Show you the mobile testing URL

**Output example:**
```
📱 Mobile Testing URL: https://abc123.ngrok.io
🖥️  Local URLs:
   Frontend: http://localhost:5173
   Backend API: http://localhost:5000/api
```

### Option 2: Manual (If script doesn't work)

```bash
# Terminal 1 - Frontend
cd client
npm run dev

# Terminal 2 - Backend
cd server
npm run dev

# Terminal 3 - ngrok tunnel
npm install -g ngrok  # if not installed
ngrok http 5173

# Copy the ngrok URL from output (https://xxxxx.ngrok.io)
```

---

## 📱 Testing on Mobile

1. **Get the public URL** from ngrok output
2. **Open on your phone** (same WiFi or any internet)
   ```
   https://abc123.ngrok.io
   ```

3. **Create a test account:**
   - Email: `test@example.com`
   - Password: `Test123456!`
   - Name: `Test User`

4. **Complete onboarding:**
   - Add 2+ emergency numbers (use dummy like 0000000000)
   - Verify phone (use any number, code will be in console logs)
   - Add 1+ contact (use dummy contact)

5. **Test emergency features:**
   - Dashboard → Click "Situation tendue" (Level 3)
   - Click a phone number → **Confirmation modal appears**
   - Click "Oui, appeler le 110" → Real call dialog opens
   - Click "Non" → Modal closes, no call
   - Try Yango/Bolt/InDriver → Same confirmation pattern

---

## 📝 Test Scenarios

### Scenario 1: Emergency Call Flow
```
1. Open app on phone
2. Click "Situation tendue" (Niveau 3/4)
3. Screen shows emergency options
4. Click "110" number card
5. Modal: "Voulez-vous appeler la Police (110) ?"
6. Click "Oui, appeler le 110"
7. Phone call dialog opens (real tel: protocol)
8. Cancel call (or make it if testing with real phone)
```

### Scenario 2: VTC Deep Link Flow
```
1. Open Emergency screen
2. Scroll to "Quitter la zone" section
3. Click "Yango" or "Bolt"
4. Modal: "Ouvrir Yango ?"
5. Click "Oui, ouvrir Yango"
6. If app installed: Opens Yango with destination pre-filled
7. If app not installed: Opens fallback URL
```

### Scenario 3: AI Conversation
```
1. Emergency screen → "AÏCHA · ASSISTANTE" section
2. AI provides initial guidance
3. Type response: "Je ne sais pas comment réagir"
4. AI responds with empathetic follow-up
5. Continue conversation naturally
```

### Scenario 4: Check-in System
```
1. Dashboard → Click "Je suis bien" (Niveau 1)
2. GPS/tracking starts
3. Wait 10 minutes (or manually trigger for demo)
4. Modal: "Tout va bien ?" appears
5. Click "Oui, je vais bien ✓"
6. Timer resets, modal closes
7. If you don't respond for 2 check-ins → SMS auto-sent
```

---

## 🔐 Important Notes

### Emergency Calls
- ✅ **Real** — Uses `window.location.href = 'tel:110'`
- ✅ **Safe** — Modal requires explicit confirmation
- ✅ **No auto-call** — User must click "Oui" button
- ⚠️ **Warning** — On real phone, this WILL dial. Use test numbers or cancel.

### VTC Links
- ✅ **Real deep links** — Will open actual apps if installed
- ✅ **Safe** — Modal asks for confirmation
- ✅ **GPS pre-fill** — Destination coordinates included
- 📍 **Fallback** — Web URLs for apps not installed on phone

### SMS Alerts
- ✅ **Real in production** — Africa's Talking SMS service
- 📝 **Dev mode** — Code logged to console (check server logs)
- ⚠️ **Requires API keys** — Add real keys to `.env` for SMS

---

## 🐛 Troubleshooting

### Frontend won't start
```bash
cd client
npm install --legacy-peer-deps
npm run dev
```

### Backend won't start
```bash
cd server
npm install
npm run migrate
npm run dev
```

### ngrok tunnel not working
```bash
# Download ngrok
curl -s https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip -o /tmp/ngrok.zip
unzip -o /tmp/ngrok.zip -d /usr/local/bin
ngrok http 5173
```

### Phone verification code?
- In dev mode, check **server terminal logs**
- Code is printed: `[DEV] OTP code for +225XXXXXXXXX: 123456`

### Emergency numbers not showing?
- Backend must be running on `localhost:5000`
- Check API call in browser DevTools (Network tab)

---

## 📊 What You're Testing

| Feature | Status | How to Test |
|---------|--------|-------------|
| AI Psychologist | ✅ Live | Talk to Aïcha, she responds with empathy |
| Emergency Calls | ✅ Real | Click phone number, confirm, call dials |
| VTC Deep Links | ✅ Real | Click Yango/Bolt, confirm, app opens |
| Check-ins | ✅ Auto | Level 1 tracking, modal every 10 min |
| Community | ✅ Live | Like testimonies, add comments |
| Danger Map | ✅ Map | Reports → see danger zone markers |
| Onboarding | ✅ Flow | 4 steps with phone verification |
| Conversation | ✅ History | Full chat history with AI |

---

## 🎯 Goals

By the end of testing, you should see:

✅ All emergency numbers open real phone dialers  
✅ All VTC buttons open real app deep links  
✅ Confirmation modals appear BEFORE any action  
✅ AI responds conversationally, not with canned messages  
✅ Map shows danger zones with incident counts  
✅ Comments appear instantly (no reload)  
✅ Check-ins appear every 10 minutes during tracking  

---

## 💡 Pro Tips

- **Test on 4G** if possible — closer to real usage
- **Try disabling modals** (developer tools) to see how quickly they appear
- **Check network tab** to see API calls (should be to backend, not hardcoded)
- **Try on iPad** too if available — responsive layout
- **Share ngrok URL** with others to test together

---

## 🚀 Ready?

```bash
bash start-dev-with-ngrok.sh
# Wait for ngrok URL
# Open URL on phone
# Test emergency flow
```

**Have fun testing! 🎉**
