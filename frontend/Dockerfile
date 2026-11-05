# ----------------------------------------------------
# Stage 1: Build static React bundle with Vite
# ----------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies cleanly
RUN npm ci

# Copy application source code
COPY . .

# Build production distribution
RUN npm run build

# ----------------------------------------------------
# Stage 2: Production Nginx Server
# ----------------------------------------------------
FROM nginx:1.27-alpine

# Set working directory to Nginx html directory
WORKDIR /usr/share/nginx/html

# Remove default Nginx static assets
RUN rm -rf ./*

# Copy built artifacts from builder stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Health check (use 127.0.0.1 to avoid IPv6 resolution issues on Alpine)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/health || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
