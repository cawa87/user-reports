#!/bin/bash

# UserReports Data Resync Script
# This script provides various options for resyncing data from GitLab and ClickUp

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Base URL
API_BASE="http://localhost:3001/api"

# Functions
print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}         UserReports Data Resync Tool${NC}"
    echo -e "${BLUE}================================================${NC}"
}

check_backend() {
    echo -e "${YELLOW}🔍 Checking backend status...${NC}"
    if curl -s --connect-timeout 5 "$API_BASE/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Backend is not running or not accessible${NC}"
        echo -e "${YELLOW}   Please start the backend with: npm run dev${NC}"
        return 1
    fi
}

sync_all() {
    echo -e "${YELLOW}🔄 Starting real data sync from GitLab and ClickUp APIs...${NC}"
    echo -e "${BLUE}   GitLab: https://gitlab.scholarshipowl.tech${NC}"
    echo -e "${BLUE}   ClickUp: Team ID 36184932${NC}"
    if curl -X POST "$API_BASE/sync/manual" -H "Content-Type: application/json" -s | grep -q "success"; then
        echo -e "${GREEN}✅ Real data sync completed successfully!${NC}"
        echo -e "${GREEN}   ✓ GitLab commits, projects, and users synced${NC}"
        echo -e "${GREEN}   ✓ ClickUp tasks, time tracking, and analytics synced${NC}"
    else
        echo -e "${RED}❌ Real data sync failed${NC}"
        echo -e "${YELLOW}   Check GitLab/ClickUp API credentials and network access${NC}"
        return 1
    fi
}

sync_gitlab() {
    echo -e "${YELLOW}🦊 Starting real GitLab data sync...${NC}"
    echo -e "${BLUE}   Source: https://gitlab.scholarshipowl.tech${NC}"
    if curl -X POST "$API_BASE/sync/gitlab" -H "Content-Type: application/json" -s | grep -q "success"; then
        echo -e "${GREEN}✅ GitLab real data sync completed!${NC}"
        echo -e "${GREEN}   ✓ Live commits and code statistics imported${NC}"
        echo -e "${GREEN}   ✓ Real project and user data updated${NC}"
    else
        echo -e "${RED}❌ GitLab sync failed${NC}"
        echo -e "${YELLOW}   Check GitLab API token and network access${NC}"
        return 1
    fi
}

sync_clickup() {
    echo -e "${YELLOW}🎯 Starting real ClickUp data sync...${NC}"
    echo -e "${BLUE}   Source: Team ID 36184932${NC}"
    if curl -X POST "$API_BASE/sync/clickup" -H "Content-Type: application/json" -s | grep -q "success"; then
        echo -e "${GREEN}✅ ClickUp real data sync completed!${NC}"
        echo -e "${GREEN}   ✓ Live tasks and time tracking imported${NC}"
        echo -e "${GREEN}   ✓ Real task statuses and analytics updated${NC}"
    else
        echo -e "${RED}❌ ClickUp sync failed${NC}"
        echo -e "${YELLOW}   Check ClickUp API token and team access${NC}"
        return 1
    fi
}

show_sync_status() {
    echo -e "${YELLOW}📊 Current sync status:${NC}"
    curl -s "$API_BASE/sync/status" | jq '.' 2>/dev/null || echo "Could not fetch sync status"
}

show_usage() {
    echo -e "${BLUE}Usage: $0 [OPTION]${NC}"
    echo ""
    echo "Options:"
    echo "  all       Sync both GitLab and ClickUp data (default)"
    echo "  gitlab    Sync only GitLab data (commits, projects, users)"
    echo "  clickup   Sync only ClickUp data (tasks, time entries)"
    echo "  status    Show current sync status"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0              # Full sync"
    echo "  $0 all          # Full sync"
    echo "  $0 gitlab       # GitLab only"
    echo "  $0 clickup      # ClickUp only"
    echo "  $0 status       # Check status"
}

# Main script
print_header

# Check if backend is running
if ! check_backend; then
    exit 1
fi

# Parse command line arguments
case "${1:-all}" in
    "all"|"")
        sync_all
        ;;
    "gitlab")
        sync_gitlab
        ;;
    "clickup")
        sync_clickup
        ;;
    "status")
        show_sync_status
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        echo -e "${RED}❌ Unknown option: $1${NC}"
        echo ""
        show_usage
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Real data resync operation completed!${NC}"
echo -e "${BLUE}   View your live GitLab and ClickUp analytics at:${NC}"
echo -e "${BLUE}   http://localhost:5174/users${NC}"
echo -e "${YELLOW}   Note: Only real API data is used - no test/mock data${NC}"
