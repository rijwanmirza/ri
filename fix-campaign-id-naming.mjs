#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Files to fix
const filesToFix = [
  path.join(__dirname, 'server', 'traffic-generator.ts'),
  path.join(__dirname, 'server', 'traffic-generator-new.ts'),
  path.join(__dirname, 'server', 'scheduled-budget-updater.ts')
];
// Fix function
async function fixFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File does not exist: ${filePath}`);
      return false;
    }
    
    // Backup the file
    const backupPath = `${filePath}.bak-${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`Backup created: ${backupPath}`);
    
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add helper function to normalize property access
    const helperFunction = `
// Helper function to get TrafficStar campaign ID regardless of property naming convention
function getTrafficStarId(campaign) {
  if (!campaign) return null;
  return campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id || null;
}
`;
    
    // Insert helper function after imports
    if (!content.includes('function getTrafficStarId')) {
      content = content.replace(
        /import.*?\n\n/s, 
        (match) => `${match}${helperFunction}\n`
      );
    }
    
    // Replace direct property access with helper function
    content = content.replace(
      /campaign\.trafficstarCampaignId/g,
      'getTrafficStarId(campaign)'
    );
    
    // Write back to file
    fs.writeFileSync(filePath, content);
    console.log(`Fixed file: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error fixing file ${filePath}:`, error);
    return false;
  }
}
// Main function
async function main() {
  console.log('Starting campaign ID naming fix...');
  
  let successCount = 0;
  for (const file of filesToFix) {
    const success = await fixFile(file);
    if (success) successCount++;
  }
  
  console.log(`Fixed ${successCount} out of ${filesToFix.length} files`);
  
  // Restart the application
  console.log('Restarting the application...');
  exec('pm2 restart url-tracker', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error restarting application: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Restart stderr: ${stderr}`);
      return;
    }
    console.log(`Application restarted: ${stdout}`);
    console.log('Fix complete! The application should now correctly handle TrafficStar campaign IDs.');
  });
}
// Run the script
main().catch(console.error);
