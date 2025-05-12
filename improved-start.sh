#!/bin/bash

# Function to kill any process on port 5000
kill_port_process() {
  local PID=$(lsof -t -i:5000)
  if [ ! -z "$PID" ]; then
    echo "Killing process $PID on port 5000"
    kill -9 $PID
    sleep 2
  else
    echo "No process found on port 5000"
  fi
}

echo "Starting URL Campaign Tracker at $(date)"

# Kill any existing process on port 5000
kill_port_process

# Double-check to make sure the port is free
if [ ! -z "$(lsof -t -i:5000)" ]; then
  echo "Port 5000 is still in use, trying again..."
  kill_port_process
  sleep 3
fi

# Set environment variables
export DATABASE_URL="postgres://neondb_owner:npg_U8evoXZz0WOB@localhost:5432/neondb"
export API_SECRET_KEY="TraffiCS10928"
export YOUTUBE_API_KEY="AIzaSyBB2nPAhc87jhkGXDe02jgn2eyV0qr-9YA"
export TRAFFICSTAR_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJjOGJmY2YyZi1lZjJlLTQwZGYtYTg4ZC1kYjQ3NmI4MTFiOGMifQ.eyJpYXQiOjE3NDA5MTI1MTUsI"
export SESSION_SECRET="2DcFsEodeYl7m0bq35CxJiW/hZI/J4dZhv9xrKiH186cZUKQ4tQEQLwDesAuMDbDZwoFG/5pyP/43tbnRIpwoQ=="
export PGHOST="localhost"
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

echo "Starting server..."
# Run the server with tsx directly to avoid compilation issues
npx tsx server/index.ts