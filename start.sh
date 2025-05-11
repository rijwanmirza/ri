#!/bin/bash
# Set environment variables
export DATABASE_URL="postgres://neondb_owner:npg_U8evoXZz0WOB@localhost:5432/neondb"
export API_SECRET_KEY="TraffiCS10928"
export YOUTUBE_API_KEY="AIzaSyBB2nPAhc87jhkGXDe02jgn2eyV0qr-9YA"
export TRAFFICSTAR_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJjOGJmY2YyZi1lZjJlLTQwZGYtYTg4ZC1kYjQ3NmI4MTFiOGMifQ.eyJpYXQiOjE3NDA5MTI1MTUsImp0aSI6ImNjNWQ2MWVkLTg5NjEtNDA4YS1iYmRhLTNhOTdkYWYwYWM4NCIsImlzcyI6Imh0dHBzOi8vaWQudHJhZmZpY3N0YXJzLmNvbS9yZWFsbXMvdHJhZmZpY3N0YXJzIiwiYXVkIjoiaHR0cHM6Ly9pZC50cmFmZmljc3RhcnMuY29tL3JlYWxtcy90cmFmZmljc3RhcnMiLCJzdWIiOiJmN2RlZTQyMy0zYzY3LTQxYjItODE4My1lZTdmZjBmMTUwOGIiLCJ0eXAiOiJPZmZsaW5lIiwiYXpwIjoiY29yZS1hcGkiLCJzZXNzaW9uX3N0YXRlIjoiYTgyNTM5MmYtZjQ1OS00Yjg5LTkzNmEtZDcyNDcwODVlMDczIiwic2NvcGUiOiJvcGVuaWQgZW1haWwgb2ZmbGluZV9hY2Nlc3MgcHJvZmlsZSIsInNpZCI6ImE4MjUzOTJmLWY0NTktNGI4OS05MzZhLWQ3MjQ3MDg1ZTA3MyJ9.Zw6cuWlQCZcbqHX3jF1VIl6rpyWjN58zW8_s9al0Yl8"
export SESSION_SECRET="2DcFsEodeYl7m0bq35CxJiW/hZI/J4dZhv9xrKiH186cZUKQ4tQEQLwDesAuMDbDZwoFG/5pyP/43tbnRIpwoQ=="
export PGHOST="localhost"
export PGPORT="5432"
export PGUSER="neondb_owner"
export PGPASSWORD="npg_U8evoXZz0WOB"
export PGDATABASE="neondb"
export NODE_ENV="production"
export PORT="5000"
export HOST="0.0.0.0"
export GMAIL_USER="compaignwalabhai@gmail.com"
export GMAIL_PASSWORD="hciuemplthdkwfho"
cd /var/www/UrlCampaignTracker
# Fix the db.ts file to remove .unique() method which is causing issues
sed -i 's/customPath: text("custom_path").unique(),/customPath: text("custom_path"),/g' /var/www/UrlCampaignTracker/shared/schema.ts
# Fix any other unique() calls in the schema
sed -i 's/\.unique()//g' /var/www/UrlCampaignTracker/shared/schema.ts
# Build the client files
echo "Building the client..."
npm run build
# Make sure the server/public directory exists
mkdir -p /var/www/UrlCampaignTracker/server/public
# Copy the built files from dist/public to server/public
echo "Copying dist to server/public..."
cp -r /var/www/UrlCampaignTracker/dist/public/* /var/www/UrlCampaignTracker/server/public/
echo "Starting URL Campaign Tracker..."
# Run the server with tsx directly to avoid compilation issues
npx tsx server/index.ts
