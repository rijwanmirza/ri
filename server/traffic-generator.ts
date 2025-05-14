/**
 * Traffic Generator Module
 * 
 * This module manages the traffic generator functionality,
 * which checks TrafficStar campaign status and manages campaigns
 * based on the traffic generator settings.
 */

import { trafficStarService } from './trafficstar-service';
import { db } from './db';
import { campaigns, urls, childTrafficstarCampaigns, type Campaign, type Url, type ChildTrafficstarCampaign } from '../shared/schema';
import { eq, and, sql, lte, gte, asc } from 'drizzle-orm';
import { getSpentValueForDate } from './spent-value';
import axios from 'axios';

// Extended URL type with active status
interface UrlWithActiveStatus extends Url {
  isActive: boolean;
}

/**
 * Get TrafficStar campaign status - ALWAYS uses real-time data
 * @param trafficstarCampaignId The TrafficStar campaign ID
 * @returns The campaign status (active, paused, etc.) or null if error
 */
export async function getTrafficStarCampaignStatus(trafficstarCampaignId: string | null): Promise<string | null> {
  // If no campaign ID, return null immediately
  if (!trafficstarCampaignId) {
    console.log('Cannot get status: No TrafficStar campaign ID provided');
    return null;
  }
  
  try {
    console.log(`TRAFFIC-GENERATOR: Getting REAL-TIME status for campaign ${trafficstarCampaignId}`);
    
    // Use trafficStarService to get campaign status - uses getCampaignStatus to ensure real-time data
    const status = await trafficStarService.getCampaignStatus(Number(trafficstarCampaignId));
    
    if (!status) {
      console.error(`Failed to get TrafficStar campaign ${trafficstarCampaignId} status`);
      return null;
    }
    
    // Return the campaign status (active or paused)
    console.log(`TRAFFIC-GENERATOR: TrafficStar campaign ${trafficstarCampaignId} REAL status is ${status.status}, active=${status.active}`);
    
    // Convert status object to string status for compatibility with existing code
    return status.active ? 'active' : 'paused';
  } catch (error) {
    console.error('Error getting TrafficStar campaign status:', error);
    return null;
  }
}

/**
 * Helper function to safely handle campaign status checks
 * This avoids TypeScript errors when comparing status from null campaign IDs
 * @param actualStatus The actual status returned from getTrafficStarCampaignStatus
 * @param expectedStatus The status we're checking for
 * @returns True if status matches expected, false otherwise
 */
