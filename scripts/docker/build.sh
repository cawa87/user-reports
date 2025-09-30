#!/bin/bash

# UserReports Docker Build Script
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
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --env ENVIRONMENT    Build environment (development|production) [default: production]"
            echo "  -p, --push               Push images to registry after build"
            echo "  -r, --registry REGISTRY  Container registry URL"
            echo "  -t, --tag TAG           Image tag [default: latest]"
            echo "  -h, --help              Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Set image names
if [[ -n "$REGISTRY" ]]; then
    BACKEND_IMAGE="$REGISTRY/userreports-api:$TAG"
    FRONTEND_IMAGE="$REGISTRY/userreports-frontend:$TAG"
else
    BACKEND_IMAGE="userreports-api:$TAG"
    FRONTEND_IMAGE="userreports-frontend:$TAG"
fi

echo -e "${BLUE}Configuration:${NC}"
echo -e "  Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "  Backend Image: ${YELLOW}$BACKEND_IMAGE${NC}"
echo -e "  Frontend Image: ${YELLOW}$FRONTEND_IMAGE${NC}"
echo -e "  Push to Registry: ${YELLOW}$PUSH_TO_REGISTRY${NC}"
echo ""

# Build backend image
echo -e "${BLUE}Building backend image...${NC}"
cd server
docker build \
    --build-arg NODE_ENV=$ENVIRONMENT \
    -t $BACKEND_IMAGE \
    -f Dockerfile \
    .

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Backend image built successfully${NC}"
else
    echo -e "${RED}❌ Backend image build failed${NC}"
    exit 1
fi

cd ..

# Build frontend image
echo -e "${BLUE}Building frontend image...${NC}"
cd client
docker build \
    --build-arg NODE_ENV=$ENVIRONMENT \
    -t $FRONTEND_IMAGE \
    -f Dockerfile \
    .

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Frontend image built successfully${NC}"
else
    echo -e "${RED}❌ Frontend image build failed${NC}"
    exit 1
fi

cd ..

# Push to registry if requested
if [[ "$PUSH_TO_REGISTRY" == true ]]; then
    if [[ -z "$REGISTRY" ]]; then
        echo -e "${RED}❌ Registry URL required for push operation${NC}"
        exit 1
    fi

    echo -e "${BLUE}Pushing images to registry...${NC}"
    
    docker push $BACKEND_IMAGE
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Backend image pushed successfully${NC}"
    else
        echo -e "${RED}❌ Backend image push failed${NC}"
        exit 1
    fi

    docker push $FRONTEND_IMAGE
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Frontend image pushed successfully${NC}"
    else
        echo -e "${RED}❌ Frontend image push failed${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}🎉 All images built successfully!${NC}"

# Show image sizes
echo -e "${BLUE}Image sizes:${NC}"
docker images | grep userreports | head -2
