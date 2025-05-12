/**
 * Traffic Generator Module
 * 
 * This module manages the traffic generator functionality,
 * which checks TrafficStar campaign status and manages campaigns
 * based on the traffic generator settings.
 */

import { trafficStarService } from './trafficstar-service';
import { db } from './db';
import { campaigns, urls, type Campaign, type Url } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { parseSpentValue } from './trafficstar-spent-helper';
import axios from 'axios';
import urlBudgetLogger from './url-budget-logger';

// Extended URL type with active status
interface UrlWithActiveStatus extends Url {
  isActive: boolean;
}

/**
 * Get TrafficStar campaign status - ALWAYS uses real-time data
 * @param trafficstarCampaignId The TrafficStar campaign ID
 * @returns The campaign status (active, paused, etc.) or null if error
 */
export async function getTrafficStarCampaignStatus(trafficstarCampaignId: string) {
  try {
    console.log(`TRAFFIC-GENERATOR: Getting REAL-TIME status for campaign ${trafficstarCampaignId}`);
    
    // Use trafficStarService to get campaign status - uses getCampaignStatus to ensure real-time data
    const status = await trafficStarService.getCampaignStatus(Number(trafficstarCampaignId));
    
    if (!status) {
      console.error(`Failed to get TrafficStar campaign ${trafficstarCampaignId} status`);
      return null;
    }
    
    // Get the campaign ID from our database to check its last activation time
    const campaign = await db.query.campaigns.findFirst({
      where: (c, { eq }) => eq(c.trafficstarCampaignId, trafficstarCampaignId)
    });
    
    // Return the campaign status (active or paused)
    console.log(`TRAFFIC-GENERATOR: TrafficStar campaign ${trafficstarCampaignId} REAL status is ${status.status}, active=${status.active}`);
    
    // Check for recent activation - if we activated this campaign in the last 5 minutes, 
    // consider it still active regardless of what TrafficStar reports
    if (campaign && campaign.lastTrafficSenderAction) {
      const timeSinceAction = new Date().getTime() - new Date(campaign.lastTrafficSenderAction).getTime();
      const campaignActions = recentActions.get(campaign.id);
      
      if (
        // Either the DB shows a recent activation (check for any activation status)
        (campaign.lastTrafficSenderStatus && 
         (campaign.lastTrafficSenderStatus.includes('reactivated') || 
          campaign.lastTrafficSenderStatus.includes('activated')) && 
         timeSinceAction < ACTION_COOLDOWN_MS) ||
        // Or our in-memory tracker shows a recent activation
        (campaignActions && 
         campaignActions.lastActivation && 
         (new Date().getTime() - campaignActions.lastActivation.getTime() < ACTION_COOLDOWN_MS))
      ) {
        console.log(`⏱️ Campaign ${trafficstarCampaignId} was recently activated (${Math.floor(timeSinceAction / (1000 * 60))} minutes ago) - treating as ACTIVE despite API response`);
        return 'active';
      }
    }
    
    // Convert status object to string status for compatibility with existing code
    return status.active ? 'active' : 'paused';
  } catch (error) {
    console.error('Error getting TrafficStar campaign status:', error);
    return null;
  }
}

/**
 * Get current spent value for a TrafficStar campaign
 * @param campaignId The campaign ID in our system
 * @param trafficstarCampaignId The TrafficStar campaign ID
 * @returns The current spent value as a number, or null if error
 */
export async function getTrafficStarCampaignSpentValue(campaignId: number, trafficstarCampaignId: string): Promise<number | null> {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    console.log(`Fetching spent value for campaign ${trafficstarCampaignId} on ${formattedDate}`);
    
    // Try getting campaign data directly from API and use our helper to parse the value
    try {
      const campaignData = await trafficStarService.getCampaign(Number(trafficstarCampaignId));
      
      // Use our parseSpentValue helper to extract the spent value regardless of format
      const spentValue = parseSpentValue(campaignData);
      
      if (spentValue > 0) {
        console.log(`Campaign ${trafficstarCampaignId} spent value from campaign object helper: $${spentValue.toFixed(4)}`);
        
        // Update our database record
        await db.update(campaigns)
          .set({
            dailySpent: spentValue.toString(),
            dailySpentDate: new Date(formattedDate),
            lastSpentCheck: new Date(),
            updatedAt: new Date()
          })
          .where(eq(campaigns.id, campaignId));
        
        return spentValue;
      }
    } catch (helperError) {
      console.error(`Failed to get spent value using helper for campaign ${trafficstarCampaignId}:`, helperError);
    }
    
    // Fallback: Try getting campaign data directly from API
    try {
      const campaignData = await trafficStarService.getCampaign(Number(trafficstarCampaignId));
      
      if (campaignData && typeof campaignData.spent === 'number') {
        console.log(`Campaign ${trafficstarCampaignId} spent value from campaign data: $${campaignData.spent.toFixed(4)}`);
        
        // Update our database record
        await db.update(campaigns)
          .set({
            dailySpent: campaignData.spent.toString(),
            dailySpentDate: new Date(formattedDate),
            lastSpentCheck: new Date(),
            updatedAt: new Date()
          })
          .where(eq(campaigns.id, campaignId));
        
        return campaignData.spent;
      } else if (campaignData && typeof campaignData.spent === 'string') {
        const numericValue = parseFloat(campaignData.spent.replace('$', ''));
        console.log(`Campaign ${trafficstarCampaignId} spent value from campaign data (string): $${numericValue.toFixed(4)}`);
        
        // Update our database record
        await db.update(campaigns)
          .set({
            dailySpent: numericValue.toString(),
            dailySpentDate: new Date(formattedDate),
            lastSpentCheck: new Date(),
            updatedAt: new Date()
          })
          .where(eq(campaigns.id, campaignId));
        
        return numericValue;
      }
    } catch (campaignDataError) {
      console.error(`Failed to get campaign data for campaign ${trafficstarCampaignId}:`, campaignDataError);
    }
    
    // Fallback: Try using the spent value service
    try {
      const result = await trafficStarService.getCampaignSpentValue(Number(trafficstarCampaignId));
      
      if (result && typeof result.totalSpent === 'number') {
        console.log(`Campaign ${trafficstarCampaignId} direct API spent value: $${result.totalSpent.toFixed(4)}`);
        
        // Update our database record
        await db.update(campaigns)
          .set({
            dailySpent: result.totalSpent.toString(),
            dailySpentDate: new Date(formattedDate),
            lastSpentCheck: new Date(),
            updatedAt: new Date()
          })
          .where(eq(campaigns.id, campaignId));
        
        return result.totalSpent;
      }
    } catch (directApiError) {
      console.error(`Failed to get spent value directly from TrafficStar API:`, directApiError);
    }
    
    // Last resort: Get the stored value from our database
    try {
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId));
      
      if (campaign && campaign.dailySpent !== null && campaign.dailySpent !== undefined) {
        const storedSpent = parseFloat(campaign.dailySpent);
        console.log(`Campaign ${trafficstarCampaignId} using stored spent value: $${storedSpent.toFixed(4)}`);
        return storedSpent;
      }
    } catch (dbError) {
      console.error(`Failed to get stored spent value for campaign ${trafficstarCampaignId}:`, dbError);
    }
    
    // If we couldn't get the spent value using any method, we'll use a default value of 0
    // This is not a mock/fallback, but a real representation that we don't have spent data
    console.log(`No spent data available for campaign ${trafficstarCampaignId} - using 0`);
    
    // Update database to record that we checked but found no value
    await db.update(campaigns)
      .set({
        lastSpentCheck: new Date(),
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, campaignId));
    
    return 0;
  } catch (error) {
    console.error(`Error getting spent value for campaign ${trafficstarCampaignId}:`, error);
    return null;
  }
}

/**
 * Handle campaign based on spent value threshold after pause
 * @param campaignId The campaign ID in our system
 * @param trafficstarCampaignId The TrafficStar campaign ID
 * @param spentValue The current spent value of the campaign
 */
