#!/bin/bash
# Script to test budget calculation fix by adding a URL and monitoring its budget calculation status

# Generate a unique test URL name
TEST_URL_NAME="test-budget-$(date +%s)"
echo "🔍 Testing budget calculation with URL name: $TEST_URL_NAME"

# Add the test URL to campaign 1
echo "▶️ Step 1: Adding test URL to campaign 1..."
node --experimental-specifier-resolution=node test-budget-update-fixed.js

# Wait for a bit to let the system detect the URL
echo -e "\n⏱️ Waiting for 1 minute to let the system detect the URL..."
sleep 60

# Check the initial status (should not be budgeted yet)
echo -e "\n▶️ Step 2: Checking initial budget status (expected: not budgeted yet)..."
node --experimental-specifier-resolution=node monitor-budget-update.js "$TEST_URL_NAME"

# Set up a loop to check every minute for 10 minutes
echo -e "\n▶️ Step 3: Setting up monitoring for the next 10 minutes..."
echo "⏱️ Will check budget status every minute for 10 minutes..."
echo "🔍 Budget should be calculated after 9 minutes"

for i in {1..10}; do
  echo -e "\n⏱️ Waiting 1 minute..."
  sleep 60
  echo -e "\n🔍 Check #$i - Checking budget status after $(($i + 1)) minutes..."
  node --experimental-specifier-resolution=node monitor-budget-update.js "$TEST_URL_NAME"
done

echo -e "\n✅ Test completed!"
echo "If the test was successful, the URL's budgetCalculated flag should now be TRUE"