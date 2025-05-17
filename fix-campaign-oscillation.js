/**
 * Fix for Campaign Oscillation Issue
 * 
 * This script fixes the bug causing campaigns to oscillate between active and paused states
 * by improving the hysteresis logic and ensuring we properly respect the threshold settings.
 */

import { db } from './server/db.js';
import { campaigns } from './shared/schema.js';
import { eq } from 'drizzle-orm/sql';

async function main() {
  try {
    console.log('Starting campaign oscillation fix script');
    
    // Get campaign ID from command line args
    const args = process.argv.slice(2);
    const campaignId = args[0] ? parseInt(args[0]) : 1; // Default to campaign ID 1
    
    console.log(`Fixing oscillation for campaign ID: ${campaignId}`);
    
    // Get campaign settings
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
    
    if (!campaign) {
      console.error(`Campaign ID ${campaignId} not found`);
      process.exit(1);
    }
    
    console.log(`Found campaign: ${campaign.name}`);
    console.log(`Current state: ${campaign.lastTrafficSenderStatus}`);
    console.log(`Spent value: $${campaign.dailySpent || '0.00'}`);
    
    // Get current threshold settings
    const lowSpendPauseThreshold = campaign.minPauseClickThreshold || 5000;
    const lowSpendActivateThreshold = campaign.minActivateClickThreshold || 15000;
    const highSpendPauseThreshold = campaign.highSpendPauseThreshold || 1000;
    const highSpendActivateThreshold = campaign.highSpendActivateThreshold || 5000;
    
    console.log('Current threshold settings:');
    console.log(`- LOW SPEND - Pause at ${lowSpendPauseThreshold}, Activate at ${lowSpendActivateThreshold}`);
    console.log(`- HIGH SPEND - Pause at ${highSpendPauseThreshold}, Activate at ${highSpendActivateThreshold}`);
    
    // Validate threshold settings
    validateThresholds(
      campaignId, 
      lowSpendPauseThreshold, 
      lowSpendActivateThreshold, 
      highSpendPauseThreshold, 
      highSpendActivateThreshold
    );
    
    // Update the campaign state to prevent oscillation
    console.log('Resetting campaign state to force proper state transition');
    
    // Determine correct state based on spent value
    const spentValue = campaign.dailySpent ? parseFloat(campaign.dailySpent) : 0;
    const isHighSpend = spentValue >= 10.0;
    
    // Set appropriate state
    let newState;
    if (isHighSpend) {
      newState = 'high_spend_waiting';
      console.log(`Setting campaign to 'high_spend_waiting' state due to high spend value ($${spentValue.toFixed(2)} >= $10.00)`);
    } else {
      newState = 'low_spend';
      console.log(`Setting campaign to 'low_spend' state due to low spend value ($${spentValue.toFixed(2)} < $10.00)`);
    }
    
    // Update the state
    await db.update(campaigns)
      .set({
        lastTrafficSenderStatus: newState,
        lastTrafficSenderAction: new Date(),
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, campaignId));
    
    console.log(`✅ Successfully reset campaign ${campaignId} state to '${newState}'`);
    console.log('Campaign oscillation fix completed successfully');
  } catch (error) {
    console.error('Error in campaign oscillation fix script:', error);
  } finally {
    process.exit(0);
  }
}

/**
 * Validate threshold settings and update if needed
 */
function validateThresholds(
  campaignId, 
  lowSpendPauseThreshold, 
  lowSpendActivateThreshold, 
  highSpendPauseThreshold, 
  highSpendActivateThreshold
) {
  let needsUpdate = false;
  const updates = {};
  
  // Ensure LOW SPEND activate threshold is higher than pause threshold
  if (lowSpendActivateThreshold <= lowSpendPauseThreshold) {
    const newActivateThreshold = lowSpendPauseThreshold + Math.ceil(lowSpendPauseThreshold * 0.15); // 15% higher
    console.log(`⚠️ LOW SPEND activate threshold (${lowSpendActivateThreshold}) must be higher than pause threshold (${lowSpendPauseThreshold})`);
    console.log(`Adjusting LOW SPEND activate threshold to ${newActivateThreshold}`);
    
    updates.minActivateClickThreshold = newActivateThreshold;
    needsUpdate = true;
  }
  
  // Ensure HIGH SPEND activate threshold is higher than pause threshold
  if (highSpendActivateThreshold <= highSpendPauseThreshold) {
    const newActivateThreshold = highSpendPauseThreshold + Math.ceil(highSpendPauseThreshold * 0.15); // 15% higher
    console.log(`⚠️ HIGH SPEND activate threshold (${highSpendActivateThreshold}) must be higher than pause threshold (${highSpendPauseThreshold})`);
    console.log(`Adjusting HIGH SPEND activate threshold to ${newActivateThreshold}`);
    
    updates.highSpendActivateThreshold = newActivateThreshold;
    needsUpdate = true;
  }
  
  // Update the database if needed
  if (needsUpdate) {
    console.log('Updating campaign thresholds to prevent oscillation...');
    db.update(campaigns)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, campaignId))
      .then(() => {
        console.log('✅ Successfully updated campaign thresholds');
      })
      .catch(error => {
        console.error('❌ Error updating campaign thresholds:', error);
      });
  } else {
    console.log('✅ Threshold settings are valid');
  }
}

// Run the main function
main();