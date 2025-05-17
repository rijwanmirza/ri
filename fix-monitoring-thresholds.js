/**
 * Campaign Monitoring Thresholds Fix
 * 
 * This script directly modifies the traffic generator code to fix oscillation issues
 * by ensuring there's proper hysteresis between pause and activate thresholds.
 */

import fs from 'fs';
import path from 'path';

// Path to traffic generator file
const filePath = path.join(process.cwd(), 'server', 'traffic-generator-new.ts');

try {
  // Read the file
  console.log(`Reading file: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Track if we made changes
  let changesMade = false;
  
  // 1. First fix: Add hysteresis buffer in active monitoring
  const activeMonitoringPattern = /\/\/ Only pause if clearly below the minimum threshold to avoid oscillation\s+if \(totalRemainingClicks < MINIMUM_CLICKS_THRESHOLD\) {/;
  const activeMonitoringReplacement = 
`// Add hysteresis buffer to prevent oscillation
          // Only pause if remaining clicks are well below the minimum threshold
          // Use a 10% buffer below the minimum threshold to prevent frequent state changes
          const PAUSE_BUFFER = Math.floor(MINIMUM_CLICKS_THRESHOLD * 0.9); // 10% below minimum threshold
          
          if (totalRemainingClicks < PAUSE_BUFFER) {`;
  
  if (activeMonitoringPattern.test(content)) {
    content = content.replace(activeMonitoringPattern, activeMonitoringReplacement);
    console.log('✅ Fixed active monitoring hysteresis');
    changesMade = true;
  } else {
    console.log('⚠️ Active monitoring pattern not found or already fixed');
  }
  
  // 2. Second fix: Ensure thresholds have sufficient gap
  const ensureThresholdsPattern = /(if \(currentSpent >= THRESHOLD\) {\s+)(\s+\/\/ HIGH SPEND: use high spend thresholds\s+MINIMUM_CLICKS_THRESHOLD = campaignSettings\?.highSpendPauseThreshold \|\| 1000; \/\/ High spend threshold for pausing\s+MAXIMUM_CLICKS_THRESHOLD = campaignSettings\?.highSpendActivateThreshold \|\| 5000; \/\/ High spend threshold for activation)/;
  const ensureThresholdsReplacement = 
`$1            // HIGH SPEND: use high spend thresholds
            MINIMUM_CLICKS_THRESHOLD = campaignSettings?.highSpendPauseThreshold || 1000; // High spend threshold for pausing
            MAXIMUM_CLICKS_THRESHOLD = campaignSettings?.highSpendActivateThreshold || 5000; // High spend threshold for activation
            
            // Ensure sufficient gap between thresholds (at least 15%)
            if (MAXIMUM_CLICKS_THRESHOLD <= MINIMUM_CLICKS_THRESHOLD * 1.15) {
              // Thresholds are too close - create a proper gap
              console.log(\`⚠️ WARNING: HIGH SPEND thresholds are too close together! Pause: \${MINIMUM_CLICKS_THRESHOLD}, Activate: \${MAXIMUM_CLICKS_THRESHOLD}\`);
              MAXIMUM_CLICKS_THRESHOLD = Math.max(MAXIMUM_CLICKS_THRESHOLD, Math.ceil(MINIMUM_CLICKS_THRESHOLD * 1.15));
              console.log(\`⚠️ Adjusted HIGH SPEND activate threshold to \${MAXIMUM_CLICKS_THRESHOLD} to prevent oscillation\`);
            }`;
  
  if (ensureThresholdsPattern.test(content)) {
    content = content.replace(ensureThresholdsPattern, ensureThresholdsReplacement);
    console.log('✅ Fixed high spend threshold gap check');
    changesMade = true;
  } else {
    console.log('⚠️ High spend threshold pattern not found or already fixed');
  }
  
  // 3. Third fix: Ensure LOW SPEND thresholds have sufficient gap
  const ensureLowThresholdsPattern = /(} else {\s+)(\s+\/\/ LOW SPEND: use regular thresholds\s+MINIMUM_CLICKS_THRESHOLD = campaignSettings\?.minPauseClickThreshold \|\| 5000; \/\/ Low spend threshold for pausing\s+MAXIMUM_CLICKS_THRESHOLD = campaignSettings\?.minActivateClickThreshold \|\| 15000; \/\/ Low spend threshold for activation)/;
  const ensureLowThresholdsReplacement = 
`$1            // LOW SPEND: use regular thresholds
            MINIMUM_CLICKS_THRESHOLD = campaignSettings?.minPauseClickThreshold || 5000; // Low spend threshold for pausing
            MAXIMUM_CLICKS_THRESHOLD = campaignSettings?.minActivateClickThreshold || 15000; // Low spend threshold for activation
            
            // Ensure sufficient gap between thresholds (at least 15%)
            if (MAXIMUM_CLICKS_THRESHOLD <= MINIMUM_CLICKS_THRESHOLD * 1.15) {
              // Thresholds are too close - create a proper gap
              console.log(\`⚠️ WARNING: LOW SPEND thresholds are too close together! Pause: \${MINIMUM_CLICKS_THRESHOLD}, Activate: \${MAXIMUM_CLICKS_THRESHOLD}\`);
              MAXIMUM_CLICKS_THRESHOLD = Math.max(MAXIMUM_CLICKS_THRESHOLD, Math.ceil(MINIMUM_CLICKS_THRESHOLD * 1.15));
              console.log(\`⚠️ Adjusted LOW SPEND activate threshold to \${MAXIMUM_CLICKS_THRESHOLD} to prevent oscillation\`);
            }`;
  
  if (ensureLowThresholdsPattern.test(content)) {
    content = content.replace(ensureLowThresholdsPattern, ensureLowThresholdsReplacement);
    console.log('✅ Fixed low spend threshold gap check');
    changesMade = true;
  } else {
    console.log('⚠️ Low spend threshold pattern not found or already fixed');
  }
  
  // Save the modified file if changes were made
  if (changesMade) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Successfully updated ${filePath} with threshold fixes`);
    console.log('Restart the application to apply changes');
  } else {
    console.log('No changes needed, file already contains fixes');
  }
} catch (error) {
  console.error(`Error updating traffic generator code: ${error.message}`);
}