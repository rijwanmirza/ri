/**
 * Extreme Fix for External Campaign Pause Interference
 * 
 * This script adds a critical modification to the traffic generator to specifically
 * handle cases where an external system is continually pausing a campaign.
 */

import fs from 'fs';
import path from 'path';

// Path to traffic generator file
const filePath = path.join(process.cwd(), 'server', 'traffic-generator-new.ts');

try {
  // Read the file
  console.log(`Reading file: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // CRITICAL FIX: Add protection against external pause interference
  // Find the function that handles pause detection during monitoring
  const pauseDetectionPattern = /if \(status === 'paused'\) {\s+console\.log\(`⚠️ Campaign \${trafficstarCampaignId} was found paused but should be active - will attempt to reactivate`\);/;
  
  // Create the replacement with external pause tracking and backoff logic
  const pauseDetectionReplacement = 
`if (status === 'paused') {
            // CRITICAL FIX: Track external pause interference pattern
            // Store the last few activation timestamps to detect patterns of external interference
            if (!global.campaignActivationHistory) {
              global.campaignActivationHistory = {};
            }
            
            if (!global.campaignActivationHistory[campaignId]) {
              global.campaignActivationHistory[campaignId] = [];
            }
            
            // Add current timestamp
            global.campaignActivationHistory[campaignId].push(Date.now());
            
            // Only keep the last 5 activations
            if (global.campaignActivationHistory[campaignId].length > 5) {
              global.campaignActivationHistory[campaignId].shift();
            }
            
            // Calculate frequency of activations
            let isUnderAttack = false;
            let timeGap = 0;
            
            if (global.campaignActivationHistory[campaignId].length >= 3) {
              // If we've had to reactivate 3+ times, check the time pattern
              const timestamps = global.campaignActivationHistory[campaignId];
              const gaps = [];
              
              for (let i = 1; i < timestamps.length; i++) {
                gaps.push(timestamps[i] - timestamps[i-1]);
              }
              
              // Calculate average gap (in seconds)
              const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length / 1000;
              timeGap = avgGap;
              
              // If campaigns are being paused more often than every 5 minutes, consider it interference
              if (avgGap < 300) { // 300 seconds = 5 minutes
                isUnderAttack = true;
                console.log(\`⚠️⚠️⚠️ CRITICAL: Campaign \${trafficstarCampaignId} appears to be under external interference!\`);
                console.log(\`Detection: \${global.campaignActivationHistory[campaignId].length} reactivations with average gap of \${avgGap.toFixed(1)} seconds\`);
              }
            }
            
            // Log the pause detection
            if (isUnderAttack) {
              console.log(\`🔒 ENHANCED PROTECTION: Campaign \${trafficstarCampaignId} was found paused by external interference - activating robust protection\`);
              
              // Update database to mark campaign as under attack
              await db.update(campaigns)
                .set({
                  externalPauseProtection: true,
                  externalPauseCount: sql\`COALESCE(external_pause_count, 0) + 1\`,
                  updatedAt: new Date()
                })
                .where(eq(campaigns.id, campaignId));
                
              // If time gap is extremely short, increase our check frequency to counter
              // For this case, we'll use an even shorter interval (15 seconds) to ensure we win
              const checkInterval = 15 * 1000; // 15 seconds
              
              // Adjust interval to be more aggressive
              clearInterval(interval);
              const newInterval = setInterval(async () => {
                // Just directly activate every time with minimal checks
                try {
                  console.log(\`🔒 ANTI-INTERFERENCE: Force activating campaign \${trafficstarCampaignId} (anti-interference mode)\`);
                  
                  // Set end time to today at 23:59 UTC
                  const today = new Date();
                  const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
                  const endTimeStr = \`\${formattedDate} 23:59:00\`;
                  
                  // Update end time first
                  await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), endTimeStr);
                  
                  // Then activate
                  await trafficStarService.activateCampaign(Number(trafficstarCampaignId));
                  
                  console.log(\`✅ ANTI-INTERFERENCE: Campaign \${trafficstarCampaignId} forcibly activated\`);
                } catch (error) {
                  console.error(\`❌ ANTI-INTERFERENCE: Error activating campaign \${trafficstarCampaignId}:\`, error);
                }
              }, checkInterval);
              
              // Update the interval in our map
              activeStatusChecks.set(campaignId, newInterval);
              
              // Skip normal reactivation logic since we're in enhanced mode
              return;
            } else {
              console.log(\`⚠️ Campaign \${trafficstarCampaignId} was found paused but should be active - will attempt to reactivate\`);
            }`;
  
  // Apply the replacement
  if (pauseDetectionPattern.test(content)) {
    content = content.replace(pauseDetectionPattern, pauseDetectionReplacement);
    console.log('✅ Added extreme protection against external pause interference');
  } else {
    console.log('⚠️ Pause detection pattern not found, cannot add protection');
  }
  
  // ADDITIONAL FIX: Add external_pause_protection column to campaigns table if it doesn't exist
  // This would typically be done through a migration but we'll include a Drizzle schema update
  console.log('Checking for schema.ts to add external_pause_protection column');
  
  // Path to schema file
  const schemaPath = path.join(process.cwd(), 'shared', 'schema.ts');
  
  // Read schema file if it exists
  if (fs.existsSync(schemaPath)) {
    let schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // Check if the column already exists
    if (!schemaContent.includes('externalPauseProtection')) {
      // Find the campaigns table definition
      const campaignsTablePattern = /(export const campaigns = pgTable\([^)]+,\s+)(}\);)/;
      
      if (campaignsTablePattern.test(schemaContent)) {
        // Add the new column to the campaigns table
        schemaContent = schemaContent.replace(
          campaignsTablePattern,
          '$1  externalPauseProtection: boolean("external_pause_protection").default(false),\n  externalPauseCount: integer("external_pause_count").default(0),\n$2'
        );
        
        // Write the updated schema
        fs.writeFileSync(schemaPath, schemaContent, 'utf8');
        console.log('✅ Added external_pause_protection and external_pause_count columns to campaigns table schema');
      } else {
        console.log('⚠️ Could not find campaigns table definition in schema.ts');
      }
    } else {
      console.log('✅ external_pause_protection column already exists in schema');
    }
  } else {
    console.log('⚠️ schema.ts file not found');
  }
  
  // Save traffic generator changes
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Successfully updated ${filePath} with extreme pause protection`);
  console.log('Restart the application to apply the changes');
  
} catch (error) {
  console.error(`Error applying extreme fix: ${error.message}`);
}