export async function handleCampaignBySpentValue(campaignId: number, trafficstarCampaignId: string, spentValue: number) {
  const THRESHOLD = 10.0; // $10 threshold for different handling
  
  // Get campaign settings to get custom threshold values
  const campaignResult = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  const campaignSettings = campaignResult[0];
  
  // Use campaign-specific thresholds if available
  const MINIMUM_CLICKS_THRESHOLD = campaignSettings?.minPauseClickThreshold || 5000; // Custom threshold for pausing
  const REMAINING_CLICKS_THRESHOLD = campaignSettings?.minActivateClickThreshold || 15000; // Custom threshold for activation
  
  // Log which thresholds are being used
  console.log(`Using campaign-specific thresholds: Pause at ${MINIMUM_CLICKS_THRESHOLD} clicks, Activate at ${REMAINING_CLICKS_THRESHOLD} clicks`);
  
  try {
    console.log(`TRAFFIC-GENERATOR: Handling campaign ${trafficstarCampaignId} by spent value - current spent: $${spentValue.toFixed(4)}`);
    
    if (spentValue < THRESHOLD) {
      // Handle campaign with less than $10 spent
      console.log(`🔵 LOW SPEND ($${spentValue.toFixed(4)} < $${THRESHOLD.toFixed(2)}): Campaign ${trafficstarCampaignId} has spent less than $${THRESHOLD.toFixed(2)}`);
      
      // Clear URL budget logs for this specific campaign since we're below the threshold
      // This ensures we start fresh logging when spent value exceeds $10 again
      await urlBudgetLogger.clearCampaignLogs(campaignId);
      
      // Cancel any pending budget updates for this campaign
      const urlBudgetManager = (await import('./url-budget-manager')).default;
      if (urlBudgetManager.hasPendingUpdates(campaignId)) {
        console.log(`🔄 Cancelling pending budget updates for campaign ${campaignId} as spent value is below threshold`);
        urlBudgetManager.cancelPendingUpdates(campaignId);
      }
      
      // Get the campaign details to check URLs and remaining clicks
      // Only fetch active URLs for the campaign to improve performance
      const campaign = await db.query.campaigns.findFirst({
        where: (campaign, { eq }) => eq(campaign.id, campaignId),
        with: {
          urls: {
            where: (urls, { eq }) => eq(urls.status, 'active')
          }
        }
      }) as (Campaign & { urls: UrlWithActiveStatus[] }) | null;
      
      if (!campaign || !campaign.urls || campaign.urls.length === 0) {
        console.log(`⏹️ LOW SPEND ACTION: Campaign ${trafficstarCampaignId} has no URLs - skipping auto-reactivation check`);
      } else {
        // Calculate total remaining clicks across all active URLs
        let totalRemainingClicks = 0;
        console.log(`🔍 DEBUG: Checking remaining clicks for ${campaign.urls.length} URLs in campaign ${trafficstarCampaignId}`);
        for (const url of campaign.urls) {
          console.log(`🔍 URL ID: ${url.id}, status: ${url.status}, clickLimit: ${url.clickLimit}, clicks: ${url.clicks}`);
          if (url.status === 'active') {
            const remainingClicks = url.clickLimit - url.clicks;
            const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
            totalRemainingClicks += validRemaining;
            console.log(`✅ Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
          } else {
            console.log(`❌ Skipping URL ID: ${url.id} with status: ${url.status}`);
          }
        }
        
        console.log(`📊 Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} total remaining clicks across all active URLs`);
        
        // Get real-time campaign status
        const currentStatus = await getTrafficStarCampaignStatus(trafficstarCampaignId);
        console.log(`📊 Campaign ${trafficstarCampaignId} current status: ${currentStatus}`);
        
        // Handle based on remaining clicks and current status
        if (totalRemainingClicks >= REMAINING_CLICKS_THRESHOLD && currentStatus !== 'active') {
          // Case 1: High remaining clicks (≥15,000) but not active - ACTIVATE CAMPAIGN
          console.log(`✅ Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks (>= ${REMAINING_CLICKS_THRESHOLD}) - will attempt auto-reactivation`);
          
          try {
            // Set end time to 23:59 UTC today
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
            const endTimeStr = `${todayStr} 23:59:00`;
            
            // First set the end time, then activate
            await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), endTimeStr);
            console.log(`✅ Set campaign ${trafficstarCampaignId} end time to ${endTimeStr}`);
            
            // Attempt to reactivate the campaign since it has low spend but high remaining clicks
            try {
              await trafficStarService.activateCampaign(Number(trafficstarCampaignId));
              
              // If we get here without an error, the campaign was activated successfully
              console.log(`✅ AUTO-REACTIVATED low spend campaign ${trafficstarCampaignId} - it has ${totalRemainingClicks} remaining clicks`);
              
              // Record this activation in our recentActions map
              const existingActions = recentActions.get(campaignId) || {};
              recentActions.set(campaignId, {
                ...existingActions,
                lastActivation: new Date()
              });
              
              // Mark as auto-reactivated in the database
              await db.update(campaigns)
                .set({
                  lastTrafficSenderStatus: 'auto_reactivated_low_spend',
                  lastTrafficSenderAction: new Date(),
                  updatedAt: new Date()
                })
                .where(eq(campaigns.id, campaignId));
              
              console.log(`✅ Marked campaign ${campaignId} as 'auto_reactivated_low_spend' in database`);
              
              // Start minute-by-minute monitoring to check if the campaign stays active
              startMinutelyStatusCheck(campaignId, trafficstarCampaignId);
              
              return;
            } catch (activateError) {
              console.error(`❌ Failed to auto-reactivate low spend campaign ${trafficstarCampaignId}:`, activateError);
            }
          } catch (error) {
            console.error(`❌ Error auto-reactivating low spend campaign ${trafficstarCampaignId}:`, error);
          }
        } else if (totalRemainingClicks < MINIMUM_CLICKS_THRESHOLD && currentStatus === 'active') {
          // Case 2: Low remaining clicks (<5,000) and active - PAUSE CAMPAIGN
          console.log(`⏹️ Campaign ${trafficstarCampaignId} only has ${totalRemainingClicks} remaining clicks (< ${MINIMUM_CLICKS_THRESHOLD}) - will pause campaign`);
          
          try {
            // Set current date/time for end time
            const now = new Date();
            const formattedDateTime = now.toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS
            
            // First pause the campaign
            try {
              await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
              
              try {
                // Then set its end time
                await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), formattedDateTime);
                
                console.log(`✅ PAUSED low spend campaign ${trafficstarCampaignId} due to low remaining clicks (${totalRemainingClicks} <= ${MINIMUM_CLICKS_THRESHOLD})`);
                
                // Mark as auto-paused in the database
                await db.update(campaigns)
                  .set({
                    lastTrafficSenderStatus: 'auto_paused_low_clicks',
                    lastTrafficSenderAction: new Date(),
                    updatedAt: new Date()
                  })
                  .where(eq(campaigns.id, campaignId));
                
                console.log(`✅ Marked campaign ${campaignId} as 'auto_paused_low_clicks' in database`);
                
                // Start pause status monitoring to ensure campaign stays paused
                startMinutelyPauseStatusCheck(campaignId, trafficstarCampaignId);
                
                return;
              } catch (endTimeError) {
                console.error(`❌ Error setting end time for campaign ${trafficstarCampaignId}:`, endTimeError);
              }
            } catch (pauseError) {
              console.error(`❌ Failed to pause low spend campaign ${trafficstarCampaignId} with low remaining clicks:`, pauseError);
            }
          } catch (error) {
            console.error(`❌ Error pausing low spend campaign ${trafficstarCampaignId} with low remaining clicks:`, error);
          }
        } else if (totalRemainingClicks >= REMAINING_CLICKS_THRESHOLD && currentStatus === 'active') {
          // Case 3: High remaining clicks and already active - CONTINUE MONITORING
          console.log(`✅ Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks and is already active - continuing monitoring`);
          
          // Ensure we're monitoring this campaign
          startMinutelyStatusCheck(campaignId, trafficstarCampaignId);
          
          // Mark status in database
          await db.update(campaigns)
            .set({
              lastTrafficSenderStatus: 'active_with_sufficient_clicks',
              lastTrafficSenderAction: new Date(),
              updatedAt: new Date()
            })
            .where(eq(campaigns.id, campaignId));
          
          return;
        } else if (totalRemainingClicks < MINIMUM_CLICKS_THRESHOLD && currentStatus !== 'active') {
          // Case 4: Low remaining clicks and already paused - CONTINUE PAUSE MONITORING
          console.log(`⏹️ Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks (< ${MINIMUM_CLICKS_THRESHOLD}) and is already paused - monitoring to ensure it stays paused`);
          
          // Ensure we're monitoring this campaign's pause status
          startMinutelyPauseStatusCheck(campaignId, trafficstarCampaignId);
          
          // Mark status in database
          await db.update(campaigns)
            .set({
              lastTrafficSenderStatus: 'paused_with_low_clicks',
              lastTrafficSenderAction: new Date(),
              updatedAt: new Date()
            })
            .where(eq(campaigns.id, campaignId));
          
          return;
        } else {
          // Case 5: Remaining clicks between thresholds - maintain current status
          console.log(`⏸️ Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks (between thresholds) - maintaining current status`);
          
          // Mark status in database
          await db.update(campaigns)
            .set({
              lastTrafficSenderStatus: 'between_click_thresholds',
              lastTrafficSenderAction: new Date(),
              updatedAt: new Date()
            })
            .where(eq(campaigns.id, campaignId));
        }
      }
      
      // Default action if no specific action was taken
      if (!await db.query.campaigns.findFirst({
        where: (c, { eq, and }) => and(
          eq(c.id, campaignId),
          eq(c.lastTrafficSenderStatus, 'low_spend')
        )
      })) {
        // Only update if not already set by one of the above conditions
        await db.update(campaigns)
          .set({
            lastTrafficSenderStatus: 'low_spend',
            lastTrafficSenderAction: new Date(),
            updatedAt: new Date()
          })
          .where(eq(campaigns.id, campaignId));
        
        console.log(`✅ Marked campaign ${campaignId} as 'low_spend' in database`);
      }
    } else {
      // Handle campaign with $10 or more spent
      console.log(`🟢 HIGH SPEND ($${spentValue.toFixed(4)} >= $${THRESHOLD.toFixed(2)}): Campaign ${trafficstarCampaignId} has spent $${THRESHOLD.toFixed(2)} or more`);
      
      // First, get the campaign's current status
      const currentStatus = await getTrafficStarCampaignStatus(trafficstarCampaignId);
      
      // Get the campaign details to check URLs and pricePerThousand
      // Only fetch active URLs for the campaign to improve performance
      const campaign = await db.query.campaigns.findFirst({
        where: (campaign, { eq }) => eq(campaign.id, campaignId),
        with: {
          urls: {
            where: (urls, { eq }) => eq(urls.status, 'active')
          }
        }
      }) as (Campaign & { urls: UrlWithActiveStatus[] }) | null;
      
      if (!campaign) {
        console.error(`Campaign ${campaignId} not found - cannot process high spend handling`);
        return;
      }
      
      console.log(`Campaign ${campaignId} price per thousand: $${campaign.pricePerThousand}`);
      
      // Check if the campaign is already in high_spend_budget_updated state
      if (campaign.lastTrafficSenderStatus === 'high_spend_budget_updated') {
        console.log(`Campaign ${campaignId} is already in high_spend_budget_updated state - checking for new URLs added after budget calculation`);
        
        // Check for URLs added after the budget calculation time
        await checkForNewUrlsAfterBudgetCalculation(campaignId, trafficstarCampaignId);
        return;
      }
      
      // Check if the campaign is already in the waiting period for high spend handling
      if (campaign.lastTrafficSenderStatus === 'high_spend_waiting') {
        // Get high spend wait minutes from campaign (default to 11 if not set)
        const highSpendWaitMinutes = campaign.highSpendWaitMinutes || 11;
        
        // Check if the configured waiting period has elapsed
        if (campaign.lastTrafficSenderAction) {
          const waitDuration = Date.now() - campaign.lastTrafficSenderAction.getTime();
          const waitMinutes = Math.floor(waitDuration / (60 * 1000));
          
          console.log(`Campaign ${campaignId} has been in high_spend_waiting state for ${waitMinutes} minutes (configured wait: ${highSpendWaitMinutes} minutes)`);
          
          if (waitMinutes >= highSpendWaitMinutes) {
            console.log(`${highSpendWaitMinutes}-minute wait period has elapsed for campaign ${campaignId} - proceeding with high spend handling`);
            
            // 1. Get updated spent value after waiting period
            const updatedSpentValue = await getTrafficStarCampaignSpentValue(campaignId, trafficstarCampaignId);
            
            if (updatedSpentValue === null) {
              console.error(`Failed to get updated spent value for campaign ${campaignId} after wait period`);
              return;
            }
            
            console.log(`Campaign ${campaignId} updated spent value after wait: $${updatedSpentValue.toFixed(4)}`);
            
            // 2. Calculate total remaining clicks across active URLs
            let totalRemainingClicks = 0;
            console.log(`Checking remaining clicks for ${campaign.urls.length} URLs in campaign ${trafficstarCampaignId}`);
            
            for (const url of campaign.urls) {
              if (url.status === 'active') {
                const remainingClicks = url.clickLimit - url.clicks;
                const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
                totalRemainingClicks += validRemaining;
                console.log(`✅ Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
                
                // Calculate individual URL price based on remaining clicks
                if (validRemaining > 0) {
                  const urlPrice = (validRemaining / 1000) * parseFloat(campaign.pricePerThousand);
                  console.log(`💰 URL ${url.id} price for ${validRemaining} remaining clicks: $${urlPrice.toFixed(2)}`);
                  
                  // Log this URL's budget calculation to the campaign-specific URL budget log file
                  await urlBudgetLogger.logUrlBudget(url.id, urlPrice, campaign.id);
                }
              } else {
                console.log(`❌ Skipping URL ID: ${url.id} with status: ${url.status}`);
              }
            }
            
            console.log(`Total remaining clicks across active URLs: ${totalRemainingClicks}`);
            
            // 3. Calculate the value of remaining clicks
            const pricePerThousand = parseFloat(campaign.pricePerThousand);
            const remainingClicksValue = (totalRemainingClicks / 1000) * pricePerThousand;
            
            console.log(`Calculated value of remaining clicks: $${remainingClicksValue.toFixed(4)}`);
            
            // 4. Calculate new budget (spent value + remaining clicks value)
            const newBudget = updatedSpentValue + remainingClicksValue;
            console.log(`New budget calculation: $${updatedSpentValue.toFixed(4)} (spent) + $${remainingClicksValue.toFixed(4)} (remaining) = $${newBudget.toFixed(4)}`);
            
            try {
              // 5. Update the TrafficStar campaign budget
              await trafficStarService.updateCampaignBudget(Number(trafficstarCampaignId), newBudget);
              console.log(`✅ Updated campaign ${trafficstarCampaignId} budget to $${newBudget.toFixed(4)}`);
              
              // Track that this campaign has had its initial budget calculation
              // This will be used to identify URLs added after this point
              await db.update(campaigns)
                .set({
                  highSpendBudgetCalcTime: new Date()
                })
                .where(eq(campaigns.id, campaignId));
              
              // 6. Set end time to 23:59 UTC today
              const today = new Date();
              const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
              const endTimeStr = `${todayStr} 23:59:00`;
              
              // 7. Set the end time
              await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), endTimeStr);
              console.log(`✅ Set campaign ${trafficstarCampaignId} end time to ${endTimeStr}`);
              
              // 8. Activate the campaign
              await trafficStarService.activateCampaign(Number(trafficstarCampaignId));
              console.log(`✅ Activated campaign ${trafficstarCampaignId} after budget update`);
              
              // 9. Update database status
              await db.update(campaigns)
                .set({
                  lastTrafficSenderStatus: 'high_spend_budget_updated',
                  lastTrafficSenderAction: new Date(),
                  updatedAt: new Date()
                })
                .where(eq(campaigns.id, campaignId));
              
              console.log(`✅ Marked campaign ${campaignId} as 'high_spend_budget_updated' in database`);
              
              // 10. Check for new URLs added after budget calculation
              await handleNewUrlsAfterBudgetCalc(campaignId, trafficstarCampaignId);
              
              // 11. Start monitoring
              startMinutelyStatusCheck(campaignId, trafficstarCampaignId);
            } catch (error) {
              console.error(`❌ Error updating campaign ${trafficstarCampaignId} for high spend handling:`, error);
              
              // Update database to record the failure
              await db.update(campaigns)
                .set({
                  lastTrafficSenderStatus: 'high_spend_update_failed',
                  lastTrafficSenderAction: new Date(),
                  updatedAt: new Date()
                })
                .where(eq(campaigns.id, campaignId));
            }
          } else {
            console.log(`Waiting period not elapsed yet (${waitMinutes}/${highSpendWaitMinutes} minutes) for campaign ${campaignId}`);
          }
        }
      } else {
        // First time seeing this campaign with high spend
        console.log(`First time detecting high spend for campaign ${trafficstarCampaignId} - initiating pause and wait period`);
        
        try {
          // If the campaign is active, pause it first
          if (currentStatus === 'active') {
            // Set current date/time for end time
            const now = new Date();
            const formattedDateTime = now.toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS
            
            // First pause the campaign
            await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
            console.log(`✅ Paused campaign ${trafficstarCampaignId} to begin high spend handling`);
            
            // Then set its end time
            await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), formattedDateTime);
            console.log(`✅ Set end time for campaign ${trafficstarCampaignId} to ${formattedDateTime}`);
          } else {
            console.log(`Campaign ${trafficstarCampaignId} is already paused - no need to pause it again`);
          }
          
          // Get high spend wait minutes from campaign (default to 11 if not set)
          const highSpendWaitMinutes = campaign.highSpendWaitMinutes || 11;
          
          // Mark as high_spend_waiting in the database and start the configurable timer
          await db.update(campaigns)
            .set({
              lastTrafficSenderStatus: 'high_spend_waiting',
              lastTrafficSenderAction: new Date(),
              updatedAt: new Date()
            })
            .where(eq(campaigns.id, campaignId));
          
          console.log(`✅ Marked campaign ${campaignId} as 'high_spend_waiting' in database`);
          console.log(`⏱️ Starting ${highSpendWaitMinutes}-minute wait period for campaign ${trafficstarCampaignId}`);
          
          // Start monitoring during the wait period
          startMinutelyPauseStatusCheck(campaignId, trafficstarCampaignId);
        } catch (error) {
          console.error(`❌ Error initiating high spend handling for campaign ${trafficstarCampaignId}:`, error);
          
          // Mark this in the database
          await db.update(campaigns)
            .set({
              lastTrafficSenderStatus: 'high_spend_initiation_failed',
              lastTrafficSenderAction: new Date(),
              updatedAt: new Date()
            })
            .where(eq(campaigns.id, campaignId));
        }
      }
    }
  } catch (error) {
    console.error(`Error handling campaign ${trafficstarCampaignId} by spent value:`, error);
  }
}

