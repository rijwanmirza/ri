#!/bin/bash

# Kill any processes on port 5000
PID=$(lsof -t -i:5000 2>/dev/null)
if [ ! -z "$PID" ]; then
  echo "Killing process on port 5000: $PID"
  kill -9 $PID
  sleep 2
fi

# Export necessary environment variables
export DATABASE_URL="postgres://neondb_owner:npg_U8evoXZz0WOB@78.46.85.93:5432/neondb"
export NODE_ENV="production"

# Remove any existing PM2 processes with the same name
pm2 delete url-tracker 2>/dev/null || true

# Start with PM2 using the absolute path to TSX
pm2 start $(which tsx) --name url-tracker -- server/index.ts

# Save PM2 configuration
pm2 save

# Display PM2 status
pm2 status

