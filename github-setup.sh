#!/bin/bash
# File: github-setup.sh - Complete GitHub-VPS Integration

# Configuration - Updated with correct database user
GITHUB_REPO="https://github.com/rijwanmirza/ri.git"
GITHUB_TOKEN="GITHUB_TOKEN_PLACEHOLDER" # Token removed for security
GITHUB_EMAIL="rijwamirza@gmail.com"
GITHUB_NAME="Rijwan Mirza"
APP_DIR="/var/www/UrlCampaignTracker"
DB_NAME="neondb"
DB_USER="neondb_owner"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting manual GitHub integration setup...${NC}"

# Step 1: Install required packages
echo -e "${YELLOW}Installing required packages...${NC}"
sudo apt-get update
sudo apt-get install -y git postgresql-client

# Step 2: Backup current application
echo -e "${YELLOW}Creating backup of current application...${NC}"
BACKUP_DIR="/tmp/app_backup_$(date +%s)"
mkdir -p "$BACKUP_DIR"
cp -R "$APP_DIR/"* "$BACKUP_DIR/" 2>/dev/null || true
cp -R "$APP_DIR/".[^.]* "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}Backup created at $BACKUP_DIR${NC}"

# Step 3: Configure Git
echo -e "${YELLOW}Configuring Git...${NC}"
git config --global user.name "$GITHUB_NAME"
git config --global user.email "$GITHUB_EMAIL"

# Step 4: Setup app directory for Git
echo -e "${YELLOW}Setting up Git in $APP_DIR...${NC}"
cd "$APP_DIR"

# Remove .git if it exists
if [ -d "$APP_DIR/.git" ]; then
    rm -rf "$APP_DIR/.git"
    echo -e "${YELLOW}Removed existing Git repository${NC}"
fi

# Initialize Git
git init

# Step 5: Create gitignore file
echo -e "${YELLOW}Creating .gitignore file...${NC}"
cat > "$APP_DIR/.gitignore" << 'GITIGNORE'
# Environment variables and configs
.env
*.env
config.json

# Logs
*.log
url_budget_logs/
Active_Url_Budget_Logs/
logs/

# Dependencies
node_modules/

# Database files
*.sql
*.dump

# Secrets
*credentials*.json
*token*.json
*secret*.json
GITIGNORE

# Step 6: Add remote with token
echo -e "${YELLOW}Adding GitHub repository as remote...${NC}"
# Format: https://<TOKEN>@github.com/<USERNAME>/<REPO>.git
GITHUB_TOKEN_URL=$(echo "$GITHUB_REPO" | sed "s/https:\/\//https:\/\/$GITHUB_TOKEN@/")
git remote add origin "$GITHUB_TOKEN_URL"

# Step 7: Create initial commit
echo -e "${YELLOW}Creating initial commit...${NC}"
git add .
git commit -m "Initial commit from VPS"

# Step 8: Create sync script
echo -e "${YELLOW}Creating manual sync script...${NC}"
mkdir -p "$APP_DIR/scripts"
cat > "$APP_DIR/scripts/sync-from-github.sh" << SYNCSCRIPT
#!/bin/bash
# File: sync-from-github.sh - Manual Sync Tool

# Configuration
APP_DIR="$APP_DIR"
LOG_DIR="\$APP_DIR/sync_logs"
GITHUB_REPO="$GITHUB_REPO"
GITHUB_TOKEN="$GITHUB_TOKEN"
DB_NAME="$DB_NAME"
DB_USER="$DB_USER"

# Create log directory if it doesn't exist
mkdir -p "\$LOG_DIR"
LOG_FILE="\$LOG_DIR/sync_\$(date +%Y%m%d_%H%M%S).log"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log() {
  echo -e "[\$(date '+%Y-%m-%d %H:%M:%S')] \$1" | tee -a "\$LOG_FILE"
}

# Create a complete backup
log "\${YELLOW}Creating backup...\${NC}"
BACKUP_DIR="/tmp/app_backup_\$(date +%s)"
mkdir -p "\$BACKUP_DIR/code"
mkdir -p "\$BACKUP_DIR/db"