/**
 * Check for URLs added after high-spend budget calculation and update the budget after a 9-minute delay
 * This is different from handleNewUrlsAfterBudgetCalc - this is called directly from the high spend handler
 * when detecting that the campaign is already in high_spend_budget_updated state
 * @param campaignId The campaign ID in our system 
 * @param trafficstarCampaignId The TrafficStar campaign ID
 */
async function checkForNewUrlsAfterBudgetCalculation(campaignId: number, trafficstarCampaignId: string) {
  try {
    console.log(`🔍 Checking for new URLs added after budget calculation for campaign ${campaignId}`);
    
    // Get the campaign with its budget calculation timestamp
    // Only fetch active URLs for the campaign to improve performance
    const campaign = await db.query.campaigns.findFirst({
      where: (c, { eq }) => eq(c.id, campaignId),
      with: { 
        urls: {
          where: (urls, { eq }) => eq(urls.status, 'active')
        } 
      }
    }) as (Campaign & { urls: UrlWithActiveStatus[] }) | null;
    
    if (!campaign || !campaign.highSpendBudgetCalcTime) {
      console.log(`Campaign ${campaignId} doesn't have a high-spend budget calculation timestamp - skipping new URL check`);
      return;
    }
    
    const calcTime = campaign.highSpendBudgetCalcTime;
    console.log(`Campaign ${campaignId} budget calculation time: ${calcTime.toISOString()}`);
    
    // Find URLs added after budget calculation time
    const newUrls = campaign.urls.filter(url => {
      // For each URL, check if it was created after the budget calculation
      return url.status === 'active' && url.createdAt > calcTime;
    });
    
    if (newUrls.length === 0) {
      console.log(`No new URLs found added after budget calculation for campaign ${campaignId}`);
      return;
    }
    
    console.log(`⚠️ Found ${newUrls.length} new URLs added after budget calculation`);
    
    // Check if there's a running timer for this campaign
    // The timer should be based on the FIRST URL added after budget calc, not the newest
    const oldestNewUrl = [...newUrls].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    const waitDuration = Date.now() - oldestNewUrl.createdAt.getTime();
    const waitMinutes = Math.floor(waitDuration / (60 * 1000));
    
    console.log(`First URL (ID: ${oldestNewUrl.id}) was added ${waitMinutes} minutes ago`);
    
    // Apply 9-minute delay before updating budget for newly added URLs
    const DELAY_MINUTES = 9;
    
    if (waitMinutes < DELAY_MINUTES) {
      console.log(`⏱️ Waiting period not elapsed yet (${waitMinutes}/${DELAY_MINUTES} minutes) - will check again on next iteration`);
      
      // Mark these URLs as pending in the database
      for (const url of newUrls) {
        await db.update(urls)
          .set({
            pendingBudgetUpdate: true as boolean, // Cast to boolean to fix TypeScript error
            updatedAt: new Date()
          })
          .where(eq(urls.id, url.id));
      }
      
      return;
    }
    
    console.log(`✅ ${DELAY_MINUTES}-minute wait period has elapsed - processing ${newUrls.length} new URLs`);
    
    // Get the current budget from TrafficStar
    const campaignData = await trafficStarService.getCampaign(Number(trafficstarCampaignId));
    if (!campaignData || !campaignData.max_daily) {
      console.log(`Could not get current budget for campaign ${trafficstarCampaignId}`);
      return;
    }
    
    const currentBudget = parseFloat(campaignData.max_daily.toString());
    console.log(`Current TrafficStar budget for campaign ${trafficstarCampaignId}: $${currentBudget.toFixed(4)}`);
    
    // Calculate new URLs budget
    let newUrlsClicksTotal = 0;
    let newUrlsBudget = 0;
    
    for (const url of newUrls) {
      // For newly added URLs, use full clickLimit instead of remaining clicks
      newUrlsClicksTotal += url.clickLimit;
      
      // Calculate individual URL budget (price)
      const urlBudget = (url.clickLimit / 1000) * parseFloat(campaign.pricePerThousand);
      console.log(`New URL ${url.id} budget: $${urlBudget.toFixed(4)} (${url.clickLimit} clicks)`);
      
      // Log this URL's budget calculation
      await urlBudgetLogger.logUrlBudget(url.id, urlBudget, campaign.id);
      
      // Add to total new URLs budget
      newUrlsBudget += urlBudget;
      
      // Update the URL to mark it as processed
      await db.update(urls)
        .set({
          pendingBudgetUpdate: false as boolean, // Cast to boolean to fix TypeScript error
          budgetCalculated: true as boolean, // Cast to boolean to fix TypeScript error
          updatedAt: new Date()
        })
        .where(eq(urls.id, url.id));
    }
    
    // Calculate updated budget (current budget + new URLs budget)
    const updatedBudget = currentBudget + newUrlsBudget;
    
    console.log(`Updating budget for campaign ${trafficstarCampaignId} from $${currentBudget.toFixed(4)} to $${updatedBudget.toFixed(4)} (+ $${newUrlsBudget.toFixed(4)} for new URLs)`);
    
    // Update the TrafficStar campaign budget
    await trafficStarService.updateCampaignBudget(Number(trafficstarCampaignId), updatedBudget);
    
    console.log(`✅ Successfully updated budget for campaign ${trafficstarCampaignId} to include new URLs`);
    
    // Update database with latest calculation time
    // We keep the status as 'high_spend_budget_updated' so that any new URLs added
    // after this will still go through the same checkForNewUrlsAfterBudgetCalculation flow
    await db.update(campaigns)
      .set({
        highSpendBudgetCalcTime: new Date(),
        lastTrafficSenderAction: new Date(), 
        lastTrafficSenderStatus: 'high_spend_budget_updated', // Keep the high spend state to maintain the flow
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, campaignId));
    
    console.log(`✅ Updated highSpendBudgetCalcTime for campaign ${campaignId}`);
    console.log(`✅ Maintained 'high_spend_budget_updated' status for new URL budget updates`);
    
  } catch (error) {
    console.error(`Error checking for new URLs after budget calculation for campaign ${campaignId}:`, error);
  }
}

