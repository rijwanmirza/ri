// File: scripts/push-to-github.mjs
import { execSync } from 'child_process';
import fs from 'fs';

// Configuration
const GITHUB_REPO = "https://github.com/rijwanmirza/ri.git";
const GITHUB_TOKEN = "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";
const GITHUB_EMAIL = "rijwamirza@gmail.com";
const GITHUB_NAME = "Rijwan Mirza";

// Execute shell command and return output
function exec(command) {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    console.error(`Error executing: ${command}`);
    console.error(error.message);
    return error.message;
  }
}

// Main function
async function pushToGitHub() {
  console.log("Pushing current Replit code to GitHub...");

  // Setup Git config
  exec(`git config --global user.name "${GITHUB_NAME}"`);
  exec(`git config --global user.email "${GITHUB_EMAIL}"`);

  // Initialize Git if needed
  if (!fs.existsSync('.git')) {
    console.log("Initializing Git repository...");
    exec('git init');
  }

  // Create .gitignore if needed
  if (!fs.existsSync('.gitignore')) {
    console.log("Creating .gitignore...");
    const gitignoreContent = `
# Node modules
node_modules/

# Environment variables
.env
.env.local

# Build files
dist/
build/

# Logs
*.log
logs/
url_budget_logs/
Active_Url_Budget_Logs/

# Replit specific
.replit
.config/
.upm/
replit.nix
`;
    fs.writeFileSync('.gitignore', gitignoreContent);
  }

  // Setup remote
  try {
    exec('git remote -v');
  } catch (e) {
    // Add origin if it doesn't exist
    const tokenUrl = GITHUB_REPO.replace('https://', `https://${GITHUB_TOKEN}@`);
    exec(`git remote add origin ${tokenUrl}`);
  }

  // Add all files
  console.log("Adding all files...");
  exec('git add .');

  // Commit
  const message = process.argv[2] || "Update from Replit";
  console.log(`Committing with message: "${message}"...`);
  exec(`git commit -m "${message}"`);

  // Push to GitHub with force to override any conflicts
  console.log("Pushing to GitHub (force)...");
  exec('git push -f origin main');

  console.log("Successfully pushed to GitHub!");
}

pushToGitHub();