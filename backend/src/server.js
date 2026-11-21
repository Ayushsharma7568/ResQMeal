import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { initSocket } from './config/socket.js';
import authRoutes from './routes/authRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import claimRoutes from './routes/claimRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import dispatchRoutes from './routes/dispatchRoutes.js';
import { startDispatchEngine, stopDispatchEngine } from './services/dispatchEngine.js';
import { register, metricsMiddleware } from './services/metrics.js';

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Basic request tracking for legacy metrics compatibility
let requestCounter = 0;
let errorCounter = 0;

app.use((req, res, next) => {
  requestCounter++;
  res.on('finish', () => {
    if (res.statusCode >= 400) errorCounter++;
  });
  next();
});

// Prometheus HTTP metrics tracking middleware
app.use(metricsMiddleware);

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || process.env.CORS_ORIGIN === '*') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', adminRoutes);
app.use('/api/dispatch', dispatchRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const memory = process.memoryUsage();
  res.status(200).json({
    status: 'success',
    message: "Don't Waste It API is running smoothly",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    database: 'MongoDB connected',
    memoryUsageMB: {
      rss: Math.round(memory.rss / (1024 * 1024)),
      heapTotal: Math.round(memory.heapTotal / (1024 * 1024)),
      heapUsed: Math.round(memory.heapUsed / (1024 * 1024))
    }
  });
});

// Prometheus monitoring metrics endpoints
const serveMetrics = async (req, res) => {
  try {
    const memory = process.memoryUsage();
    const uptime = process.uptime();
    const promMetrics = await register.metrics();
    const legacyMetrics = `
# HELP dontwasteit_requests_total Total HTTP requests received
# TYPE dontwasteit_requests_total counter
dontwasteit_requests_total ${requestCounter}

# HELP dontwasteit_errors_total Total HTTP errors (>=400)
# TYPE dontwasteit_errors_total counter
dontwasteit_errors_total ${errorCounter}

# HELP dontwasteit_uptime_seconds Application uptime in seconds
# TYPE dontwasteit_uptime_seconds gauge
dontwasteit_uptime_seconds ${uptime}

# HELP dontwasteit_memory_heap_bytes Memory heap used in bytes
# TYPE dontwasteit_memory_heap_bytes gauge
dontwasteit_memory_heap_bytes ${memory.heapUsed}
    `.trim();

    res.setHeader('Content-Type', register.contentType);
    res.send(`${promMetrics}\n\n${legacyMetrics}\n`);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

app.get('/metrics', serveMetrics);
app.get('/api/metrics', serveMetrics);

// Root route
app.get('/', (req, res) => {
  res.send("Don't Waste It API Server — Healthy");
});

// Production 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Endpoint ${req.originalUrl} not found`
  });
});

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server, allowedOrigins);

server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  // Start the Autonomous Volunteer Dispatch & Expiry Matching Engine
  startDispatchEngine(30000);
});

// Graceful Shutdown
const handleShutdown = (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  stopDispatchEngine();
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
