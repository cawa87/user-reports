#!/bin/bash

# UserReports Docker Health Check Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏥 UserReports Health Check${NC}"

# Default values
COMPOSE_FILE="docker-compose.yml"
ENV_FILE="env.prod.example"
PROFILE=""
DETAILED=false
WAIT_TIME=5
MAX_RETRIES=3

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
        -d|--detailed)
            DETAILED=true
            shift
            ;;
        -w|--wait)
            WAIT_TIME="$2"
            shift 2
            ;;
        -r|--retries)
            MAX_RETRIES="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -f, --file FILE         Docker compose file [default: docker-compose.yml]"
            echo "  --env-file FILE         Environment file [default: env.prod.example]"
            echo "  --profile PROFILE       Docker compose profile (optional)"
            echo "  -d, --detailed          Show detailed health information"
            echo "  -w, --wait SECONDS      Wait time between checks [default: 5]"
            echo "  -r, --retries COUNT     Max retries for health checks [default: 3]"
            echo "  -h, --help              Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

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

echo -e "${BLUE}Health Check Configuration:${NC}"
echo -e "  Compose file: ${YELLOW}$COMPOSE_FILE${NC}"
echo -e "  Environment file: ${YELLOW}$ENV_FILE${NC}"
echo -e "  Profile: ${YELLOW}${PROFILE:-auto-detect}${NC}"
echo -e "  Detailed output: ${YELLOW}$DETAILED${NC}"
echo -e "  Wait time: ${YELLOW}${WAIT_TIME}s${NC}"
echo -e "  Max retries: ${YELLOW}$MAX_RETRIES${NC}"
echo ""

# Function to check service health with retries
check_service_health() {
    local service_name=$1
    local health_url=$2
    local retry=1

    while [[ $retry -le $MAX_RETRIES ]]; do
        if curl -f -s --connect-timeout 5 "$health_url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name: Healthy${NC}"
            return 0
        fi
        
        if [[ $retry -eq $MAX_RETRIES ]]; then
            echo -e "${RED}❌ $service_name: Unhealthy (failed after $MAX_RETRIES attempts)${NC}"
            return 1
        else
            echo -e "${YELLOW}⏳ $service_name: Checking... (attempt $retry/$MAX_RETRIES)${NC}"
            sleep $WAIT_TIME
        fi
        
        ((retry++))
    done
}

# Function to get detailed service info
get_service_details() {
    local service_name=$1
    local container_name=$2
    
    if [[ "$DETAILED" == true ]]; then
        echo -e "${BLUE}📊 $service_name Details:${NC}"
        
        # Container status
        local status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "not found")
        echo -e "  Status: ${YELLOW}$status${NC}"
        
        if [[ "$status" == "running" ]]; then
            # Uptime
            local started=$(docker inspect --format='{{.State.StartedAt}}' "$container_name" 2>/dev/null)
            echo -e "  Started: ${YELLOW}$started${NC}"
            
            # Resource usage
            local stats=$(docker stats --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}" "$container_name" 2>/dev/null | tail -n 1)
            if [[ -n "$stats" ]]; then
                echo -e "  Resources: ${YELLOW}$stats${NC}"
            fi
        fi
        echo ""
    fi
}

# Build compose command with profile if specified
COMPOSE_CMD="$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE"
if [[ -n "$PROFILE" ]]; then
    COMPOSE_CMD="$COMPOSE_CMD --profile $PROFILE"
fi
if [[ -f "$ENV_FILE" ]]; then
    COMPOSE_CMD="$COMPOSE_CMD --env-file $ENV_FILE"
fi

# Check if services are running
echo -e "${BLUE}🔍 Checking container status...${NC}"
SERVICES_STATUS=$($COMPOSE_CMD ps --format json 2>/dev/null || echo "[]")

if [[ "$SERVICES_STATUS" == "[]" ]]; then
    echo -e "${RED}❌ No services are running${NC}"
    exit 1
fi

# Parse service status
RUNNING_SERVICES=$($COMPOSE_CMD ps --services --filter status=running 2>/dev/null || echo "")

if [[ -z "$RUNNING_SERVICES" ]]; then
    echo -e "${RED}❌ No services are currently running${NC}"
    echo -e "${YELLOW}💡 Try running: $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE up -d${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found running services${NC}"
echo ""

