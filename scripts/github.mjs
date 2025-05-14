#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const GITHUB_REPO = "https://github.com/rijwanmirza/ri.git";
const GITHUB_TOKEN = "YOUR_TOKEN_HERE"; // Replace with your token before using
const GITHUB_EMAIL = "rijwamirza@gmail.com";
const GITHUB_NAME = "Rijwan Mirza";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m"
};

/**
 * Main function to run the GitHub upload process
 */
async function main() {
  try {
    console.log(`${colors.cyan}🚀 GitHub Repository Upload Helper${colors.reset}`);
    console.log(`${colors.cyan}==================================\n${colors.reset}`);
    
    // Configure Git
    console.log(`${colors.magenta}⚙️ Configuring Git...${colors.reset}`);
    execSync(`git config --global user.name "${GITHUB_NAME}"`);
    execSync(`git config --global user.email "${GITHUB_EMAIL}"`);
    console.log(`${colors.green}✅ Git configured with name and email${colors.reset}\n`);
    
    // Initialize Git if needed
    if (!fs.existsSync('.git')) {
      console.log(`${colors.magenta}🔧 Initializing Git repository...${colors.reset}`);
      execSync('git init');
      console.log(`${colors.green}✅ Git repository initialized${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}⚠️ Git repository already initialized${colors.reset}\n`);
    }
    
    // Create .gitignore
    const gitignoreContent = `
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

# Temporary files
tmp/
temp/
`;
    
    console.log(`${colors.magenta}📝 Creating .gitignore file...${colors.reset}`);
    fs.writeFileSync('.gitignore', gitignoreContent);
    console.log(`${colors.green}✅ .gitignore file created${colors.reset}\n`);
    
    // Add files to Git
    console.log(`${colors.magenta}📦 Adding files to Git...${colors.reset}`);
    execSync('git add .');
    console.log(`${colors.green}✅ Files added to staging${colors.reset}\n`);
    
    // Commit changes
    console.log(`${colors.magenta}💾 Committing changes...${colors.reset}`);
    execSync('git commit -m "Initial commit"');
    console.log(`${colors.green}✅ Changes committed${colors.reset}\n`);
    
    // Set remote origin
    console.log(`${colors.magenta}🔗 Setting remote origin...${colors.reset}`);
    try {
      execSync('git remote rm origin');
    } catch (error) {
      // It's okay if this fails
    }
    
    execSync(`git remote add origin https://${GITHUB_TOKEN}@github.com/rijwanmirza/ri.git`);
    console.log(`${colors.green}✅ Remote origin set${colors.reset}\n`);
    
    // Push to GitHub
    console.log(`${colors.magenta}📤 Pushing to GitHub...${colors.reset}`);
    execSync('git push -u origin master');
    console.log(`${colors.green}✅ Code pushed to GitHub${colors.reset}\n`);
    
    console.log(`${colors.green}🎉 Success! Your code has been uploaded to GitHub${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}\n`);
    console.log(`${colors.yellow}🔍 Troubleshooting tips:${colors.reset}`);
    console.log(`1. Make sure your GitHub token has the correct permissions (repo, workflow)`);
    console.log(`2. Check if the repository already exists and you have access to it`);
    console.log(`3. Verify your internet connection`);
    console.log(`4. Try running each command manually to see which one fails`);
  }
}

// Run the script
main();