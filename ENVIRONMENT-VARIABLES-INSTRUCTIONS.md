# 🚀 Vercel Environment Variables - Setup Instructions

## ✅ What You Need to Do

Your app is deployed but needs **2 environment variables** to work. Here's exactly what to do:

---

## Step 1: Go to Vercel Settings

1. Open: https://vercel.com/sonnysunsunsun/buddy-vision/settings/environment-variables
2. You should see the "Environment Variables" page

---

## Step 2: Add OPENAI_API_KEY

Click **"Add New"** button and enter:

**Name (Key):**
```
OPENAI_API_KEY
```

**Value:**
```
sk-proj-YOUR_OPENAI_KEY_HERE
```
(Replace with your actual OpenAI API key from https://platform.openai.com/api-keys)

**Environments to apply to:**
- ✅ Check **Production**
- ✅ Check **Preview**
- ✅ Check **Development**

Click **Save**

---

## Step 3: Add GOOGLE_VISION_API_KEY

Click **"Add New"** button again and enter:

**Name (Key):**
```
GOOGLE_VISION_API_KEY
```

**Value:**
```
AIzaYOUR_GOOGLE_VISION_KEY_HERE
```
(Replace with your actual Google Vision API key from https://console.cloud.google.com/apis/credentials)

**Environments to apply to:**
- ✅ Check **Production**
- ✅ Check **Preview**
- ✅ Check **Development**

Click **Save**

---

## Step 4: Redeploy

After adding both variables, you MUST redeploy:

**Option A: Via Dashboard**
1. Go to: https://vercel.com/sonnysunsunsun/buddy-vision
2. Click **"Redeploy"** on the latest deployment

**Option B: Via Terminal**
```bash
cd /Users/sonny/Desktop/build-a-thon/buddy-vision
npx vercel --prod
```

---

## 🎯 Quick Copy-Paste Format

For easy reference, here's what the variables should look like:

```
Variable 1:
Key:   OPENAI_API_KEY
Value: sk-proj-XXXXXXXXXXXXX... (your actual OpenAI key)

Variable 2:
Key:   GOOGLE_VISION_API_KEY
Value: AIzaXXXXXXXXXXXXXX... (your actual Google Vision key)
```

**⚠️ IMPORTANT**: Use YOUR actual keys from the API provider websites!

---

## ✅ How to Verify It's Working

1. After redeploying, visit: https://buddy-vision-7xodrb9h4-sonnysunsunsun.vercel.app
2. Grant camera permission
3. Tap anywhere on the screen to capture
4. If you get an AI description → **It works!** 🎉
5. If you see "API keys not configured" → Environment variables not set or not redeployed

---

## 📍 Direct Links

- **Add Environment Variables**: https://vercel.com/sonnysunsunsun/buddy-vision/settings/environment-variables
- **Get OpenAI Key**: https://platform.openai.com/api-keys
- **Get Google Vision Key**: https://console.cloud.google.com/apis/credentials
- **Production App**: https://buddy-vision-7xodrb9h4-sonnysunsunsun.vercel.app

---

## 💰 Cost Info

Very affordable:
- ~$0.0035 per image analysis
- 100 images/month = $0.35
- 1,000 images/month = $3.50

Google Vision gives you 1,000 free images per month! 🎁

---

## That's It!

Once you add both environment variables and redeploy, your app will be fully functional with AI-powered scene descriptions for visually impaired users! 🚀
