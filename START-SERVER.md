# Quick Start Guide - Buddy Vision

## 🚀 Local Testing (5 minutes)

### Step 1: Start Local Server

#### Option A: Python (Easiest)
```bash
cd buddy-vision
python3 -m http.server 8000
```
Then open: **http://localhost:8000**

#### Option B: Node.js (npx)
```bash
cd buddy-vision
npx http-server -p 8000
```
Then open: **http://localhost:8000**

### Step 2: Get API Keys

#### Google Cloud Vision API
1. Go to: https://console.cloud.google.com/
2. Create new project or select existing
3. Enable "Cloud Vision API"
4. Go to Credentials → Create Credentials → API Key
5. Copy the API key

#### OpenAI API
1. Go to: https://platform.openai.com/api-keys
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the API key (starts with `sk-...`)

### Step 3: Test the App

1. **Open in browser**: http://localhost:8000
2. **Enter API keys** when prompted
3. **Allow camera access** when browser asks
4. **Select venue** (optional): Choose "Crypto.com Arena"
5. **Tap "Capture Scene"**
6. **Listen** to the spoken description!

---

## 📱 Mobile Testing

### iOS (Safari)
```bash
# Find your local IP
ipconfig getifaddr en0  # Mac
# or
hostname -I  # Linux

# Start server on your IP
python3 -m http.server 8000 --bind 0.0.0.0

# On iPhone Safari, open:
http://YOUR-IP:8000
```

### Android (Chrome)
Same as iOS - use your local IP address.

**Note:** Camera requires HTTPS for production. Use localhost for testing only.

---

## 🎯 Demo Checklist

- [ ] Camera preview shows live feed
- [ ] Capture button creates loading spinner
- [ ] Google Vision extracts objects/faces/text
- [ ] GPT generates natural description
- [ ] Voice speaks description aloud
- [ ] Replay button works
- [ ] Settings adjust voice speed
- [ ] Venue selector changes context
- [ ] Partner referral shows badge (?ref=special-olympics)
- [ ] PWA install prompt appears

---

## 🐛 Troubleshooting

### Camera Not Working
- Check browser permissions (camera icon in address bar)
- Use Chrome or Safari (Firefox has limited support)
- Ensure you're on localhost or HTTPS

### No Voice Output
- Check browser volume/mute status
- Ensure Web Speech API supported (Chrome/Safari)
- Try clicking "Voice Command" button to test

### API Errors
- Verify API keys are correct
- Check API quotas/billing (Google Cloud Console)
- Check browser console (F12) for error messages

### Loading Stuck
- Check network tab in DevTools
- Verify API endpoints are reachable
- Ensure API keys have correct permissions

---

## ✨ Quick Test Commands

```bash
# Test in Chrome
open -a "Google Chrome" http://localhost:8000

# Test in Safari
open -a Safari http://localhost:8000

# Test with partner referral
open http://localhost:8000/?ref=special-olympics
```

---

## 📸 Demo Screenshot Scenarios

1. **Multi-person scene**: Capture group of people for social context
2. **Signage scene**: Point at readable text to test OCR
3. **Navigation scene**: Capture entrance/exit to test wayfinding
4. **Empty scene**: Test fallback descriptions

---

## 🎤 Voice Test

Once loaded, open browser console (F12) and type:
```javascript
window.buddyVoice.test()
```

Should hear: "Buddy Vision speech test. If you can hear this, voice output is working correctly."

---

## 🏗️ Production Deployment

For production (HTTPS required):

### Vercel (Easiest)
```bash
npm install -g vercel
cd buddy-vision
vercel
```

### Netlify
```bash
npm install -g netlify-cli
cd buddy-vision
netlify deploy
```

### GitHub Pages
1. Push to GitHub
2. Settings → Pages → Source: main branch
3. Wait 2-3 minutes for deploy

---

**Ready to test!** 🎉

Questions? Check README.md for full documentation.
