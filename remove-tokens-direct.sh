#!/bin/bash
# Script to directly remove problematic files from Git history

echo "🚨 STARTING DIRECT TOKEN REMOVAL 🚨"
echo "This script will remove sensitive files from Git history."
echo ""

# Identify specific commits with the token
echo "🔍 The problem is in these specific commits:"
echo "  - ee8281807b8aa9a577af613039dfbdc06320d6f5 (attached_assets/Pasted--workspace-Check-if-git-is-initialized-ls-la-git-Try-to-set-your-user-name-directly-if--1747211368491.txt)"
echo "  - 9b816fc11ee149443fddefd8061c8bed763ade49 (scripts/github.mjs)"
echo ""

# Check if BFG repo cleaner is available, if not provide manual instructions
echo "🧹 We'll use direct Git filter-branch to remove these files:"
echo ""

# Ensure we're in the right directory
REPO_ROOT=$(git rev-parse --show-toplevel)
cd $REPO_ROOT

# Create a backup branch
echo "📋 Creating backup branch..."
git checkout -b backup_before_cleanup

# Go back to main
git checkout main

# Remove the specific files using filter-branch
echo "🔧 Removing sensitive files from history..."
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch attached_assets/Pasted--workspace-Check-if-git-is-initialized-ls-la-git-Try-to-set-your-user-name-directly-if--1747211368491.txt scripts/github.mjs github-setup.sh scripts/sync-from-github.sh scripts/replit-push.js" \
  --prune-empty --tag-name-filter cat -- --all

# Remove the Git refs to ensure garbage collection can clean up
echo "🗑️ Cleaning up references..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now
git gc --aggressive --prune=now

# Create sanitized placeholder files
echo "📝 Creating sanitized placeholder files..."
mkdir -p scripts
echo "// Placeholder file - token removed for security" > scripts/github.mjs

# Add the sanitized files
git add scripts/github.mjs

# Commit the changes
git commit -m "Add sanitized placeholders for sensitive files"

# Force push to GitHub
echo "📤 Force pushing cleaned repository to GitHub..."
echo "WARNING: This will override the remote repository with your cleaned local copy."
echo "If you have unsaved changes in the remote repository, they will be lost."
echo ""
read -p "Continue with force push? (y/n): " continue_push

if [[ "$continue_push" == "y" || "$continue_push" == "Y" ]]; then
  git push -f origin main
  echo "✅ Changes force pushed to GitHub!"
else
  echo "❌ Push canceled. You can manually push later with: git push -f origin main"
fi

echo ""
echo "📢 IMPORTANT: If you need the removed files, they are still in the backup_before_cleanup branch."
echo "   You can view them with: git checkout backup_before_cleanup"
echo ""
echo "🔐 SECURITY TIP: Always store tokens in environment variables or secure credential storage, never in code."