#!/bin/bash

# UserReports Docker Backup Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}💾 UserReports Docker Backup Utility${NC}"

# Default values
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups"
BACKUP_TYPE="full"
RETENTION_DAYS=30
COMPRESS=true

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
        -d|--dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -t|--type)
            BACKUP_TYPE="$2"
            shift 2
            ;;
        --retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        --no-compress)
            COMPRESS=false
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -f, --file FILE         Docker compose file [default: docker-compose.prod.yml]"
            echo "  --env-file FILE         Environment file [default: .env]"
            echo "  -d, --dir DIRECTORY     Backup directory [default: ./backups]"
            echo "  -t, --type TYPE         Backup type: full, db-only, volumes [default: full]"
            echo "  --retention DAYS        Retention period in days [default: 30]"
            echo "  --no-compress           Skip compression of backups"
            echo "  -h, --help              Show this help message"
            echo ""
            echo "Backup types:"
            echo "  full      - Database dump + volume backup + configuration"
            echo "  db-only   - Database dump only"
            echo "  volumes   - Volume backup only"
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

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PREFIX="userreports_backup_${TIMESTAMP}"

echo -e "${BLUE}Backup Configuration:${NC}"
echo -e "  Compose file: ${YELLOW}$COMPOSE_FILE${NC}"
echo -e "  Backup type: ${YELLOW}$BACKUP_TYPE${NC}"
echo -e "  Backup directory: ${YELLOW}$BACKUP_DIR${NC}"
echo -e "  Compression: ${YELLOW}$COMPRESS${NC}"
echo -e "  Retention: ${YELLOW}$RETENTION_DAYS days${NC}"
echo ""

# Check if services are running
if ! $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE ps | grep -q "Up"; then
    echo -e "${RED}❌ No services are running. Please start UserReports first.${NC}"
    exit 1
fi

# Function to backup database
backup_database() {
    echo -e "${BLUE}🗄️  Backing up PostgreSQL database...${NC}"
    
    local db_backup_file="$BACKUP_DIR/${BACKUP_PREFIX}_database.sql"
    
    # Create database dump
    $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE exec -T userreports-db pg_dump -U postgres -d userreports > "$db_backup_file"
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Database backup created: ${db_backup_file}${NC}"
        
        # Compress if requested
        if [[ "$COMPRESS" == true ]]; then
            gzip "$db_backup_file"
            echo -e "${GREEN}✅ Database backup compressed: ${db_backup_file}.gz${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}❌ Database backup failed${NC}"
        return 1
    fi
}

# Function to backup volumes
backup_volumes() {
    echo -e "${BLUE}💽 Backing up Docker volumes...${NC}"
    
    local volume_backup_dir="$BACKUP_DIR/${BACKUP_PREFIX}_volumes"
    mkdir -p "$volume_backup_dir"
    
    # Backup PostgreSQL data volume
    if docker volume ls | grep -q "postgres_data"; then
        echo -e "${BLUE}Backing up postgres_data volume...${NC}"
        docker run --rm \
            -v userreports_postgres_data:/source:ro \
            -v "$PWD/$volume_backup_dir":/backup \
            alpine \
            tar czf /backup/postgres_data.tar.gz -C /source .
        
        if [[ $? -eq 0 ]]; then
            echo -e "${GREEN}✅ PostgreSQL volume backup created${NC}"
        else
            echo -e "${RED}❌ PostgreSQL volume backup failed${NC}"
            return 1
        fi
    fi
    
    # Backup Redis data volume
    if docker volume ls | grep -q "redis_data"; then
        echo -e "${BLUE}Backing up redis_data volume...${NC}"
        docker run --rm \
            -v userreports_redis_data:/source:ro \
            -v "$PWD/$volume_backup_dir":/backup \
            alpine \
            tar czf /backup/redis_data.tar.gz -C /source .
        
        if [[ $? -eq 0 ]]; then
            echo -e "${GREEN}✅ Redis volume backup created${NC}"
        else
            echo -e "${RED}❌ Redis volume backup failed${NC}"
            return 1
        fi
    fi
    
    return 0
}