/**
 * Handle URLs that were added after the initial high-spend budget calculation
 * These need special handling with a 9-minute delay and batch update approach
 * @param campaignId The campaign ID in our system
 * @param trafficstarCampaignId The TrafficStar campaign ID
 */
async function handleNewUrlsAfterBudgetCalc(campaignId: number, trafficstarCampaignId: string) {
  try {
    console.log(`Checking for URLs added after high-spend budget calculation for campaign ${campaignId}`);
    
    // Get the campaign with its budget calculation timestamp
    // Only fetch active URLs for the campaign to improve performance
    const campaign = await db.query.campaigns.findFirst({
      where: (c, { eq }) => eq(c.id, campaignId),
      with: { 
        urls: {
          where: (urls, { eq }) => eq(urls.status, 'active')
        } 
      }
    }) as (Campaign & { urls: UrlWithActiveStatus[] }) | null;
    
    if (!campaign || !campaign.highSpendBudgetCalcTime) {
      console.log(`Campaign ${campaignId} doesn't have a high-spend budget calculation timestamp - skipping new URL check`);
      return;
    }
    
    const calcTime = campaign.highSpendBudgetCalcTime;
    console.log(`Campaign ${campaignId} budget calculation time: ${calcTime.toISOString()}`);
    
    // Find URLs added after budget calculation time
    const newUrls = campaign.urls.filter(url => {
      // For each URL, check if it was created after the budget calculation
      return url.status === 'active' && url.createdAt > calcTime;
    });
    
    if (newUrls.length === 0) {
      console.log(`No new URLs found added after budget calculation for campaign ${campaignId}`);
      return;
    }
    
    console.log(`Found ${newUrls.length} URLs added after high-spend budget calculation for campaign ${campaignId}`);
    
    // Check if the 9-minute waiting period has elapsed from the OLDEST new URL
    // This ensures all URLs added within the 9-minute window get processed together
    const oldestNewUrl = [...newUrls].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    const waitDuration = Date.now() - oldestNewUrl.createdAt.getTime();
    const waitMinutes = Math.floor(waitDuration / (60 * 1000));
    
    console.log(`First URL (ID: ${oldestNewUrl.id}) was added ${waitMinutes} minutes ago`);
    
    // Apply 9-minute delay before updating budget for newly added URLs
    const DELAY_MINUTES = 9;
    
    if (waitMinutes < DELAY_MINUTES) {
      console.log(`⏱️ Waiting period not elapsed yet (${waitMinutes}/${DELAY_MINUTES} minutes) - will check again later`);
      
      // Mark these URLs as pending in the database
      for (const url of newUrls) {
        await db.update(urls)
          .set({
            pendingBudgetUpdate: true as boolean, // Cast to boolean to fix TypeScript error
            updatedAt: new Date()
          })
          .where(eq(urls.id, url.id));
      }
      
      return;
    }
    
    console.log(`${DELAY_MINUTES}-minute wait period has elapsed - processing ${newUrls.length} new URLs`);
    
    // Get the current campaign budget from TrafficStar
    const updatedSpentValue = await getTrafficStarCampaignSpentValue(campaignId, trafficstarCampaignId);
    
    if (updatedSpentValue === null) {
      console.error(`Failed to get current spent value for campaign ${campaignId}`);
      return;
    }
    
    // Calculate additional budget needed for new URLs
    let additionalBudget = 0;
    let totalNewClicks = 0;
    
    console.log(`Processing new URLs for campaign ${campaignId} with current spent value: $${updatedSpentValue.toFixed(4)}`);
    
    for (const url of newUrls) {
      // For newly added URLs, use total click limit instead of remaining clicks
      const totalClicks = url.clickLimit;
      totalNewClicks += totalClicks;
      
      // Calculate budget based on price per thousand
      const urlBudget = (totalClicks / 1000) * parseFloat(campaign.pricePerThousand);
      additionalBudget += urlBudget;
      
      console.log(`URL ID ${url.id}: ${totalClicks} clicks = $${urlBudget.toFixed(4)} additional budget`);
      
      // Log this URL's budget calculation to the campaign-specific URL budget log file
      await urlBudgetLogger.logUrlBudget(url.id, urlBudget, campaignId);
      
      // Update the URL to mark it as processed
      await db.update(urls)
        .set({
          pendingBudgetUpdate: false as boolean, // Cast to boolean to fix TypeScript error
          budgetCalculated: true as boolean, // Cast to boolean to fix TypeScript error
          updatedAt: new Date()
        })
        .where(eq(urls.id, url.id));
    }
    
    // Calculate new total campaign budget
    const newTotalBudget = updatedSpentValue + additionalBudget;
    
    console.log(`New budget calculation for batch update: $${updatedSpentValue.toFixed(4)} (current) + $${additionalBudget.toFixed(4)} (additional) = $${newTotalBudget.toFixed(4)}`);
    
    // Update the TrafficStar campaign budget with the new total
    await trafficStarService.updateCampaignBudget(Number(trafficstarCampaignId), newTotalBudget);
    
    console.log(`✅ Updated campaign ${trafficstarCampaignId} budget to $${newTotalBudget.toFixed(4)} after processing ${newUrls.length} new URLs`);
    
    // Update campaign status to reflect the batch update
    await db.update(campaigns)
      .set({
        lastTrafficSenderStatus: 'batch_updated_new_urls',
        lastTrafficSenderAction: new Date(),
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, campaignId));
    
    console.log(`✅ Marked campaign ${campaignId} as 'batch_updated_new_urls' in database`);
    
  } catch (error) {
    console.error(`Error handling new URLs for campaign ${campaignId}:`, error);
  }
}

/**
 * Maps to store status check intervals by campaign ID
 * These prevent duplicate intervals from being created for the same campaign
 */
const activeStatusChecks = new Map<number, NodeJS.Timeout>();
const pauseStatusChecks = new Map<number, NodeJS.Timeout>();

// Store timestamps of recent actions to prevent oscillation
// Map format: { campaignId: { action: timestamp } }
const recentActions = new Map<number, { 
  lastActivation?: Date,
  lastPause?: Date 
}>();

// How long to wait before allowing the same action again (in milliseconds)
const ACTION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const emptyUrlStatusChecks = new Map<number, NodeJS.Timeout>();

/**
 * Start minute-by-minute check for campaign status
 * This ensures the campaign stays active after reactivation
 * @param campaignId The campaign ID in our system
 * @param trafficstarCampaignId The TrafficStar campaign ID
 */
