#!/bin/bash
# Script to force update the code from GitHub on your VPS

# Set the repository directory
REPO_DIR="/var/www/UrlCampaignTracker"

# Go to the repository directory
cd $REPO_DIR || { echo "Error: Cannot find repository directory"; exit 1; }

# Check for PM2 wrapper script existence and fix it if missing
PM2_START_SCRIPT="$REPO_DIR/pm2-start.sh"
if [ ! -f "$PM2_START_SCRIPT" ]; then
  echo "PM2 start script not found, creating it..."
  cat > "$PM2_START_SCRIPT" << 'PM2_EOF'
#!/bin/bash

# Check if port 5000 is in use and kill the process if needed
PORT_PID=$(lsof -t -i:5000)
if [ ! -z "$PORT_PID" ]; then
  echo "Port 5000 is in use by PID $PORT_PID, killing process..."
  kill -9 $PORT_PID
fi

# Start the application
cd /var/www/UrlCampaignTracker
NODE_ENV=production node server.js
PM2_EOF

  chmod +x "$PM2_START_SCRIPT"
  echo "Created PM2 start script"
fi

# Save any local changes (just in case)
git stash

# Fetch latest from GitHub
git fetch origin

# Reset to match the remote repository exactly
git reset --hard origin/main

# Clean up any untracked files
git clean -fd

# Make sure PM2 script is executable
chmod +x "$PM2_START_SCRIPT"

# Check permissions on important directories
chown -R www-data:www-data $REPO_DIR
chmod -R 755 $REPO_DIR

# Restart the application with PM2
pm2 restart url-tracker || { 
  echo "Could not restart with existing PM2 config, trying to start fresh..."; 
  pm2 delete url-tracker || true
  pm2 start "$PM2_START_SCRIPT" --name url-tracker
}

echo "Update completed successfully!"