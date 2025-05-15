#!/bin/bash
# Simple script to test the budget calculation fix

echo "🧪 TESTING BUDGET CALCULATION FIX 🧪"
echo "====================================="
echo "Step 1: Adding a test URL with 1 click to campaign 1..."
node --experimental-specifier-resolution=node add-test-url.js

echo -e "\nStep 2: Initial check immediately after adding..."
node --experimental-specifier-resolution=node check-test-url.js

# Now set up monitoring every minute for 10 minutes
echo -e "\nStep 3: Monitoring every minute for 10 minutes..."

for i in {1..10}; do
  echo -e "\n⏱️ Waiting 1 minute..."
  sleep 60
  echo -e "\n🔍 Check #$i after $(($i)) minute(s)..."
  node --experimental-specifier-resolution=node check-test-url.js
done

echo -e "\n🧪 Test completed!"
echo "Final status check:"
node --experimental-specifier-resolution=node check-test-url.js