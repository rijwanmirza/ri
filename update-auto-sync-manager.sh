#!/bin/bash

# This script adds safety checks to auto-sync-manager.sh to prevent
# starting duplicate app instances

ORIGINAL_FILE="/root/auto-sync-manager.sh"
BACKUP_FILE="/root/auto-sync-manager.sh.bak"

# Create a backup before modifying
cp "$ORIGINAL_FILE" "$BACKUP_FILE"
echo "Created backup of auto-sync-manager.sh at $BACKUP_FILE"

# Add our modification to use PM2 instead of direct node execution
cat > "$ORIGINAL_FILE" << 'EOF'
#!/bin/bash

# Auto Sync Manager for URL Campaign Tracker
# Modified to use PM2 for process management

sync_branch="main"
repo_url="https://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@github.com/username/UrlCampaignTracker.git"
repo_path="/var/www/UrlCampaignTracker"

function sync_repo() {
  echo "Syncing repository from $repo_url branch $sync_branch to $repo_path"
  
  # Pull the latest changes
  cd "$repo_path" || { echo "Failed to change directory to $repo_path"; exit 1; }
  
  # Stash any local changes
  git stash
  
  # Pull latest changes
  git pull origin "$sync_branch"
  
  echo "Repository sync completed"
  
  # Use PM2 for application management instead of direct start
  if [ -f "$repo_path/pm2-start-improved.sh" ]; then
    echo "Restarting application using PM2..."
    
    # Execute the stop script first to ensure clean state
    if [ -f "$repo_path/stop-all-instances.sh" ]; then
      echo "Stopping all application instances first..."
      bash "$repo_path/stop-all-instances.sh"
    fi
    
    # Start with PM2
    bash "$repo_path/pm2-start-improved.sh"
  else
    echo "WARNING: pm2-start-improved.sh not found, using backup start method"
    
    # Fallback to legacy method but ensure we stop any existing instances first
    if command -v pm2 &> /dev/null; then
      pm2 stop url-tracker 2>/dev/null || true
      pm2 delete url-tracker 2>/dev/null || true
      pm2 start --name url-tracker npm -- start
    else
      echo "ERROR: PM2 not installed. Please install PM2 with: npm install -g pm2"
    fi
  fi
}

# Process command line arguments
case "$1" in
  sync)
    sync_repo
    ;;
  *)
    echo "Usage: $0 sync"
    exit 1
    ;;
esac

exit 0
EOF

# Make the script executable
chmod +x "$ORIGINAL_FILE"
echo "Updated auto-sync-manager.sh to use PM2 exclusively"
echo "Original file backed up at $BACKUP_FILE"