#!/bin/bash

# This script stops all instances of the URL Campaign Tracker application
# and ensures port 5000 is free

echo "Stopping all URL Campaign Tracker instances at $(date)"

# Stop any PM2 instances
if command -v pm2 &> /dev/null; then
  echo "Stopping PM2 instances..."
  pm2 stop url-tracker 2>/dev/null || true
  pm2 delete url-tracker 2>/dev/null || true
fi

# Find and kill any other processes on port 5000 (multiple methods for redundancy)
echo "Finding and killing processes on port 5000..."

# Method 1: Using lsof
if command -v lsof &> /dev/null; then
  PORT_PIDS=$(lsof -ti:5000 2>/dev/null)
  if [ ! -z "$PORT_PIDS" ]; then
    echo "Found processes using lsof: $PORT_PIDS"
    for PID in $PORT_PIDS; do
      if [ ! -z "$PID" ] && [ "$PID" -gt 0 ]; then
        echo "Killing process $PID"
        kill -9 $PID 2>/dev/null || true
      fi
    done
  fi
fi

# Method 2: Using netstat
if command -v netstat &> /dev/null; then
  NETSTAT_PIDS=$(netstat -tlnp 2>/dev/null | grep ':5000' | awk '{print $7}' | cut -d'/' -f1)
  if [ ! -z "$NETSTAT_PIDS" ]; then
    echo "Found processes using netstat: $NETSTAT_PIDS"
    for PID in $NETSTAT_PIDS; do
      if [ ! -z "$PID" ] && [ "$PID" -gt 0 ]; then
        echo "Killing process $PID"
        kill -9 $PID 2>/dev/null || true
      fi
    done
  fi
fi

# Method 3: Using fuser (if available)
if command -v fuser &> /dev/null; then
  echo "Using fuser to find and kill processes on port 5000"
  fuser -k 5000/tcp 2>/dev/null || true
fi

# Sleep to allow processes to terminate
sleep 2

# Verify port is free
if command -v lsof &> /dev/null && lsof -i:5000 &>/dev/null; then
  echo "WARNING: Port 5000 is still in use despite kill attempts"
else
  echo "✅ Port 5000 is free"
fi

echo "All URL Campaign Tracker instances stopped at $(date)"