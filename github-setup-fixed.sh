#!/bin/bash
# GitHub Repository Setup and Upload Script
# This script helps securely set up a GitHub repository and upload code

# Display welcome message
echo "🚀 GitHub Repository Setup and Upload Helper"
echo "=========================================="
echo ""

# Prompt for GitHub token (or use environment variable if available)
if [ -z "$GITHUB_TOKEN" ]; then
  read -p "Enter your GitHub token (will not be stored): " GITHUB_TOKEN
fi

# Verify token is provided
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ GitHub token is required. Please run the script again with a valid token."
  exit 1
fi

# Configure GitHub credentials
echo "⚙️ Configuring Git..."
git config --global user.name "Rijwan Mirza"
git config --global user.email "rijwamirza@gmail.com"
echo "✅ Git configured with name and email"

# Initialize Git if needed
if [ ! -d ".git" ]; then
  echo "🔧 Initializing Git repository..."
  git init
  echo "✅ Git repository initialized"
else
  echo "⚠️ Git repository already initialized"
fi

# Create .gitignore
echo "📝 Creating .gitignore file..."
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

echo "✅ .gitignore file created"

# Add files to Git
echo "📦 Adding files to Git..."
git add .
echo "✅ Files added to staging"

# Commit changes
echo "💾 Committing changes..."
git commit -m "Initial commit"
echo "✅ Changes committed"

# Set remote origin
echo "🔗 Setting remote origin..."
git remote remove origin 2>/dev/null || true

# Use a secure way to set the remote without exposing the token in process list
remote_url="https://$GITHUB_TOKEN@github.com/rijwanmirza/ri.git"
git remote add origin "$remote_url"
echo "✅ Remote origin set"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push -u origin main --force
echo "✅ Code pushed to GitHub"

# Cleanup (remove token from environment)
GITHUB_TOKEN=""

echo "🎉 Success! Your code has been uploaded to GitHub"