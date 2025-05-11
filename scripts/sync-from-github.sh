#!/bin/bash
# File: sync-from-github.sh - Manual Sync Tool

# Configuration
APP_DIR="/var/www/UrlCampaignTracker"
LOG_DIR="$APP_DIR/sync_logs"
GITHUB_REPO="https://github.com/rijwanmirza/ri.git"
GITHUB_TOKEN="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"
DB_NAME="neondb"
DB_USER="neondb_owner"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/sync_$(date +%Y%m%d_%H%M%S).log"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log() {
  echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Create a complete backup
log "${YELLOW}Creating backup...${NC}"
BACKUP_DIR="/tmp/app_backup_$(date +%s)"
mkdir -p "$BACKUP_DIR/code"
mkdir -p "$BACKUP_DIR/db"

# Backup code
cp -R "$APP_DIR/"* "$BACKUP_DIR/code/" 2>/dev/null || true
cp -R "$APP_DIR/".[^.]* "$BACKUP_DIR/code/" 2>/dev/null || true

# Backup database
log "${YELLOW}Backing up database...${NC}"
pg_dump -U neondb_owner neondb > "$BACKUP_DIR/db/database_backup.sql"
log "${GREEN}Backup completed at $BACKUP_DIR${NC}"

# Go to application directory
cd "$APP_DIR"

# Save current git state
CURRENT_COMMIT=$(git rev-parse HEAD)
log "${YELLOW}Current commit: $CURRENT_COMMIT${NC}"

# Pull latest changes from GitHub
log "${YELLOW}Pulling latest changes from GitHub...${NC}"
git pull origin main >> "$LOG_FILE" 2>&1
PULL_STATUS=$?

if [ $PULL_STATUS -ne 0 ]; then
  log "${RED}Error pulling changes from GitHub. See $LOG_FILE for details.${NC}"
  log "${YELLOW}Would you like to force reset to the latest GitHub version? (y/n)${NC}"
  read -p "Reset to GitHub version? (y/n): " RESET_CHOICE
  
  if [[ "$RESET_CHOICE" == "y" || "$RESET_CHOICE" == "Y" ]]; then
    git reset --hard origin/main
    log "${GREEN}Reset to GitHub version completed${NC}"
  else
    log "${RED}Sync aborted. Please resolve Git issues manually.${NC}"
    exit 1
  fi
fi

# Get list of changed files
CHANGED_FILES=$(git diff --name-only $CURRENT_COMMIT HEAD)
log "${YELLOW}Changed files:${NC}"
echo "$CHANGED_FILES" | tee -a "$LOG_FILE"

# Check for database changes
DB_CHANGES=false
for file in $CHANGED_FILES; do
  if [[ $file == *"schema.ts"* || $file == *"migrations/"* ]]; then
    DB_CHANGES=true
    log "${YELLOW}Database related file changed: $file${NC}"
  fi
done

# If database changes detected, ask for confirmation
if [ "$DB_CHANGES" = true ]; then
  log "${YELLOW}Database changes detected. Do you want to apply these changes? (y/n)${NC}"
  read -p "Apply database changes? (y/n): " DB_CHOICE
  
  if [[ "$DB_CHOICE" == "y" || "$DB_CHOICE" == "Y" ]]; then
    log "${YELLOW}Applying database changes...${NC}"
    
    # Check for migrations
    if [ -d "$APP_DIR/migrations" ]; then
      log "${YELLOW}Processing migrations directory...${NC}"
      for migration in $APP_DIR/migrations/*.sql; do
        if [ -f "$migration" ]; then
          log "${YELLOW}Applying migration: $(basename "$migration")${NC}"
          psql -U neondb_owner -d neondb -f "$migration" >> "$LOG_FILE" 2>&1
          MIGRATION_STATUS=$?
          
          if [ $MIGRATION_STATUS -ne 0 ]; then
            log "${RED}Error applying migration: $(basename "$migration")${NC}"
            log "${RED}Check $LOG_FILE for details${NC}"
          else
            log "${GREEN}Migration applied: $(basename "$migration")${NC}"
          fi
        fi
      done
    fi
    
    # Check for application-specific database update
    if [ -f "$APP_DIR/update-db.js" ]; then
      log "${YELLOW}Running database update script...${NC}"
      node "$APP_DIR/update-db.js" >> "$LOG_FILE" 2>&1
    fi
  else
    log "${YELLOW}Skipping database changes.${NC}"
  fi
fi

# Check for package.json changes
if echo "$CHANGED_FILES" | grep -q "package.json"; then
  log "${YELLOW}package.json changed. Do you want to install dependencies? (y/n)${NC}"
  read -p "Install dependencies? (y/n): " DEP_CHOICE
  
  if [[ "$DEP_CHOICE" == "y" || "$DEP_CHOICE" == "Y" ]]; then
    log "${YELLOW}Installing dependencies...${NC}"
    npm install --production >> "$LOG_FILE" 2>&1
    DEP_STATUS=$?
    
    if [ $DEP_STATUS -ne 0 ]; then
      log "${RED}Error installing dependencies. Check $LOG_FILE for details${NC}"
    else
      log "${GREEN}Dependencies installed successfully${NC}"
    fi
  else
    log "${YELLOW}Skipping dependency installation.${NC}"
  fi
fi

# Create any required directories
log "${YELLOW}Checking required directories...${NC}"
REQUIRED_DIRS=(
  "$APP_DIR/url_budget_logs" 
  "$APP_DIR/Active_Url_Budget_Logs"
  "$APP_DIR/logs"
)

for dir in "${REQUIRED_DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    log "${YELLOW}Creating required directory: $dir${NC}"
    mkdir -p "$dir"
    chmod 777 "$dir"
  fi
done

# Ask for restart
log "${YELLOW}Do you want to restart the application? (y/n)${NC}"
read -p "Restart application? (y/n): " RESTART_CHOICE

if [[ "$RESTART_CHOICE" == "y" || "$RESTART_CHOICE" == "Y" ]]; then
  log "${YELLOW}Restarting application...${NC}"
  if command -v pm2 &> /dev/null; then
    pm2 restart url-tracker >> "$LOG_FILE" 2>&1
    log "${GREEN}Application restarted with PM2${NC}"
  else
    log "${RED}PM2 not found. Please restart your application manually.${NC}"
  fi
else
  log "${YELLOW}Skipping application restart.${NC}"
fi

log "${GREEN}Sync completed successfully!${NC}"
log "${GREEN}Application updated from GitHub to commit: $(git rev-parse HEAD)${NC}"
