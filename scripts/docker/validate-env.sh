#!/bin/bash

# UserReports Environment Validation Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 UserReports Environment Validation${NC}"

# Default values
ENV_FILE=".env"
STRICT_MODE=false
FIX_ISSUES=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        --strict)
            STRICT_MODE=true
            shift
            ;;
        --fix)
            FIX_ISSUES=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --env-file FILE     Environment file to validate [default: .env]"
            echo "  --strict            Enable strict validation (fail on warnings)"
            echo "  --fix               Attempt to fix common issues"
            echo "  -h, --help          Show this help message"
            echo ""
            echo "This script validates environment configuration for UserReports Docker deployment."
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}Validation Configuration:${NC}"
echo -e "  Environment file: ${YELLOW}$ENV_FILE${NC}"
echo -e "  Strict mode: ${YELLOW}$STRICT_MODE${NC}"
echo -e "  Fix issues: ${YELLOW}$FIX_ISSUES${NC}"
echo ""

# Validation counters
ERRORS=0
WARNINGS=0
FIXED=0

# Function to log error
log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ERRORS=$((ERRORS + 1))
}

# Function to log warning
log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

# Function to log success
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to log info
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to log fix
log_fix() {
    echo -e "${GREEN}🔧 FIXED: $1${NC}"
    FIXED=$((FIXED + 1))
}

# Check if environment file exists
if [[ ! -f "$ENV_FILE" ]]; then
    if [[ "$FIX_ISSUES" == true ]] && [[ -f "env.docker.example" ]]; then
        cp env.docker.example "$ENV_FILE"
        log_fix "Created $ENV_FILE from template"
    else
        log_error "Environment file '$ENV_FILE' not found"
        if [[ -f "env.docker.example" ]]; then
            log_info "Run: cp env.docker.example $ENV_FILE"
        fi
        exit 1
    fi
fi

echo -e "${BLUE}📋 Validating environment variables...${NC}"

# Load environment file
set -a
source "$ENV_FILE" 2>/dev/null || {
    log_error "Failed to load environment file '$ENV_FILE'"
    exit 1
}
set +a

# Required variables for basic functionality
REQUIRED_VARS=(
    "DATABASE_URL"
    "REDIS_HOST"
    "JWT_SECRET"
    "GITLAB_URL"
    "GITLAB_ACCESS_TOKEN"
    "CLICKUP_API_TOKEN"
)

# Optional but recommended variables
OPTIONAL_VARS=(
    "NODE_ENV"
    "PORT"
    "REDIS_PORT" 
    "REDIS_PASSWORD"
    "GITLAB_PROJECT_IDS"
    "CLICKUP_TEAM_ID"
    "CLICKUP_SPACE_IDS"
    "JWT_EXPIRES_IN"
    "LOG_LEVEL"
)

# Validate required variables
echo -e "${BLUE}🔍 Checking required variables...${NC}"
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        log_error "Required variable '$var' is not set"
    else
        log_success "Required variable '$var' is set"
    fi
done

# Validate optional variables
echo -e "${BLUE}🔍 Checking optional variables...${NC}"
for var in "${OPTIONAL_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        log_warning "Optional variable '$var' is not set"
    else
        log_success "Optional variable '$var' is set"
    fi
done

echo ""

# Detailed validations
echo -e "${BLUE}🔬 Performing detailed validations...${NC}"

