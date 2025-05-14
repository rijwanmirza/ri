#!/bin/bash
# Restart application
cd $(dirname $0)

echo "Restarting application..."
pkill -f "forever.sh"
pkill -f "tsx server/index.ts"
sleep 2
nohup ./forever.sh >/dev/null 2>&1 &
echo "Application restarted in background mode"
echo "Run ./status.sh to check status"
