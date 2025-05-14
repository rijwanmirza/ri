#!/bin/bash
# This script creates a filtered push that excludes sensitive files

echo "🔒 Creating filtered Git push..."

# Create a temporary branch
TEMP_BRANCH="temp_clean_branch_$(date +%s)"
echo "📋 Creating temporary branch: $TEMP_BRANCH"
git checkout -b $TEMP_BRANCH

# Files to exclude from the push
echo "📝 Creating list of files to exclude..."
cat > .exclude-files << EOL
attached_assets/Pasted--workspace-Check-if-git-is-initialized-ls-la-git-Try-to-set-your-user-name-directly-if--1747211368491.txt
scripts/github.mjs
github-setup.sh
scripts/sync-from-github.sh
scripts/replit-push.js
EOL

# Remove sensitive files from the temp branch
echo "🗑️ Removing sensitive files from the branch..."
while IFS= read -r file; do
  if [ -f "$file" ]; then
    git rm --cached "$file"
    echo "  Removed: $file"
  fi
done < .exclude-files

# Commit the changes
echo "💾 Committing filtered changes..."
git commit -m "Push without sensitive files"

# Force push the filtered branch to the main branch on remote
echo "📤 Pushing filtered branch..."
git push -f origin $TEMP_BRANCH:main

# Switch back to main branch and clean up
echo "🧹 Cleaning up..."
git checkout main
git branch -D $TEMP_BRANCH
rm .exclude-files

echo "✅ Filtered push completed!"
echo "Your repository should now be clean of sensitive files on GitHub."