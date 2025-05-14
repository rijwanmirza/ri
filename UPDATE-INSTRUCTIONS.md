# How to Update Your GitHub Repository and VPS

Since we can't push directly from Replit to GitHub, follow these steps to update both your GitHub repository and VPS with the latest code including redirect analytics tracking.

## IMPORTANT: GitHub Token Warning

GitHub detected a sensitive token in your repository history. This is why your pushes are being rejected. To fix this, you need to clean your Git history and create a new token.

## Accessing Your Application

To access the application, use the following URL format:
```
https://your-server-url/access/ABCD123
```

This will generate a temporary login URL and redirect you to it. The default access code is `ABCD123` (you can change this in the system settings or in server/access-control.ts).

## Step 1: Download Your Code from Replit

1. Click on the three dots (...) in the top-left corner of Replit
2. Select "Download as zip"
3. Save the ZIP file to your computer
4. Extract the ZIP file to a folder on your computer

## Step 2: Push to GitHub from Your Computer (Safe Way)

First, create a new GitHub token:
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with the "repo" scope
3. Copy the new token to use in the commands below

Then open a terminal or command prompt on your computer and run these commands:

```bash
# Navigate to the extracted folder
cd path/to/extracted/folder

# Initialize Git (make a completely fresh repository)
git init

# Configure Git with your information
git config --local user.name "rijwan mirza"
git config --local user.email "rijwamirza@gmail.com"

# Create a .gitignore file to exclude sensitive files
cat > .gitignore << 'EOF'
# Node.js dependencies
node_modules/
npm-debug.log
yarn-debug.log
yarn-error.log

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build directories
dist/
build/
out/

# Logs
logs/
*.log
url_budget_logs/
url_click_logs/
redirect_logs/
Active_Url_Budget_Logs/

# System files
.DS_Store
Thumbs.db

# Sensitive files
attached_assets/

# Temporary files
tmp/
temp/
EOF

# Add all files (except those in .gitignore)
git add .

# Commit changes
git commit -m "Add redirect analytics tracking"

# Add your GitHub repository as remote (use your NEW token)
git remote add origin https://YOUR_NEW_TOKEN@github.com/rijwanmirza/ri.git

# Force push to GitHub (this will override any existing content on GitHub)
git push -f origin main
```

## Step 3: Update Your VPS

Upload the `vps-update.sh` script to your VPS and run it:

1. Upload the `vps-update.sh` file to your VPS using SCP, SFTP, or copy-paste the content
2. Connect to your VPS via SSH
3. Make the script executable and run it:

```bash
chmod +x vps-update.sh
./vps-update.sh
```

This script will:
- Fix the missing PM2 start script issue
- Pull the latest code from GitHub
- Restart your application properly

## What Was Added/Fixed

The following improvements were made to your code:

1. Added `fix-redirect-analytics.ts` with improved redirect method handling
2. Created fixed route handlers for all redirect endpoints (/views, /r, /r/bridge)
3. Updated `routes.ts` to register these fixed routes
4. Added proper tracking for redirect analytics through all routes
5. Created a VPS update script to fix the PM2 start issues
6. Fixed the getCampaignUrls function reference in fix-views-route.ts

### Testing the Redirect Method Analytics

The updates are working correctly now. You can test them by visiting:

```
https://your-server-url/views/traffic1
```

or 

```
https://your-server-url/views/traffic2
```

These redirect routes now track the chosen redirect method and update the analytics data in the database. You'll see logs like:

```
🔀 Determining redirect method for URL ID 245, campaign ID 5
🔀 Custom redirector disabled for campaign 5, using direct method
🔄 ATTEMPTING TO INCREMENT REDIRECT COUNT for URL ID 245, method: direct
...
✅ Updated record: {
  id: 11,
  urlId: 245,
  linkedinRedirects: 2,
  facebookRedirects: 1,
  ...
  directRedirects: 1,
  updatedAt: 2025-05-14T09:08:49.744Z
}
📊 Successfully recorded direct redirect for URL ID 245
```

These changes ensure that redirect method analytics are properly tracked and stored in the database, and they will be displayed correctly in the URL information section.

If you encounter any issues with the update process, please let me know!