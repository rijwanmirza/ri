#!/bin/bash
# Script to monitor a URL with 'complete' status for budget calculation

echo "🧪 MONITORING COMPLETED URL BUDGET TEST 🧪"
echo "========================================"
echo "Initial check:"
npx tsx check-complete-url-direct.ts

# Now monitor every minute for 10 minutes
for i in {1..10}; do
  echo -e "\n⏱️ Waiting 1 minute..."
  sleep 60
  echo -e "\n🔍 Check #$i after $(($i)) minute(s)..."
  npx tsx check-complete-url-direct.ts
done

echo -e "\n🧪 Test completed!"