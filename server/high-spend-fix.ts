/**
 * Temporary file to help debug and fix the high-spend budget calculation issue
 * 
 * This is a safer way to create a fix without modifying the existing functionality directly
 */
import { db } from './db';
import { campaigns, type Campaign } from '../shared/schema';
import { getUrlsAddedAfterBudgetCalc } from './url-status-helper';
import { trafficStarService } from './trafficstar-service';

/**
 * Fixed version of the check for new URLs after budget calculation
 * This properly handles URLs with status 'active' or 'complete' (including those completed during the 9-minute window)
 */
export async function fixedCheckForNewUrlsAfterBudgetCalc(campaignId: number) {
  console.log(`🔍 [FIXED VERSION] Checking for new URLs after budget calculation for campaign ${campaignId}`);
  
  try {
    // Get the campaign with its budget calculation timestamp
    const campaign = await db.query.campaigns.findFirst({
      where: (c, { eq }) => eq(c.id, campaignId),
    });
    
    if (!campaign || !campaign.highSpendBudgetCalcTime) {
      console.log(`Campaign ${campaignId} doesn't have a high-spend budget calculation timestamp - skipping check`);
      return [];
    }
    
    const calcTime = campaign.highSpendBudgetCalcTime;
    console.log(`Campaign ${campaignId} budget calculation time: ${calcTime.toISOString()}`);
    
    // Use the fixed helper to get URLs with status 'active' OR 'complete'
    const newUrls = await getUrlsAddedAfterBudgetCalc(campaignId, calcTime);
    
    console.log(`Found ${newUrls.length} new URLs added after budget calculation for campaign ${campaignId}`);
    console.log(`URL statuses: ${newUrls.map(url => url.status).join(', ')}`);
    
    return newUrls;
  } catch (error) {
    console.error(`Error in fixed check for new URLs: ${error.message}`);
    return [];
  }
}

/**
 * Fixed version of checkForNewUrlsAfterBudgetCalculation to be used in traffic-generator-new.ts
 * Uses SQL directly instead of the 'or' operator to avoid reference errors
 */
export async function fixedCheckForNewUrlsAfterBudgetCalculation(campaignId: number, trafficstarCampaignId: string) {
  try {
    console.log(`🔍 [FIXED] Checking for new URLs added after budget calculation for campaign ${campaignId}`);
    
    // Get the campaign with its budget calculation timestamp
    const campaign = await db.query.campaigns.findFirst({
      where: (c, { eq }) => eq(c.id, campaignId),
    }) as Campaign | null;
    
    if (!campaign || !campaign.highSpendBudgetCalcTime) {
      console.log(`Campaign ${campaignId} doesn't have a high-spend budget calculation timestamp - skipping new URL check`);
      return;
    }
    
    const calcTime = campaign.highSpendBudgetCalcTime;
    console.log(`Campaign ${campaignId} budget calculation time: ${calcTime.toISOString()}`);
    
    // Use the reliable helper method to handle both active and complete URLs
    const newUrls = await getUrlsAddedAfterBudgetCalc(campaignId, calcTime);
    
    if (newUrls.length === 0) {
      console.log(`No new URLs found added after budget calculation for campaign ${campaignId}`);
      return;
    }
    
    console.log(`⚠️ Found ${newUrls.length} new URLs added after budget calculation`);
    console.log(`Status breakdown: ${newUrls.filter(url => url.status === 'active').length} active, ${newUrls.filter(url => url.status === 'complete').length} complete`);
    
    // Rest of the function is the same...
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
      return;
    }
    
    console.log(`✅ Waiting period has elapsed (${waitMinutes}/${DELAY_MINUTES} minutes) - proceeding with budget update`);
    
    // --- Unchanged logic from original function ---
    // Calculate total clicks for new URLs (this drives the budget update)
    const totalNewClicks = newUrls.reduce((sum, url) => sum + url.clickLimit, 0);
    
    // Sum the clickLimit of all URLs added after budget calc
    const totalBudgetIncrease = totalNewClicks / 1000 * parseFloat(campaign.pricePerThousand);
    
    console.log(`Total new URL clicks: ${totalNewClicks}, Budget increase: $${totalBudgetIncrease.toFixed(4)}`);
    
    // Fetch the current TrafficStar campaign budget from TrafficStar API
    const currentCampaign = await trafficStarService.getCampaign(trafficstarCampaignId);
    
    if (!currentCampaign) {
      console.error(`Failed to get TrafficStar campaign ${trafficstarCampaignId} - skipping budget update`);
      return;
    }
    
    const currentBudget = parseFloat(currentCampaign.maxDaily) || 0;
    const newBudget = parseFloat((currentBudget + totalBudgetIncrease).toFixed(4));
    
    console.log(`Current TrafficStar budget: $${currentBudget.toFixed(4)}, New budget: $${newBudget.toFixed(4)}`);
    
    // Update the TrafficStar campaign budget
    const updateResult = await trafficStarService.updateCampaignBudget(trafficstarCampaignId, newBudget.toString());
    
    if (!updateResult) {
      console.error(`Failed to update TrafficStar campaign ${trafficstarCampaignId} budget - retrying later`);
      return;
    }
    
    console.log(`✅ Successfully updated TrafficStar campaign ${trafficstarCampaignId} budget to $${newBudget.toFixed(4)}`);
    
    // Mark the URLs as budgeted
    for (const url of newUrls) {
      await db.update(url).set({ budgetCalculated: true });
      console.log(`Marked URL ${url.id} (${url.name}) as budget calculated`);
    }
    
    console.log(`✅ Updated budget for ${newUrls.length} new URLs for campaign ${campaignId}`);
  } catch (error) {
    console.error(`Error checking for new URLs after budget calculation for campaign ${campaignId}:`, error);
  }
}