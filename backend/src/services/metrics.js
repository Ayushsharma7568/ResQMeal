import promClient from 'prom-client';

// Initialize Prometheus default process and runtime metrics
promClient.collectDefaultMetrics({ timeout: 5000 });

// Custom Histogram: http_request_duration_seconds
export const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

// Custom Counter: http_requests_total
export const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code']
});

// Custom Gauge: active_websocket_connections
export const activeWebSocketConnections = new promClient.Gauge({
  name: 'active_websocket_connections',
  help: 'Number of active Socket.io client connections'
});

/**
 * Express middleware to record request duration and counts
 */
export const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const elapsed = process.hrtime(start);
    const durationInSeconds = elapsed[0] + elapsed[1] / 1e9;

    // Normalize route label: fallback to req.baseUrl + req.path or req.route.path
    let route = req.baseUrl || '';
    if (req.route && req.route.path) {
      route += req.route.path;
    } else if (!route) {
      route = req.path || '/';
    }

    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode.toString()
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationMicroseconds.observe(labels, durationInSeconds);
  });

  next();
};

export const register = promClient.register;
export default promClient;
