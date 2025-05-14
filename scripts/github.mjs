// File: scripts/push-to-github.mjs
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const GITHUB_REPO = "https://github.com/rijwanmirza/ri.git";
const GITHUB_TOKEN = "GITHUB_TOKEN_GOES_HERE"; // Replace with your token before using
const GITHUB_EMAIL = "rijwamirza@gmail.com";
const GITHUB_NAME = "Rijwan Mirza";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m"
};

// Execute shell command and return output
function exec(command) {
  console.log(`${colors.dim}> ${command}${colors.reset}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    return output.trim();
  } catch (error) {
    console.error(`${colors.red}Error executing: ${command}${colors.reset}`);
    console.error(error.message);
    return error.message;
  }
}

// Main function
async function pushToGitHub() {
  console.log(`\n${colors.bright}${colors.blue}======================================${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}   Replit to GitHub Push Tool v2.0${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}======================================${colors.reset}\n`);

  console.log(`${colors.cyan}Preparing to push Replit code to GitHub...${colors.reset}`);

  // Setup Git config
  console.log(`\n${colors.yellow}Setting up Git configuration...${colors.reset}`);
  exec(`git config --global user.name "${GITHUB_NAME}"`);
  exec(`git config --global user.email "${GITHUB_EMAIL}"`);

  // Initialize Git if needed
  if (!fs.existsSync('.git')) {
    console.log(`\n${colors.yellow}Initializing Git repository...${colors.reset}`);
    exec('git init');
  }

  // Create better .gitignore if needed
  if (!fs.existsSync('.gitignore')) {
    console.log(`\n${colors.yellow}Creating .gitignore file...${colors.reset}`);
    const gitignoreContent = `# Node modules
node_modules/

# Environment variables
.env
.env.local
.env.development
.env.production

# Build directories
dist/
build/

# Logs
*.log
logs/
url_budget_logs/
Active_Url_Budget_Logs/
redirect_logs/

# Replit specific
.replit
.config/
.upm/
replit.nix
.cache/
.breakpoints

# System files
.DS_Store
Thumbs.db

# Package manager files
package-lock.json
yarn.lock
`;
    fs.writeFileSync('.gitignore', gitignoreContent);
    console.log(`${colors.green}Created .gitignore file${colors.reset}`);
  }

  // Setup remote
  try {
    const remotes = exec('git remote -v');
    if (!remotes.includes('origin')) {
      console.log(`\n${colors.yellow}Adding GitHub repository as remote...${colors.reset}`);
      const tokenUrl = GITHUB_REPO.replace('https://', `https://${GITHUB_TOKEN}@`);
      exec(`git remote add origin ${tokenUrl}`);
    }
  } catch (e) {
    // Add origin if it doesn't exist
    console.log(`\n${colors.yellow}Adding GitHub repository as remote...${colors.reset}`);
    const tokenUrl = GITHUB_REPO.replace('https://', `https://${GITHUB_TOKEN}@`);
    exec(`git remote add origin ${tokenUrl}`);
  }

  // Get list of changed files
  console.log(`\n${colors.yellow}Checking for changes...${colors.reset}`);
  const status = exec('git status --porcelain');

  if (!status) {
    console.log(`${colors.green}No changes detected. Everything is up to date.${colors.reset}`);
    return;
  }

  // Display changes
  console.log(`\n${colors.yellow}Changes detected:${colors.reset}`);
  const changes = status.split('\n').map(line => {
    const status = line.substring(0, 2).trim();
    const file = line.substring(3);
    let statusDesc = '';

    if (status === 'M') statusDesc = `${colors.yellow}Modified${colors.reset}`;
    else if (status === 'A') statusDesc = `${colors.green}Added${colors.reset}`;
    else if (status === 'D') statusDesc = `${colors.red}Deleted${colors.reset}`;
    else if (status === '??') statusDesc = `${colors.blue}New${colors.reset}`;
    else statusDesc = status;

    return `  ${statusDesc}: ${file}`;
  });

  console.log(changes.join('\n'));

  // Add all files
  console.log(`\n${colors.yellow}Adding files to Git...${colors.reset}`);
  exec('git add .');

  // Commit
  const message = process.argv[2] || `Update from Replit on ${new Date().toLocaleString()}`;
  console.log(`\n${colors.yellow}Committing changes with message: "${message}"...${colors.reset}`);
  exec(`git commit -m "${message}"`);

  // Push to GitHub with force to override any conflicts
  console.log(`\n${colors.yellow}Pushing to GitHub...${colors.reset}`);
  const pushResult = exec('git push -f origin main');

  if (pushResult.includes('error') || pushResult.includes('fatal')) {
    console.log(`\n${colors.red}Error pushing to GitHub. Please check your token or network connection.${colors.reset}`);
    return;
  }

  console.log(`\n${colors.bright}${colors.green}Success! Changes pushed to GitHub successfully.${colors.reset}`);
  console.log(`${colors.blue}Repository: ${GITHUB_REPO}${colors.reset}`);
  console.log(`${colors.blue}Commit message: ${message}${colors.reset}`);
  console.log(`\n${colors.bright}${colors.blue}======================================${colors.reset}`);
  console.log(`${colors.bright}${colors.green}  Your code is now ready to be synced to VPS!${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}======================================${colors.reset}\n`);
}

// Execute the function
pushToGitHub().catch(error => {
  console.error(`${colors.red}${colors.bright}Error:${colors.reset}`, error);
});