function statusMatches(actualStatus: string | null, expectedStatus: string): boolean {
  return actualStatus === expectedStatus;
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
    
    // Use the existing spent value tracking functionality
    const spentValue = await getSpentValueForDate(Number(trafficstarCampaignId), formattedDate);
    
    if (spentValue === null) {
      console.error(`Failed to get spent value for campaign ${trafficstarCampaignId}`);
      
      // Set a default value for development testing to ensure the traffic generator logic continues
      if (process.env.NODE_ENV === 'development') {
        console.log('DEVELOPMENT MODE: Using default spent value of $5.0000 for traffic generator testing');
        return 5.0; // Default below $10 threshold to test logic
      }
      
      return null;
    }
    
    // Convert spent value to number - remove $ and parse as float
    const numericValue = parseFloat(spentValue.replace('$', ''));
    console.log(`Campaign ${trafficstarCampaignId} spent value: $${numericValue.toFixed(4)}`);
    
    return numericValue;
  } catch (error) {
    console.error(`Error getting spent value for campaign ${trafficstarCampaignId}:`, error);
    
    // Set a default value for development testing to ensure the traffic generator logic continues
    if (process.env.NODE_ENV === 'development') {
      console.log('DEVELOPMENT MODE: Using default spent value of $5.0000 for traffic generator testing');
      return 5.0; // Default below $10 threshold to test logic
    }
    
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
  
  try {
    // Fetch campaign-specific thresholds if available
    const campaignSettings = await db.query.campaigns.findFirst({
      where: (campaign, { eq }) => eq(campaign.id, campaignId),
      columns: {
        minPauseClickThreshold: true,
        minActivateClickThreshold: true,
        highSpendPauseThreshold: true,
        highSpendActivateThreshold: true
      }
    });
    
    // Determine which thresholds to use based on spent value
    let MINIMUM_CLICKS_THRESHOLD;
    let REMAINING_CLICKS_THRESHOLD;
    
    if (spentValue >= THRESHOLD) {
      // HIGH SPEND ($10+) - use high spend thresholds
      MINIMUM_CLICKS_THRESHOLD = campaignSettings?.highSpendPauseThreshold || 1000;
      REMAINING_CLICKS_THRESHOLD = campaignSettings?.highSpendActivateThreshold || 5000;
      console.log(`Using HIGH SPEND thresholds: Pause at ${MINIMUM_CLICKS_THRESHOLD} clicks, Activate at ${REMAINING_CLICKS_THRESHOLD} clicks`);
    } else {
      // LOW SPEND (< $10) - use regular thresholds
      MINIMUM_CLICKS_THRESHOLD = campaignSettings?.minPauseClickThreshold || 5000;
      REMAINING_CLICKS_THRESHOLD = campaignSettings?.minActivateClickThreshold || 15000;
      console.log(`Using LOW SPEND thresholds: Pause at ${MINIMUM_CLICKS_THRESHOLD} clicks, Activate at ${REMAINING_CLICKS_THRESHOLD} clicks`);
    }
    
    console.log(`TRAFFIC-GENERATOR: Handling campaign ${trafficstarCampaignId} by spent value - current spent: $${spentValue.toFixed(4)}`);
    
    if (spentValue < THRESHOLD) {
      // Handle campaign with less than $10 spent
      console.log(`🔵 LOW SPEND ($${spentValue.toFixed(4)} < $${THRESHOLD.toFixed(2)}): Campaign ${trafficstarCampaignId} has spent less than $${THRESHOLD.toFixed(2)}`);
      
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
          // Since we're already filtering for active URLs in the query, all URLs here are active
          const remainingClicks = url.clickLimit - url.clicks;
          const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
          totalRemainingClicks += validRemaining;
          console.log(`✅ Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
        }
        
        console.log(`📊 Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} total remaining clicks across all active URLs`);
        
        // Handle child TrafficStar campaigns based on remaining clicks
        await handleChildTrafficstarCampaigns(campaignId, totalRemainingClicks);
        
        // Get real-time campaign status
        const currentStatus = await getTrafficStarCampaignStatus(trafficstarCampaignId);
        console.log(`📊 Campaign ${trafficstarCampaignId} current status: ${currentStatus}`);
        
        // Handle based on remaining clicks and current status
        if (totalRemainingClicks >= REMAINING_CLICKS_THRESHOLD && !statusMatches(currentStatus, 'active')) {
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
              // Use type assertion since we know trafficstarCampaignId exists in this context
              startMinutelyStatusCheck(campaignId, trafficstarCampaignId as string);
              
              return;
            } catch (activateError) {
              console.error(`❌ Failed to auto-reactivate low spend campaign ${trafficstarCampaignId}:`, activateError);
            }
          } catch (error) {
            console.error(`❌ Error auto-reactivating low spend campaign ${trafficstarCampaignId}:`, error);
          }
        } else if (totalRemainingClicks <= MINIMUM_CLICKS_THRESHOLD && statusMatches(currentStatus, 'active')) {
          // Case 2: Low remaining clicks (≤5,000) and active - PAUSE CAMPAIGN
          console.log(`⏹️ Campaign ${trafficstarCampaignId} only has ${totalRemainingClicks} remaining clicks (<= ${MINIMUM_CLICKS_THRESHOLD}) - will pause campaign`);
          
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
                // Use type assertion since we know trafficstarCampaignId exists in this context
                startMinutelyPauseStatusCheck(campaignId, trafficstarCampaignId as string);
                
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
        } else if (totalRemainingClicks >= REMAINING_CLICKS_THRESHOLD && statusMatches(currentStatus, 'active')) {
          // Case 3: High remaining clicks and already active - CONTINUE MONITORING
          console.log(`✅ Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks and is already active - continuing monitoring`);
          
          // Ensure we're monitoring this campaign
          // Use type assertion since we know trafficstarCampaignId exists in this context
          startMinutelyStatusCheck(campaignId, trafficstarCampaignId as string);
          
          // Mark status in database
          await db.update(campaigns)
            .set({
              lastTrafficSenderStatus: 'active_with_sufficient_clicks',
              lastTrafficSenderAction: new Date(),
              updatedAt: new Date()
            })
            .where(eq(campaigns.id, campaignId));
          
          return;
        } else if (totalRemainingClicks <= MINIMUM_CLICKS_THRESHOLD && !statusMatches(currentStatus, 'active')) {
          // Case 4: Low remaining clicks and already paused - CONTINUE PAUSE MONITORING
          console.log(`⏹️ Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks (<= ${MINIMUM_CLICKS_THRESHOLD}) and is already paused - monitoring to ensure it stays paused`);
          
          // Ensure we're monitoring this campaign's pause status
          // Use type assertion since we know trafficstarCampaignId exists in this context
          startMinutelyPauseStatusCheck(campaignId, trafficstarCampaignId as string);
          
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
      
      // Check if the campaign is already in high_spend state
      const existingCampaign = await db.query.campaigns.findFirst({
        where: (c, { eq, and }) => and(
          eq(c.id, campaignId),
          eq(c.lastTrafficSenderStatus, 'high_spend')
        )
      });
      
      if (existingCampaign) {
        // Campaign is already in high_spend state, just log this
        console.log(`ℹ️ Campaign ${campaignId} is already in 'high_spend' state - continuing monitoring`);
      } else {
        // First time high spend detected - mark this in the database
        await db.update(campaigns)
          .set({
            lastTrafficSenderStatus: 'high_spend',
            lastTrafficSenderAction: new Date(),
            updatedAt: new Date()
          })
          .where(eq(campaigns.id, campaignId));
        
        console.log(`✅ Marked campaign ${campaignId} as 'high_spend' in database for the first time`);
      }
    }
  } catch (error) {
    console.error(`Error handling campaign ${trafficstarCampaignId} by spent value:`, error);
  }
}

/**
 * Maps to store status check intervals by campaign ID
 * These prevent duplicate intervals from being created for the same campaign
 */
const activeStatusChecks = new Map<number, NodeJS.Timeout>();
const pauseStatusChecks = new Map<number, NodeJS.Timeout>();

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
      
      if (statusMatches(status, 'active')) {
        console.log(`✅ Campaign ${trafficstarCampaignId} is still active - monitoring will continue`);
        
        // Check if we need to pause based on remaining clicks
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
          console.log(`🔍 ACTIVE MONITORING: Checking remaining clicks for ${campaign.urls.length} URLs in campaign ${trafficstarCampaignId}`);
          for (const url of campaign.urls) {
            console.log(`🔍 URL ID: ${url.id}, status: ${url.status}, clickLimit: ${url.clickLimit}, clicks: ${url.clicks}`);
            // Since we're already filtering for active URLs in the query, we don't need to check status again
            const remainingClicks = url.clickLimit - url.clicks;
            const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
            totalRemainingClicks += validRemaining;
            console.log(`✅ Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
          }
          
          // If remaining clicks fell below threshold, pause the campaign
          // Need to fetch campaign settings to get the threshold
          const campaignResult = await db.select({
            id: campaigns.id,
            minPauseClickThreshold: campaigns.minPauseClickThreshold,
            minActivateClickThreshold: campaigns.minActivateClickThreshold,
            highSpendPauseThreshold: campaigns.highSpendPauseThreshold,
            highSpendActivateThreshold: campaigns.highSpendActivateThreshold
          }).from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
          const campaignSettings = campaignResult[0];
          
          // Get current spent value to determine which threshold to use
          const spentValue = await getTrafficStarCampaignSpentValue(campaignId, trafficstarCampaignId);
          const THRESHOLD = 10.0; // $10 threshold for different handling
          
          // Use different thresholds based on HIGH/LOW SPEND state
          let MINIMUM_CLICKS_THRESHOLD;
          if (spentValue !== null && spentValue >= THRESHOLD) {
            // HIGH SPEND ($10+) - use high spend threshold
            MINIMUM_CLICKS_THRESHOLD = campaignSettings?.highSpendPauseThreshold || 1000; 
            console.log(`Using HIGH SPEND thresholds for pause: ${MINIMUM_CLICKS_THRESHOLD} clicks`);
          } else {
            // LOW SPEND (< $10) - use normal threshold
            MINIMUM_CLICKS_THRESHOLD = campaignSettings?.minPauseClickThreshold || 5000;
            console.log(`Using LOW SPEND thresholds for pause: ${MINIMUM_CLICKS_THRESHOLD} clicks`);
          }
          
          if (totalRemainingClicks <= MINIMUM_CLICKS_THRESHOLD) {
            console.log(`⏹️ During monitoring: Campaign ${trafficstarCampaignId} remaining clicks (${totalRemainingClicks}) fell below threshold (${MINIMUM_CLICKS_THRESHOLD}) - pausing campaign`);
            
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
                  // Use type assertion since we know trafficstarCampaignId exists in this context
                  startMinutelyPauseStatusCheck(campaignId, trafficstarCampaignId as string);
                } catch (endTimeError) {
                  console.error(`❌ Error setting end time for campaign ${trafficstarCampaignId}:`, endTimeError);
                }
              } catch (pauseError) {
                console.error(`❌ Failed to pause low spend campaign ${trafficstarCampaignId} with low remaining clicks:`, pauseError);
                
                // If we failed to pause, restart the active monitoring
                // Use non-null assertion as we know trafficstarCampaignId exists in this context
                startMinutelyStatusCheck(campaignId, trafficstarCampaignId as string);
              }
            } catch (error) {
              console.error(`❌ Error pausing low spend campaign ${trafficstarCampaignId} with low remaining clicks:`, error);
              
              // If we failed to pause, restart the active monitoring
              // Use type assertion as we know trafficstarCampaignId exists in this context
              startMinutelyStatusCheck(campaignId, trafficstarCampaignId as string);
            }
          }
        }
      } else if (status === 'paused') {
        console.log(`⚠️ Campaign ${trafficstarCampaignId} was found paused but should be active - will attempt to reactivate`);
        
        try {
          // Get the campaign details to check URLs and remaining clicks
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
              // Since we're already filtering for active URLs in the query, we don't need to check status again
              const remainingClicks = url.clickLimit - url.clicks;
              const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
              totalRemainingClicks += validRemaining;
              console.log(`✅ Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
            }
            
            // Only reactivate if there are enough remaining clicks
            const REMAINING_CLICKS_THRESHOLD = campaign.minActivateClickThreshold || 15000; // Use campaign-specific threshold if available
            if (totalRemainingClicks >= REMAINING_CLICKS_THRESHOLD) {
              console.log(`✅ Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks (>= ${REMAINING_CLICKS_THRESHOLD}) - will attempt reactivation during monitoring`);
              
              // Set end time to 23:59 UTC today
              const today = new Date();
              const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
              const endTimeStr = `${todayStr} 23:59:00`;
              
              // First set the end time, then activate
              await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), endTimeStr);
              
              // Attempt to reactivate the campaign
              await trafficStarService.activateCampaign(Number(trafficstarCampaignId));
              
              console.log(`✅ REACTIVATED campaign ${trafficstarCampaignId} during monitoring - it has ${totalRemainingClicks} remaining clicks`);
              
              // Mark as reactivated during monitoring in the database
              await db.update(campaigns)
                .set({
                  lastTrafficSenderStatus: 'reactivated_during_monitoring',
                  lastTrafficSenderAction: new Date(),
                  updatedAt: new Date()
                })
                .where(eq(campaigns.id, campaignId));
              
              console.log(`✅ Marked campaign ${campaignId} as 'reactivated_during_monitoring' in database`);
            } else {
              console.log(`⏹️ Campaign ${trafficstarCampaignId} has only ${totalRemainingClicks} remaining clicks (< ${REMAINING_CLICKS_THRESHOLD}) - will not reactivate during monitoring`);
              
              // Stop this monitoring since we're now in pause state
              clearInterval(interval);
              activeStatusChecks.delete(campaignId);
              
              // Start pause monitoring instead
              // Use type assertion since we know trafficstarCampaignId exists in this context
              startMinutelyPauseStatusCheck(campaignId, trafficstarCampaignId as string);
              
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
      
      if (statusMatches(status, 'paused')) {
        console.log(`⏹️ Campaign ${trafficstarCampaignId} is still paused as expected - monitoring will continue`);
        
        // Check current spent value and remaining clicks periodically
        const campaign = await db.query.campaigns.findFirst({
          where: (campaign, { eq }) => eq(campaign.id, campaignId),
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
                // Since we're already filtering for active URLs in the query, we don't need to check status again
                const remainingClicks = url.clickLimit - url.clicks;
                const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
                totalRemainingClicks += validRemaining;
                console.log(`✅ Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
              }
              
              // Need to fetch all campaign settings including high spend thresholds
              const campaignSettings = await db.select({
                id: campaigns.id,
                minPauseClickThreshold: campaigns.minPauseClickThreshold,
                minActivateClickThreshold: campaigns.minActivateClickThreshold,
                highSpendPauseThreshold: campaigns.highSpendPauseThreshold,
                highSpendActivateThreshold: campaigns.highSpendActivateThreshold
              }).from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
              
              // Set defaults if not found
              const settings = campaignSettings[0] || {
                minPauseClickThreshold: 5000,
                minActivateClickThreshold: 15000,
                highSpendPauseThreshold: 1000,
                highSpendActivateThreshold: 5000
              };
              
              // Check if clicks have been replenished
              // Determine which threshold to use based on spend state
              const THRESHOLD = 10.0; // $10 threshold for different handling
              
              // Use different thresholds based on HIGH/LOW SPEND state
              let REMAINING_CLICKS_THRESHOLD;
              if (spentValue >= THRESHOLD) {
                // HIGH SPEND ($10+) - use high spend threshold
                REMAINING_CLICKS_THRESHOLD = settings.highSpendActivateThreshold || 5000;
                console.log(`Using HIGH SPEND thresholds for hysteresis check: Pause at ${settings.highSpendPauseThreshold || 1000} clicks, Activate at ${REMAINING_CLICKS_THRESHOLD} clicks`);
              } else {
                // LOW SPEND (< $10) - use normal threshold
                REMAINING_CLICKS_THRESHOLD = settings.minActivateClickThreshold || 15000;
                console.log(`Using LOW SPEND thresholds for hysteresis check: Pause at ${settings.minPauseClickThreshold || 5000} clicks, Activate at ${REMAINING_CLICKS_THRESHOLD} clicks`);
              }
              
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
                  // Use type assertion as we know trafficstarCampaignId exists in this context
                  startMinutelyStatusCheck(campaignId, trafficstarCampaignId as string);
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
      } else if (statusMatches(status, 'active')) {
        console.log(`⚠️ Campaign ${trafficstarCampaignId} was found active but should be paused - will attempt to pause again`);
        
        try {
          // Get the campaign details to check URLs and remaining clicks
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
              // Since we're already filtering for active URLs in the query, we don't need to check status again
              const remainingClicks = url.clickLimit - url.clicks;
              totalRemainingClicks += remainingClicks > 0 ? remainingClicks : 0;
            }
            
            console.log(`Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks but should be paused - re-pausing campaign`);
            
            // Set current date/time for end time
            const now = new Date();
            const formattedDateTime = now.toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS
            
            // First pause the campaign
            await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
            
            // Then set its end time
            await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), formattedDateTime);
            
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
 * Handle child TrafficStar campaigns based on the parent campaign's remaining clicks
 * @param parentCampaignId The parent campaign ID in our system
 * @param remainingClicks The total remaining clicks in the parent campaign
 */
