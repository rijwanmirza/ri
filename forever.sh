#!/bin/bash
# This script ensures the application runs forever and survives terminal disconnects

# Go to application directory
cd $(dirname $0)
mkdir -p logs

# Kill any existing processes on the port
fuser -k 5000/tcp >/dev/null 2>&1 || true
sleep 2

# Make sure start script is executable
chmod +x ./start.sh

# Start the application in a continuous loop
echo "[$(date)] Starting application in forever mode..." >> logs/forever.log
while true; do
  echo "[$(date)] Starting application..." >> logs/forever.log
  ./start.sh >> logs/app.log 2>&1
  echo "[$(date)] Application exited with code $?, restarting in 5 seconds..." >> logs/forever.log
  sleep 5
done
