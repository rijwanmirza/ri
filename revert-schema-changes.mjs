#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Files to restore from backups
const filesToRestore = [
  {
    path: path.join(__dirname, 'shared', 'schema.ts'),
    backupPattern: /schema\.ts\.bak.*/
  },
  {
    path: path.join(__dirname, 'server', 'url-budget-logger.ts'),
    backupPattern: /url-budget-logger\.ts\.bak.*/
  },
  {
    path: path.join(__dirname, 'server', 'traffic-generator.ts'),
    backupPattern: /traffic-generator\.ts\.bak.*/
  },
  {
    path: path.join(__dirname, 'server', 'traffic-generator-new.ts'),
    backupPattern: /traffic-generator-new\.ts\.bak.*/
  },
  {
    path: path.join(__dirname, 'server', 'scheduled-budget-updater.ts'),
    backupPattern: /scheduled-budget-updater\.ts\.bak.*/
  }
];
// Revert function
async function revertChanges() {
  console.log('Starting reversion of schema changes...');
  
  // Get all files in the directories
  for (const fileInfo of filesToRestore) {
    const dir = path.dirname(fileInfo.path);
    
    try {
      // Find matching backup file
      const files = fs.readdirSync(dir);
      const backupFile = files.find(file => fileInfo.backupPattern.test(file));
      
      if (backupFile) {
        const backupPath = path.join(dir, backupFile);
        console.log(`Restoring ${fileInfo.path} from ${backupPath}`);
        
        // Copy backup file to original
        fs.copyFileSync(backupPath, fileInfo.path);
        console.log(`Successfully restored ${fileInfo.path}`);
      } else {
        console.log(`No backup found for ${fileInfo.path}`);
      }
    } catch (error) {
      console.error(`Error restoring ${fileInfo.path}:`, error);
    }
  }
  
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
    console.log('Schema changes have been reverted successfully!');
  });
}
// Run the revert function
revertChanges().catch(console.error);
