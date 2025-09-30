# UserReports Docker Usage Guide

## 🎯 Single Docker Compose File Setup

UserReports now uses a **single `docker-compose.yml` file** with Docker Compose profiles to handle all deployment scenarios. This is much simpler and easier to manage!

## 📋 Available Profiles

### `dev` - Development Mode
- **Services**: API + Frontend + Database + Redis
- **Features**: Hot-reload, debug ports, development volumes
- **Ports**: Frontend on 5173, API on 3001, Debug on 9229
- **Use case**: Local development with live code changes

### `prod` - Production Mode  
- **Services**: API + Frontend + Database + Redis + Nginx Proxy
- **Features**: Optimized builds, reverse proxy, production config
- **Ports**: HTTP/HTTPS via Nginx proxy (80/443)
- **Use case**: Full production deployment

### `app` - Applications Only
- **Services**: API + Frontend (no database/Redis)
- **Features**: Connect to external database and Redis
- **Ports**: Frontend on 8080, API on 3001
- **Use case**: Google Cloud, AWS, or external managed services

### `full` - Full Stack (Default)
- **Services**: API + Frontend + Database + Redis
- **Features**: Complete local stack without proxy
- **Ports**: Frontend on 8080, API on 3001
- **Use case**: Local testing, development without hot-reload

### `db` - Database Services Only
- **Services**: Database + Redis
- **Use case**: Run just the data services

## 🚀 Quick Start Commands

### Development (Hot-reload)
```bash
# Copy development environment
cp env.dev.example .env

# Start development stack
npm run docker:up:dev
# or
docker compose --env-file env.dev.example --profile dev up -d

# View logs
npm run docker:logs

# Stop
npm run docker:down
```

### Production (Complete Stack)
```bash
# Copy production environment  
cp env.prod.example .env
# Edit .env with your API keys

# Deploy production stack
npm run docker:up:prod
# or  
docker compose --env-file env.prod.example --profile prod up -d

# Access at: http://localhost (via Nginx proxy)
```

### App-Only (External DB/Redis)
```bash
# Copy app-only environment
cp env.app.example .env
# Edit .env with your external database and Redis URLs

# Start applications only
npm run docker:up:app
# or
docker compose --env-file env.app.example --profile app up -d

# Access at: http://localhost:8080
```

### Database Services Only
```bash
# Start just database and Redis
docker compose --profile db up -d
```

## ⚙️ Environment Files

### `env.dev.example` - Development
```bash
COMPOSE_PROFILES=dev,db
BACKEND_BUILD_TARGET=builder
FRONTEND_BUILD_TARGET=development  
NODE_ENV=development
FRONTEND_PORT=5173
```

### `env.prod.example` - Production  
```bash
COMPOSE_PROFILES=prod,db,full
BACKEND_BUILD_TARGET=production
FRONTEND_BUILD_TARGET=production
NODE_ENV=production
FRONTEND_PORT=8080
```

### `env.app.example` - App-Only
```bash
COMPOSE_PROFILES=app
DATABASE_URL=postgresql://user:pass@external-host:5432/db
REDIS_HOST=external-redis-host
```

## 🛠️ NPM Scripts

### Quick Commands
```bash
npm run docker:up:dev      # Development with hot-reload
npm run docker:up:prod     # Production with proxy
npm run docker:up:app      # Applications only
npm run docker:up          # Full stack (default)
npm run docker:down        # Stop all services
```

### Deployment Scripts
```bash
npm run docker:deploy              # Production deployment
npm run docker:deploy:build        # Build + deploy production  
npm run docker:deploy:dev          # Development deployment
npm run docker:deploy:app          # App-only deployment
```

### Monitoring & Logs
```bash
npm run docker:status              # Service status
npm run docker:logs               # All service logs
npm run docker:logs:api           # API logs only
npm run docker:logs:frontend      # Frontend logs only
npm run docker:health             # Health check
npm run docker:health:detailed    # Detailed health report
```

### Management
```bash
npm run docker:build              # Build images
npm run docker:cleanup            # Clean containers
npm run docker:cleanup:all        # Clean everything
npm run docker:backup             # Backup database
npm run docker:validate           # Validate environment
```

## 🔧 Advanced Usage

### Custom Profiles
```bash
# Multiple profiles
docker compose --profile dev --profile db up -d

# Custom environment + profile
docker compose --env-file my-custom.env --profile prod up -d

# Override specific services
docker compose --profile prod up -d userreports-api userreports-frontend
```

