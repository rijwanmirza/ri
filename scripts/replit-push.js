#!/usr/bin/env node
/**
 * Replit Push Helper
 * Place this in your Replit project and run to push changes to GitHub.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const GITHUB_REPO = "https://github.com/rijwanmirza/ri.git";
const GITHUB_TOKEN = "GITHUB_TOKEN_PLACEHOLDER"; // Token removed for security

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m"
};

// Helper function to execute shell commands
function execCommand(command, ignoreError = false) {
  try {
    return execSync(command, { stdio: 'pipe' }).toString().trim();
  } catch (error) {
    if (!ignoreError) {
      console.error(`${colors.red}Error executing command:${colors.reset} ${command}`);
      console.error(error.message);
    }
    return error.message;
  }
}

// Function to push changes to GitHub
async function pushToGitHub() {
  console.log(`${colors.bright}${colors.blue}Pushing changes to GitHub...${colors.reset}`);
  
  // Check if .git directory exists
  if (!fs.existsSync('.git')) {
    console.log(`${colors.yellow}Initializing Git repository...${colors.reset}`);
    execCommand('git init');
    
    // Configure Git
    execCommand('git config --global user.name "Rijwan Mirza"');
    execCommand('git config --global user.email "rijwamirza@gmail.com"');
    
    // Add remote with token
    const githubTokenUrl = GITHUB_REPO.replace('https://', `https://${GITHUB_TOKEN}@`);
    execCommand(`git remote add origin ${githubTokenUrl}`);
  }
  
  // Create .gitignore if it doesn't exist
  if (!fs.existsSync('.gitignore')) {
    console.log(`${colors.yellow}Creating .gitignore file...${colors.reset}`);
    const gitignoreContent = `
# Environment variables and configs
.env
*.env
config.json

# Logs
*.log
url_budget_logs/
Active_Url_Budget_Logs/
logs/

# Dependencies
node_modules/

# Replit specific
.replit
replit.nix
.config/
`;
    fs.writeFileSync('.gitignore', gitignoreContent.trim());
  }
  
  // Add all changes
  console.log(`${colors.yellow}Adding changes...${colors.reset}`);
  execCommand('git add .');
  
  // Check if there are changes to commit
  const status = execCommand('git status --porcelain');
  if (!status) {
    console.log(`${colors.green}No changes to commit.${colors.reset}`);
    return;
  }
  
  // Get commit message from user or use default
  let commitMessage = "Update from Replit";
  if (process.argv.length > 2) {
    commitMessage = process.argv.slice(2).join(' ');
  }
  
  // Commit changes
  console.log(`${colors.yellow}Committing changes...${colors.reset}`);
  execCommand(`git commit -m "${commitMessage}"`);
  
  // Push to GitHub
  console.log(`${colors.yellow}Pushing to GitHub...${colors.reset}`);
  const pushResult = execCommand('git push -u origin main', true);
  
  if (pushResult.includes('error') || pushResult.includes('fatal')) {
    console.log(`${colors.red}Error pushing to GitHub. Attempting force push...${colors.reset}`);
    execCommand('git push -u origin main --force');
  }
  
  console.log(`${colors.green}${colors.bright}Changes pushed to GitHub successfully!${colors.reset}`);
  console.log(`${colors.blue}Repository: ${GITHUB_REPO}${colors.reset}`);
}

// Execute the function
pushToGitHub().catch(error => {
  console.error(`${colors.red}${colors.bright}Error:${colors.reset}`, error);
});
