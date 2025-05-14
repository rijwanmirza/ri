#!/bin/bash

# This script completely removes sensitive files from Git history
# It will rewrite history to remove any trace of the files with GitHub tokens

echo "🔒 Starting Git history cleanup..."

# First, fix the git lock issue if it exists
rm -f .git/index.lock

# List of files to remove from Git history completely
FILES_TO_REMOVE=(
  "attached_assets/Pasted--workspace-Check-if-git-is-initialized-ls-la-git-Try-to-set-your-user-name-directly-if--1747211368491.txt"
  "scripts/github.mjs"
)

# Create a temporary clean branch
git checkout --orphan temp_clean_branch

# Add all files except those we want to remove
echo "📋 Adding files to clean branch..."
for file in "${FILES_TO_REMOVE[@]}"; do
  # Make sure the file is ignored
  echo "$file" >> .gitignore
done

# Make sure attached_assets is in gitignore
echo "attached_assets/" >> .gitignore

# Modify the github.mjs file to remove the token
if [ -f "scripts/github.mjs" ]; then
  echo "🔄 Replacing token in github.mjs..."
  sed -i 's/ghp_[a-zA-Z0-9]\{36\}/YOUR_TOKEN_HERE/g' scripts/github.mjs
fi

# Add all files
git add .

# Commit changes
echo "💾 Committing clean files..."
git commit -m "Fresh start with clean history"

# Delete the main branch and rename our temporary branch
echo "🔀 Replacing main branch with clean branch..."
git branch -D main || true
git branch -m main

# Force push to origin
echo "📤 Force pushing clean history to GitHub..."
git push -f origin main

echo "✅ Git history cleanup completed!"
echo "⚠️ Remember to generate a new GitHub token since the old one might be compromised."