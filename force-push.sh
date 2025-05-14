#!/bin/bash

# Force push script for GitHub repository
# This will override the remote repository with our local changes

echo "🚀 Starting force push to GitHub..."

# Configure Git (if needed)
git config --global user.name "rijwan mirza"
git config --global user.email "rijwamirza@gmail.com"

# Add all files
echo "📦 Adding all files..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Add redirect analytics tracking"

# Force push to GitHub
echo "📤 Force pushing to GitHub..."
git push -f origin main

echo "✅ Force push completed!"