# Backup code
cp -R "\$APP_DIR/"* "\$BACKUP_DIR/code/" 2>/dev/null || true
cp -R "\$APP_DIR/".[^.]* "\$BACKUP_DIR/code/" 2>/dev/null || true

# Backup database
log "\${YELLOW}Backing up database...\${NC}"
pg_dump -U $DB_USER $DB_NAME > "\$BACKUP_DIR/db/database_backup.sql"
log "\${GREEN}Backup completed at \$BACKUP_DIR\${NC}"

# Go to application directory
cd "\$APP_DIR"

# Save current git state
CURRENT_COMMIT=\$(git rev-parse HEAD)
log "\${YELLOW}Current commit: \$CURRENT_COMMIT\${NC}"

# Pull latest changes from GitHub
log "\${YELLOW}Pulling latest changes from GitHub...\${NC}"
git pull origin main >> "\$LOG_FILE" 2>&1
PULL_STATUS=\$?

if [ \$PULL_STATUS -ne 0 ]; then
  log "\${RED}Error pulling changes from GitHub. See \$LOG_FILE for details.\${NC}"
  log "\${YELLOW}Would you like to force reset to the latest GitHub version? (y/n)\${NC}"
  read -p "Reset to GitHub version? (y/n): " RESET_CHOICE
  
  if [[ "\$RESET_CHOICE" == "y" || "\$RESET_CHOICE" == "Y" ]]; then
    git reset --hard origin/main
    log "\${GREEN}Reset to GitHub version completed\${NC}"
  else
    log "\${RED}Sync aborted. Please resolve Git issues manually.\${NC}"
    exit 1
  fi
fi

# Get list of changed files
CHANGED_FILES=\$(git diff --name-only \$CURRENT_COMMIT HEAD)
log "\${YELLOW}Changed files:\${NC}"
echo "\$CHANGED_FILES" | tee -a "\$LOG_FILE"

# Check for database changes
DB_CHANGES=false
for file in \$CHANGED_FILES; do
  if [[ \$file == *"schema.ts"* || \$file == *"migrations/"* ]]; then
    DB_CHANGES=true
    log "\${YELLOW}Database related file changed: \$file\${NC}"
  fi
done

