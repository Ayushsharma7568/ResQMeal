# 🍲 Don't Waste It — Zero-Waste Food Redistribution Platform

> **A modern, deployable, location-aware food rescue platform connecting surplus food donors with community organizations and logistics volunteers.**

---

## 🚀 Key Features

* 🔐 **Authentication & RBAC**: Secure JWT authentication with role-based portals (`FOOD_PROVIDER`, `FOOD_SEEKER`, `VOLUNTEER`, `ADMIN`).
* 📦 **Surplus Food Listings**: Multi-item posting with quantity, category, dietary info, preparation time, and pickup deadline tracking.
* 🤝 **Food Claim Workflow**: Real-time claim requests, provider approvals/rejections, and atomic inventory lock.
* 🚚 **Logistics & Delivery**: Volunteer pickup task acceptance, status progression (`UNASSIGNED` → `ASSIGNED` → `PICKED_UP` → `DELIVERED` → `RECEIVED` → `COMPLETED`), and seeker receipt verification.
* 📍 **Location Matching & Rescue Radar**: Haversine distance utility, radius filters (2 km, 5 km, 10 km, 25 km), auto-location detection, and interactive Leaflet map radar.
* 🔔 **Notification Center**: Live topbar notification bell with unread counters, auto-triggered workflow alerts, and mark-as-read controls.
* ✨ **AI Features**:
  * **Smart Listing Assistant**: Converts raw text (e.g. *"50 rotis, 3 kg dal, 4 kg aloo sabzi prepared at 6 PM"*) into structured food items.
  * **Smart Matching Score**: Calculates 0–100% recommendation score for food seekers based on distance, category alignment, and deadline urgency.
  * **Surplus Demand Insights**: Aggregates real-time surplus trends, peak hours, and top donor rankings.
  * **Admin AI Query Assistant**: Answers natural-language analytics queries on platform stats.
* 🐳 **Dockerized**: Multi-stage production Dockerfiles for Node backend and Nginx React frontend with Docker Compose orchestration.
* ⚙️ **GitLab CI/CD**: Automated 4-stage pipeline running test suites, production build, and container build.
* 📊 **Monitoring**: `/api/health` and Prometheus-compatible `/api/metrics` endpoint.

---

## 🛠️ Technology Stack

* **Frontend**: React 18, Vite, React Router, Tailwind/Vanilla CSS, Lucide Icons, Leaflet / React-Leaflet
* **Backend**: Node.js, Express, MongoDB, Mongoose, JSON Web Tokens (JWT), BcryptJS
* **DevOps**: Docker, Docker Compose, Nginx, GitLab CI/CD, Prometheus Metrics

---

## 🚀 Quick Start Guide

### Prerequisites
* Node.js v18+
* MongoDB local instance or MongoDB Atlas URI

### 1. Clone & Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in both folders:
```bash
# In backend/.env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/dontwasteit
JWT_SECRET=your_secret_key_here

# In frontend/.env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run Development Servers
```bash
# Start Backend Server (Terminal 1)
cd backend
npm run dev

# Start Frontend App (Terminal 2)
cd frontend
npm run dev
```

---

## 🧪 Automated Testing

The backend includes a comprehensive 199-test suite covering all workflow phases:

```bash
cd backend

# Run individual test suites
node test-auth.js         # Auth & RBAC Tests (27/27)
node test-listings.js     # Listing CRUD Tests (47/47)
node test-claims.js       # Food Claim Workflow Tests (36/36)
node test-deliveries.js   # Delivery Workflow Tests (36/36)
node test-phase8.js       # Distance & Notification Tests (42/42)
node test-phase9.js       # AI & Monitoring Tests (11/11)
```

**Total Backend Test Coverage**: **199 / 199 PASSED (100%)**

---

## 🐳 Docker Setup

Run the full application locally using Docker Compose:

```bash
docker-compose up --build
```

* **Frontend**: http://localhost
* **Backend API**: http://localhost:5000/api
* **Health Check**: http://localhost:5000/api/health
* **Prometheus Metrics**: http://localhost:5000/api/metrics

---

## 📌 Future Scope (Out of Scope for Current Phase)
* Payment Gateway Integration for nominal cost recovery sales
* Live GPS Tracking for volunteer transport vehicles
* Native Mobile Applications (iOS / Android)
* WhatsApp / SMS Gateway alerts
* Government / FSSAI Compliance Auditing export
