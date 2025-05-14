#!/bin/bash
# Script to completely clean Git repository of sensitive tokens

echo "🧹 Starting deep Git repository cleaning..."

# Create a temporary .gitignore to exclude sensitive files
echo "Creating temporary .gitignore for sensitive files..."
cat > .gitignore.temp << EOL
# Temporary gitignore to exclude sensitive files
attached_assets/Pasted--workspace-Check-if-git-is-initialized-ls-la-git-Try-to-set-your-user-name-directly-if--1747211368491.txt
scripts/github.mjs
github-setup.sh
scripts/sync-from-github.sh
scripts/replit-push.js
# Other sensitive files
*token*
*secret*
*credential*
*password*
*.env
EOL

# Create a clean branch without the problematic files
echo "📋 Creating a clean branch..."
git checkout --orphan clean-branch

# Add all files except those in .gitignore.temp
echo "🔍 Adding files to the clean branch..."
git add .
git reset -- $(cat .gitignore.temp | grep -v "^#" | xargs)

# Create a new initial commit in the clean branch
echo "💾 Creating initial commit in clean branch..."
git commit -m "Initial clean commit (sensitive files removed)"

# Rename the clean branch to main (forcefully)
echo "🔄 Replacing old main branch with clean branch..."
git branch -D main
git branch -m main

# Create files with placeholders instead of tokens
echo "📝 Creating sanitized versions of sensitive files..."

# Create github.mjs with placeholder
mkdir -p scripts
cat > scripts/github.mjs << EOL
// File: scripts/github.mjs
// IMPORTANT: Configure your GitHub token as an environment variable
// Do not hard-code the token in this file

import { execSync } from 'child_process';

// Configuration
const GITHUB_REPO = "https://github.com/rijwanmirza/ri.git";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "GITHUB_TOKEN_PLACEHOLDER";
const GITHUB_EMAIL = "rijwamirza@gmail.com";
const GITHUB_NAME = "Rijwan Mirza";

// Export the token for use in other modules
export { GITHUB_REPO, GITHUB_TOKEN, GITHUB_EMAIL, GITHUB_NAME };

// Function to execute Git commands
export function executeGitCommand(command) {
  try {
    console.log(\`Executing: \${command.replace(GITHUB_TOKEN, "***")}\`);
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    console.error(\`Error executing Git command: \${error.message}\`);
    throw error;
  }
}
EOL

# Create a placeholder github-setup.sh
cat > github-setup.sh << EOL
#!/bin/bash
# File: github-setup.sh - GitHub Integration Setup

# IMPORTANT: Set your token as an environment variable:
# export GITHUB_TOKEN="your_token_here"
# Do not hardcode the token in this file

# Configuration
GITHUB_REPO="https://github.com/rijwanmirza/ri.git"
GITHUB_TOKEN="\${GITHUB_TOKEN:-GITHUB_TOKEN_PLACEHOLDER}"
GITHUB_EMAIL="rijwamirza@gmail.com"
GITHUB_NAME="Rijwan Mirza"

echo "Using GitHub repository: \$GITHUB_REPO"
echo "Using GitHub username: \$GITHUB_NAME"
echo "Using GitHub email: \$GITHUB_EMAIL"

# Add your setup logic here
# ...
EOL

# Make scripts executable
chmod +x github-setup.sh
chmod +x scripts/github.mjs

# Add sanitized files
echo "📦 Adding sanitized files..."
git add scripts/github.mjs github-setup.sh

# Commit the sanitized files
git commit -m "Add sanitized versions of sensitive files"

# Remove temporary gitignore
rm .gitignore.temp

echo "✅ Repository cleaned successfully!"
echo "Now try pushing with: git push -f origin main"
echo ""
echo "IMPORTANT: In the future, use environment variables for tokens:"
echo "export GITHUB_TOKEN=\"your_token_here\""
echo "This keeps sensitive information out of your code."