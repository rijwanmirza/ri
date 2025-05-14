#!/bin/bash
BACKUP_DIR="/tmp/app_backup_20250514_040203"
DATABASE_BACKUP="$BACKUP_DIR/database.sql"
echo "Analyzing backup in: $BACKUP_DIR"
if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ Error: Backup directory does not exist!"
  exit 1
fi
if [ -f "$DATABASE_BACKUP" ]; then
  echo "✅ Found database backup file: $DATABASE_BACKUP"
  
  FILESIZE=$(du -h "$DATABASE_BACKUP" | cut -f1)
  CREATION_DATE=$(stat -c %y "$DATABASE_BACKUP" | cut -d' ' -f1)
  
  echo "   - File size: $FILESIZE"
  echo "   - Created on: $CREATION_DATE"
  
  # Get quick stats on database content
  echo "   - Contains campaign data: $(grep -q "COPY public.campaigns" "$DATABASE_BACKUP" && echo "YES" || echo "NO")"
  echo "   - Contains URL data: $(grep -q "COPY public.urls" "$DATABASE_BACKUP" && echo "YES" || echo "NO")"
  echo "   - Contains click data: $(grep -q "COPY public.url_click_logs\|COPY public.click_analytics" "$DATABASE_BACKUP" && echo "YES" || echo "NO")"
  
  # Count number of campaigns and URLs
  CAMPAIGN_COUNT=$(grep -c -A1 "COPY public.campaigns" "$DATABASE_BACKUP" | head -1)
  URL_COUNT=$(grep -c -A1 "COPY public.urls" "$DATABASE_BACKUP" | head -1)
  
  echo "   - Approximate campaign count: $CAMPAIGN_COUNT"
  echo "   - Approximate URL count: $URL_COUNT"
  
  # Check for specific campaign IDs
  echo ""
  echo "Checking for specific campaigns:"
  
  # Check for Campaign ID 5
  if grep -q "^5[[:space:]]\|^5," "$DATABASE_BACKUP"; then
    echo "✅ Campaign ID 5: FOUND"
  else  
    echo "❌ Campaign ID 5: NOT FOUND"
  fi
  
  # Check for TrafficStar ID 1000866
  if grep -q "1000866" "$DATABASE_BACKUP"; then
    echo "✅ TrafficStar ID 1000866: FOUND"
  else
    echo "❌ TrafficStar ID 1000866: NOT FOUND"
  fi
  
  # Check for TrafficStar ID 1016596
  if grep -q "1016596" "$DATABASE_BACKUP"; then
    echo "✅ TrafficStar ID 1016596: FOUND"
  else
    echo "❌ TrafficStar ID 1016596: NOT FOUND"
  fi
  
  echo ""
  echo "Checking database schema:"
  
  # Extract and display table structure
  echo "Tables defined in backup:"
  grep -n "CREATE TABLE" "$DATABASE_BACKUP" | head -10
  echo "... (more tables may exist)"
  
  # Look for views
  echo ""
  echo "Views defined in backup:"
  grep -n "CREATE VIEW" "$DATABASE_BACKUP" | head -10
  
  echo ""
  echo "To restore this backup with column fixes, run:"
  echo ""
  echo "PGPASSWORD=npg_U8evoXZz0WOB psql -U neondb_owner -h 78.46.85.93 -p 5432 -d neondb -c \"DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;\""
  echo "PGPASSWORD=npg_U8evoXZz0WOB psql -U neondb_owner -h 78.46.85.93 -p 5432 -d neondb < $DATABASE_BACKUP"
  echo ""
  echo "# After restoring, fix column issues with:"
  echo "PGPASSWORD=npg_U8evoXZz0WOB psql -U neondb_owner -h 78.46.85.93 -p 5432 -d neondb -c \\"
  echo "  ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS custom_redirector_enabled BOOLEAN DEFAULT false;\\
  ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS googlemeet_redirection_enabled BOOLEAN DEFAULT false;\\
  ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS googlesearch_redirection_enabled BOOLEAN DEFAULT false;\\
  \""
  echo ""
  echo "# And modify traffic-generator-new.ts:"
  echo "cp /var/www/UrlCampaignTracker/server/traffic-generator-new.ts /var/www/UrlCampaignTracker/server/traffic-generator-new.ts.bak"
  echo "sed -i 's/google_meet_redirection_enabled/googlemeet_redirection_enabled/g' /var/www/UrlCampaignTracker/server/traffic-generator-new.ts"
  echo "sed -i 's/google_search_redirection_enabled/googlesearch_redirection_enabled/g' /var/www/UrlCampaignTracker/server/traffic-generator-new.ts"
else
  echo "❌ Error: Database backup file not found in the backup directory!"
  
  # List files in the backup directory
  echo "Files found in backup directory:"
  ls -la "$BACKUP_DIR"
fi
echo ""
echo "Check complete! You can now decide if you want to restore this backup."
