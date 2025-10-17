# Vercel Environment Variables Setup

## Required Environment Variables

You need to set these **2 environment variables** in your Vercel project settings:

### 1. OPENAI_API_KEY
- **Value**: Your OpenAI API key (starts with `sk-proj-...`)
- **Get it from**: https://platform.openai.com/api-keys
- **Required permissions**: Access to `gpt-4o-mini` model

### 2. GOOGLE_VISION_API_KEY
- **Value**: Your Google Cloud Vision API key (starts with `AIza...`)
- **Get it from**: https://console.cloud.google.com/apis/credentials
- **Required APIs**: Cloud Vision API must be enabled

---

## How to Set Environment Variables in Vercel

### Method 1: Via Vercel Dashboard (Recommended)

1. Go to your Vercel project: https://vercel.com/sonnysunsunsun/buddy-vision
2. Click on **Settings** tab
3. Click on **Environment Variables** in the left sidebar
4. Add each variable:

   **Variable 1:**
   - Key: `OPENAI_API_KEY`
   - Value: `sk-proj-YOUR_OPENAI_KEY_HERE`
   - Environment: Select **Production**, **Preview**, and **Development**
   - Click **Save**

   **Variable 2:**
   - Key: `GOOGLE_VISION_API_KEY`
   - Value: `AIzaYOUR_GOOGLE_VISION_KEY_HERE`
   - Environment: Select **Production**, **Preview**, and **Development**
   - Click **Save**

5. **Important**: After adding variables, you must **redeploy** your app for them to take effect

### Method 2: Via Vercel CLI

```bash
cd /Users/sonny/Desktop/build-a-thon/buddy-vision

# Add OpenAI API Key
vercel env add OPENAI_API_KEY
# When prompted, paste: sk-proj-YOUR_KEY_HERE
# Select: Production, Preview, Development

# Add Google Vision API Key
vercel env add GOOGLE_VISION_API_KEY
# When prompted, paste: AIzaYOUR_KEY_HERE
# Select: Production, Preview, Development

# Redeploy to apply changes
vercel --prod
```

---

## How to Get Your API Keys

### OpenAI API Key

1. Visit: https://platform.openai.com/api-keys
2. Sign in with your OpenAI account
3. Click "Create new secret key"
4. Give it a name (e.g., "Buddy Vision")
5. Copy the key (starts with `sk-proj-...`)
6. **Important**: Save it immediately - you won't see it again!

**Pricing**: ~$0.002 per image analysis (gpt-4o-mini is very affordable)

### Google Cloud Vision API Key

1. Visit: https://console.cloud.google.com/
2. Create a new project or select existing one
3. Enable the **Cloud Vision API**:
   - Go to: https://console.cloud.google.com/apis/library/vision.googleapis.com
   - Click "Enable"
4. Create API Key:
   - Go to: https://console.cloud.google.com/apis/credentials
   - Click "Create Credentials" → "API Key"
   - Copy the key (starts with `AIza...`)
5. (Optional) Restrict the key to Vision API for security

**Pricing**: First 1,000 images/month are free, then ~$1.50 per 1,000 images

---

## Testing Your Setup

After setting environment variables and redeploying:

1. Visit your production URL: https://buddy-vision-anmx1tz2c-sonnysunsunsun.vercel.app
2. Grant camera permissions
3. Tap anywhere to capture a scene
4. If everything is configured correctly, you'll get an AI description!

### Troubleshooting

**Error: "API keys not configured"**
- Environment variables are not set or not deployed
- Solution: Set variables in Vercel dashboard and redeploy

**Error: "OpenAI API error: Incorrect API key"**
- OPENAI_API_KEY is invalid
- Solution: Get a new key from OpenAI platform

**Error: "Google Vision API error"**
- GOOGLE_VISION_API_KEY is invalid or Vision API not enabled
- Solution: Verify key and enable Vision API in Google Cloud Console

**Check Function Logs:**
- Go to Vercel Dashboard → Deployments → Click latest deployment
- Click "Functions" tab to see serverless function logs
- Look for errors from `/api/analyze`

---

## Cost Estimation

### Per Image Analysis:
- Google Vision API: ~$0.0015 (free for first 1,000/month)
- OpenAI GPT-4o-mini: ~$0.002
- **Total per image: ~$0.0035** (after free tier)

### Monthly Estimates:
- 100 images/month: ~$0.35
- 1,000 images/month: ~$3.50
- 10,000 images/month: ~$35.00

Very affordable for a production app! 🎉

---

## Security Notes

✅ API keys are stored securely in Vercel's environment
✅ Keys never exposed to client-side code
✅ Keys only accessible by your serverless functions
✅ Use Vercel's secrets management - never commit keys to git

---

## Quick Reference

```
OPENAI_API_KEY=sk-proj-...
GOOGLE_VISION_API_KEY=AIza...
```

Set these in Vercel Dashboard → Settings → Environment Variables

Then redeploy with:
```bash
vercel --prod
```

Done! 🚀
