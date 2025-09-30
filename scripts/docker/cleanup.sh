#!/bin/bash

# UserReports Docker Cleanup Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 UserReports Docker Cleanup Utility${NC}"

# Default values
REMOVE_VOLUMES=false
REMOVE_IMAGES=false
REMOVE_NETWORKS=false
FORCE_CLEANUP=false
COMPOSE_FILE="docker-compose.prod.yml"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--volumes)
            REMOVE_VOLUMES=true
            shift
            ;;
        -i|--images)
            REMOVE_IMAGES=true
            shift
            ;;
        -n|--networks)
            REMOVE_NETWORKS=true
            shift
            ;;
        -f|--force)
            FORCE_CLEANUP=true
            shift
            ;;
        --compose-file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        --all)
            REMOVE_VOLUMES=true
            REMOVE_IMAGES=true
            REMOVE_NETWORKS=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -v, --volumes           Remove Docker volumes (WARNING: This deletes data!)"
            echo "  -i, --images            Remove UserReports Docker images"
            echo "  -n, --networks          Remove UserReports Docker networks"
            echo "  -f, --force             Skip confirmation prompts"
            echo "  --compose-file FILE     Docker compose file [default: docker-compose.prod.yml]"
            echo "  --all                   Remove everything (volumes, images, networks)"
            echo "  -h, --help              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                      Stop and remove containers only"
            echo "  $0 -i                   Stop containers and remove images"
            echo "  $0 --all -f             Complete cleanup without prompts (DANGEROUS)"
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

echo -e "${BLUE}Cleanup Configuration:${NC}"
echo -e "  Remove volumes: ${YELLOW}$REMOVE_VOLUMES${NC}"
echo -e "  Remove images: ${YELLOW}$REMOVE_IMAGES${NC}"
echo -e "  Remove networks: ${YELLOW}$REMOVE_NETWORKS${NC}"
echo -e "  Force cleanup: ${YELLOW}$FORCE_CLEANUP${NC}"
echo -e "  Compose file: ${YELLOW}$COMPOSE_FILE${NC}"
echo ""

# Warning for destructive operations
if [[ "$REMOVE_VOLUMES" == true ]]; then
    echo -e "${RED}⚠️  WARNING: Volume removal will delete all database data!${NC}"
fi

if [[ "$FORCE_CLEANUP" == false ]]; then
    echo -e "${YELLOW}Are you sure you want to proceed? (y/N)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Cleanup cancelled.${NC}"
        exit 0
    fi
fi

# Stop and remove containers
echo -e "${BLUE}🛑 Stopping and removing containers...${NC}"
if [[ -f "$COMPOSE_FILE" ]]; then
    $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE down --remove-orphans
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Containers stopped and removed${NC}"
    else
        echo -e "${YELLOW}⚠️  Some containers may not have been removed${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Compose file not found, stopping containers manually...${NC}"
    docker stop $(docker ps -q --filter "label=com.docker.compose.project=userreports") 2>/dev/null || true
    docker rm $(docker ps -aq --filter "label=com.docker.compose.project=userreports") 2>/dev/null || true
fi

# Remove volumes if requested
if [[ "$REMOVE_VOLUMES" == true ]]; then
    echo -e "${BLUE}🗄️  Removing volumes...${NC}"
    
    # Remove named volumes
    docker volume rm userreports_postgres_data 2>/dev/null || true
    docker volume rm userreports_redis_data 2>/dev/null || true
    
    # Remove all userreports-related volumes
    docker volume ls -q | grep userreports | xargs docker volume rm 2>/dev/null || true
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Volumes removed${NC}"
    else
        echo -e "${YELLOW}⚠️  Some volumes may not have been removed${NC}"
    fi
fi

# Remove images if requested
if [[ "$REMOVE_IMAGES" == true ]]; then
    echo -e "${BLUE}🖼️  Removing images...${NC}"
    
    # Remove UserReports images
    docker images -q userreports-api | xargs docker rmi -f 2>/dev/null || true
    docker images -q userreports-frontend | xargs docker rmi -f 2>/dev/null || true
    
    # Remove dangling images
    docker image prune -f 2>/dev/null || true
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Images removed${NC}"
    else
        echo -e "${YELLOW}⚠️  Some images may not have been removed${NC}"
    fi
fi

# Remove networks if requested
if [[ "$REMOVE_NETWORKS" == true ]]; then
    echo -e "${BLUE}🌐 Removing networks...${NC}"
    
    # Remove UserReports network
    docker network rm userreports-network 2>/dev/null || true
    
    # Clean up unused networks
    docker network prune -f 2>/dev/null || true
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Networks removed${NC}"
    else
        echo -e "${YELLOW}⚠️  Some networks may not have been removed${NC}"
    fi
fi

# General Docker cleanup
echo -e "${BLUE}🧹 Performing general Docker cleanup...${NC}"
docker system prune -f 2>/dev/null || true

# Show remaining UserReports resources
echo -e "${BLUE}📊 Remaining UserReports resources:${NC}"

echo -e "${YELLOW}Containers:${NC}"
docker ps -a --filter "label=com.docker.compose.project=userreports" --format "table {{.Names}}\t{{.Status}}" || echo "None"

echo -e "${YELLOW}Images:${NC}"
docker images | grep userreports || echo "None"

echo -e "${YELLOW}Volumes:${NC}"
docker volume ls | grep userreports || echo "None"

echo -e "${YELLOW}Networks:${NC}"
docker network ls | grep userreports || echo "None"

echo -e "${GREEN}🎉 Cleanup completed!${NC}"

# Show disk space freed
echo -e "${BLUE}💾 Docker disk usage:${NC}"
docker system df
