#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routesPath = path.join(__dirname, 'server', 'routes.ts');
async function fixRoutes() {
  console.log('Fixing routes.ts file...');
  
  try {
    // Read the current file
    const content = fs.readFileSync(routesPath, 'utf8');
    
    // Create a backup
    const backupPath = `${routesPath}.backup-${Date.now()}`;
    fs.writeFileSync(backupPath, content);
    console.log(`Created backup at ${backupPath}`);
    
    // Find the line causing the error by looking for migration check around line 3265
    const lines = content.split('\n');
    let foundLine = false;
    let updatedContent = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check if it's a raw SQL query that's trying to use Drizzle ORM methods
      if (line.includes('query.getSQL') || 
          (line.includes('execute') && line.includes('sql') && line.includes('migration'))) {
        
        console.log(`Found potentially problematic line: ${line}`);
        
        // Replace with a raw SQL query
        updatedContent += `    // Migration check using raw SQL instead of Drizzle ORM
    try {
      const { pool } = await import('./db');
      const migrationResult = await pool.query(\`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '_drizzle_migrations'
        )
      \`);
      
      const migrationTableExists = migrationResult.rows[0].exists;
      console.log(\`Migration table exists: \${migrationTableExists}\`);
    } catch (migrationError) {
      console.error('Failed to check migration status:', migrationError);
    }\n`;
        
        foundLine = true;
        // Skip the next few lines that are part of the problematic code
        let skipCount = 0;
        while (i + 1 < lines.length && 
              (lines[i + 1].includes('migration') || 
               lines[i + 1].includes('drizzle') || 
               lines[i + 1].trim() === ')' || 
               lines[i + 1].trim() === '}')) {
          i++;
          skipCount++;
        }
        console.log(`Skipped ${skipCount} related lines`);
      } else {
        updatedContent += line + '\n';
      }
    }
    
    if (foundLine) {
      // Write the updated file
      fs.writeFileSync(routesPath, updatedContent);
      console.log('Fixed routes.ts file');
    } else {
      console.log('Could not find the specific line causing the error. Looking for migration check...');
      
      // Try a more general approach - look for any migration check
      const migrationCheckRegex = /check.*migration|migration.*check/i;
      
      if (migrationCheckRegex.test(content)) {
        console.log('Found migration check section. Adding raw SQL implementation...');
        
        // Add raw SQL implementation at the top of the file after imports
        const updated = content.replace(
          /(import.*;\n\n)/s,
          `$1
// Database migration check using raw SQL
async function checkMigrationStatus() {
  try {
    const { pool } = await import('./db');
    const result = await pool.query(\`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_drizzle_migrations'
      )
    \`);
    
    return result.rows[0].exists;
  } catch (error) {
    console.error('Failed to check migration status:', error);
    return false;
  }
}
`
        );
        
        // Replace any migration checks with this function
        const fixedContent = updated.replace(
          /db\.execute\(sql\`[\s\S]*?_drizzle_migrations[\s\S]*?\`\)/g,
          'checkMigrationStatus()'
        );
        
        fs.writeFileSync(routesPath, fixedContent);
        console.log('Added migration check function using raw SQL');
      } else {
        console.log('Could not find migration check section. Manual inspection needed.');
      }
    }
    
    // Restart the application
    console.log('Restarting the application...');
    exec('pm2 restart url-tracker', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error restarting application: ${error.message}`);
        return;
      }
      
      console.log(`Application restarted: ${stdout}`);
      console.log('Routes file has been fixed!');
    });
  } catch (error) {
    console.error('Error fixing routes file:', error);
  }
}
// Run the function
fixRoutes().catch(console.error);
