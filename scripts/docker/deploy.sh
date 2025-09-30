#!/bin/bash

# UserReports Docker Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying UserReports Application...${NC}"

# Default values
COMPOSE_FILE="docker-compose.yml"
ENV_FILE="env.prod.example"
PROFILE="prod"
BUILD_IMAGES=false
PULL_IMAGES=false
RESTART_SERVICES=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        --env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        --profile)
            PROFILE="$2"
            shift 2
            ;;
        -b|--build)
            BUILD_IMAGES=true
            shift
            ;;
        -p|--pull)
            PULL_IMAGES=true
            shift
            ;;
        -r|--restart)
            RESTART_SERVICES=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -f, --file FILE         Docker compose file [default: docker-compose.yml]"
            echo "  --env-file FILE         Environment file [default: env.prod.example]"
            echo "  --profile PROFILE       Docker compose profile [default: prod]"
            echo "  -b, --build             Build images before deployment"
            echo "  -p, --pull              Pull latest images before deployment"
            echo "  -r, --restart           Restart services after deployment"
            echo "  -h, --help              Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose is not available.${NC}"
    exit 1
fi

# Use docker compose or docker-compose based on availability
DOCKER_COMPOSE_CMD="docker-compose"
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
fi

# Check if compose file exists
if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo -e "${RED}❌ Docker compose file not found: $COMPOSE_FILE${NC}"
    exit 1
fi

# Check if environment file exists
if [[ ! -f "$ENV_FILE" ]]; then
    echo -e "${YELLOW}⚠️  Environment file not found: $ENV_FILE${NC}"
    echo -e "${YELLOW}   Creating from template...${NC}"
    if [[ -f "env.docker.example" ]]; then
        cp env.docker.example $ENV_FILE
        echo -e "${YELLOW}   Please edit $ENV_FILE with your configuration before continuing.${NC}"
        read -p "Press Enter to continue after editing the environment file..."
    else
        echo -e "${RED}❌ Template file env.docker.example not found.${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}Configuration:${NC}"
echo -e "  Compose file: ${YELLOW}$COMPOSE_FILE${NC}"
echo -e "  Environment file: ${YELLOW}$ENV_FILE${NC}"
echo -e "  Profile: ${YELLOW}$PROFILE${NC}"
echo -e "  Build images: ${YELLOW}$BUILD_IMAGES${NC}"
echo -e "  Pull images: ${YELLOW}$PULL_IMAGES${NC}"
echo -e "  Restart services: ${YELLOW}$RESTART_SERVICES${NC}"
echo ""

# Pull images if requested
if [[ "$PULL_IMAGES" == true ]]; then
    echo -e "${BLUE}📥 Pulling latest images...${NC}"
    $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE --profile $PROFILE pull
fi

# Build images if requested
if [[ "$BUILD_IMAGES" == true ]]; then
    echo -e "${BLUE}🔨 Building images...${NC}"
    $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE --profile $PROFILE build --no-cache
fi

# Create network if it doesn't exist
NETWORK_NAME="userreports-network"
if ! docker network ls | grep -q $NETWORK_NAME; then
    echo -e "${BLUE}🌐 Creating network: $NETWORK_NAME${NC}"
    docker network create $NETWORK_NAME
fi

# Stop existing services
echo -e "${BLUE}🛑 Stopping existing services...${NC}"
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE --profile $PROFILE down --remove-orphans

# Start services
echo -e "${BLUE}🚀 Starting services...${NC}"
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE --profile $PROFILE up -d

# Wait for services to be healthy
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Check service health
echo -e "${BLUE}🔍 Checking service health...${NC}"

# Function to check service health
check_service_health() {
    local service_name=$1
    local health_url=$2
    local max_attempts=30
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$health_url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is healthy${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}⏳ Waiting for $service_name... (attempt $attempt/$max_attempts)${NC}"
        sleep 5
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service_name failed to become healthy${NC}"
    return 1
}

# Check database health
if $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE ps | grep -q userreports-db; then
    echo -e "${BLUE}Checking database connection...${NC}"
    if $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE exec -T userreports-db pg_isready -U postgres >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database is healthy${NC}"
    else
        echo -e "${RED}❌ Database is not responding${NC}"
    fi
fi

# Check Redis health
if $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE ps | grep -q userreports-redis; then
    echo -e "${BLUE}Checking Redis connection...${NC}"
    if $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE exec -T userreports-redis redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis is healthy${NC}"
    else
        echo -e "${RED}❌ Redis is not responding${NC}"
    fi
fi

# Check API health
check_service_health "API" "http://localhost:3001/api/health"

# Check Frontend health
check_service_health "Frontend" "http://localhost:8080/health"

# Show running services
echo -e "${BLUE}📊 Service Status:${NC}"
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE ps

# Show application URLs
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}Application URLs:${NC}"
echo -e "  Frontend: ${YELLOW}http://localhost:8080${NC}"
echo -e "  API: ${YELLOW}http://localhost:3001/api${NC}"
echo -e "  API Health: ${YELLOW}http://localhost:3001/api/health${NC}"
echo ""
echo -e "${BLUE}Management Commands:${NC}"
echo -e "  View logs: ${YELLOW}$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE logs -f${NC}"
echo -e "  Stop services: ${YELLOW}$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE down${NC}"
echo -e "  Restart services: ${YELLOW}$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE restart${NC}"
