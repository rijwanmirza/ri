#!/bin/bash
# Check application status
cd $(dirname $0)

echo "======== Application Status ========"
if pgrep -f "forever.sh" > /dev/null; then
  echo "✅ Forever process: RUNNING"
else
  echo "❌ Forever process: NOT RUNNING"
fi

if pgrep -f "tsx server/index.ts" > /dev/null; then
  echo "✅ Application process: RUNNING"
else
  echo "❌ Application process: NOT RUNNING"
fi

# Check port 5000
if netstat -tuln | grep -q ":5000 "; then
  echo "✅ Port 5000: OPEN (application is accessible)"
else
  echo "❌ Port 5000: CLOSED (application may still be starting)"
fi

# Check database
echo -n "📊 Database connection: "
if psql -U $(grep DB_USER= start.sh | cut -d= -f2) -d $(grep DB_NAME= start.sh | cut -d= -f2) -c "SELECT 1" > /dev/null 2>&1; then
  echo "CONNECTED"
else
  echo "DISCONNECTED"
fi

# Show last 5 log entries
echo -e "\n📝 Last 5 log entries:"
tail -n 5 logs/app.log

echo "===================================="
echo "Use ./restart.sh to restart the application"
echo "Use tail -f logs/app.log to view live logs"
