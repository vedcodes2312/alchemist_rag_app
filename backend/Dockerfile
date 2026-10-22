# ------------------------------------------------------------------------------
# Alchemist AI — Express Backend Dockerfile
# Node.js 20 Alpine lightweight container
# ------------------------------------------------------------------------------
FROM node:20-alpine

# Set production environment
ENV NODE_ENV=production

WORKDIR /app

# Install curl for container health checks
RUN apk add --no-cache curl

# Copy dependency manifests first for Docker cache optimization
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy backend source code and scripts
COPY src/ ./src/
COPY scripts/ ./scripts/

# Expose backend port
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Start the Express server
CMD ["node", "src/server.js"]
