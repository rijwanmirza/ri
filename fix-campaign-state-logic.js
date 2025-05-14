/**
 * Campaign State Transition Fix
 * 
 * This script fixes the campaign state logic for proper transitions between
 * low_spend and high_spend states. It will:
 * 
 * 1. Check all campaigns
 * 2. For each campaign, get the latest spent value
 * 3. Verify that the campaign state matches the spent value
 * 4. Force transition if needed
 */

import { db } from './server/db.js';
import { campaigns } from './shared/schema.js';
import { trafficStarService } from './server/trafficstar-service.js';
import { eq } from 'drizzle-orm';

// Constants
const THRESHOLD = 10.0; // $10 threshold for different handling
const DEFAULT_WAIT_MINUTES = 4; // Default wait minutes for high spend processing

/**
 * Get TrafficStar campaign spent value
 */
async function getTrafficStarCampaignSpentValue(campaignId, trafficstarCampaignId) {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    console.log(`Fetching spent value for campaign ${trafficstarCampaignId} on ${formattedDate}`);
    
    // Try using the reports API
    try {
      const result = await trafficStarService.getCampaignSpentValue(Number(trafficstarCampaignId));
      
      if (result && typeof result.totalSpent === 'number') {
        console.log(`Campaign ${trafficstarCampaignId} spent value from reports API: $${result.totalSpent.toFixed(4)}`);
        return result.totalSpent;
      }
    } catch (error) {
      console.error(`Failed to get spent value from reports API for campaign ${trafficstarCampaignId}:`, error);
    }
    
    // Fallback: Try getting campaign data directly
    try {
      const campaignData = await trafficStarService.getCampaign(Number(trafficstarCampaignId));
      
      if (campaignData && typeof campaignData.spent === 'number') {
        console.log(`Campaign ${trafficstarCampaignId} spent value from campaign data: $${campaignData.spent.toFixed(4)}`);
        return campaignData.spent;
      } else if (campaignData && typeof campaignData.spent === 'string') {
        const numericValue = parseFloat(campaignData.spent.replace('$', ''));
        console.log(`Campaign ${trafficstarCampaignId} spent value from campaign data (string): $${numericValue.toFixed(4)}`);
        return numericValue;
      }
    } catch (error) {
      console.error(`Failed to get campaign data for campaign ${trafficstarCampaignId}:`, error);
    }
    
    // Try stored value in database
    try {
      const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
      
      if (campaign && campaign.dailySpent !== null && campaign.dailySpent !== undefined) {
        const storedSpent = parseFloat(campaign.dailySpent);
        console.log(`Campaign ${trafficstarCampaignId} using stored spent value: $${storedSpent.toFixed(4)}`);
        return storedSpent;
      }
    } catch (error) {
      console.error(`Failed to get stored spent value for campaign ${trafficstarCampaignId}:`, error);
    }
    
    console.log(`No spent data available for campaign ${trafficstarCampaignId} - using 0`);
    return 0;
  } catch (error) {
    console.error(`Error getting spent value for campaign ${trafficstarCampaignId}:`, error);
    return null;
  }
}

/**
 * Fix campaign state based on spent value
 */
async function fixCampaignState(campaign) {
  try {
    const campaignId = campaign.id;
    const trafficstarCampaignId = campaign.trafficstarCampaignId;
    const currentState = campaign.lastTrafficSenderStatus || 'unknown';
    
    console.log(`\n==== Processing Campaign ${campaignId} (${campaign.name}) ====`);
    console.log(`Current state: ${currentState}`);
    
    // Skip if no TrafficStar campaign ID
    if (!trafficstarCampaignId) {
      console.log(`Campaign ${campaignId} has no TrafficStar ID - skipping`);
      return;
    }
    
    // Get current spent value
    const spentValue = await getTrafficStarCampaignSpentValue(campaignId, trafficstarCampaignId);
    
    if (spentValue === null) {
      console.error(`Failed to get spent value for campaign ${campaignId} - skipping`);
      return;
    }
    
    console.log(`Campaign ${campaignId} current spent value: $${spentValue.toFixed(4)}`);
    
    // Determine correct state based on spent value
    let correctState;
    if (spentValue >= THRESHOLD) {
      // High spend logic
      console.log(`Campaign ${campaignId} has spent $${spentValue.toFixed(4)} which is ≥ $${THRESHOLD.toFixed(2)} (HIGH SPEND threshold)`);
      
      if (currentState === 'low_spend' || 
          currentState === 'auto_reactivated_low_spend' || 
          currentState === 'auto_paused_low_clicks' ||
          currentState === 'unknown') {
        // Should be transitioning to high spend
        correctState = 'high_spend_waiting';
        console.log(`Campaign ${campaignId} should be in 'high_spend_waiting' state`);
      } else if (currentState === 'high_spend') {
        // Should be transitioning to waiting
        correctState = 'high_spend_waiting';
        console.log(`Campaign ${campaignId} is in 'high_spend' state but should be in 'high_spend_waiting'`);
      } else {
        // Already in a high spend state
        console.log(`Campaign ${campaignId} is already in a high spend state: ${currentState}`);
        return;
      }
    } else {
      // Low spend logic
      console.log(`Campaign ${campaignId} has spent $${spentValue.toFixed(4)} which is < $${THRESHOLD.toFixed(2)} (LOW SPEND threshold)`);
      
      if (currentState === 'high_spend' || 
          currentState === 'high_spend_waiting' || 
          currentState === 'high_spend_budget_updated' ||
          currentState === 'unknown') {
        // Should be transitioning to low spend
        correctState = 'low_spend';
        console.log(`Campaign ${campaignId} should be in 'low_spend' state`);
      } else {
        // Already in a low spend state
        console.log(`Campaign ${campaignId} is already in a low spend state: ${currentState}`);
        return;
      }
    }
    
    // Force update state if needed
    if (correctState && correctState !== currentState) {
      console.log(`Fixing campaign ${campaignId} state from '${currentState}' to '${correctState}'`);
      
      try {
        // Update the campaign status in the database
        await db.update(campaigns)
          .set({
            lastTrafficSenderStatus: correctState,
            lastTrafficSenderAction: new Date(),
            updatedAt: new Date(),
            dailySpent: spentValue.toString()
          })
          .where(eq(campaigns.id, campaignId));
        
        console.log(`✅ Successfully fixed campaign ${campaignId} state from '${currentState}' to '${correctState}'`);
        
        // If transitioning to high_spend_waiting, ensure TrafficStar campaign is paused
        if (correctState === 'high_spend_waiting') {
          const trafficstarStatus = await trafficStarService.getCampaignStatus(Number(trafficstarCampaignId));
          
          if (trafficstarStatus && trafficstarStatus.active) {
            // Pause the campaign
            console.log(`Pausing TrafficStar campaign ${trafficstarCampaignId} as part of transition to ${correctState}`);
            await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
            console.log(`✅ Paused TrafficStar campaign ${trafficstarCampaignId}`);
          } else {
            console.log(`TrafficStar campaign ${trafficstarCampaignId} is already paused`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to update campaign ${campaignId} state:`, error);
      }
    }
  } catch (error) {
    console.error(`Error fixing campaign ${campaign.id} state:`, error);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting campaign state fix script');
    
    // Get all campaigns
    const allCampaigns = await db.select().from(campaigns);
    console.log(`Found ${allCampaigns.length} campaigns`);
    
    // Process each campaign
    for (const campaign of allCampaigns) {
      await fixCampaignState(campaign);
    }
    
    console.log('\nFinished processing all campaigns');
  } catch (error) {
    console.error('Error in campaign state fix script:', error);
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Run the main function
main();