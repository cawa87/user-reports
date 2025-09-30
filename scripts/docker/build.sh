#!/bin/bash

# UserReports Docker Build Script (Unified Dockerfile)
set -e

echo "🐳 Building UserReports Docker Images..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="production"
PUSH_TO_REGISTRY=false
REGISTRY=""
TAG="latest"
SERVICES="all"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -p|--push)
            PUSH_TO_REGISTRY=true
            shift
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -s|--services)
            SERVICES="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --env ENVIRONMENT    Build environment (development|production) [default: production]"
            echo "  -p, --push               Push images to registry after build"
            echo "  -r, --registry REGISTRY  Container registry URL"
            echo "  -t, --tag TAG           Image tag [default: latest]"
            echo "  -s, --services SERVICES  Services to build (all|backend|frontend) [default: all]"
            echo "  -h, --help              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                      # Build all services for production"
            echo "  $0 -e development       # Build all services for development"
            echo "  $0 -s backend           # Build only backend service"
            echo "  $0 -p -r my-registry    # Build and push to registry"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Determine build targets based on environment
if [[ "$ENVIRONMENT" == "development" ]]; then
    BACKEND_TARGET="backend-production"    # Backend always uses production build
    FRONTEND_TARGET="frontend-development" # Frontend can use dev target
else
    BACKEND_TARGET="backend-production"
    FRONTEND_TARGET="frontend-production"
fi

# Set image names
if [[ -n "$REGISTRY" ]]; then
    BACKEND_IMAGE="$REGISTRY/userreports-api:$TAG"
    FRONTEND_IMAGE="$REGISTRY/userreports-frontend:$TAG"
    FULLSTACK_IMAGE="$REGISTRY/userreports-fullstack:$TAG"
else
    BACKEND_IMAGE="userreports-api:$TAG"
    FRONTEND_IMAGE="userreports-frontend:$TAG"
    FULLSTACK_IMAGE="userreports-fullstack:$TAG"
fi

echo -e "${BLUE}Configuration:${NC}"
echo -e "  Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "  Services: ${YELLOW}$SERVICES${NC}"
echo -e "  Backend Target: ${YELLOW}$BACKEND_TARGET${NC}"
echo -e "  Frontend Target: ${YELLOW}$FRONTEND_TARGET${NC}"
echo -e "  Push to Registry: ${YELLOW}$PUSH_TO_REGISTRY${NC}"
echo ""

# Build functions
build_backend() {
    echo -e "${BLUE}Building backend image...${NC}"
    docker build \
        --build-arg NODE_ENV=$ENVIRONMENT \
        --target $BACKEND_TARGET \
        -t $BACKEND_IMAGE \
        .

    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Backend image built successfully: $BACKEND_IMAGE${NC}"
    else
        echo -e "${RED}❌ Backend image build failed${NC}"
        exit 1
    fi
}

build_frontend() {
    echo -e "${BLUE}Building frontend image...${NC}"
    docker build \
        --build-arg NODE_ENV=$ENVIRONMENT \
        --target $FRONTEND_TARGET \
        -t $FRONTEND_IMAGE \
        .

    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Frontend image built successfully: $FRONTEND_IMAGE${NC}"
    else
        echo -e "${RED}❌ Frontend image build failed${NC}"
        exit 1
    fi
}

build_fullstack() {
    echo -e "${BLUE}Building fullstack image...${NC}"
    docker build \
        --build-arg NODE_ENV=$ENVIRONMENT \
        --target fullstack \
        -t $FULLSTACK_IMAGE \
        .

    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Fullstack image built successfully: $FULLSTACK_IMAGE${NC}"
    else
        echo -e "${RED}❌ Fullstack image build failed${NC}"
        exit 1
    fi
}

# Push function
push_image() {
    local image=$1
    echo -e "${BLUE}Pushing $image...${NC}"
    
    docker push $image
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ $image pushed successfully${NC}"
    else
        echo -e "${RED}❌ $image push failed${NC}"
        exit 1
    fi
}

# Build selected services
case "$SERVICES" in
    "backend")
        build_backend
        BUILT_IMAGES=($BACKEND_IMAGE)
        ;;
    "frontend") 
        build_frontend
        BUILT_IMAGES=($FRONTEND_IMAGE)
        ;;
    "fullstack")
        build_fullstack
        BUILT_IMAGES=($FULLSTACK_IMAGE)
        ;;
    "all")
        build_backend
        build_frontend
        BUILT_IMAGES=($BACKEND_IMAGE $FRONTEND_IMAGE)
        ;;
    *)
        echo -e "${RED}❌ Unknown service: $SERVICES${NC}"
        echo -e "${YELLOW}Available services: all, backend, frontend, fullstack${NC}"
        exit 1
        ;;
esac

# Push to registry if requested
if [[ "$PUSH_TO_REGISTRY" == true ]]; then
    if [[ -z "$REGISTRY" ]]; then
        echo -e "${RED}❌ Registry URL required for push operation${NC}"
        exit 1
    fi

    echo -e "${BLUE}Pushing images to registry...${NC}"
    for image in "${BUILT_IMAGES[@]}"; do
        push_image $image
    done
fi

echo -e "${GREEN}🎉 Build completed successfully!${NC}"

# Show image sizes
echo -e "${BLUE}Built images:${NC}"
for image in "${BUILT_IMAGES[@]}"; do
    docker images | grep "$(echo $image | cut -d':' -f1)" | head -1
done

echo ""
echo -e "${BLUE}💡 Usage examples:${NC}"
echo -e "  # Development:"
echo -e "  docker run -p 5173:5173 $FRONTEND_IMAGE  # Frontend dev server"
echo -e "  docker run -p 3001:3001 $BACKEND_IMAGE   # Backend API"
echo ""
echo -e "  # Production:"
echo -e "  docker run -p 8080:8080 $FRONTEND_IMAGE  # Frontend with Nginx"
echo -e "  docker run -p 3001:3001 $BACKEND_IMAGE   # Backend API"

if [[ "$SERVICES" == "all" ]] || [[ "$SERVICES" == "fullstack" ]]; then
    echo ""
    echo -e "  # Fullstack (single container):"
    echo -e "  docker run -p 8080:8080 $FULLSTACK_IMAGE  # Complete app"
fi