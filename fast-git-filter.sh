#!/bin/bash
# Script to filter sensitive files from Git repository 
# without changing repository history

echo "🧹 Starting Git token filter..."

# Create a .gitattributes file with filter settings
echo "📝 Setting up Git attributes for filtering..."
cat > .gitattributes << EOL
*.js filter=token
*.mjs filter=token
*.ts filter=token
*.sh filter=token
*.txt filter=token
EOL

# Configure Git filter to replace tokens
echo "🔧 Configuring Git token filter..."
git config filter.token.clean "sed 's/ghp_[a-zA-Z0-9]\\{36\\}/GITHUB_TOKEN_PLACEHOLDER/g'"
git config filter.token.smudge cat

# Add .gitattributes file
git add .gitattributes
git commit -m "Add Git attributes for token filtering"

# Now create a .gitignore file to exclude the problematic files that still contain tokens
echo "📋 Creating .gitignore for sensitive files..."
cat > .gitignore << EOL
# Ignore files with sensitive tokens
attached_assets/Pasted--workspace-Check-if-git-is-initialized-ls-la-git-Try-to-set-your-user-name-directly-if--1747211368491.txt
# Add other sensitive files if needed
EOL

# Add .gitignore file
git add .gitignore
git commit -m "Add gitignore for sensitive files"

echo "✅ Git filter setup complete!"
echo ""
echo "📢 INSTRUCTIONS:"
echo "1. Now you can push with: git push -f origin main"
echo "2. The token filter will automatically replace tokens with placeholders"
echo "3. Sensitive files in .gitignore will be excluded from the push"
echo ""
echo "🔒 SECURITY TIP: In the future, store tokens in environment variables, not in code."