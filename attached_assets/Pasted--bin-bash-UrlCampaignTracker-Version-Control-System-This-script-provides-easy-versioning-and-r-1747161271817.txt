#!/bin/bash
# UrlCampaignTracker Version Control System
# This script provides easy versioning and rollback capabilities
# Configuration
APP_DIR="/var/www/UrlCampaignTracker"
VERSIONS_DIR="/var/www/versions"
DB_NAME="neondb"
DB_USER="postgres"
LOG_FILE="/var/log/version-control.log"
CURRENT_VERSION_FILE="${VERSIONS_DIR}/current_version"
# Create versions directory if it doesn't exist
if [ ! -d "$VERSIONS_DIR" ]; then
  mkdir -p "$VERSIONS_DIR"
  echo "Created versions directory at $VERSIONS_DIR"
fi
# Function to write to log
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}
# Function to create a new version
create_version() {
  # Stop the application
  log "Stopping application..."
  pm2 stop url-tracker
  # Get next version number
  if [ -f "$CURRENT_VERSION_FILE" ]; then
    CURRENT_VERSION=$(cat "$CURRENT_VERSION_FILE")
    NEXT_VERSION=$((CURRENT_VERSION + 1))
  else
    NEXT_VERSION=1
    echo "0" > "$CURRENT_VERSION_FILE"  # Initialize with 0 since we're creating version 1
  fi
  VERSION_DIR="${VERSIONS_DIR}/version_${NEXT_VERSION}"
  
  # Create version directory
  mkdir -p "$VERSION_DIR"
  
  # Get description from user
  if [ -z "$1" ]; then
    read -p "Enter a description for version ${NEXT_VERSION}: " DESCRIPTION
  else
    DESCRIPTION="$1"
  fi
  
  # Save version information
  echo "$DESCRIPTION" > "${VERSION_DIR}/description.txt"
  date > "${VERSION_DIR}/date.txt"
  
  # Copy application files
  log "Copying application files for version ${NEXT_VERSION}..."
  cp -r "$APP_DIR" "${VERSION_DIR}/app"
  
  # Export database
  log "Exporting database for version ${NEXT_VERSION}..."
  sudo -u $DB_USER pg_dump $DB_NAME > "${VERSION_DIR}/database.sql"
  
  # Copy all log files
  log "Copying log files for version ${NEXT_VERSION}..."
  mkdir -p "${VERSION_DIR}/logs"
  if [ -d "${APP_DIR}/url_budget_logs" ]; then
    cp -r "${APP_DIR}/url_budget_logs" "${VERSION_DIR}/logs/"
  fi
  if [ -d "${APP_DIR}/Active_Url_Budget_Logs" ]; then
    cp -r "${APP_DIR}/Active_Url_Budget_Logs" "${VERSION_DIR}/logs/"
  fi
  
  # Save environment variables
  log "Saving environment variables for version ${NEXT_VERSION}..."
  if [ -f "${APP_DIR}/.env" ]; then
    cp "${APP_DIR}/.env" "${VERSION_DIR}/env_backup"
  fi
  
  # Save PM2 configuration
  log "Saving PM2 configuration for version ${NEXT_VERSION}..."
  pm2 describe url-tracker > "${VERSION_DIR}/pm2_config.txt"
  
  # Update current version
  echo "$NEXT_VERSION" > "$CURRENT_VERSION_FILE"
  
  # Restart the application
  log "Restarting application..."
  pm2 restart url-tracker
  
  log "Version ${NEXT_VERSION} created successfully with description: ${DESCRIPTION}"
  echo "Version ${NEXT_VERSION} created successfully!"
}
# Function to roll back to a specific version
rollback() {
  if [ -z "$1" ]; then
    echo "Error: You must specify a version number to roll back to."
    list_versions
    return 1
  fi
  
  VERSION_TO_RESTORE="$1"
  VERSION_DIR="${VERSIONS_DIR}/version_${VERSION_TO_RESTORE}"
  
  if [ ! -d "$VERSION_DIR" ]; then
    echo "Error: Version ${VERSION_TO_RESTORE} does not exist."
    list_versions
    return 1
  fi
  
  # Confirm rollback
  read -p "Are you sure you want to roll back to version ${VERSION_TO_RESTORE}? This will replace your current application and database. (y/n): " CONFIRM
  if [ "$CONFIRM" != "y" ]; then
    echo "Rollback cancelled."
    return 0
  fi
  
  # Stop the application
  log "Stopping application for rollback to version ${VERSION_TO_RESTORE}..."
  pm2 stop url-tracker
  
  # Before rolling back, create an automatic backup of current state if needed
  CURRENT_VERSION=$(cat "$CURRENT_VERSION_FILE")
  if [ "$CURRENT_VERSION" != "$VERSION_TO_RESTORE" ]; then
    log "Creating automatic backup before rolling back..."
    BACKUP_DIR="${VERSIONS_DIR}/auto_backup_before_rollback_$(date '+%Y%m%d_%H%M%S')"
    mkdir -p "$BACKUP_DIR"
    
    # Copy current app files
    cp -r "$APP_DIR" "${BACKUP_DIR}/app"
    
    # Export current database
    sudo -u $DB_USER pg_dump $DB_NAME > "${BACKUP_DIR}/database.sql"
    
    log "Automatic backup created at ${BACKUP_DIR}"
  fi
  
  # Restore application files
  log "Restoring application files from version ${VERSION_TO_RESTORE}..."
  # Create a temporary backup of the current app directory
  TEMP_BACKUP="/tmp/app_backup_$(date '+%Y%m%d_%H%M%S')"
  mv "$APP_DIR" "$TEMP_BACKUP"
  
  # Copy version files to app directory
  cp -r "${VERSION_DIR}/app" "$APP_DIR"
  
  # Restore database
  log "Restoring database from version ${VERSION_TO_RESTORE}..."
  sudo -u $DB_USER psql -d $DB_NAME -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null
  sudo -u $DB_USER psql -d $DB_NAME < "${VERSION_DIR}/database.sql"
  
  # Restore environment variables if they exist
  if [ -f "${VERSION_DIR}/env_backup" ]; then
    log "Restoring environment variables from version ${VERSION_TO_RESTORE}..."
    cp "${VERSION_DIR}/env_backup" "${APP_DIR}/.env"
  fi
  
  # Restore log files if needed
  log "Restoring log files from version ${VERSION_TO_RESTORE}..."
  if [ -d "${VERSION_DIR}/logs/url_budget_logs" ]; then
    rm -rf "${APP_DIR}/url_budget_logs" 2>/dev/null
    cp -r "${VERSION_DIR}/logs/url_budget_logs" "${APP_DIR}/"
  fi
  if [ -d "${VERSION_DIR}/logs/Active_Url_Budget_Logs" ]; then
    rm -rf "${APP_DIR}/Active_Url_Budget_Logs" 2>/dev/null
    cp -r "${VERSION_DIR}/logs/Active_Url_Budget_Logs" "${APP_DIR}/"
  fi
  
  # Update current version
  echo "$VERSION_TO_RESTORE" > "$CURRENT_VERSION_FILE"
  
  # Restart the application
  log "Restarting application after rollback to version ${VERSION_TO_RESTORE}..."
  pm2 restart url-tracker
  
  log "Successfully rolled back to version ${VERSION_TO_RESTORE}"
  echo "Successfully rolled back to version ${VERSION_TO_RESTORE}!"
  echo "Description: $(cat ${VERSION_DIR}/description.txt)"
  echo "Date created: $(cat ${VERSION_DIR}/date.txt)"
}
# Function to list all available versions
list_versions() {
  echo "Available versions:"
  echo "-----------------"
  
  if [ -f "$CURRENT_VERSION_FILE" ]; then
    CURRENT_VERSION=$(cat "$CURRENT_VERSION_FILE")
    echo "Current active version: $CURRENT_VERSION"
    echo ""
  else
    echo "No version is currently active."
    echo ""
  fi
  
  for VERSION_DIR in $(ls -d ${VERSIONS_DIR}/version_* 2>/dev/null); do
    VERSION_NUM=$(echo "$VERSION_DIR" | sed 's/.*version_//')
    DESCRIPTION=$(cat "${VERSION_DIR}/description.txt" 2>/dev/null || echo "No description")
    DATE=$(cat "${VERSION_DIR}/date.txt" 2>/dev/null || echo "Unknown date")
    
    echo "Version $VERSION_NUM:"
    echo "  Description: $DESCRIPTION"
    echo "  Created: $DATE"
    echo ""
  done
}
# Function to show the status of the current version
status() {
  if [ -f "$CURRENT_VERSION_FILE" ]; then
    CURRENT_VERSION=$(cat "$CURRENT_VERSION_FILE")
    VERSION_DIR="${VERSIONS_DIR}/version_${CURRENT_VERSION}"
    
    echo "Current Version: $CURRENT_VERSION"
    
    if [ -f "${VERSION_DIR}/description.txt" ]; then
      echo "Description: $(cat ${VERSION_DIR}/description.txt)"
    fi
    
    if [ -f "${VERSION_DIR}/date.txt" ]; then
      echo "Created: $(cat ${VERSION_DIR}/date.txt)"
    fi
    
    echo ""
    echo "Application Status:"
    pm2 status url-tracker
  else
    echo "No version is currently active."
  fi
}
# Function to delete a specific version
delete_version() {
  if [ -z "$1" ]; then
    echo "Error: You must specify a version number to delete."
    list_versions
    return 1
  fi
  
  VERSION_TO_DELETE="$1"
  VERSION_DIR="${VERSIONS_DIR}/version_${VERSION_TO_DELETE}"
  
  if [ ! -d "$VERSION_DIR" ]; then
    echo "Error: Version ${VERSION_TO_DELETE} does not exist."
    list_versions
    return 1
  fi
  
  # Check if trying to delete the current version
  if [ -f "$CURRENT_VERSION_FILE" ] && [ "$(cat $CURRENT_VERSION_FILE)" == "$VERSION_TO_DELETE" ]; then
    echo "Error: Cannot delete the currently active version."
    echo "Please roll back to another version first, then delete this version."
    return 1
  fi
  
  # Confirm deletion
  read -p "Are you sure you want to delete version ${VERSION_TO_DELETE}? This cannot be undone. (y/n): " CONFIRM
  if [ "$CONFIRM" != "y" ]; then
    echo "Deletion cancelled."
    return 0
  fi
  
  # Delete the version directory
  rm -rf "$VERSION_DIR"
  
  log "Version ${VERSION_TO_DELETE} deleted"
  echo "Version ${VERSION_TO_DELETE} has been deleted."
}
# Main command processing
case "$1" in
  create)
    create_version "$2"
    ;;
  rollback)
    rollback "$2"
    ;;
  list)
    list_versions
    ;;
  status)
    status
    ;;
  delete)
    delete_version "$2"
    ;;
  help)
    echo "UrlCampaignTracker Version Control System"
    echo ""
    echo "Usage:"
    echo "  ./version-control-system.sh create [description]  - Create a new version"
    echo "  ./version-control-system.sh rollback <version>    - Roll back to a specific version"
    echo "  ./version-control-system.sh list                  - List all available versions"
    echo "  ./version-control-system.sh status                - Show current version status"
    echo "  ./version-control-system.sh delete <version>      - Delete a specific version"
    echo "  ./version-control-system.sh help                  - Show this help message"
    ;;
  *)
    echo "Unknown command. Use 'help' to see available commands."
    echo "Usage: ./version-control-system.sh {create|rollback|list|status|delete|help}"
    exit 1
    ;;
esac
exit 0
