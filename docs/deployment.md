# Cloud Deployment Guide — Don't Waste It Platform

This document outlines the deployment strategy for the **Don't Waste It** zero-waste food redistribution platform across modern cloud hosting providers.

---

## Recommended Architecture

```
User Browser (React Client)
       │
       ▼
Cloud Frontend (Vercel / Render Static Site / Netlify)
       │
       ▼ HTTPS REST API
Cloud Backend Container (Render Web Service / Railway / AWS App Runner)
       │
       ▼ TLS MongoDB Protocol
MongoDB Atlas (Cloud Database Cluster)
```

---

## 1. Database Setup — MongoDB Atlas

1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free shared `M0` or dedicated cluster.
3. Under **Database Access**, create a database user with read/write access.
4. Under **Network Access**, add `0.0.0.0/0` (or host IP whitelist) to allow cloud container access.
5. Obtain the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/dontwasteit?retryWrites=true&w=majority
   ```

---

## 2. Backend Deployment — Render / Railway

### Option A: Render (Web Service)
1. Connect your GitHub / GitLab repository to [Render](https://render.com).
2. Choose **New Web Service** and select the `/backend` directory.
3. Environment: `Node`.
4. Build Command: `npm ci`
5. Start Command: `node src/server.js`
6. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000` (or default `$PORT`)
   - `MONGODB_URI`: `<Your MongoDB Atlas URI>`
   - `JWT_SECRET`: `<Generate a random 64-char string>`
   - `CORS_ORIGIN`: `https://your-frontend-domain.vercel.app`

### Option B: Docker Container Deployment (AWS App Runner / Railway)
1. Use the provided production [Dockerfile](file:///c:/Users/DELL/OneDrive/Documents/website/backend/Dockerfile).
2. Build container image:
   ```bash
   docker build -t dontwasteit-backend ./backend
   ```
3. Push image to Amazon ECR or Docker Hub and link to AWS App Runner or Railway.

---

## 3. Frontend Deployment — Vercel / Render

1. Connect your repository to [Vercel](https://vercel.com).
2. Select the `frontend` root folder.
3. Framework Preset: `Vite`.
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Environment Variable:
   - `VITE_API_URL`: `https://your-backend-api.onrender.com/api`

---

## 4. Verification Checklist

- [ ] Backend `/api/health` returns `200 OK` with database status `MongoDB connected`.
- [ ] Backend `/api/metrics` returns Prometheus metrics text.
- [ ] Frontend user authentication (login/register) works cleanly over HTTPS.
- [ ] CORS policies allow requests exclusively from your production frontend URL.
