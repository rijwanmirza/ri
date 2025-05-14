#!/bin/bash
# This script creates a completely new repository without token history

echo "🔄 Creating clean repository without tokens..."

# Create a temporary directory
TEMP_DIR="/tmp/clean_repo_$(date +%s)"
mkdir -p $TEMP_DIR

# Copy all current files to the temp directory (except .git)
echo "📋 Copying current files to temporary directory..."
rsync -avq --exclude='.git/' --exclude='attached_assets/Pasted--workspace-Check-if-git-is-initialized-ls-la-git-Try-to-set-your-user-name-directly-if--1747211368491.txt' --exclude='scripts/github.mjs' --exclude='github-setup.sh' --exclude='scripts/sync-from-github.sh' --exclude='scripts/replit-push.js' ./ $TEMP_DIR/

# Create placeholders for sensitive files
echo "📝 Creating placeholders for sensitive files..."
mkdir -p $TEMP_DIR/scripts
echo "// Placeholder file - token removed for security" > $TEMP_DIR/scripts/github.mjs

# Initialize a new Git repository in the temp directory
echo "🔄 Initializing new Git repository..."
cd $TEMP_DIR
git init
git config --global user.name "rijwan mirza"
git config --global user.email "rijwamirza@gmail.com"

# Create .gitignore
echo "📋 Setting up .gitignore..."
cat > .gitignore << EOL
# Node modules
node_modules/

# Environment variables
.env
*.env
config.json

# Logs
*.log
url_budget_logs/
Active_Url_Budget_Logs/
logs/

# Replit specific
.replit
replit.nix
.config/

# System files
.DS_Store
Thumbs.db
EOL

# Add all files to the new repository
echo "📦 Adding files to new repository..."
git add .

# Initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit (clean repository)"

# Add the original remote
echo "🔗 Adding remote repository..."
git remote add origin https://github.com/rijwanmirza/ri.git

# Ask for confirmation before force pushing
echo ""
echo "⚠️ WARNING: This will completely replace your GitHub repository history!"
echo "All previous commits and history will be lost, but your files will be preserved."
echo ""
read -p "Continue with force push? (y/n): " continue_push

if [[ "$continue_push" == "y" || "$continue_push" == "Y" ]]; then
  echo "📤 Force pushing to GitHub..."
  git push -f origin main
  echo "✅ Clean repository successfully pushed to GitHub!"
  echo ""
  echo "📋 Next steps:"
  echo "1. Delete this temporary directory when finished: rm -rf $TEMP_DIR"
  echo "2. Return to your original directory and pull the clean repository:"
  echo "   cd /path/to/original/repo"
  echo "   git fetch"
  echo "   git reset --hard origin/main"
else
  echo "❌ Push canceled."
  echo "Your clean repository is available at: $TEMP_DIR"
fi