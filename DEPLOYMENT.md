# Buddy Vision - Deployment Info

## Live URLs

- **Production**: https://buddy-vision-anmx1tz2c-sonnysunsunsun.vercel.app
- **GitHub Repository**: https://github.com/Sonnysunsunsun/buddy-vision

## Deployment Status

✅ Successfully deployed on Vercel
✅ Connected to GitHub for automatic deployments
✅ API keys removed from codebase (users provide their own)

## How to Use

1. Visit the live URL above
2. Grant camera permissions when prompted
3. You'll be asked to enter your API keys:
   - **OpenAI API Key**: Get from https://platform.openai.com/api-keys
   - **Google Vision API Key**: Get from https://console.cloud.google.com/apis/credentials
4. Your keys are stored securely in your browser's localStorage
5. Tap anywhere on screen to capture and describe what you see!

## Features

- 🎤 **Voice Interaction**: Automatic speech output
- 🌍 **15 Languages**: English, Spanish, French, Arabic, Chinese, and more
- 📱 **PWA**: Install as app on any device
- 📳 **Haptic Feedback**: Phone vibrates for blind users
- 🔒 **Secure**: No API keys stored on server
- ♿ **Accessible**: Optimized for blind and visually impaired users

## Tech Stack

- Pure JavaScript (no frameworks)
- OpenAI GPT-4 Vision for scene understanding
- Google Cloud Vision API for OCR
- Web Speech API for voice output
- Service Worker for offline capability
- Vercel for hosting

## Partner Program

Organizations can use custom URLs with their branding:
- `?ref=special-olympics` - Special Olympics
- `?ref=best-buddies` - Best Buddies International
- `?ref=axis-dance` - AXIS Dance Company

## Local Development

```bash
# Clone the repo
git clone https://github.com/Sonnysunsunsun/buddy-vision.git
cd buddy-vision

# Start local server
python3 -m http.server 8000

# Visit http://localhost:8000
```

## Deploy Your Own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Sonnysunsunsun/buddy-vision)

## Security Note

This app requires users to provide their own API keys. Keys are:
- ✅ Stored only in the user's browser localStorage
- ✅ Never sent to our servers
- ✅ Only used for direct API calls to OpenAI and Google
- ✅ Can be cleared by clearing browser data

## Support

For issues or questions, please open an issue on GitHub:
https://github.com/Sonnysunsunsun/buddy-vision/issues