# Overall health score
TOTAL_CHECKS=0
PASSED_CHECKS=0

# Check Database Health
if echo "$RUNNING_SERVICES" | grep -q "userreports-db\|postgres"; then
    echo -e "${BLUE}🗄️  Checking Database...${NC}"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if $COMPOSE_CMD exec -T userreports-db pg_isready -U postgres >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database: Healthy${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        get_service_details "Database" "userreports-db"
    else
        echo -e "${RED}❌ Database: Unhealthy${NC}"
    fi
fi

# Check Redis Health
if echo "$RUNNING_SERVICES" | grep -q "userreports-redis\|redis"; then
    echo -e "${BLUE}📋 Checking Redis...${NC}"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if $COMPOSE_CMD exec -T userreports-redis redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis: Healthy${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        get_service_details "Redis" "userreports-redis"
    else
        echo -e "${RED}❌ Redis: Unhealthy${NC}"
    fi
fi

# Check API Health
if echo "$RUNNING_SERVICES" | grep -q "userreports-api"; then
    echo -e "${BLUE}🔌 Checking API...${NC}"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if check_service_health "API" "http://localhost:3001/api/health"; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        get_service_details "API" "userreports-api"
        
        # Check API endpoints if detailed
        if [[ "$DETAILED" == true ]]; then
            echo -e "${BLUE}📡 Testing API endpoints:${NC}"
            
            # Dashboard endpoint
            if curl -f -s http://localhost:3001/api/dashboard >/dev/null 2>&1; then
                echo -e "  ${GREEN}✅ Dashboard endpoint${NC}"
            else
                echo -e "  ${YELLOW}⚠️  Dashboard endpoint (may need authentication)${NC}"
            fi
            
            # Users endpoint
            if curl -f -s http://localhost:3001/api/users >/dev/null 2>&1; then
                echo -e "  ${GREEN}✅ Users endpoint${NC}"
            else
                echo -e "  ${YELLOW}⚠️  Users endpoint (may need authentication)${NC}"
            fi
            echo ""
        fi
    fi
fi

# Check Frontend Health
if echo "$RUNNING_SERVICES" | grep -q "userreports-frontend"; then
    echo -e "${BLUE}🌐 Checking Frontend...${NC}"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if check_service_health "Frontend" "http://localhost:8080/health"; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        get_service_details "Frontend" "userreports-frontend"
    fi
fi

# Check Proxy Health (if exists)
if echo "$RUNNING_SERVICES" | grep -q "userreports-proxy"; then
    echo -e "${BLUE}🔀 Checking Reverse Proxy...${NC}"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if check_service_health "Proxy" "http://localhost:80/health"; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        get_service_details "Proxy" "userreports-proxy"
    fi
fi

# Show overall health summary
echo -e "${BLUE}📊 Health Summary:${NC}"
echo -e "  Services running: ${GREEN}$(echo "$RUNNING_SERVICES" | wc -l)${NC}"
echo -e "  Health checks: ${GREEN}$PASSED_CHECKS${NC}/${TOTAL_CHECKS}"

# Calculate health percentage
if [[ $TOTAL_CHECKS -gt 0 ]]; then
    HEALTH_PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    
    if [[ $HEALTH_PERCENTAGE -eq 100 ]]; then
        echo -e "  Overall health: ${GREEN}$HEALTH_PERCENTAGE%${NC} 🎉"
    elif [[ $HEALTH_PERCENTAGE -ge 80 ]]; then
        echo -e "  Overall health: ${YELLOW}$HEALTH_PERCENTAGE%${NC} ⚠️"
    else
        echo -e "  Overall health: ${RED}$HEALTH_PERCENTAGE%${NC} 🚨"
    fi
else
    echo -e "  Overall health: ${RED}No checks performed${NC}"
    exit 1
fi

# Show application URLs
echo ""
echo -e "${BLUE}🔗 Application URLs:${NC}"
echo -e "  Frontend: ${YELLOW}http://localhost:8080${NC}"
echo -e "  API: ${YELLOW}http://localhost:3001/api${NC}"
echo -e "  API Health: ${YELLOW}http://localhost:3001/api/health${NC}"

# Exit with appropriate code
if [[ $PASSED_CHECKS -eq $TOTAL_CHECKS ]]; then
    echo -e "${GREEN}🎉 All services are healthy!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some services are unhealthy${NC}"
    exit 1
fi