function startMinutelyStatusCheck(campaignId: number, trafficstarCampaignId: string) {
  // Clear existing interval if there is one
  if (activeStatusChecks.has(campaignId)) {
    clearInterval(activeStatusChecks.get(campaignId));
    activeStatusChecks.delete(campaignId);
  }
  
  // Also clear any pause status checks for this campaign
  if (pauseStatusChecks.has(campaignId)) {
    clearInterval(pauseStatusChecks.get(campaignId));
    pauseStatusChecks.delete(campaignId);
  }
  
  console.log(`🔄 Starting minute-by-minute ACTIVE status check for campaign ${trafficstarCampaignId}`);
  
  // Set up a new interval that runs every minute
  const interval = setInterval(async () => {
    console.log(`⏱️ Running minute check for campaign ${trafficstarCampaignId} active status`);
    
    try {
      // Get the current status
      const status = await getTrafficStarCampaignStatus(trafficstarCampaignId);
      
      if (status === 'active') {
        console.log(`✅ Campaign ${trafficstarCampaignId} is still active - monitoring will continue`);
        
        // Check if we need to pause based on remaining clicks
        // Only fetch active URLs for the campaign to improve performance
        const campaign = await db.query.campaigns.findFirst({
          where: (c, { eq }) => eq(c.id, campaignId),
          with: { 
            urls: {
              where: (urls, { eq }) => eq(urls.status, 'active')
            } 
          }
        }) as (Campaign & { urls: UrlWithActiveStatus[] }) | null;
        
        if (campaign && campaign.urls && campaign.urls.length > 0) {
          // Calculate total remaining clicks
          let totalRemainingClicks = 0;
          console.log(`🔍 ACTIVE MONITORING: Checking remaining clicks for ${campaign.urls.length} URLs in campaign ${trafficstarCampaignId}`);
          for (const url of campaign.urls) {
            console.log(`🔍 URL ID: ${url.id}, status: ${url.status}, clickLimit: ${url.clickLimit}, clicks: ${url.clicks}`);
            if (url.status === 'active') {
              const remainingClicks = url.clickLimit - url.clicks;
              const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
              totalRemainingClicks += validRemaining;
              console.log(`✅ Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
            } else {
              console.log(`❌ Skipping URL ID: ${url.id} with status: ${url.status}`);
            }
          }
          
          // If remaining clicks fell below threshold, pause the campaign
          // Need to fetch campaign settings to get the threshold
          const campaignResult = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
          const campaignSettings = campaignResult[0];
          const MINIMUM_CLICKS_THRESHOLD = campaignSettings?.minPauseClickThreshold || 5000; // Use campaign-specific threshold
          const MAXIMUM_CLICKS_THRESHOLD = campaignSettings?.minActivateClickThreshold || 15000; // Use campaign-specific threshold for activation
          
          // Only pause if clearly below the minimum threshold to avoid oscillation
          if (totalRemainingClicks < MINIMUM_CLICKS_THRESHOLD) {
            console.log(`⏹️ During monitoring: Campaign ${trafficstarCampaignId} remaining clicks (${totalRemainingClicks}) fell below threshold (${MINIMUM_CLICKS_THRESHOLD}) - pausing campaign`);
            
            // Check if we recently paused this campaign to prevent oscillation
            const campaignActions = recentActions.get(campaignId);
            const now = new Date();
            if (campaignActions && campaignActions.lastPause) {
              const timeSinceLastPause = now.getTime() - campaignActions.lastPause.getTime();
              if (timeSinceLastPause < ACTION_COOLDOWN_MS) {
                const minutesRemaining = Math.ceil((ACTION_COOLDOWN_MS - timeSinceLastPause) / (1000 * 60));
                console.log(`⏱️ Campaign ${trafficstarCampaignId} was paused ${Math.floor(timeSinceLastPause / (1000 * 60))} minutes ago. Waiting ${minutesRemaining} more minutes before attempting again.`);
                return;
              }
            }
            
            // Stop active status monitoring since we're switching to pause monitoring
            clearInterval(interval);
            activeStatusChecks.delete(campaignId);
            
            try {
              // Set current date/time for end time
              const now = new Date();
              const formattedDateTime = now.toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS
              
              // First pause the campaign
              try {
                await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
                
                try {
                  // Then set its end time
                  await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), formattedDateTime);
                  
                  console.log(`✅ PAUSED low spend campaign ${trafficstarCampaignId} during monitoring due to low remaining clicks (${totalRemainingClicks} <= ${MINIMUM_CLICKS_THRESHOLD})`);
                  
                  // Record this pause in our recent actions map
                  recentActions.set(campaignId, { 
                    ...campaignActions,
                    lastPause: new Date() 
                  });
                  
                  // Mark as auto-paused in the database
                  await db.update(campaigns)
                    .set({
                      lastTrafficSenderStatus: 'auto_paused_low_clicks_during_monitoring',
                      lastTrafficSenderAction: new Date(),
                      updatedAt: new Date()
                    })
                    .where(eq(campaigns.id, campaignId));
                  
                  console.log(`✅ Marked campaign ${campaignId} as 'auto_paused_low_clicks_during_monitoring' in database`);
                  
                  // Start pause status monitoring to ensure campaign stays paused
                  startMinutelyPauseStatusCheck(campaignId, trafficstarCampaignId);
                } catch (endTimeError) {
                  console.error(`❌ Error setting end time for campaign ${trafficstarCampaignId}:`, endTimeError);
                }
              } catch (pauseError) {
                console.error(`❌ Failed to pause low spend campaign ${trafficstarCampaignId} with low remaining clicks:`, pauseError);
                
                // If we failed to pause, restart the active monitoring
                startMinutelyStatusCheck(campaignId, trafficstarCampaignId);
              }
            } catch (error) {
              console.error(`❌ Error pausing low spend campaign ${trafficstarCampaignId} with low remaining clicks:`, error);
              
              // If we failed to pause, restart the active monitoring
              startMinutelyStatusCheck(campaignId, trafficstarCampaignId);
            }
          }
        }
      } else if (status === 'paused') {
        console.log(`⚠️ Campaign ${trafficstarCampaignId} was found paused but should be active - will attempt to reactivate`);
        
        try {
          // Get the campaign details to check URLs and remaining clicks
          // Only fetch active URLs for the campaign to improve performance
          const campaign = await db.query.campaigns.findFirst({
            where: (campaign, { eq }) => eq(campaign.id, campaignId),
            with: { 
              urls: {
                where: (urls, { eq }) => eq(urls.status, 'active')
              } 
            }
          }) as (Campaign & { urls: UrlWithActiveStatus[] }) | null;
          
          if (campaign && campaign.urls && campaign.urls.length > 0) {
            // Calculate total remaining clicks
            let totalRemainingClicks = 0;
            console.log(`🔍 PAUSE DETECTED: Checking remaining clicks for ${campaign.urls.length} URLs in campaign ${trafficstarCampaignId}`);
            for (const url of campaign.urls) {
              console.log(`🔍 URL ID: ${url.id}, status: ${url.status}, clickLimit: ${url.clickLimit}, clicks: ${url.clicks}`);
              if (url.status === 'active') {
                const remainingClicks = url.clickLimit - url.clicks;
                const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
                totalRemainingClicks += validRemaining;
                console.log(`✅ Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
              } else {
                console.log(`❌ Skipping URL ID: ${url.id} with status: ${url.status}`);
              }
            }
            
            // Only reactivate if there are enough remaining clicks
            // Get campaign settings to determine the threshold
            const campaignResult = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
            const campaignSettings = campaignResult[0];
            const MINIMUM_CLICKS_THRESHOLD = campaignSettings?.minPauseClickThreshold || 5000; // Use campaign-specific threshold for pausing
            const REMAINING_CLICKS_THRESHOLD = campaignSettings?.minActivateClickThreshold || 15000; // Use campaign-specific threshold for activation
            
            // Only reactivate if clearly above the activation threshold to avoid oscillation
            if (totalRemainingClicks > REMAINING_CLICKS_THRESHOLD) {
              console.log(`✅ Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks (>= ${REMAINING_CLICKS_THRESHOLD}) - will attempt reactivation during monitoring`);
              
              // Check if we recently activated this campaign to prevent oscillation
              const campaignActions = recentActions.get(campaignId);
              const now = new Date();
              if (campaignActions && campaignActions.lastActivation) {
                const timeSinceLastActivation = now.getTime() - campaignActions.lastActivation.getTime();
                if (timeSinceLastActivation < ACTION_COOLDOWN_MS) {
                  const minutesRemaining = Math.ceil((ACTION_COOLDOWN_MS - timeSinceLastActivation) / (1000 * 60));
                  console.log(`⏱️ Campaign ${trafficstarCampaignId} was activated ${Math.floor(timeSinceLastActivation / (1000 * 60))} minutes ago. Waiting ${minutesRemaining} more minutes before attempting again.`);
                  
                  // Start active monitoring to continue checking
                  startMinutelyStatusCheck(campaignId, trafficstarCampaignId);
                  return;
                }
              }
              
              // Set end time to 23:59 UTC today
              const today = new Date();
              const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
              const endTimeStr = `${todayStr} 23:59:00`;
              
              // First set the end time, then activate
              try {
                await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), endTimeStr);
                
                // Attempt to reactivate the campaign
                await trafficStarService.activateCampaign(Number(trafficstarCampaignId));
                
                console.log(`✅ REACTIVATED campaign ${trafficstarCampaignId} during monitoring - it has ${totalRemainingClicks} remaining clicks`);
                
                // Record this activation in our recent actions map
                recentActions.set(campaignId, { 
                  ...campaignActions,
                  lastActivation: new Date() 
                });
                
                // Mark as reactivated during monitoring in the database
                await db.update(campaigns)
                  .set({
                    lastTrafficSenderStatus: 'reactivated_during_monitoring',
                    lastTrafficSenderAction: new Date(),
                    updatedAt: new Date()
                  })
                  .where(eq(campaigns.id, campaignId));
                
                console.log(`✅ Marked campaign ${campaignId} as 'reactivated_during_monitoring' in database`);
              } catch (error) {
                console.error(`Failed to reactivate campaign ${trafficstarCampaignId}:`, error);
              }
            } else {
              console.log(`⏹️ Campaign ${trafficstarCampaignId} has only ${totalRemainingClicks} remaining clicks (< ${REMAINING_CLICKS_THRESHOLD}) - will not reactivate during monitoring`);
              
              // Stop this monitoring since we're now in pause state
              clearInterval(interval);
              activeStatusChecks.delete(campaignId);
              
              // Start pause monitoring instead
              startMinutelyPauseStatusCheck(campaignId, trafficstarCampaignId);
              
              // Mark as staying paused during monitoring in the database
              await db.update(campaigns)
                .set({
                  lastTrafficSenderStatus: 'staying_paused_low_clicks',
                  lastTrafficSenderAction: new Date(),
                  updatedAt: new Date()
                })
                .where(eq(campaigns.id, campaignId));
              
              console.log(`✅ Marked campaign ${campaignId} as 'staying_paused_low_clicks' in database`);
            }
          }
        } catch (error) {
          console.error(`❌ Error handling paused campaign ${trafficstarCampaignId} during active monitoring:`, error);
        }
      } else {
        console.log(`⚠️ Campaign ${trafficstarCampaignId} has unknown status during monitoring: ${status}`);
      }
    } catch (error) {
      console.error(`❌ Error checking campaign ${trafficstarCampaignId} status during active monitoring:`, error);
    }
  }, 60 * 1000); // Check every minute
  
  // Store the interval so we can clear it later if needed
  activeStatusChecks.set(campaignId, interval);
}