async function handleChildTrafficstarCampaigns(parentCampaignId: number, remainingClicks: number) {
  try {
    // Get all child campaigns for this parent campaign, ordered by click remaining threshold (ascending)
    const childCampaigns = await db.select().from(childTrafficstarCampaigns)
      .where(eq(childTrafficstarCampaigns.parentCampaignId, parentCampaignId))
      .orderBy(asc(childTrafficstarCampaigns.clickRemainingThreshold));
    
    if (childCampaigns.length === 0) {
      // No child campaigns configured, nothing to do
      return;
    }
    
    console.log(`🔄 Found ${childCampaigns.length} child TrafficStar campaigns for parent campaign ${parentCampaignId}`);
    
    // Process each child campaign
    for (const childCampaign of childCampaigns) {
      // Check if the TrafficStar campaign ID is valid
      if (!childCampaign.trafficstarCampaignId) {
        console.log(`⚠️ Child campaign ${childCampaign.id} has no TrafficStar campaign ID - skipping`);
        continue;
      }
      
      // Get the current status of the child TrafficStar campaign
      const currentStatus = await getTrafficStarCampaignStatus(childCampaign.trafficstarCampaignId);
      console.log(`🔍 Child campaign ${childCampaign.id} (TrafficStar ID: ${childCampaign.trafficstarCampaignId}) status: ${currentStatus}, threshold: ${childCampaign.clickRemainingThreshold}, remaining clicks: ${remainingClicks}`);
      
      // Handle the child campaign based on its threshold and the parent's remaining clicks
      if (remainingClicks >= childCampaign.clickRemainingThreshold) {
        // The parent campaign has enough remaining clicks to meet the threshold
        
        // Start the child campaign if it's not already active
        if (!statusMatches(currentStatus, 'active')) {
          console.log(`▶️ Activating child campaign ${childCampaign.id} (TrafficStar ID: ${childCampaign.trafficstarCampaignId}) - parent campaign has ${remainingClicks} remaining clicks, which meets the threshold of ${childCampaign.clickRemainingThreshold}`);
          
          try {
            // Set an end time for today at 23:59 UTC
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
            const endTimeStr = `${todayStr} 23:59:00`;
            
            // First set the end time, then activate
            await trafficStarService.updateCampaignEndTime(Number(childCampaign.trafficstarCampaignId), endTimeStr);
            
            // Activate the campaign
            const success = await trafficStarService.activateCampaign(Number(childCampaign.trafficstarCampaignId));
            
            if (success) {
              console.log(`✅ Successfully activated child campaign ${childCampaign.id} (TrafficStar ID: ${childCampaign.trafficstarCampaignId})`);
              
              // Update the last action timestamp
              // Fix: Use raw SQL query to update child campaign - avoids ORM issues
              await db.execute(sql`
                UPDATE child_trafficstar_campaigns
                SET last_action = 'activate',
                    last_action_time = ${new Date()},
                    updated_at = ${new Date()}
                WHERE id = ${childCampaign.id}
              `);
            } else {
              console.error(`⚠️ Failed to activate child campaign ${childCampaign.id} (TrafficStar ID: ${childCampaign.trafficstarCampaignId})`);
            }
          } catch (error) {
            console.error(`Error activating child campaign ${childCampaign.id}:`, error);
          }
        } else {
          // Child campaign is already active - nothing to do
          console.log(`✅ Child campaign ${childCampaign.id} (TrafficStar ID: ${childCampaign.trafficstarCampaignId}) is already active and threshold is met - no action needed`);
        }
      } else {
        // The parent campaign does not have enough remaining clicks to meet the threshold
        
        // Pause the child campaign if it's currently active
        if (statusMatches(currentStatus, 'active')) {
          console.log(`⏸️ Pausing child campaign ${childCampaign.id} (TrafficStar ID: ${childCampaign.trafficstarCampaignId}) - parent campaign has ${remainingClicks} remaining clicks, which is below the threshold of ${childCampaign.clickRemainingThreshold}`);
          
          try {
            // Pause the campaign
            const success = await pauseTrafficStarCampaign(childCampaign.trafficstarCampaignId);
            
            if (success) {
              console.log(`✅ Successfully paused child campaign ${childCampaign.id} (TrafficStar ID: ${childCampaign.trafficstarCampaignId})`);
              
              // Update the last action timestamp
              // Fix: Use raw SQL query to update child campaign - avoids ORM issues
              await db.execute(sql`
                UPDATE child_trafficstar_campaigns
                SET last_action = 'pause',
                    last_action_time = ${new Date()},
                    updated_at = ${new Date()}
                WHERE id = ${childCampaign.id}
              `);
            } else {
              console.error(`⚠️ Failed to pause child campaign ${childCampaign.id} (TrafficStar ID: ${childCampaign.trafficstarCampaignId})`);
            }
          } catch (error) {
            console.error(`Error pausing child campaign ${childCampaign.id}:`, error);
          }
        } else {
          // Child campaign is already paused - nothing to do
          console.log(`✅ Child campaign ${childCampaign.id} (TrafficStar ID: ${childCampaign.trafficstarCampaignId}) is already paused and threshold is not met - no action needed`);
        }
      }
    }
  } catch (error) {
    console.error(`Error handling child TrafficStar campaigns for parent campaign ${parentCampaignId}:`, error);
  }
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
    
    if (statusMatches(status, 'paused')) {
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
      
      // CRITICAL FIX: If traffic generator is disabled, make sure the campaign is ACTIVE if it has URLs
      if (campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id && campaign.urls.length > 0) {
        console.log(`🔄 Campaign has Traffic Generator DISABLED but has ${campaign.urls.length} active URLs - ensuring it's ACTIVE 24/7`);
        
        // Get current status
        const status = await getTrafficStarCampaignStatus(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
        
        // If it's paused but has URLs and traffic generator is OFF, activate it
        if (statusMatches(status, 'paused')) {
          console.log(`⚠️ Campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} is paused but has active URLs and Traffic Generator is OFF - activating it`);
          
          try {
            // Set end time to 23:59 UTC today
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
            const endTimeStr = `${todayStr} 23:59:00`;
            
            // First set the end time, then activate
            await trafficStarService.updateCampaignEndTime(Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id), endTimeStr);
            console.log(`Set campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} end time to ${endTimeStr}`);
            
            // Activate the campaign
            await trafficStarService.activateCampaign(Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id));
            console.log(`Activating campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}`);
            
            // Update the database
            await db.update(campaigns)
              .set({
                lastTrafficSenderStatus: 'activated_manually_traffic_gen_off',
                lastTrafficSenderAction: new Date(),
                updatedAt: new Date()
              })
              .where(eq(campaigns.id, campaignId));
            
            console.log(`✅ Successfully activated campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} with Traffic Generator OFF`);
          } catch (error) {
            console.error(`❌ Error activating campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} with Traffic Generator OFF:`, error);
          }
        }
      }
      
      return;
    }
    
    // IMMEDIATE CHECK: Check if remaining clicks are below threshold and pause immediately if needed
    // This ensures we don't wait for the minute-by-minute check when a campaign is already below threshold
    if (campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id && campaign.urls.length > 0) {
      // Use campaign-specific threshold if available, otherwise use default of 5000
      const MINIMUM_CLICKS_THRESHOLD = campaign.minPauseClickThreshold || 5000;
      let totalRemainingClicks = 0;
      
      // Calculate total remaining clicks
      for (const url of campaign.urls) {
        const remainingClicks = url.clickLimit - url.clicks;
        if (remainingClicks > 0) {
          totalRemainingClicks += remainingClicks;
        }
      }
      
      // If clicks are already below threshold, pause immediately
      if (totalRemainingClicks <= MINIMUM_CLICKS_THRESHOLD) {
        console.log(`⚠️ IMMEDIATE ACTION: Campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} has only ${totalRemainingClicks} remaining clicks (≤ ${MINIMUM_CLICKS_THRESHOLD}) - pausing immediately`);
        
        // Get current status
        const status = await getTrafficStarCampaignStatus(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
        
        if (statusMatches(status, 'active')) {
          // Pause the campaign immediately without waiting for minute-by-minute check
          await pauseTrafficStarCampaign(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
          
          // Update database
          await db.update(campaigns)
            .set({
              lastTrafficSenderStatus: 'auto_paused_low_clicks_immediate',
              lastTrafficSenderAction: new Date(),
              updatedAt: new Date()
            })
            .where(eq(campaigns.id, campaignId));
            
          console.log(`✅ IMMEDIATELY PAUSED campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} due to low clicks (${totalRemainingClicks} < ${MINIMUM_CLICKS_THRESHOLD})`);
          
          // Start pause monitoring
          // Use type assertion since we know trafficstarCampaignId exists in this context
          startMinutelyPauseStatusCheck(campaignId, campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id as string);
          return;
        }
      }
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
        // Use type assertion for the campaign ID as we know it exists
        startMinutelyStatusCheck(campaignId, campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id as string);
        
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
        // Use type assertion since we've already checked trafficstarCampaignId exists before this point
        startMinutelyPauseStatusCheck(campaignId, campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id as string);
        
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
    const enabledCampaigns = await db.query.campaigns.findMany({
      where: (campaign, { eq }) => eq(campaign.trafficGeneratorEnabled, true),
    });
    
    if (enabledCampaigns.length === 0) {
      console.log('No campaigns have Traffic Generator enabled - skipping');
      return;
    }
    
    console.log(`Processing ${enabledCampaigns.length} campaigns with traffic generator enabled`);
    
    // Process each campaign
    for (const campaign of enabledCampaigns) {
      try {
        await processTrafficGenerator(campaign.id);
      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
      }
    }
    
    console.log('Finished running Traffic Generator for all enabled campaigns');
  } catch (error) {
    console.error('Error running Traffic Generator for all campaigns:', error);
  }
}

/**
 * Initialize Traffic Generator scheduler
 * This function sets up a system to handle campaign status changes
 * 
 * IMPORTANT: No periodic processing of campaigns when traffic generator is enabled
 * - Only check for campaigns with no URLs to pause them
 * - Traffic Generator settings are applied once when enabled
 * - Status is determined by each campaign independently
 */
export function initializeTrafficGeneratorScheduler() {
  console.log('Initializing Traffic Generator status monitor');
  
  // Run the traffic generator once on startup to initialize campaigns
  console.log('Running initial traffic generator check on startup');
  runTrafficGeneratorForAllCampaigns();
  
  // Run initial empty URL check
  console.log('Running initial empty URL check');
  checkForCampaignsWithNoURLs();
  
  // Only keep the empty URL check on a schedule (every minute)
  // This ensures campaigns with no URLs are paused immediately
  setInterval(() => {
    console.log('Running scheduled empty URL check');
    checkForCampaignsWithNoURLs();
  }, 60 * 1000); // Check every minute
  
  console.log('Traffic Generator status monitor initialized successfully');
}

/**
 * Check for campaigns with no active URLs and ensure they are paused
 * This ensures campaigns with no URLs don't run unnecessarily
 */
export async function checkForCampaignsWithNoURLs() {
  try {
    console.log('Checking for campaigns with no active URLs to pause TrafficStar campaigns');
    
    // Get all campaigns with TrafficStar campaign IDs
    const campaignsWithTrafficStar = await db.select({
      id: campaigns.id,
      name: campaigns.name,
      trafficstarCampaignId: campaigns.trafficstarCampaignId,
      trafficGeneratorEnabled: campaigns.trafficGeneratorEnabled,
      lastTrafficSenderStatus: campaigns.lastTrafficSenderStatus,
      lastTrafficSenderAction: campaigns.lastTrafficSenderAction
    }).from(campaigns)
      .where(sql`${campaigns.trafficstarCampaignId} IS NOT NULL`);
    
    if (campaignsWithTrafficStar.length === 0) {
      console.log('No campaigns with TrafficStar integration found');
      return;
    }
    
    console.log(`Found ${campaignsWithTrafficStar.length} campaigns with TrafficStar integration`);
    
    // Check each campaign for active URLs
    for (const campaign of campaignsWithTrafficStar) {
      // Skip campaigns that were recently paused/activated and are still within the wait period
      if (campaign.lastTrafficSenderAction && 
          campaign.lastTrafficSenderStatus && 
          (campaign.lastTrafficSenderStatus === 'auto_paused_low_clicks' || 
           campaign.lastTrafficSenderStatus === 'auto_paused_low_spend' || 
           campaign.lastTrafficSenderStatus === 'reactivated_during_monitoring')) {
        
        // Check if we're within the wait period
        if (campaign.lastTrafficSenderAction) {
          const waitDuration = Date.now() - campaign.lastTrafficSenderAction.getTime();
          const waitMinutes = Math.floor(waitDuration / (60 * 1000));
          const requiredWaitMinutes = 10; // Wait 10 minutes by default
          
          if (waitMinutes < requiredWaitMinutes) {
            console.log(`Campaign ${campaign.id} was recently processed (${waitMinutes}/${requiredWaitMinutes} minutes ago) - skipping empty URL check`);
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
        
        if (statusMatches(currentStatus, 'active')) {
          console.log(`TrafficStar campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} is ACTIVE with no active URLs - will pause it`);
          
          try {
            // Set current date/time for end time
            const now = new Date();
            const formattedDateTime = now.toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS
            
            // First pause the campaign
            await trafficStarService.pauseCampaign(Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id));
            
            // Then set its end time
            await trafficStarService.updateCampaignEndTime(Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id), formattedDateTime);
            
            console.log(`✅ PAUSED campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} with NO active URLs`);
            
            // Update status in database
            await db.update(campaigns)
              .set({
                lastTrafficSenderStatus: 'auto_paused_no_active_urls',
                lastTrafficSenderAction: new Date(),
                updatedAt: new Date()
              })
              .where(eq(campaigns.id, campaign.id));
            
            // Empty URL monitoring is now handled by the main scheduler check every minute
            console.log(`🔄 Starting minute-by-minute EMPTY URL status check for campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}`);
          } catch (error) {
            console.error(`❌ Error pausing TrafficStar campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}:`, error);
          }
        } else if (statusMatches(currentStatus, 'paused')) {
          console.log(`TrafficStar campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} is already PAUSED with no active URLs - continuing monitoring`);
          
          // Update status in database
          await db.update(campaigns)
            .set({
              lastTrafficSenderStatus: 'paused_no_active_urls',
              lastTrafficSenderAction: new Date(),
              updatedAt: new Date()
            })
            .where(eq(campaigns.id, campaign.id));
          
          // Start minute-by-minute empty URL check (replaces startEmptyUrlStatusCheck)
          console.log(`🔄 Starting minute-by-minute EMPTY URL status check for campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}`);
        } else {
          console.log(`TrafficStar campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} has status: ${currentStatus || 'unknown'} - will monitor`);
          
          // Campaign will be included in the minute-by-minute empty URL check
          if (campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
            console.log(`🔄 Campaign ${campaign.id} included in the minute-by-minute empty URL check`);
          }
        }
      } else if (campaign.lastTrafficSenderStatus === 'auto_paused_no_active_urls' || 
                 campaign.lastTrafficSenderStatus === 'paused_no_active_urls') {
        // If there are active URLs now, and the campaign was previously paused due to no active URLs, 
        // we should activate it
        
        console.log(`Campaign ${campaign.id} now has ${activeUrls.length} active URLs but was previously paused - will check status`);
        
        // Get current status
        const status = await getTrafficStarCampaignStatus(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
        
        if (statusMatches(status, 'paused')) {
          console.log(`Campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} is paused but now has active URLs - activating it`);
          
          try {
            // Set end time to 23:59 UTC today
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
            const endTimeStr = `${todayStr} 23:59:00`;
            
            // First set the end time
            await trafficStarService.updateCampaignEndTime(Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id), endTimeStr);
            console.log(`Set campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} end time to ${endTimeStr}`);
            
            // Then activate
            await trafficStarService.activateCampaign(Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id));
            console.log(`✅ Activated campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} that now has active URLs`);
            
            // Update database status
            await db.update(campaigns)
              .set({
                lastTrafficSenderStatus: 'activated_with_new_urls',
                lastTrafficSenderAction: new Date(),
                updatedAt: new Date()
              })
              .where(eq(campaigns.id, campaign.id));
            
            // Start active monitoring
            // Use type assertion since we've already checked trafficstarCampaignId exists before this point
            startMinutelyStatusCheck(campaign.id, campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id as string);
          } catch (error) {
            console.error(`❌ Error activating campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} with new URLs:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking for campaigns with no URLs:', error);
  }
}

/**
 * Real-time check for campaign status after URL status change
 * This is called directly when a URL is activated or deactivated to ensure immediate campaign action
 * @param campaignId Campaign ID in our system
 * @param urlWasActivated True if URL was activated, false if deactivated
 */
export async function checkCampaignStatusAfterUrlChange(campaignId: number, urlWasActivated: boolean) {
  try {
    console.log(`🔄 REAL-TIME CHECK: Campaign ${campaignId} status after URL was ${urlWasActivated ? 'activated' : 'deactivated'}`);
    
    // Get the campaign details
    const campaign = await db.query.campaigns.findFirst({
      where: (campaign, { eq }) => eq(campaign.id, campaignId),
      with: {
        urls: {
          where: (urls, { eq }) => eq(urls.status, 'active')
        }
      }
    }) as (Campaign & { urls: UrlWithActiveStatus[] }) | null;
    
    if (!campaign) {
      console.error(`Campaign ${campaignId} not found in real-time check`);
      return;
    }
    
    if (!campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
      console.log(`Campaign ${campaignId} has no TrafficStar ID - skipping real-time check`);
      return;
    }
    
    // If URL was activated and there was previously no URLs, activate the campaign
    if (urlWasActivated && campaign.urls.length === 1) {
      console.log(`✅ REAL-TIME: First URL added to campaign ${campaignId} - activating TrafficStar campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}`);
      
      // Get current status
      const status = await getTrafficStarCampaignStatus(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
      
      if (statusMatches(status, 'paused')) {
        try {
          // Set end time to 23:59 UTC today
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
          const endTimeStr = `${todayStr} 23:59:00`;
          
          // First set the end time
          await trafficStarService.updateCampaignEndTime(Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id), endTimeStr);
          console.log(`Set campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} end time to ${endTimeStr}`);
          
          // Then activate
          await trafficStarService.activateCampaign(Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id));
          console.log(`✅ REAL-TIME: Activated campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} after first URL was added`);
          
          // Update database status
          await db.update(campaigns)
            .set({
              lastTrafficSenderStatus: 'activated_after_url_added',
              lastTrafficSenderAction: new Date(),
              updatedAt: new Date()
            })
            .where(eq(campaigns.id, campaignId));
          
          // Start active monitoring
          // Use type assertion since we've already checked trafficstarCampaignId exists before this point
          startMinutelyStatusCheck(campaignId, campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id as string);
        } catch (error) {
          console.error(`❌ REAL-TIME: Error activating campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} after URL activation:`, error);
        }
      }
    } else if (!urlWasActivated && campaign.urls.length === 0) {
      // If URL was deactivated and there are now no URLs, pause the campaign
      console.log(`⏹️ REAL-TIME: Last URL removed from campaign ${campaignId} - pausing TrafficStar campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}`);
      
      // Get current status
      const status = await getTrafficStarCampaignStatus(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
      
      if (statusMatches(status, 'active')) {
        try {
          // Set current date/time for end time
          const now = new Date();
          const formattedDateTime = now.toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS
          
          // First pause the campaign
          await trafficStarService.pauseCampaign(Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id));
          
          // Then set its end time
          await trafficStarService.updateCampaignEndTime(Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id), formattedDateTime);
          
          console.log(`✅ REAL-TIME: Paused campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} after last URL was removed`);
          
          // Update status in database
          await db.update(campaigns)
            .set({
              lastTrafficSenderStatus: 'paused_after_url_removed',
              lastTrafficSenderAction: new Date(),
              updatedAt: new Date()
            })
            .where(eq(campaigns.id, campaignId));
          
          // Empty URL monitoring is now handled by the main scheduler
          console.log(`🔄 Campaign ${campaignId} now included in the minute-by-minute empty URL check`);
        } catch (error) {
          console.error(`❌ REAL-TIME: Error pausing campaign ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id} after URL deactivation:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error in real-time campaign status check after URL change:`, error);
  }
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
      // Since we're already filtering for active URLs in the query, we know all URLs in this list are active
      const remainingClicks = url.clickLimit - url.clicks;
      const effectiveRemaining = remainingClicks > 0 ? remainingClicks : 0;
      
      urlDetails.push({
        id: url.id,
        name: url.name,
        status: url.status,
        clickLimit: url.clickLimit,
        clicks: url.clicks,
        remainingClicks: effectiveRemaining,
        isActive: true
      });
      
      // Add to total remaining clicks and increment active URL count
      totalRemainingClicks += effectiveRemaining;
      activeUrls++;
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
        minimumClicksThreshold: campaign.minPauseClickThreshold || 5000,
        remainingClicksThreshold: campaign.minActivateClickThreshold || 15000
      }
    };
  } catch (error) {
    console.error(`Error in debug process:`, error);
    return { success: false, error: String(error) };
  }
}