# Database URL validation
if [[ -n "$DATABASE_URL" ]]; then
    if [[ "$DATABASE_URL" =~ ^postgresql:// ]]; then
        log_success "DATABASE_URL uses correct PostgreSQL protocol"
        
        # Check for localhost in production
        if [[ "$NODE_ENV" == "production" ]] && [[ "$DATABASE_URL" == *"localhost"* ]]; then
            log_warning "DATABASE_URL contains 'localhost' in production environment"
        fi
    else
        log_error "DATABASE_URL must start with 'postgresql://'"
    fi
fi

# JWT Secret validation
if [[ -n "$JWT_SECRET" ]]; then
    if [[ ${#JWT_SECRET} -lt 32 ]]; then
        if [[ "$FIX_ISSUES" == true ]]; then
            NEW_SECRET=$(openssl rand -base64 48)
            sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=$NEW_SECRET|" "$ENV_FILE"
            log_fix "Generated new JWT_SECRET (minimum 32 characters)"
        else
            log_error "JWT_SECRET should be at least 32 characters long (current: ${#JWT_SECRET})"
        fi
    else
        log_success "JWT_SECRET meets minimum length requirement"
    fi
    
    if [[ "$JWT_SECRET" == "your-super-secret-jwt-key"* ]]; then
        log_warning "JWT_SECRET appears to be the default template value"
    fi
fi

# GitLab URL validation
if [[ -n "$GITLAB_URL" ]]; then
    if [[ "$GITLAB_URL" =~ ^https?:// ]]; then
        log_success "GITLAB_URL format is valid"
        
        # Check if it's still the template value
        if [[ "$GITLAB_URL" == *"your-gitlab"* ]]; then
            log_warning "GITLAB_URL appears to be the template value"
        fi
    else
        log_error "GITLAB_URL must start with 'http://' or 'https://'"
    fi
fi

# GitLab token validation
if [[ -n "$GITLAB_ACCESS_TOKEN" ]]; then
    if [[ ${#GITLAB_ACCESS_TOKEN} -lt 20 ]]; then
        log_warning "GITLAB_ACCESS_TOKEN seems too short (typical tokens are 20+ characters)"
    else
        log_success "GITLAB_ACCESS_TOKEN length appears valid"
    fi
    
    if [[ "$GITLAB_ACCESS_TOKEN" == "your-gitlab"* ]]; then
        log_error "GITLAB_ACCESS_TOKEN is still the template value"
    fi
fi

# ClickUp token validation
if [[ -n "$CLICKUP_API_TOKEN" ]]; then
    if [[ ${#CLICKUP_API_TOKEN} -lt 30 ]]; then
        log_warning "CLICKUP_API_TOKEN seems too short (typical tokens are 30+ characters)"
    else
        log_success "CLICKUP_API_TOKEN length appears valid"
    fi
    
    if [[ "$CLICKUP_API_TOKEN" == "your-clickup"* ]]; then
        log_error "CLICKUP_API_TOKEN is still the template value"
    fi
fi

# Redis configuration validation
if [[ -n "$REDIS_HOST" ]] && [[ -n "$REDIS_PORT" ]]; then
    if [[ "$REDIS_PORT" =~ ^[0-9]+$ ]] && [[ "$REDIS_PORT" -ge 1 ]] && [[ "$REDIS_PORT" -le 65535 ]]; then
        log_success "REDIS_PORT is valid"
    else
        log_error "REDIS_PORT must be a number between 1-65535"
    fi
fi

# Node environment validation
if [[ -n "$NODE_ENV" ]]; then
    case "$NODE_ENV" in
        "development"|"production"|"test")
            log_success "NODE_ENV is set to valid value: $NODE_ENV"
            ;;
        *)
            log_warning "NODE_ENV should be 'development', 'production', or 'test' (current: $NODE_ENV)"
            ;;
    esac
fi

# Port validation
if [[ -n "$PORT" ]]; then
    if [[ "$PORT" =~ ^[0-9]+$ ]] && [[ "$PORT" -ge 1 ]] && [[ "$PORT" -le 65535 ]]; then
        log_success "PORT is valid"
    else
        log_error "PORT must be a number between 1-65535"
    fi
fi

# Log level validation
if [[ -n "$LOG_LEVEL" ]]; then
    case "$LOG_LEVEL" in
        "error"|"warn"|"info"|"debug"|"trace")
            log_success "LOG_LEVEL is valid: $LOG_LEVEL"
            ;;
        *)
            log_warning "LOG_LEVEL should be one of: error, warn, info, debug, trace"
            ;;
    esac
fi

echo ""

# Docker-specific validations
echo -e "${BLUE}🐳 Docker-specific validations...${NC}"

# Check if Docker is running
if command -v docker >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then
        log_success "Docker is running"
    else
        log_error "Docker is installed but not running"
    fi
else
    log_error "Docker is not installed"
fi

# Check if Docker Compose is available
if command -v docker-compose >/dev/null 2>&1; then
    log_success "docker-compose is available"
elif docker compose version >/dev/null 2>&1; then
    log_success "docker compose (v2) is available"
else
    log_error "Docker Compose is not available"
fi

# Check for required Docker Compose files
COMPOSE_FILES=("docker-compose.yml" "docker-compose.prod.yml")
for file in "${COMPOSE_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        log_success "Found $file"
    else
        log_error "Missing Docker Compose file: $file"
    fi
done

echo ""

# Security validations
echo -e "${BLUE}🔒 Security validations...${NC}"

# Check for default passwords
if [[ "$DATABASE_URL" == *":password@"* ]]; then
    log_warning "Database URL contains default password 'password'"
fi

if [[ -n "$POSTGRES_PASSWORD" ]] && [[ "$POSTGRES_PASSWORD" == "password" ]]; then
    log_warning "POSTGRES_PASSWORD is set to default value 'password'"
fi

# Check file permissions
if [[ -f "$ENV_FILE" ]]; then
    PERMS=$(stat -c "%a" "$ENV_FILE" 2>/dev/null || stat -f "%A" "$ENV_FILE" 2>/dev/null || echo "000")
    if [[ "$PERMS" == "600" ]] || [[ "$PERMS" == "644" ]]; then
        log_success "Environment file has appropriate permissions"
    else
        if [[ "$FIX_ISSUES" == true ]]; then
            chmod 600 "$ENV_FILE"
            log_fix "Set environment file permissions to 600"
        else
            log_warning "Environment file should have restricted permissions (600 or 644)"
        fi
    fi
fi

echo ""

# Summary
echo -e "${BLUE}📊 Validation Summary:${NC}"
echo -e "  Errors: ${RED}$ERRORS${NC}"
echo -e "  Warnings: ${YELLOW}$WARNINGS${NC}"
echo -e "  Fixed issues: ${GREEN}$FIXED${NC}"

# Exit codes
if [[ $ERRORS -gt 0 ]]; then
    echo -e "${RED}❌ Validation failed with $ERRORS errors${NC}"
    exit 1
elif [[ $WARNINGS -gt 0 ]] && [[ "$STRICT_MODE" == true ]]; then
    echo -e "${YELLOW}⚠️  Validation failed in strict mode with $WARNINGS warnings${NC}"
    exit 1
elif [[ $WARNINGS -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  Validation completed with $WARNINGS warnings${NC}"
    echo -e "${BLUE}💡 Run with --strict to treat warnings as errors${NC}"
    exit 0
else
    echo -e "${GREEN}🎉 All validations passed!${NC}"
    exit 0
fi