/**
 * Start minute-by-minute check for campaign PAUSE status
 * This ensures the campaign stays paused when it should be paused
 * @param campaignId The campaign ID in our system
 * @param trafficstarCampaignId The TrafficStar campaign ID
 */
function startMinutelyPauseStatusCheck(campaignId: number, trafficstarCampaignId: string) {
  // Clear existing interval if there is one
  if (pauseStatusChecks.has(campaignId)) {
    clearInterval(pauseStatusChecks.get(campaignId));
    pauseStatusChecks.delete(campaignId);
  }
  
  // Also clear any active status checks for this campaign
  if (activeStatusChecks.has(campaignId)) {
    clearInterval(activeStatusChecks.get(campaignId));
    activeStatusChecks.delete(campaignId);
  }
  
  console.log(`🔄 Starting minute-by-minute PAUSE status check for campaign ${trafficstarCampaignId}`);
  
  // Set up a new interval that runs every minute
  const interval = setInterval(async () => {
    console.log(`⏱️ Running minute check for campaign ${trafficstarCampaignId} pause status`);
    
    try {
      // Get the current status
      const status = await getTrafficStarCampaignStatus(trafficstarCampaignId);
      
      if (status === 'paused') {
        console.log(`⏹️ Campaign ${trafficstarCampaignId} is still paused as expected - monitoring will continue`);
        
        // Check current spent value and remaining clicks periodically
        // Only fetch active URLs for the campaign to improve performance
        const campaign = await db.query.campaigns.findFirst({
          where: (c, { eq }) => eq(c.id, campaignId),
          with: { 
            urls: {
              where: (urls, { eq }) => eq(urls.status, 'active')
            } 
          }
        }) as (Campaign & { urls: UrlWithActiveStatus[] }) | null;
        
        // Get current pause duration if we've auto-paused the campaign
        if (campaign && campaign.lastTrafficSenderAction && 
            (campaign.lastTrafficSenderStatus === 'auto_paused_low_clicks' || 
             campaign.lastTrafficSenderStatus === 'auto_paused_low_clicks_during_monitoring')) {
          
          const pauseDuration = Date.now() - campaign.lastTrafficSenderAction.getTime();
          const pauseMinutes = Math.floor(pauseDuration / (60 * 1000));
          
          // Check if we're past the wait period for low clicks (postPauseCheckMinutes or default 2 minutes)
          const postPauseMinutes = campaign.postPauseCheckMinutes || 2;
          
          console.log(`⏱️ Campaign ${trafficstarCampaignId} has been paused for ${pauseMinutes} minutes (check after ${postPauseMinutes} minutes)`);
          
          if (pauseMinutes >= postPauseMinutes) {
            console.log(`⏱️ ${pauseMinutes} minutes elapsed (>= ${postPauseMinutes}) since pausing - checking spent value and remaining clicks`);
            
            // Get spent value to determine next actions
            const spentValue = await getTrafficStarCampaignSpentValue(campaignId, trafficstarCampaignId);
            
            if (spentValue !== null) {
              // Calculate total remaining clicks
              let totalRemainingClicks = 0;
              console.log(`🔍 PAUSE MONITORING: Checking remaining clicks for ${campaign.urls.length} URLs in campaign ${trafficstarCampaignId}`);
              for (const url of campaign.urls) {
                console.log(`🔍 URL ID: ${url.id}, status: ${url.status}, clickLimit: ${url.clickLimit}, clicks: ${url.clicks}`);
                if (url.status === 'active') {
                  const remainingClicks = url.clickLimit - url.clicks;
                  const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
                  totalRemainingClicks += validRemaining;
                  console.log(`✅ Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
                } else {
                  console.log(`❌ Skipping URL ID: ${url.id} with status: ${url.status}`);
                }
              }
              
              // Check if clicks have been replenished
              // Need to fetch campaign settings to get the threshold
              const campaignResult = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
              const campaignSettings = campaignResult[0];
              const MINIMUM_CLICKS_THRESHOLD = campaignSettings?.minPauseClickThreshold || 5000; // Use campaign-specific threshold for pausing
              const REMAINING_CLICKS_THRESHOLD = campaignSettings?.minActivateClickThreshold || 15000; // Use campaign-specific threshold for activation
              
              if (totalRemainingClicks >= REMAINING_CLICKS_THRESHOLD) {
                console.log(`✅ Campaign ${trafficstarCampaignId} now has ${totalRemainingClicks} remaining clicks (>= ${REMAINING_CLICKS_THRESHOLD}) - will attempt reactivation after pause period`);
                
                try {
                  // Set end time to 23:59 UTC today
                  const today = new Date();
                  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
                  const endTimeStr = `${todayStr} 23:59:00`;
                  
                  // First set the end time, then activate
                  await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), endTimeStr);
                  
                  // Attempt to reactivate the campaign
                  await trafficStarService.activateCampaign(Number(trafficstarCampaignId));
                  
                  console.log(`✅ REACTIVATED campaign ${trafficstarCampaignId} after pause period - it now has ${totalRemainingClicks} remaining clicks`);
                  
                  // Mark as reactivated after pause in the database
                  await db.update(campaigns)
                    .set({
                      lastTrafficSenderStatus: 'reactivated_after_pause',
                      lastTrafficSenderAction: new Date(),
                      updatedAt: new Date()
                    })
                    .where(eq(campaigns.id, campaignId));
                  
                  console.log(`✅ Marked campaign ${campaignId} as 'reactivated_after_pause' in database`);
                  
                  // Stop pause monitoring and start active monitoring
                  clearInterval(interval);
                  pauseStatusChecks.delete(campaignId);
                  startMinutelyStatusCheck(campaignId, trafficstarCampaignId);
                } catch (error) {
                  console.error(`❌ Error reactivating campaign ${trafficstarCampaignId} after pause:`, error);
                }
              } else {
                console.log(`⏹️ Campaign ${trafficstarCampaignId} still has only ${totalRemainingClicks} remaining clicks (< ${REMAINING_CLICKS_THRESHOLD}) - continuing pause monitoring`);
                
                // Update the status in the database to reflect we checked after the pause period
                await db.update(campaigns)
                  .set({
                    lastTrafficSenderStatus: 'checked_after_pause_still_low_clicks',
                    lastTrafficSenderAction: new Date(),
                    updatedAt: new Date()
                  })
                  .where(eq(campaigns.id, campaignId));
                
                console.log(`✅ Marked campaign ${campaignId} as 'checked_after_pause_still_low_clicks' in database`);
              }
            }
          }
        }
      } else if (status === 'active') {
        console.log(`⚠️ Campaign ${trafficstarCampaignId} was found active but should be paused - will attempt to pause again`);
        
        try {
          // Get the campaign details to check URLs and remaining clicks
          // Only fetch active URLs for the campaign to improve performance
          const campaign = await db.query.campaigns.findFirst({
            where: (campaign, { eq }) => eq(campaign.id, campaignId),
            with: { 
              urls: {
                where: (urls, { eq }) => eq(urls.status, 'active')
              } 
            }
          }) as (Campaign & { urls: UrlWithActiveStatus[] }) | null;
          
          if (campaign && campaign.urls && campaign.urls.length > 0) {
            // Calculate total remaining clicks
            let totalRemainingClicks = 0;
            for (const url of campaign.urls) {
              if (url.status === 'active') {
                const remainingClicks = url.clickLimit - url.clicks;
                totalRemainingClicks += remainingClicks > 0 ? remainingClicks : 0;
              }
            }
            
            // Get campaign thresholds
            const campaignResult = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
            const campaignSettings = campaignResult[0];
            const MINIMUM_CLICKS_THRESHOLD = campaignSettings?.minPauseClickThreshold || 5000; // Pause threshold
            const MAXIMUM_CLICKS_THRESHOLD = campaignSettings?.minActivateClickThreshold || 15000; // Activate threshold
            
            // Create hysteresis zone - a buffer between thresholds to prevent oscillation
            // Only re-pause if clearly below the activation threshold with a 10% buffer
            const HYSTERESIS_THRESHOLD = MAXIMUM_CLICKS_THRESHOLD * 0.9;
            
            if (totalRemainingClicks < HYSTERESIS_THRESHOLD) {
              console.log(`Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks (< ${HYSTERESIS_THRESHOLD}) - re-pausing campaign`);
              
              // Set current date/time for end time
              const now = new Date();
              const formattedDateTime = now.toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS
              
              // First pause the campaign
              await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
              
              // Then set its end time
              await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), formattedDateTime);
            } else {
              console.log(`Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks in hysteresis zone (>= ${HYSTERESIS_THRESHOLD}) - not re-pausing to prevent oscillation`);
              return; // Exit early without taking any action
            }
            
            console.log(`✅ RE-PAUSED campaign ${trafficstarCampaignId} during pause monitoring - it was found active`);
            
            // Mark as re-paused during monitoring in the database
            await db.update(campaigns)
              .set({
                lastTrafficSenderStatus: 're_paused_during_monitoring',
                lastTrafficSenderAction: new Date(),
                updatedAt: new Date()
              })
              .where(eq(campaigns.id, campaignId));
            
            console.log(`✅ Marked campaign ${campaignId} as 're_paused_during_monitoring' in database`);
          }
        } catch (error) {
          console.error(`❌ Error re-pausing campaign ${trafficstarCampaignId} during pause monitoring:`, error);
        }
      } else {
        console.log(`⚠️ Campaign ${trafficstarCampaignId} has unknown status during pause monitoring: ${status}`);
      }
    } catch (error) {
      console.error(`❌ Error checking campaign ${trafficstarCampaignId} status during pause monitoring:`, error);
    }
  }, 60 * 1000); // Check every minute
  
  // Store the interval so we can clear it later if needed
  pauseStatusChecks.set(campaignId, interval);
}

/**
 * Start minute-by-minute check for empty URL campaigns
 * This function is specifically for monitoring campaigns that have no active URLs
 * It ensures they stay paused until URLs become active again
 * @param campaignId The campaign ID in our system
 * @param trafficstarCampaignId The TrafficStar campaign ID
 */
function startEmptyUrlStatusCheck(campaignId: number, trafficstarCampaignId: string) {
  // Clear existing interval if there is one
  if (emptyUrlStatusChecks.has(campaignId)) {
    clearInterval(emptyUrlStatusChecks.get(campaignId));
    emptyUrlStatusChecks.delete(campaignId);
  }
  
  // Also clear any active status checks for this campaign
  if (activeStatusChecks.has(campaignId)) {
    clearInterval(activeStatusChecks.get(campaignId));
    activeStatusChecks.delete(campaignId);
  }
  
  // Also clear any pause status checks for this campaign
  if (pauseStatusChecks.has(campaignId)) {
    clearInterval(pauseStatusChecks.get(campaignId));
    pauseStatusChecks.delete(campaignId);
  }
  
  console.log(`🔄 Starting minute-by-minute EMPTY URL status check for campaign ${trafficstarCampaignId}`);
  
  // Set up a new interval that runs every minute
  const interval = setInterval(async () => {
    console.log(`⏱️ Running empty URL check for campaign ${trafficstarCampaignId}`);
    
    try {
      // First check if there are any active URLs now
      const activeUrls = await db.select()
        .from(urls)
        .where(
          and(
            eq(urls.campaignId, campaignId),
            eq(urls.status, 'active')
          )
        );
      
      // If there are now active URLs, we can stop this check
      if (activeUrls.length > 0) {
        console.log(`✅ Campaign ${campaignId} now has ${activeUrls.length} active URLs - stopping empty URL monitoring`);
        
        clearInterval(interval);
        emptyUrlStatusChecks.delete(campaignId);
        
        // Update the status in database
        await db.update(campaigns)
          .set({
            lastTrafficSenderStatus: 'active_urls_available',
            lastTrafficSenderAction: new Date(),
            updatedAt: new Date()
          })
          .where(eq(campaigns.id, campaignId));
          
        return;
      }
      
      // If we still have no active URLs, ensure the campaign is paused
      const status = await getTrafficStarCampaignStatus(trafficstarCampaignId);
      
      if (status === 'active') {
        console.log(`⚠️ Campaign ${trafficstarCampaignId} was found active but has no active URLs - re-pausing it`);
        
        try {
          // Set current date/time for end time
          const now = new Date();
          const formattedDateTime = now.toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS
          
          // First pause the campaign
          await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
          console.log(`Successfully paused campaign ${trafficstarCampaignId}`);
          
          // Then set its end time
          await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), formattedDateTime);
          console.log(`Setting campaign ${trafficstarCampaignId} end time to: ${formattedDateTime}`);
          console.log(`Successfully updated end time for campaign ${trafficstarCampaignId}`);
          
          // Update the status in database
          await db.update(campaigns)
            .set({
              lastTrafficSenderStatus: 're_paused_no_active_urls',
              lastTrafficSenderAction: new Date(),
              updatedAt: new Date()
            })
            .where(eq(campaigns.id, campaignId));
          
          console.log(`✅ RE-PAUSED campaign ${trafficstarCampaignId} during empty URL monitoring`);
        } catch (error) {
          console.error(`❌ Error re-pausing campaign ${trafficstarCampaignId} during empty URL monitoring:`, error);
        }
      } else if (status === 'paused') {
        console.log(`⏹️ Campaign ${trafficstarCampaignId} is correctly paused with no active URLs - continuing monitoring`);
      }
    } catch (error) {
      console.error(`❌ Error in empty URL status check for campaign ${trafficstarCampaignId}:`, error);
    }
  }, 60 * 1000); // Check every minute
  
  // Store the interval so we can clear it later if needed
  emptyUrlStatusChecks.set(campaignId, interval);
}

/**
 * Pause TrafficStar campaign
 * @param trafficstarCampaignId The TrafficStar campaign ID
 * @returns True if the pause operation was successful, false otherwise
 */
export async function pauseTrafficStarCampaign(trafficstarCampaignId: string): Promise<boolean> {
  try {
    console.log(`⏹️ Attempting to pause TrafficStar campaign ${trafficstarCampaignId}`);
    
    // Get current status first to see if it's already paused
    const status = await getTrafficStarCampaignStatus(trafficstarCampaignId);
    
    if (status === 'paused') {
      console.log(`TrafficStar campaign ${trafficstarCampaignId} is already paused, no action needed`);
      return true;
    }
    
    // Set current date/time for end time
    const now = new Date();
    const formattedDateTime = now.toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS
    
    // Pause the campaign
    await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
    
    // Set its end time
    await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), formattedDateTime);
    
    console.log(`✅ Successfully paused TrafficStar campaign ${trafficstarCampaignId} with end time ${formattedDateTime}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error pausing TrafficStar campaign ${trafficstarCampaignId}:`, error);
    return false;
  }
}

/**
 * Process Traffic Generator for a campaign
 * @param campaignId The campaign ID
 * @param forceMode Optional mode for testing - can be 'force_activate' or 'force_pause'
 */
export async function processTrafficGenerator(campaignId: number, forceMode?: string) {
  try {
    console.log(`Processing Traffic Generator for campaign ${campaignId}`);
    
    // Get the campaign details with URLs
    // Only fetch active URLs for the campaign to improve performance
    const campaign = await db.query.campaigns.findFirst({
      where: (campaign, { eq }) => eq(campaign.id, campaignId),
      with: {
        urls: {
          where: (urls, { eq }) => eq(urls.status, 'active')
        }
      }
    }) as (Campaign & { urls: UrlWithActiveStatus[] }) | null;
    
    if (!campaign) {
      console.error(`Campaign ${campaignId} not found`);
      return;
    }
    
    // Skip if traffic generator is not enabled
    if (!campaign.trafficGeneratorEnabled && !forceMode) {
      console.log(`Traffic Generator not enabled for campaign ${campaignId} - skipping`);
      return;
    }
    
    if (!campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
      console.error(`Campaign ${campaignId} has no TrafficStar ID - skipping`);
      return;
    }
    
    console.log(`Processing Traffic Generator for campaign ${campaignId} with TrafficStar ID ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}`);
    
    // Handle force mode for testing
    if (forceMode === 'force_activate') {
      console.log(`💪 FORCE MODE: Forcing activation of campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}`);
      
      try {
        // Set end time to 23:59 UTC today
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const endTimeStr = `${todayStr} 23:59:00`;
        
        // First set the end time, then activate
        await trafficStarService.updateCampaignEndTime(Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id), endTimeStr);
        await trafficStarService.activateCampaign(Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id));
        
        console.log(`✅ FORCE MODE: Successfully activated campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}`);
        
        // Start minute-by-minute monitoring
        startMinutelyStatusCheck(campaignId, campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
        
        return;
      } catch (error) {
        console.error(`❌ FORCE MODE: Error activating campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}:`, error);
        return;
      }
    } else if (forceMode === 'force_pause') {
      console.log(`💪 FORCE MODE: Forcing pause of campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}`);
      
      try {
        // Pause the campaign
        await pauseTrafficStarCampaign(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
        
        console.log(`✅ FORCE MODE: Successfully paused campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}`);
        
        // Start minute-by-minute pause monitoring
        startMinutelyPauseStatusCheck(campaignId, campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
        
        return;
      } catch (error) {
        console.error(`❌ FORCE MODE: Error pausing campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}:`, error);
        return;
      }
    }
    
    // Get the current spent value for the campaign
    const spentValue = await getTrafficStarCampaignSpentValue(campaignId, campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
    
    if (spentValue === null) {
      console.error(`Failed to get spent value for campaign ${campaignId}`);
      return;
    }
    
    console.log(`Campaign ${campaignId} spent value: $${spentValue.toFixed(4)}`);
    
    // Handle the campaign based on spent value and clicks
    await handleCampaignBySpentValue(campaignId, campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id, spentValue);
  } catch (error) {
    console.error(`Error processing Traffic Generator for campaign ${campaignId}:`, error);
  }
}

/**
 * Run traffic generator for all campaigns
 * This function should be scheduled to run periodically
 */
export async function runTrafficGeneratorForAllCampaigns() {
  try {
    console.log('Running Traffic Generator for all enabled campaigns');
    
    // Get all campaigns with traffic generator enabled
    // Use a more efficient query with only necessary fields
    const enabledCampaigns = await db.query.campaigns.findMany({
      columns: {
        id: true,
        trafficstarCampaignId: true,
      },
      where: (campaign, { eq }) => eq(campaign.trafficGeneratorEnabled, true),
    });
    
    if (enabledCampaigns.length === 0) {
      console.log('No campaigns have Traffic Generator enabled - skipping');
      return;
    }
    
    console.log(`Processing ${enabledCampaigns.length} campaigns with traffic generator enabled`);
    
    // Set a reasonable concurrency limit to prevent overwhelming the system
    const CONCURRENCY_LIMIT = 2;
    const chunks = [];
    
    // Split campaigns into chunks based on concurrency limit
    for (let i = 0; i < enabledCampaigns.length; i += CONCURRENCY_LIMIT) {
      chunks.push(enabledCampaigns.slice(i, i + CONCURRENCY_LIMIT));
    }
    
    // Process each chunk of campaigns in parallel
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (campaign) => {
          try {
            await processTrafficGenerator(campaign.id);
          } catch (error) {
            console.error(`Error processing campaign ${campaign.id}:`, error);
          }
        })
      );
      
      // Small break between chunks to prevent resource exhaustion
      if (chunks.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('Finished running Traffic Generator for all enabled campaigns');
  } catch (error) {
    console.error('Error running Traffic Generator for all campaigns:', error);
  }
}

/**
 * Check for campaigns with no active URLs and pause their TrafficStar campaigns
 * This function is separate from other Traffic Generator functionality
 * It only handles the specific case of no active URLs in a campaign
 */
export async function pauseTrafficStarForEmptyCampaigns() {
  try {
    console.log('Checking for campaigns with no active URLs to pause TrafficStar campaigns');
    
    // Get all campaigns with TrafficStar campaign IDs
    const campaignsWithTrafficStar = await db.select()
      .from(campaigns)
      .where(sql`trafficstar_campaign_id is not null AND traffic_generator_enabled = true`);
    
    if (!campaignsWithTrafficStar || campaignsWithTrafficStar.length === 0) {
      console.log('No campaigns with TrafficStar integration found');
      return;
    }
    
    console.log(`Found ${campaignsWithTrafficStar.length} campaigns with TrafficStar integration`);
    
    // Process each campaign
    for (const campaign of campaignsWithTrafficStar) {
      if (!campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) continue;
      
      // Skip campaigns that are in a wait period after enabling
      if (campaign.lastTrafficSenderStatus === 'auto_reactivated_low_spend' || 
          campaign.lastTrafficSenderStatus === 'reactivated_during_monitoring') {
          
        // Check if we're within the wait period
        if (campaign.lastTrafficSenderAction) {
          const waitDuration = Date.now() - campaign.lastTrafficSenderAction.getTime();
          const waitMinutes = Math.floor(waitDuration / (60 * 1000));
          const requiredWaitMinutes = campaign.postPauseCheckMinutes || 10; // Default to 10 minutes if not set
          
          if (waitMinutes < requiredWaitMinutes) {
            console.log(`Campaign ${campaign.id} was recently activated (${waitMinutes}/${requiredWaitMinutes} minutes ago) - skipping empty URL check`);
            continue;
          }
        }
      }
      
      // Get all active URLs for this campaign
      const activeUrls = await db.select()
        .from(urls)
        .where(
          and(
            eq(urls.campaignId, campaign.id),
            eq(urls.status, 'active')
          )
        );
      
      console.log(`Campaign ${campaign.id} (TrafficStar ID: ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}) has ${activeUrls.length} active URLs`);
      
      // If there are no active URLs, pause the TrafficStar campaign
      if (activeUrls.length === 0) {
        console.log(`Campaign ${campaign.id} has NO active URLs - will pause TrafficStar campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}`);
        
        // Check the current status of the TrafficStar campaign
        const currentStatus = await getTrafficStarCampaignStatus(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
        
        if (currentStatus === 'active') {
          console.log(`TrafficStar campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} is ACTIVE but has no active URLs - pausing it`);
          
          try {
            // Set current date/time for end time
            const now = new Date();
            const formattedDateTime = now.toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS
            
            // First pause the campaign
            await trafficStarService.pauseCampaign(Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id));
            console.log(`Successfully paused campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}`);
            
            // Then set its end time
            await trafficStarService.updateCampaignEndTime(Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id), formattedDateTime);
            console.log(`Setting campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} end time to: ${formattedDateTime}`);
            console.log(`Successfully updated end time for campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}`);
            console.log(`Confirmed end time update for campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}`);
            
            console.log(`✅ PAUSED TrafficStar campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} due to no active URLs`);
            
            // Mark as auto-paused in the database
            await db.update(campaigns)
              .set({
                lastTrafficSenderStatus: 'auto_paused_no_active_urls',
                lastTrafficSenderAction: new Date(),
                updatedAt: new Date()
              })
              .where(eq(campaigns.id, campaign.id));
            
            // Start pause status monitoring for this specific scenario
            startEmptyUrlStatusCheck(campaign.id, campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
          } catch (error) {
            console.error(`❌ Error pausing TrafficStar campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}:`, error);
          }
        } else if (currentStatus === 'paused') {
          console.log(`TrafficStar campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} is already PAUSED with no active URLs - continuing monitoring`);
          
          // Update status in database
          await db.update(campaigns)
            .set({
              lastTrafficSenderStatus: 'paused_no_active_urls',
              lastTrafficSenderAction: new Date(),
              updatedAt: new Date()
            })
            .where(eq(campaigns.id, campaign.id));
          
          // Ensure we're monitoring for empty URL scenario specifically
          startEmptyUrlStatusCheck(campaign.id, campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
        } else {
          console.log(`TrafficStar campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} has status: ${currentStatus || 'unknown'} - will monitor`);
        }
      } else {
        // If there are active URLs, and the campaign was previously marked as paused due to no active URLs,
        // we should update its status and STOP the empty URL check monitoring
        if (campaign.lastTrafficSenderStatus === 'auto_paused_no_active_urls' || 
            campaign.lastTrafficSenderStatus === 'paused_no_active_urls') {
          console.log(`Campaign ${campaign.id} now has ${activeUrls.length} active URLs - updating status and stopping empty URL monitoring`);
          
          // Stop the empty URL status check since we now have active URLs
          if (emptyUrlStatusChecks.has(campaign.id)) {
            clearInterval(emptyUrlStatusChecks.get(campaign.id));
            emptyUrlStatusChecks.delete(campaign.id);
            console.log(`✅ Stopped empty URL monitoring for campaign ${campaign.id} as it now has active URLs`);
          }
          
          await db.update(campaigns)
            .set({
              lastTrafficSenderStatus: 'active_urls_available',
              lastTrafficSenderAction: new Date(),
              updatedAt: new Date()
            })
            .where(eq(campaigns.id, campaign.id));
        }
      }
    }
  } catch (error) {
    console.error('Error in pauseTrafficStarForEmptyCampaigns:', error);
  }
}

/**
 * Initialize Traffic Generator scheduler
 * This function sets up a periodic job to run the traffic generator
 */
export function initializeTrafficGeneratorScheduler() {
  console.log('Initializing Traffic Generator scheduler');
  
  // Run the traffic generator on startup
  console.log('Running initial traffic generator check on startup');
  runTrafficGeneratorForAllCampaigns();
  
  // Also run the empty URL check on startup (after 10 seconds to allow other initializations)
  setTimeout(() => {
    console.log('Running initial empty URL check');
    pauseTrafficStarForEmptyCampaigns();
  }, 10 * 1000);
  
  // Set up a periodic job to run the traffic generator every 5 minutes
  setInterval(() => {
    console.log('Running scheduled Traffic Generator check');
    runTrafficGeneratorForAllCampaigns();
  }, 5 * 60 * 1000); // 5 minutes
  
  // Set up a periodic job to check for empty campaigns every 3 minutes
  setInterval(() => {
    console.log('Running scheduled empty URL check');
    pauseTrafficStarForEmptyCampaigns();
  }, 3 * 60 * 1000); // 3 minutes
  
  console.log('Traffic Generator scheduler initialized successfully');
}

/**
 * Debug function to test Traffic Generator with detailed logging
 * This function helps test campaigns with different click quantities
 * @param campaignId The campaign ID to test
 * @returns Debug information about the process
 */
export async function debugProcessCampaign(campaignId: number) {
  try {
    console.log(`🔍 DEBUG: Testing Traffic Generator for campaign ${campaignId}`);
    
    // Get the campaign details with URLs
    // Only fetch active URLs for the campaign to improve performance
    const campaign = await db.query.campaigns.findFirst({
      where: (campaign, { eq }) => eq(campaign.id, campaignId),
      with: {
        urls: {
          where: (urls, { eq }) => eq(urls.status, 'active')
        }
      }
    }) as (Campaign & { urls: UrlWithActiveStatus[] }) | null;
    
    if (!campaign) {
      return { success: false, error: `Campaign ${campaignId} not found` };
    }
    
    if (!campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
      return { success: false, error: `Campaign ${campaignId} has no TrafficStar ID` };
    }
    
    // Get all the debugging info
    const spentValue = await getTrafficStarCampaignSpentValue(campaignId, campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
    const status = await getTrafficStarCampaignStatus(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
    
    // Calculate remaining clicks
    let totalRemainingClicks = 0;
    let activeUrls = 0;
    let inactiveUrls = 0;
    let urlDetails = [];
    
    for (const url of campaign.urls) {
      const isActive = url.status === 'active';
      const remainingClicks = url.clickLimit - url.clicks;
      const effectiveRemaining = remainingClicks > 0 ? remainingClicks : 0;
      
      urlDetails.push({
        id: url.id,
        name: url.name,
        status: url.status,
        clickLimit: url.clickLimit,
        clicks: url.clicks,
        remainingClicks: effectiveRemaining,
        isActive
      });
      
      if (isActive) {
        totalRemainingClicks += effectiveRemaining;
        activeUrls++;
      } else {
        inactiveUrls++;
      }
    }
    
    // Return all the debug information
    return {
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        trafficstarCampaignId: campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id,
        trafficGeneratorEnabled: campaign.trafficGeneratorEnabled,
        lastTrafficSenderStatus: campaign.lastTrafficSenderStatus,
        lastTrafficSenderAction: campaign.lastTrafficSenderAction,
        postPauseCheckMinutes: campaign.postPauseCheckMinutes || 2
      },
      status: status,
      spentValue: spentValue !== null ? `$${spentValue.toFixed(4)}` : null,
      clicks: {
        totalRemainingClicks,
        totalUrls: campaign.urls.length,
        activeUrls,
        inactiveUrls,
        urlDetails
      },
      thresholds: {
        spentThreshold: 10.0,
        minimumClicksThreshold: 5000,
        remainingClicksThreshold: 15000
      }
    };
  } catch (error) {
    console.error(`Error in debug process:`, error);
    return { success: false, error: String(error) };
  }
}