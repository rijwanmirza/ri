#!/bin/bash

# Function to kill any process on port 5000 with extra validation
kill_port_process() {
  echo "Checking for processes on port 5000..."
  
  # First find the process IDs using both netstat and lsof for redundancy
  local PIDs_NETSTAT=$(netstat -tlnp 2>/dev/null | grep ':5000' | awk '{print $7}' | cut -d'/' -f1)
  local PIDs_LSOF=$(lsof -ti:5000 2>/dev/null)
  
  # Combine the PIDs 
  local ALL_PIDS=$(echo -e "$PIDs_NETSTAT\n$PIDs_LSOF" | sort -u | grep -v "^$")
  
  if [ ! -z "$ALL_PIDS" ]; then
    echo "Found processes using port 5000: $ALL_PIDS"
    
    for PID in $ALL_PIDS; do
      if [ ! -z "$PID" ] && [ "$PID" -gt 0 ]; then
        echo "Killing process $PID on port 5000 with SIGKILL (9)"
        kill -9 $PID
      fi
    done
    
    # Sleep to ensure processes are fully terminated
    sleep 3
    
    # Triple check no processes are left
    if [ ! -z "$(lsof -ti:5000 2>/dev/null)" ]; then
      echo "ERROR: Port 5000 is still in use after kill attempts. Manual intervention required."
      exit 1
    else
      echo "Port 5000 is now free."
    fi
  else
    echo "No process found on port 5000"
  fi
}

echo "Starting URL Campaign Tracker at $(date)"

# Kill any existing process on port 5000 - with repeated attempts
kill_port_process

# Verify port is actually free
echo "Verifying port 5000 is free..."
if lsof -i:5000 &>/dev/null; then
  echo "ERROR: Port 5000 is still in use after cleanup. Trying more aggressive approach..."
  # More aggressive cleanup
  for i in {1..3}; do
    echo "Attempt $i to forcibly free port 5000"
    kill_port_process
    sleep 2
    if ! lsof -i:5000 &>/dev/null; then
      echo "Port finally freed after attempt $i"
      break
    fi
    
    if [ $i -eq 3 ]; then
      echo "FATAL: Could not free port 5000 after multiple attempts. Please check manually."
      echo "Try rebooting the server or use a different port."
      exit 1
    fi
  done
fi

# Set environment variables - UPDATE YOUR DATABASE_URL HERE!
export DATABASE_URL="postgres://neondb_owner:npg_U8evoXZz0WOB@78.46.85.93:5432/neondb"
export API_SECRET_KEY="TraffiCS10928"
export YOUTUBE_API_KEY="AIzaSyBB2nPAhc87jhkGXDe02jgn2eyV0qr-9YA"

# Load TrafficStar API key from separate file to avoid truncation
if [ -f "/var/www/UrlCampaignTracker/trafficstar_token.txt" ]; then
  export TRAFFICSTAR_API_KEY=$(cat /var/www/UrlCampaignTracker/trafficstar_token.txt)
  echo "Loaded TrafficStar API token from file."
else
  echo "Creating TrafficStar API token file..."
  # Create trafficstar_token.txt with this token (replace with your complete token)
  echo -n "eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJjOGJmY2YyZi1lZjJlLTQwZGYtYTg4ZC1kYjQ3NmI4MTFiOGMifQ.eyJpYXQiOjE3NDA5MTI1MTUsImV4cCI6MTc0MDk5ODkxNSwianRpIjoiNWIxZjQyMGEtZWM3Yy00MTEwLTg2OTAtNDRlZjVlNWRhMTMzIiwiaXNzIjoiaHR0cHM6Ly9zc28udHJhZmZpY3N0YXJzLmNvbS9hdXRoL3JlYWxtcy90cmFmZmljc3RhcnMiLCJzdWIiOiI0ZTExZjhjMC1mN2VhLTQyNGQtYWZhYy1iMmE2YmM0NmQ2YWIiLCJ0eXAiOiJSZWZyZXNoIiwiYXpwIjoiYXBpLXYxIiwic2Vzc2lvbl9zdGF0ZSI6ImJiM2FlNzVmLTE3MzctNDM2ZS1hZTI0LTRkMDdlNjIzNDhhMiIsInNjb3BlIjoib2ZmbGluZV9hY2Nlc3MifQ.kbvfT4ReCFO2HxDBFW-TRmYMoFoW9b0_sMIcvZF-Z70" > /var/www/UrlCampaignTracker/trafficstar_token.txt
  chmod 600 /var/www/UrlCampaignTracker/trafficstar_token.txt
  export TRAFFICSTAR_API_KEY=$(cat /var/www/UrlCampaignTracker/trafficstar_token.txt)
  echo "Created TrafficStar API token file."
fi

export SESSION_SECRET="2DcFsEodeYl7m0bq35CxJiW/hZI/J4dZhv9xrKiH186cZUKQ4tQEQLwDesAuMDbDZwoFG/5pyP/43tbnRIpwoQ=="
export PGHOST="78.46.85.93"
export PGPORT="5432"
export PGUSER="neondb_owner"
export PGPASSWORD="npg_U8evoXZz0WOB"
export PGDATABASE="neondb"
export NODE_ENV="production"
export PORT="5000"
export HOST="0.0.0.0"
export GMAIL_USER="compaignwalabhai@gmail.com"
export GMAIL_PASSWORD="hciuemplthdkwfho"

cd /var/www/UrlCampaignTracker

# Fix the db.ts file to remove .unique() method which is causing issues
sed -i 's/customPath: text("custom_path").unique(),/customPath: text("custom_path"),/g' /var/www/UrlCampaignTracker/shared/schema.ts
# Fix any other unique() calls in the schema
sed -i 's/\.unique()//g' /var/www/UrlCampaignTracker/shared/schema.ts

# Build the client files
echo "Building the client..."
npm run build

# Make sure the server/public directory exists
mkdir -p /var/www/UrlCampaignTracker/server/public

# Copy the built files from dist/public to server/public
echo "Copying dist to server/public..."
cp -r /var/www/UrlCampaignTracker/dist/public/* /var/www/UrlCampaignTracker/server/public/

# Add PM2 integration for proper daemon management
if command -v pm2 &> /dev/null; then
  echo "Starting server with PM2..."
  # Stop any existing URL Campaign Tracker instance
  pm2 stop url-tracker 2>/dev/null || true
  pm2 delete url-tracker 2>/dev/null || true
  # Start with PM2
  pm2 start --name url-tracker npm -- start
  echo "Application started with PM2. Check status with: pm2 status"
  echo "View logs with: pm2 logs url-tracker"
else
  echo "PM2 not found. Starting server directly..."
  # Run the server with tsx directly
  npx tsx server/index.ts
fi