# Function to backup configuration
backup_configuration() {
    echo -e "${BLUE}⚙️  Backing up configuration files...${NC}"
    
    local config_backup_dir="$BACKUP_DIR/${BACKUP_PREFIX}_config"
    mkdir -p "$config_backup_dir"
    
    # Backup environment file (without sensitive data)
    if [[ -f "$ENV_FILE" ]]; then
        # Create sanitized version of env file
        grep -E '^[A-Z_]+=.*$' "$ENV_FILE" | \
        sed 's/\(PASSWORD\|SECRET\|TOKEN\|KEY\)=.*/\1=***REDACTED***/g' \
        > "$config_backup_dir/env_template.txt"
        
        echo -e "${GREEN}✅ Environment template saved (sensitive data redacted)${NC}"
    fi
    
    # Backup Docker Compose files
    for compose_file in docker-compose*.yml; do
        if [[ -f "$compose_file" ]]; then
            cp "$compose_file" "$config_backup_dir/"
            echo -e "${GREEN}✅ Copied $compose_file${NC}"
        fi
    done
    
    # Backup nginx configuration if it exists
    if [[ -d "nginx" ]]; then
        cp -r nginx "$config_backup_dir/"
        echo -e "${GREEN}✅ Copied nginx configuration${NC}"
    fi
    
    # Backup init SQL if it exists
    if [[ -f "init.sql" ]]; then
        cp init.sql "$config_backup_dir/"
        echo -e "${GREEN}✅ Copied init.sql${NC}"
    fi
    
    return 0
}

# Function to create backup manifest
create_manifest() {
    local manifest_file="$BACKUP_DIR/${BACKUP_PREFIX}_manifest.json"
    
    cat > "$manifest_file" << EOF
{
  "backup_info": {
    "timestamp": "$TIMESTAMP",
    "type": "$BACKUP_TYPE", 
    "version": "1.0.0",
    "created_by": "UserReports Docker Backup Script"
  },
  "system_info": {
    "hostname": "$(hostname)",
    "user": "$(whoami)",
    "docker_version": "$(docker --version)",
    "compose_version": "$(docker-compose --version 2>/dev/null || docker compose version 2>/dev/null)"
  },
  "services_status": $(${DOCKER_COMPOSE_CMD} -f ${COMPOSE_FILE} ps --format json 2>/dev/null || echo '[]'),
  "volumes": $(docker volume ls --format json | jq -s '[.[] | select(.Name | contains("userreports"))]' 2>/dev/null || echo '[]'),
  "backup_files": []
}
EOF

    echo -e "${GREEN}✅ Backup manifest created: ${manifest_file}${NC}"
}

# Perform backup based on type
case "$BACKUP_TYPE" in
    "full")
        echo -e "${BLUE}🔄 Performing full backup...${NC}"
        backup_database && backup_volumes && backup_configuration
        ;;
    "db-only")
        echo -e "${BLUE}🔄 Performing database-only backup...${NC}"
        backup_database
        ;;
    "volumes")
        echo -e "${BLUE}🔄 Performing volumes-only backup...${NC}"
        backup_volumes
        ;;
    *)
        echo -e "${RED}❌ Unknown backup type: $BACKUP_TYPE${NC}"
        echo -e "${YELLOW}Available types: full, db-only, volumes${NC}"
        exit 1
        ;;
esac

# Create backup manifest
create_manifest

# Clean up old backups based on retention policy
if [[ $RETENTION_DAYS -gt 0 ]]; then
    echo -e "${BLUE}🧹 Cleaning up old backups (older than $RETENTION_DAYS days)...${NC}"
    
    find "$BACKUP_DIR" -name "userreports_backup_*" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "userreports_backup_*" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
    
    echo -e "${GREEN}✅ Old backups cleaned up${NC}"
fi

# Calculate total backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR"/${BACKUP_PREFIX}* 2>/dev/null | awk '{total += $1} END {print total "K"}' | numfmt --from=iec --to=iec || echo "Unknown")

echo ""
echo -e "${GREEN}🎉 Backup completed successfully!${NC}"
echo -e "${BLUE}📊 Backup Summary:${NC}"
echo -e "  Timestamp: ${YELLOW}$TIMESTAMP${NC}"
echo -e "  Type: ${YELLOW}$BACKUP_TYPE${NC}" 
echo -e "  Location: ${YELLOW}$BACKUP_DIR${NC}"
echo -e "  Size: ${YELLOW}$BACKUP_SIZE${NC}"
echo ""
echo -e "${BLUE}📁 Backup files:${NC}"
ls -la "$BACKUP_DIR"/${BACKUP_PREFIX}* 2>/dev/null || echo "No backup files found"

echo ""
echo -e "${BLUE}🔄 To restore from this backup:${NC}"
echo -e "  Database: ${YELLOW}./scripts/docker/restore.sh --db $BACKUP_DIR/${BACKUP_PREFIX}_database.sql${NC}"
echo -e "  Volumes: ${YELLOW}./scripts/docker/restore.sh --volumes $BACKUP_DIR/${BACKUP_PREFIX}_volumes${NC}"