# If database changes detected, ask for confirmation
if [ "\$DB_CHANGES" = true ]; then
  log "\${YELLOW}Database changes detected. Do you want to apply these changes? (y/n)\${NC}"
  read -p "Apply database changes? (y/n): " DB_CHOICE
  
  if [[ "\$DB_CHOICE" == "y" || "\$DB_CHOICE" == "Y" ]]; then
    log "\${YELLOW}Applying database changes...\${NC}"
    
    # Check for migrations
    if [ -d "\$APP_DIR/migrations" ]; then
      log "\${YELLOW}Processing migrations directory...\${NC}"
      for migration in \$APP_DIR/migrations/*.sql; do
        if [ -f "\$migration" ]; then
          log "\${YELLOW}Applying migration: \$(basename "\$migration")\${NC}"
          psql -U $DB_USER -d $DB_NAME -f "\$migration" >> "\$LOG_FILE" 2>&1
          MIGRATION_STATUS=\$?
          
          if [ \$MIGRATION_STATUS -ne 0 ]; then
            log "\${RED}Error applying migration: \$(basename "\$migration")\${NC}"
            log "\${RED}Check \$LOG_FILE for details\${NC}"
          else
            log "\${GREEN}Migration applied: \$(basename "\$migration")\${NC}"
          fi
        fi
      done
    fi
    
    # Check for application-specific database update
    if [ -f "\$APP_DIR/update-db.js" ]; then
      log "\${YELLOW}Running database update script...\${NC}"
      node "\$APP_DIR/update-db.js" >> "\$LOG_FILE" 2>&1
    fi
  else
    log "\${YELLOW}Skipping database changes.\${NC}"
  fi
fi

# Check for package.json changes
if echo "\$CHANGED_FILES" | grep -q "package.json"; then
  log "\${YELLOW}package.json changed. Do you want to install dependencies? (y/n)\${NC}"
  read -p "Install dependencies? (y/n): " DEP_CHOICE
  
  if [[ "\$DEP_CHOICE" == "y" || "\$DEP_CHOICE" == "Y" ]]; then
    log "\${YELLOW}Installing dependencies...\${NC}"
    npm install --production >> "\$LOG_FILE" 2>&1
    DEP_STATUS=\$?
    
    if [ \$DEP_STATUS -ne 0 ]; then
      log "\${RED}Error installing dependencies. Check \$LOG_FILE for details\${NC}"
    else
      log "\${GREEN}Dependencies installed successfully\${NC}"
    fi
  else
    log "\${YELLOW}Skipping dependency installation.\${NC}"
  fi
fi

# Create any required directories
log "\${YELLOW}Checking required directories...\${NC}"
REQUIRED_DIRS=(
  "\$APP_DIR/url_budget_logs" 
  "\$APP_DIR/Active_Url_Budget_Logs"
  "\$APP_DIR/logs"
)

for dir in "\${REQUIRED_DIRS[@]}"; do
  if [ ! -d "\$dir" ]; then
    log "\${YELLOW}Creating required directory: \$dir\${NC}"
    mkdir -p "\$dir"
    chmod 777 "\$dir"
  fi
done

# Ask for restart
log "\${YELLOW}Do you want to restart the application? (y/n)\${NC}"
read -p "Restart application? (y/n): " RESTART_CHOICE

if [[ "\$RESTART_CHOICE" == "y" || "\$RESTART_CHOICE" == "Y" ]]; then
  log "\${YELLOW}Restarting application...\${NC}"
  if command -v pm2 &> /dev/null; then
    pm2 restart url-tracker >> "\$LOG_FILE" 2>&1
    log "\${GREEN}Application restarted with PM2\${NC}"
  else
    log "\${RED}PM2 not found. Please restart your application manually.\${NC}"
  fi
else
  log "\${YELLOW}Skipping application restart.\${NC}"
fi

log "\${GREEN}Sync completed successfully!\${NC}"
log "\${GREEN}Application updated from GitHub to commit: \$(git rev-parse HEAD)\${NC}"
SYNCSCRIPT

# Step 9: Make the script executable
echo -e "${YELLOW}Making sync script executable...${NC}"
chmod +x "$APP_DIR/scripts/sync-from-github.sh"

# Step 10: Create Replit helper script
echo -e "${YELLOW}Creating Replit helper script...${NC}"
mkdir -p "$APP_DIR/scripts"
cat > "$APP_DIR/scripts/replit-push.js" << 'REPLITSCRIPT'
#!/usr/bin/env node
/**
 * Replit Push Helper
 * Place this in your Replit project and run to push changes to GitHub.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const GITHUB_REPO = "https://github.com/rijwanmirza/ri.git";
const GITHUB_TOKEN = "GITHUB_TOKEN_PLACEHOLDER"; // Token removed for security

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m"
};

// Helper function to execute shell commands
function execCommand(command, ignoreError = false) {
  try {
    return execSync(command, { stdio: 'pipe' }).toString().trim();
  } catch (error) {
    if (!ignoreError) {
      console.error(`${colors.red}Error executing command:${colors.reset} ${command}`);
      console.error(error.message);
    }
    return error.message;
  }
}

// Function to push changes to GitHub
async function pushToGitHub() {
  console.log(`${colors.bright}${colors.blue}Pushing changes to GitHub...${colors.reset}`);
  
  // Check if .git directory exists
  if (!fs.existsSync('.git')) {
    console.log(`${colors.yellow}Initializing Git repository...${colors.reset}`);
    execCommand('git init');
    
    // Configure Git
    execCommand('git config --global user.name "Rijwan Mirza"');
    execCommand('git config --global user.email "rijwamirza@gmail.com"');
    
    // Add remote with token
    const githubTokenUrl = GITHUB_REPO.replace('https://', `https://${GITHUB_TOKEN}@`);
    execCommand(`git remote add origin ${githubTokenUrl}`);
  }
  
  // Create .gitignore if it doesn't exist
  if (!fs.existsSync('.gitignore')) {
    console.log(`${colors.yellow}Creating .gitignore file...${colors.reset}`);
    const gitignoreContent = `
# Environment variables and configs
.env
*.env
config.json

# Logs
*.log
url_budget_logs/
Active_Url_Budget_Logs/
logs/

# Dependencies
node_modules/

# Replit specific
.replit
replit.nix
.config/
`;
    fs.writeFileSync('.gitignore', gitignoreContent.trim());
  }
  
  // Add all changes
  console.log(`${colors.yellow}Adding changes...${colors.reset}`);
  execCommand('git add .');
  
  // Check if there are changes to commit
  const status = execCommand('git status --porcelain');
  if (!status) {
    console.log(`${colors.green}No changes to commit.${colors.reset}`);
    return;
  }
  
  // Get commit message from user or use default
  let commitMessage = "Update from Replit";
  if (process.argv.length > 2) {
    commitMessage = process.argv.slice(2).join(' ');
  }
  
  // Commit changes
  console.log(`${colors.yellow}Committing changes...${colors.reset}`);
  execCommand(`git commit -m "${commitMessage}"`);
  
  // Push to GitHub
  console.log(`${colors.yellow}Pushing to GitHub...${colors.reset}`);
  const pushResult = execCommand('git push -u origin main', true);
  
  if (pushResult.includes('error') || pushResult.includes('fatal')) {
    console.log(`${colors.red}Error pushing to GitHub. Attempting force push...${colors.reset}`);
    execCommand('git push -u origin main --force');
  }
  
  console.log(`${colors.green}${colors.bright}Changes pushed to GitHub successfully!${colors.reset}`);
  console.log(`${colors.blue}Repository: ${GITHUB_REPO}${colors.reset}`);
}

// Execute the function
pushToGitHub().catch(error => {
  console.error(`${colors.red}${colors.bright}Error:${colors.reset}`, error);
});
REPLITSCRIPT

# Step 11: Make the Replit script executable
echo -e "${YELLOW}Making Replit helper script executable...${NC}"
chmod +x "$APP_DIR/scripts/replit-push.js"

# Step 12: Create migrations directory
echo -e "${YELLOW}Creating migrations directory...${NC}"
mkdir -p "$APP_DIR/migrations"
cat > "$APP_DIR/migrations/README.md" << EOF
# Database Migrations

Place SQL migration files in this directory with date-based naming:
YYYYMMDD_description.sql

Example: 
- 20250511_add_user_settings.sql
- 20250512_create_logs_table.sql

These migrations will be run in order when you execute the sync script.
EOF

# Step 13: Create sync logs directory
echo -e "${YELLOW}Creating sync logs directory...${NC}"
mkdir -p "$APP_DIR/sync_logs"

# Step 14: Push to GitHub
echo -e "${YELLOW}Pushing your code to GitHub...${NC}"
git push -u origin main --force

echo -e "${GREEN}Manual GitHub integration setup finished!${NC}"
echo -e "${GREEN}Your VPS is now connected to GitHub repository: $GITHUB_REPO${NC}"
echo -e "\n${YELLOW}IMPORTANT USAGE INSTRUCTIONS:${NC}"
echo -e "${GREEN}1. On your VPS:${NC}"
echo -e "   - To sync from GitHub: ${YELLOW}$APP_DIR/scripts/sync-from-github.sh${NC}"
echo -e "   - This will prompt you for confirmation at each step:${NC}"
echo -e "     - Database changes${NC}"
echo -e "     - Package installations${NC}"
echo -e "     - Application restart${NC}"
echo -e "\n${GREEN}2. In Replit:${NC}"
echo -e "   - Clone the repository: ${YELLOW}git clone $GITHUB_REPO .${NC}"
echo -e "   - After making changes, run: ${YELLOW}node scripts/replit-push.js \"Your commit message\"${NC}"
echo -e "\n${GREEN}That's it! You have complete manual control over syncing.${NC}"
