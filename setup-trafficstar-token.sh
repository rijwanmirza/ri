#!/bin/bash

# This script creates the token file for TrafficStar API
# Run this once to configure your TrafficStar API token correctly

# Replace this token with your complete TrafficStar API token
COMPLETE_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJjOGJmY2YyZi1lZjJlLTQwZGYtYTg4ZC1kYjQ3NmI4MTFiOGMifQ.eyJpYXQiOjE3NDA5MTI1MTUsImV4cCI6MTc0MDk5ODkxNSwianRpIjoiNWIxZjQyMGEtZWM3Yy00MTEwLTg2OTAtNDRlZjVlNWRhMTMzIiwiaXNzIjoiaHR0cHM6Ly9zc28udHJhZmZpY3N0YXJzLmNvbS9hdXRoL3JlYWxtcy90cmFmZmljc3RhcnMiLCJzdWIiOiI0ZTExZjhjMC1mN2VhLTQyNGQtYWZhYy1iMmE2YmM0NmQ2YWIiLCJ0eXAiOiJSZWZyZXNoIiwiYXpwIjoiYXBpLXYxIiwic2Vzc2lvbl9zdGF0ZSI6ImJiM2FlNzVmLTE3MzctNDM2ZS1hZTI0LTRkMDdlNjIzNDhhMiIsInNjb3BlIjoib2ZmbGluZV9hY2Nlc3MifQ.kbvfT4ReCFO2HxDBFW-TRmYMoFoW9b0_sMIcvZF-Z70"

# Create the token file
echo -n "$COMPLETE_TOKEN" > /var/www/UrlCampaignTracker/trafficstar_token.txt

# Set correct permissions
chmod 600 /var/www/UrlCampaignTracker/trafficstar_token.txt

echo "TrafficStar token file created successfully at: /var/www/UrlCampaignTracker/trafficstar_token.txt"
echo "The start script will now use this token file for API authentication."