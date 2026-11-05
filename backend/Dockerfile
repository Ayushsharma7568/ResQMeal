# ----------------------------------------------------
# Production Dockerfile for Node.js/Express Backend
# ----------------------------------------------------
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies (only production)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code
COPY . .

# Ensure files are owned by non-root node user
RUN chown -R node:node /app

# Expose backend API port
EXPOSE 5000

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Switch to non-root user for security
USER node

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start production server
CMD ["node", "src/server.js"]
