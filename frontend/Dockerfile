# ------------------------------------------------------------------------------
# Alchemist AI — React Frontend Dockerfile
# Stage 1: Build static assets using Node.js
# Stage 2: Serve optimized assets with Nginx + API reverse proxy
# ------------------------------------------------------------------------------

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies including devDependencies (needed for Vite build)
RUN npm ci

# Copy source code
COPY . .

# Build production bundle
RUN npm run build

# --- Stage 2: Production Nginx Server ---
FROM nginx:alpine

# Remove default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with reverse proxy for /api
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port 80
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
