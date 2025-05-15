#!/bin/bash
# Script to test if URLs that transition to 'complete' before the 9-minute waiting period
# are still properly counted in budget calculations

echo "🧪 TESTING BUDGET CALCULATION FIX FOR COMPLETED URLS 🧪"
echo "======================================================"
echo "Step 1: Creating a test URL and immediately marking it as 'complete'..."
node --experimental-specifier-resolution=node test-complete-url-budget.js

echo -e "\nStep 2: Initial check immediately after adding..."
node --experimental-specifier-resolution=node check-complete-url.js

# Now set up monitoring every minute for 10 minutes
echo -e "\nStep 3: Monitoring every minute for 10 minutes..."

for i in {1..10}; do
  echo -e "\n⏱️ Waiting 1 minute..."
  sleep 60
  echo -e "\n🔍 Check #$i after $(($i)) minute(s)..."
  node --experimental-specifier-resolution=node check-complete-url.js
done

echo -e "\n🧪 Test completed!"
echo "Final status check:"
node --experimental-specifier-resolution=node check-complete-url.js