# 🚀 Render Deployment Guide

## Files Created
✅ `render.yaml` - Render configuration
✅ `Procfile` - Process file for web service
✅ `runtime.txt` - Python version specification
✅ `requirements.txt` - Python dependencies
✅ Updated `main.py` - Dynamic PORT handling

---

## Step-by-Step Deployment

### 1️⃣ Push to GitHub

```bash
cd "/home/sachin/Desktop/Portfolio AI"

# Initialize git (if not already)
git init
git add .
git commit -m "Backend ready for Render deployment"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/portfolio-ai.git
git branch -M main
git push -u origin main
```

### 2️⃣ Deploy on Render

1. Go to **https://render.com** and sign up/login with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `portfolio-ai-backend`
   - **Region**: Choose nearest (e.g., Oregon, Frankfurt)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`

5. **Environment Variables** (Click "Advanced"):
   - Key: `GROQ_API_KEY`
   - Value: `<YOUR_GROQ_API_KEY_FROM_ENV_FILE>`

6. Click **"Create Web Service"**

### 3️⃣ Wait for Deployment

- First build takes ~3-5 minutes
- Watch the logs for any errors
- Once deployed, you'll get a URL like: `https://portfolio-ai-backend.onrender.com`

### 4️⃣ Test Your API

```bash
# Health check
curl https://YOUR-APP.onrender.com/api/health

# Test chat
curl -X POST https://YOUR-APP.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are your skills?"}'
```

---

## ⚙️ Important Notes

### Cold Starts
- Free tier spins down after 15 min of inactivity
- First request after idle takes ~30 seconds to wake up
- Subsequent requests are fast

### CORS Configuration
Your backend already has CORS enabled for all origins (`allow_origins=["*"]`)

For production, update to specific frontend URL:
```python
allow_origins=["https://your-frontend.vercel.app"]
```

### Logs & Monitoring
- View logs in Render dashboard
- Monitor health endpoint: `/api/health`

---

## 🔥 Next Steps

### Deploy Frontend to Vercel

1. Update frontend API URL to your Render backend:
   ```typescript
   // frontend/app/api/chat/route.ts
   const response = await fetch('https://YOUR-APP.onrender.com/api/chat', ...)
   ```

2. Deploy to Vercel:
   ```bash
   cd "/home/sachin/Desktop/Portfolio AI/frontend"
   npm install -g vercel
   vercel --prod
   ```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check Python version in logs, ensure all dependencies in requirements.txt |
| 502 Bad Gateway | Check logs for startup errors, verify PORT is used correctly |
| CORS errors | Update `allow_origins` in main.py |
| API key errors | Verify GROQ_API_KEY environment variable is set in Render dashboard |
| Slow responses | First request after idle = cold start (normal on free tier) |

---

## 📊 Resource Limits (Free Tier)

- **RAM**: 512 MB
- **CPU**: Shared
- **Build Time**: 15 min max
- **Uptime**: Spins down after 15 min idle
- **Monthly Hours**: 750 hours/month

**Cost: $0/month** 🎉

---

## Ready to Deploy?

Run the commands above and your backend will be live in minutes!