### Development Debugging
```bash
# Start with debug port exposed
docker compose --env-file env.dev.example --profile dev up -d

# Connect debugger to localhost:9229
# Hot-reload: Edit files in server/src or client/src
```

### Production with SSL
```bash
# 1. Add SSL certificates to nginx/ssl/
# 2. Uncomment SSL config in nginx/nginx.conf
# 3. Start with production profile
docker compose --env-file env.prod.example --profile prod up -d

# Access at: https://localhost
```

### External Services Integration
```bash
# For Google Cloud SQL + Redis
cp env.app.example .env

# Edit .env:
DATABASE_URL=postgresql://user:pass@cloud-sql-proxy:5432/db
REDIS_HOST=redis.memorystore.googleapis.com
REDIS_PORT=6379

# Deploy app-only
docker compose --profile app up -d
```

## 🏗️ Architecture Overview

```
Single docker-compose.yml with profiles:

┌─────────────────────────────────────────────────────────┐
│                   Profile: prod                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │    Proxy    │  │     API     │  │  Frontend   │     │
│  │   (Nginx)   │  │  (Node.js)  │  │   (React)   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│         │                │               │              │
│         └────────────────┼───────────────┘              │
│                          │                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Database   │  │    Redis    │  │   Migrate   │     │
│  │(PostgreSQL) │  │   (Cache)   │  │ (One-time)  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Profile: dev                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │     API     │  │  Frontend   │  │  Database   │     │
│  │(Hot-reload) │  │(Vite Dev)   │  │(+Dev Tools) │     │
│  │  Port 3001  │  │  Port 5173  │  │  Port 5432  │     │
│  │  Debug 9229 │  │             │  │             │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│         │                │               │              │
│         └────────────────┼───────────────┘              │
│                          │                              │
│  ┌─────────────┐  ┌─────────────┐                      │
│  │    Redis    │  │   Migrate   │                      │
│  │  Port 6379  │  │ (One-time)  │                      │
│  └─────────────┘  └─────────────┘                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Profile: app                          │
│  ┌─────────────┐  ┌─────────────┐                      │
│  │     API     │  │  Frontend   │                      │
│  │  (Node.js)  │  │   (React)   │                      │
│  │  Port 3001  │  │  Port 8080  │                      │
│  └─────────────┘  └─────────────┘                      │
│         │                │                              │
│         └────────────────┘                              │
│                          │                              │
│  ┌─────────────┐  ┌─────────────┐                      │
│  │  External   │  │  External   │                      │
│  │  Database   │  │    Redis    │                      │
│  │ (Cloud SQL) │  │(Memorystore)│                      │
│  └─────────────┘  └─────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

## 🎯 Google Cloud Kubernetes Ready

The single compose file makes Kubernetes deployment easier:

```bash
# Use app profile for K8s
docker compose --env-file env.app.example --profile app config > k8s-base.yml

# Then convert to K8s manifests
# - Database: Use Cloud SQL
# - Redis: Use Memorystore  
# - Images: Push to GCR
# - Load Balancer: Replace Nginx proxy
```

## 🔍 Troubleshooting

### Common Issues

**Profile not found:**
```bash
# Check available profiles
docker compose config --profiles

# List active services for profile  
docker compose --profile dev config --services
```

**Environment file not loading:**
```bash
# Check file exists
ls -la env.*.example

# Test environment loading
docker compose --env-file env.dev.example config
```

**Services won't start:**
```bash
# Check logs
docker compose logs

# Check specific service
docker compose logs userreports-api

# Restart specific profile
docker compose --profile dev down
docker compose --profile dev up -d
```

**Port conflicts:**
```bash
# Check what's using ports
sudo netstat -tulpn | grep :5173

# Use different ports in .env
FRONTEND_PORT=5174
VITE_DEV_PORT=5174
```

### Health Checking
```bash
# Basic health check
./scripts/docker/health-check.sh

# Detailed health check with profile
./scripts/docker/health-check.sh --profile dev --detailed

# Check specific environment
./scripts/docker/health-check.sh --env-file env.prod.example --profile prod
```

## 🎉 Benefits of Single Compose File

✅ **Simplified Management** - One file instead of four  
✅ **Profile-Based Deployment** - Easy environment switching  
✅ **Consistent Configuration** - Shared settings across environments  
✅ **Easier Maintenance** - Single source of truth  
✅ **Better Documentation** - All options in one place  
✅ **Reduced Complexity** - Less cognitive overhead  

Your Docker setup is now much cleaner and easier to use! 🐳
