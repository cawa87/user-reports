# UserReports Unified Dockerfile
# This single file can build both frontend and backend services
# Use --target flag to specify which service to build

# =============================================================================
# BASE STAGE - Common Node.js base for both services
# =============================================================================
FROM node:18-alpine AS node-base

# Install common system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    wget \
    netcat-openbsd

# Create app user for security
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 -G appuser

# =============================================================================
# BACKEND STAGES
# =============================================================================

# Backend Dependencies
FROM node-base AS backend-deps

WORKDIR /app/server

# Copy backend package files
COPY server/package*.json ./
COPY server/prisma ./prisma/

# Install all dependencies (needed for build)
RUN npm ci && npm cache clean --force

# Backend Builder
FROM backend-deps AS backend-builder

WORKDIR /app/server

# Copy backend source code
COPY server/ .

# Generate Prisma client and build TypeScript
RUN npx prisma generate && \
    npm run build

# Backend Production
FROM node-base AS backend-production

WORKDIR /app

# Copy backend package files and install only production deps
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma client for production
RUN npx prisma generate

# Copy built application from builder
COPY --from=backend-builder --chown=appuser:appuser /app/server/dist ./dist

# Change ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

# =============================================================================
# FRONTEND STAGES  
# =============================================================================

# Frontend Dependencies
FROM node-base AS frontend-deps

WORKDIR /app/client

# Copy frontend package files
COPY client/package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Frontend Development
FROM frontend-deps AS frontend-development

WORKDIR /app/client

# Install development dependencies
RUN npm install

# Copy frontend source code
COPY client/ .

# Switch to non-root user
USER appuser

# Expose Vite dev server port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev"]

# Frontend Builder  
FROM frontend-deps AS frontend-builder

WORKDIR /app/client

# Copy frontend source code
COPY client/ .

# Build the React application
RUN npm run build

# Frontend Production with Nginx
FROM nginx:alpine AS frontend-production

# Copy custom nginx config
COPY client/nginx.conf /etc/nginx/nginx.conf

# Copy built React application
COPY --from=frontend-builder /app/client/dist /usr/share/nginx/html

# Create nginx user with matching UID
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    mkdir -p /var/run/nginx && \
    chown -R nginx:nginx /var/run/nginx

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# =============================================================================
# FULL STACK STAGE (Optional - for single container deployment)
# =============================================================================
FROM node-base AS fullstack

WORKDIR /app

# Install nginx for serving frontend
RUN apk add --no-cache nginx

# Copy backend production files
COPY --from=backend-builder /app/server/dist ./backend/
COPY --from=backend-builder /app/server/package*.json ./backend/
COPY --from=backend-builder /app/server/prisma ./backend/prisma/

# Copy frontend build files  
COPY --from=frontend-builder /app/client/dist ./frontend/

# Install backend production dependencies
WORKDIR /app/backend
RUN npm ci --only=production && npm cache clean --force && \
    npx prisma generate

WORKDIR /app

# Create nginx config for fullstack
RUN mkdir -p /etc/nginx/conf.d
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 8080;
    server_name localhost;
    
    # Frontend
    location / {
        root /app/frontend;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Create startup script
COPY <<'EOF' /app/start.sh
#!/bin/sh
set -e

echo "Starting UserReports Full Stack..."

# Start backend in background
cd /app/backend
node dist/index.js &
BACKEND_PID=$!

# Start nginx in foreground
nginx -g 'daemon off;' &
NGINX_PID=$!

# Wait for any process to exit
wait -n

# Kill remaining processes
kill $BACKEND_PID $NGINX_PID 2>/dev/null || true

echo "UserReports Full Stack stopped"
EOF

RUN chmod +x /app/start.sh && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health && \
      wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/start.sh"]
