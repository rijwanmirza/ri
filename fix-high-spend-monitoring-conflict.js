/**
 * Fix High Spend Monitoring State Conflict
 * 
 * This script fixes the critical bug where multiple state monitors are running
 * simultaneously, causing HIGH SPEND campaigns to oscillate between states
 * even when they have sufficient remaining clicks.
 */

import fs from 'fs';
import path from 'path';

// Path to traffic generator file
const filePath = path.join(process.cwd(), 'server', 'traffic-generator-new.ts');

try {
  // Read the file
  console.log(`Reading traffic generator file: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Track changes
  let changesMade = false;
  
  // FIX 1: Prevent multiple monitors from running simultaneously by properly clearing intervals
  // This is the critical fix - ensure we're always clearing ALL monitoring processes before starting new ones
  
  // Find the function that starts a new monitoring process
  const startMonitorPattern = /(function startMinutelyStatusCheck.+?\) {[\s\S]+?)(\/\/ Set up a new interval that runs every minute)/;
  const startMonitorReplacement = 
`$1
  // CRITICAL FIX: Ensure we clear ALL types of monitoring before starting a new one
  // This prevents multiple monitors from running simultaneously and conflicting with each other
  
  // Clear any active status checks
  if (activeStatusChecks.has(campaignId)) {
    clearInterval(activeStatusChecks.get(campaignId));
    activeStatusChecks.delete(campaignId);
    console.log(\`🛑 Cleared existing ACTIVE monitor for campaign \${campaignId}\`);
  }
  
  // Clear any pause status checks
  if (pauseStatusChecks.has(campaignId)) {
    clearInterval(pauseStatusChecks.get(campaignId));
    pauseStatusChecks.delete(campaignId);
    console.log(\`🛑 Cleared existing PAUSE monitor for campaign \${campaignId}\`);
  }
  
  // Clear any empty URL checks
  if (emptyUrlStatusChecks.has(campaignId)) {
    clearInterval(emptyUrlStatusChecks.get(campaignId));
    emptyUrlStatusChecks.delete(campaignId);
    console.log(\`🛑 Cleared existing EMPTY URL monitor for campaign \${campaignId}\`);
  }
  
  console.log(\`🧹 All existing monitors cleared for campaign \${campaignId} before starting new ACTIVE monitor\`);
  
  $2`;
  
  if (startMonitorPattern.test(content)) {
    content = content.replace(startMonitorPattern, startMonitorReplacement);
    console.log('✅ Added monitoring cleanup to prevent multiple concurrent monitors');
    changesMade = true;
  } else {
    console.log('⚠️ Could not find start monitor pattern');
  }
  
  // FIX 2: Ensure HIGH SPEND campaigns respect their thresholds
  // Find the HIGH SPEND campaign handling code
  const highSpendPattern = /(console\.log\(`Campaign \${campaignId} has spent \$\${spentValue\.toFixed\(4\)} which is ≥ \$\${THRESHOLD\.toFixed\(2\)} \(HIGH SPEND threshold\)`\);)([\s\S]+?)(\/\/ If we're transitioning from high spend to low spend, ensure we clear any high spend state)/;
  const highSpendReplacement = 
`$1
    
    // Get campaign current state to determine the right action
    const campaignResult = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    const campaignSettings = campaignResult[0];
    const currentState = campaignSettings?.lastTrafficSenderStatus || 'unknown';
    console.log(\`Current campaign state for HIGH SPEND campaign: \${currentState}\`);
    
    // HIGH SPEND CRITICAL FIX: Ensure we're taking the right action based on current state and remaining clicks
    // Get the total remaining clicks for this campaign to decide the correct state
    const campaignWithUrls = await db.query.campaigns.findFirst({
      where: (c, { eq }) => eq(c.id, campaignId),
      with: { 
        urls: {
          where: (urls, { eq }) => eq(urls.status, 'active')
        } 
      }
    });
    
    if (campaignWithUrls && campaignWithUrls.urls && campaignWithUrls.urls.length > 0) {
      // Calculate total remaining clicks
      let totalRemainingClicks = 0;
      for (const url of campaignWithUrls.urls) {
        const remainingClicks = url.clickLimit - url.clicks;
        const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
        totalRemainingClicks += validRemaining;
      }
      
      console.log(\`HIGH SPEND campaign \${campaignId} has \${totalRemainingClicks} remaining clicks\`);
      
      // Get the HIGH SPEND thresholds
      const HIGH_SPEND_PAUSE_THRESHOLD = campaignSettings?.highSpendPauseThreshold || 1000;
      const HIGH_SPEND_ACTIVATE_THRESHOLD = campaignSettings?.highSpendActivateThreshold || 5000;
      console.log(\`HIGH SPEND thresholds: Pause at \${HIGH_SPEND_PAUSE_THRESHOLD}, Activate at \${HIGH_SPEND_ACTIVATE_THRESHOLD}\`);
      
      // If we have enough remaining clicks and not in a high spend state already, transition directly
      if (totalRemainingClicks >= HIGH_SPEND_ACTIVATE_THRESHOLD && 
          !['high_spend', 'high_spend_budget_updated'].includes(currentState)) {
        
        console.log(\`🔄 HIGH SPEND FIX: Campaign \${campaignId} has \${totalRemainingClicks} remaining clicks which is >= \${HIGH_SPEND_ACTIVATE_THRESHOLD} (HIGH SPEND activate threshold)\`);
        console.log(\`🔄 Directly transitioning to high_spend state and activating campaign\`);
        
        // Update campaign state
        await db.update(campaigns)
          .set({
            lastTrafficSenderStatus: 'high_spend',
            lastTrafficSenderAction: new Date(),
            updatedAt: new Date()
          })
          .where(eq(campaigns.id, campaignId));
        
        // Activate the campaign if needed
        const status = await getTrafficStarCampaignStatus(trafficstarCampaignId);
        if (status !== 'active') {
          // Set end time to today at 23:59 UTC
          const today = new Date();
          const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
          const endTimeStr = \`\${formattedDate} 23:59:00\`;
          
          // Update end time
          await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), endTimeStr);
          
          // Activate the campaign
          await trafficStarService.activateCampaign(Number(trafficstarCampaignId));
          console.log(\`✅ HIGH SPEND FIX: Activated campaign \${trafficstarCampaignId} directly based on remaining clicks\`);
        }
        
        // Start the right monitoring process
        startMinutelyStatusCheck(campaignId, trafficstarCampaignId);
        
        // Exit early - we've handled this case
        return;
      }
      // If we're below the pause threshold, make sure we pause
      else if (totalRemainingClicks < HIGH_SPEND_PAUSE_THRESHOLD && 
               ['high_spend', 'high_spend_budget_updated'].includes(currentState)) {
        
        console.log(\`🔄 HIGH SPEND FIX: Campaign \${campaignId} has \${totalRemainingClicks} remaining clicks which is < \${HIGH_SPEND_PAUSE_THRESHOLD} (HIGH SPEND pause threshold)\`);
        console.log(\`🔄 Need to ensure campaign is paused\`);
        
        // Check if it's already paused
        const status = await getTrafficStarCampaignStatus(trafficstarCampaignId);
        if (status === 'active') {
          // Pause the campaign
          await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
          console.log(\`✅ HIGH SPEND FIX: Paused campaign \${trafficstarCampaignId} based on low remaining clicks\`);
          
          // Update the state
          await db.update(campaigns)
            .set({
              lastTrafficSenderStatus: 'high_spend_paused_low_clicks',
              lastTrafficSenderAction: new Date(),
              updatedAt: new Date()
            })
            .where(eq(campaigns.id, campaignId));
        }
        
        // Start pause monitoring
        startMinutelyPauseStatusCheck(campaignId, trafficstarCampaignId);
        
        // Exit early - we've handled this case
        return;
      }
    }
$3`;
  
  if (highSpendPattern.test(content)) {
    content = content.replace(highSpendPattern, highSpendReplacement);
    console.log('✅ Added HIGH SPEND threshold enforcement to prevent state conflicts');
    changesMade = true;
  } else {
    console.log('⚠️ Could not find high spend pattern');
  }
  
  // FIX 3: Make state transitions explicit by improving the handleCampaignBySpentValue function
  const campaignStatePattern = /(\/\/ Handle campaign based on spent value threshold after pause[\s\S]+?export async function handleCampaignBySpentValue.+?{)([\s\S]+?)(}\s+\/\*\*)/;
  const campaignStateReplacement = 
`$1
  try {
    const THRESHOLD = 10.0; // $10 threshold for different handling
    
    // Get campaign settings to get custom threshold values and current state
    const campaignResult = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    const campaignSettings = campaignResult[0];
    
    // Store current campaign status for state transition checks
    const currentCampaignStatus = campaignSettings?.lastTrafficSenderStatus || 'unknown';
    
    console.log(\`SPENT VALUE HANDLER: Campaign \${campaignId} current state: \${currentCampaignStatus}\`);
    
    // Always get the real spent value each time this function is called - don't rely on cached values
    if (spentValue >= THRESHOLD) {
      console.log(\`Campaign \${campaignId} has spent $\${spentValue.toFixed(4)} which is ≥ $\${THRESHOLD.toFixed(2)} (HIGH SPEND threshold)\`);
      
      // CRITICAL FIX: Get remaining clicks to make proper decision
      const campaignWithUrls = await db.query.campaigns.findFirst({
        where: (c, { eq }) => eq(c.id, campaignId),
        with: { 
          urls: {
            where: (urls, { eq }) => eq(urls.status, 'active')
          } 
        }
      });
      
      if (campaignWithUrls && campaignWithUrls.urls && campaignWithUrls.urls.length > 0) {
        // Calculate total remaining clicks
        let totalRemainingClicks = 0;
        for (const url of campaignWithUrls.urls) {
          const remainingClicks = url.clickLimit - url.clicks;
          const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
          totalRemainingClicks += validRemaining;
        }
        
        console.log(\`SPENT VALUE HANDLER: Campaign \${campaignId} has \${totalRemainingClicks} remaining clicks\`);
        
        // Get the HIGH SPEND thresholds
        const HIGH_SPEND_PAUSE_THRESHOLD = campaignSettings?.highSpendPauseThreshold || 1000;
        const HIGH_SPEND_ACTIVATE_THRESHOLD = campaignSettings?.highSpendActivateThreshold || 5000;
        
        // If transitioning from low spend to high spend, check clicks first
        if (['low_spend', 'auto_reactivated_low_spend', 'auto_paused_low_clicks'].includes(currentCampaignStatus)) {
          console.log(\`Campaign \${campaignId} is transitioning from \${currentCampaignStatus} to high spend state\`);
          
          // Check remaining clicks to determine proper high spend state
          if (totalRemainingClicks >= HIGH_SPEND_ACTIVATE_THRESHOLD) {
            // Has enough remaining clicks to be active in high spend mode
            console.log(\`SPENT VALUE HANDLER: Campaign has \${totalRemainingClicks} remaining clicks (>= \${HIGH_SPEND_ACTIVATE_THRESHOLD}), transitioning to high_spend state\`);
            
            // Force update to high_spend state
            await db.update(campaigns)
              .set({
                lastTrafficSenderStatus: 'high_spend',
                lastTrafficSenderAction: new Date(),
                updatedAt: new Date()
              })
              .where(eq(campaigns.id, campaignId));
              
            console.log(\`✅ Transitioned campaign \${campaignId} directly to 'high_spend' state based on remaining clicks\`);
            
            // Make sure campaign is active
            const status = await getTrafficStarCampaignStatus(trafficstarCampaignId);
            if (status !== 'active') {
              // Set end time to today at 23:59 UTC
              const today = new Date();
              const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
              const endTimeStr = \`\${formattedDate} 23:59:00\`;
              
              // Update end time
              await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), endTimeStr);
              
              // Activate the campaign
              await trafficStarService.activateCampaign(Number(trafficstarCampaignId));
              console.log(\`✅ SPENT VALUE HANDLER: Activated campaign \${trafficstarCampaignId} directly based on remaining clicks\`);
            }
            
            // Start the proper monitoring
            startMinutelyStatusCheck(campaignId, trafficstarCampaignId);
            
            return; // Exit early - we've handled this case
          } else if (totalRemainingClicks < HIGH_SPEND_PAUSE_THRESHOLD) {
            // Not enough remaining clicks, should be paused in high spend mode
            console.log(\`SPENT VALUE HANDLER: Campaign has \${totalRemainingClicks} remaining clicks (< \${HIGH_SPEND_PAUSE_THRESHOLD}), transitioning to high_spend_paused_low_clicks state\`);
            
            // Force update to paused state
            await db.update(campaigns)
              .set({
                lastTrafficSenderStatus: 'high_spend_paused_low_clicks',
                lastTrafficSenderAction: new Date(),
                updatedAt: new Date()
              })
              .where(eq(campaigns.id, campaignId));
              
            console.log(\`✅ Transitioned campaign \${campaignId} to 'high_spend_paused_low_clicks' state based on low remaining clicks\`);
            
            // Make sure campaign is paused
            const status = await getTrafficStarCampaignStatus(trafficstarCampaignId);
            if (status === 'active') {
              // Pause the campaign
              await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
              console.log(\`✅ SPENT VALUE HANDLER: Paused campaign \${trafficstarCampaignId} based on low remaining clicks\`);
            }
            
            // Start pause monitoring
            startMinutelyPauseStatusCheck(campaignId, trafficstarCampaignId);
            
            return; // Exit early - we've handled this case
          } else {
            // In the middle - transition to waiting state
            console.log(\`SPENT VALUE HANDLER: Campaign has \${totalRemainingClicks} remaining clicks (between thresholds), transitioning to high_spend_waiting state\`);
            
            // Force update to waiting state
            await db.update(campaigns)
              .set({
                lastTrafficSenderStatus: 'high_spend_waiting',
                lastTrafficSenderAction: new Date(),
                updatedAt: new Date()
              })
              .where(eq(campaigns.id, campaignId));
          }
        }
      }
    } else {
      console.log(\`Campaign \${campaignId} has spent $\${spentValue.toFixed(4)} which is < $\${THRESHOLD.toFixed(2)} (LOW SPEND threshold)\`);
      
      // If we're transitioning from high spend to low spend, ensure we clear any high spend state
      if (currentCampaignStatus === 'high_spend' || 
          currentCampaignStatus === 'high_spend_waiting' || 
          currentCampaignStatus === 'high_spend_budget_updated' ||
          currentCampaignStatus === 'high_spend_paused_low_clicks') {
        console.log(\`Campaign \${campaignId} is transitioning from \${currentCampaignStatus} to low spend state - forcing proper state transition\`);
        
        // Force update to low_spend state to reset the process
        await db.update(campaigns)
          .set({
            lastTrafficSenderStatus: 'low_spend',
            lastTrafficSenderAction: new Date(),
            updatedAt: new Date()
          })
          .where(eq(campaigns.id, campaignId));
          
        console.log(\`✅ Reset campaign \${campaignId} state from \${currentCampaignStatus} to 'low_spend' due to spent value change\`);
      }
    }
  } catch (error) {
    console.error(\`Error in handleCampaignBySpentValue for campaign \${campaignId}:\`, error);
  }
$3`;
  
  if (campaignStatePattern.test(content)) {
    content = content.replace(campaignStatePattern, campaignStateReplacement);
    console.log('✅ Improved handleCampaignBySpentValue function to prevent state conflicts');
    changesMade = true;
  } else {
    console.log('⚠️ Could not find campaign state pattern');
  }
  
  // Save the modified file if changes were made
  if (changesMade) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Successfully updated ${filePath} with HIGH SPEND monitoring fixes`);
    console.log('Restart the application to apply changes');
  } else {
    console.log('No changes were made to the file');
  }
} catch (error) {
  console.error(`Error fixing HIGH SPEND monitoring bug: ${error.message}`);
}