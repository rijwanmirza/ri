#!/bin/bash

# Safe GitHub push script that will not expose tokens
echo "🔒 Starting secure GitHub push..."

# Configure Git (if needed)
git config --global user.name "rijwan mirza"
git config --global user.email "rijwamirza@gmail.com"

# Add all files
echo "📦 Adding all files..."
git add .

# Check for files with tokens (final safety check)
if grep -r "ghp_" --include="*.js" --include="*.mjs" --include="*.ts" --include="*.sh" --include="*.txt" .; then
  echo "⚠️ WARNING: GitHub tokens still found in files! Please remove them before pushing."
  echo "Use the 'git add' command to stage specific files instead of all files."
  exit 1
fi

# Commit changes
echo "💾 Committing changes..."
git commit -m "Update custom redirectors with new URL formats"

# Push to GitHub using HTTPS URL (without token in script)
echo "📤 Pushing to GitHub..."
read -p "Enter your GitHub username: " username
git push origin main

echo "✅ Push operation completed!"