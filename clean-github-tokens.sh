#!/bin/bash

# Script to remove GitHub tokens from repository
echo "🔒 Starting GitHub token cleanup..."

# Check if files exist and remove tokens
if [ -f "scripts/github.mjs" ]; then
    echo "📝 Cleaning scripts/github.mjs..."
    # Create a backup
    cp scripts/github.mjs scripts/github.mjs.bak
    # Replace the token with a placeholder
    sed -i 's/const token = ".*"/const token = "GITHUB_TOKEN_PLACEHOLDER"/g' scripts/github.mjs
    echo "✅ Cleaned scripts/github.mjs"
fi

# Check for the assets file
if [ -f "attached_assets/Pasted--workspace-Check-if-git-is-initialized-ls-la-git-Try-to-set-your-user-name-directly-if--1747211368491.txt" ]; then
    echo "📝 Removing sensitive asset file..."
    rm "attached_assets/Pasted--workspace-Check-if-git-is-initialized-ls-la-git-Try-to-set-your-user-name-directly-if--1747211368491.txt"
    echo "✅ Removed sensitive asset file"
fi

echo "📦 Adding files to git..."
git add scripts/github.mjs
git add attached_assets

echo "💾 Committing changes..."
git commit -m "Remove sensitive tokens from repository"

echo "🚀 Force pushing to GitHub using HTTPS URL..."
git push -f origin main

echo "✅ Cleanup completed!"