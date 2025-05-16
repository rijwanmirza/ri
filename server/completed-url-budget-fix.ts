/**
 * Fix for Budget Calculation with Completed URLs
 * 
 * This modification ensures that URLs which complete before the 9-minute waiting period
 * are properly included in budget calculations for high-spend campaigns.
 */

import { db } from './db';
import { campaigns, urls } from '../shared/schema';
import { eq, and, or } from 'drizzle-orm';
import { trafficStarService } from './trafficstar-service';
import urlBudgetLogger from './url-budget-logger';

/**
 * Check for new URLs (both active and completed) added after high-spend budget calculation
 * @param campaignId The campaign ID in our system
 * @param trafficstarCampaignId The TrafficStar campaign ID
 */
export async function checkForNewUrlsAfterBudgetCalculation(campaignId: number, trafficstarCampaignId: string) {
  try {
    console.log(`🔍 Checking for URLs (active and completed) added after budget calculation for campaign ${campaignId}`);
    
    // Get the campaign with its budget calculation timestamp
    // Fetch both active URLs and completed URLs for the campaign
    const campaign = await db.query.campaigns.findFirst({
      where: (c, { eq }) => eq(c.id, campaignId),
      with: { 
        urls: {
          // Include both active URLs and completed URLs to properly account for budget
          where: (urls, { or, eq }) => or(
            eq(urls.status, 'active'),
            eq(urls.status, 'completed')
          )
        } 
      }
    });
    
    if (!campaign || !campaign.highSpendBudgetCalcTime) {
      console.log(`Campaign ${campaignId} doesn't have a high-spend budget calculation timestamp - skipping new URL check`);
      return;
    }
    
    const calcTime = campaign.highSpendBudgetCalcTime;
    console.log(`Campaign ${campaignId} budget calculation time: ${calcTime.toISOString()}`);
    
    // Find URLs added after budget calculation time (both active and completed)
    const newUrls = campaign.urls.filter(url => {
      // Include both active and completed URLs created after budget calculation
      return (url.status === 'active' || url.status === 'completed') && url.createdAt > calcTime;
    });
    
    if (newUrls.length === 0) {
      console.log(`No new URLs (active or completed) found after budget calculation for campaign ${campaignId}`);
      return;
    }
    
    // Log the counts of active and completed URLs for clarity
    const activeUrlCount = newUrls.filter(url => url.status === 'active').length;
    const completedUrlCount = newUrls.filter(url => url.status === 'completed').length;
    console.log(`⚠️ Found ${newUrls.length} new URLs after budget calculation: ${activeUrlCount} active, ${completedUrlCount} completed`);
    
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
            pendingBudgetUpdate: true,
            updatedAt: new Date()
          })
          .where(eq(urls.id, url.id));
      }
      
      return;
    }
    
    console.log(`✅ ${DELAY_MINUTES}-minute wait period has elapsed - processing ${newUrls.length} URLs (both active and completed)`);
    
    // Get the current budget from TrafficStar
    const campaignData = await trafficStarService.getCampaign(Number(trafficstarCampaignId));
    if (!campaignData || !campaignData.max_daily) {
      console.log(`Could not get current budget for campaign ${trafficstarCampaignId}`);
      return;
    }
    
    const currentBudget = parseFloat(campaignData.max_daily.toString());
    console.log(`Current TrafficStar budget for campaign ${trafficstarCampaignId}: $${currentBudget.toFixed(4)}`);
    
    // Calculate new URLs budget (both active and completed)
    let newUrlsClicksTotal = 0;
    let newUrlsBudget = 0;
    
    for (const url of newUrls) {
      // For newly added URLs (active or completed), use full clickLimit instead of remaining clicks
      newUrlsClicksTotal += url.clickLimit;
      
      // Calculate individual URL budget (price)
      const urlBudget = (url.clickLimit / 1000) * parseFloat(campaign.pricePerThousand);
      console.log(`URL ${url.id} (status: ${url.status}) budget: $${urlBudget.toFixed(4)} (${url.clickLimit} clicks)`);
      
      // Log this URL's budget calculation
      await urlBudgetLogger.logUrlBudget(url.id, urlBudget, campaign.id);
      
      // Add to total new URLs budget
      newUrlsBudget += urlBudget;
      
      // Update the URL to mark it as processed
      await db.update(urls)
        .set({
          pendingBudgetUpdate: false,
          budgetCalculated: true,
          updatedAt: new Date()
        })
        .where(eq(urls.id, url.id));
    }
    
    console.log(`New URLs total clicks: ${newUrlsClicksTotal}, total budget: $${newUrlsBudget.toFixed(4)}`);
    
    // Update total budget in TrafficStar if needed
    const newTotalBudget = currentBudget + newUrlsBudget;
    console.log(`Current TrafficStar budget: $${currentBudget.toFixed(4)}, new total budget: $${newTotalBudget.toFixed(4)}`);
    
    // Update the budget in TrafficStar
    const updateResult = await trafficStarService.updateCampaignBudget(Number(trafficstarCampaignId), newTotalBudget);
    if (updateResult) {
      console.log(`✅ Successfully updated TrafficStar campaign ${trafficstarCampaignId} budget to $${newTotalBudget.toFixed(4)}`);
    } else {
      console.error(`❌ Failed to update TrafficStar campaign ${trafficstarCampaignId} budget`);
    }
    
    // Maintain the high spend status in our database
    await db.update(campaigns)
      .set({
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, campaignId));
    
    console.log(`✅ Maintained 'high_spend_budget_updated' status with proper accounting for completed URLs`);
    
  } catch (error) {
    console.error(`Error checking for new URLs after budget calculation for campaign ${campaignId}:`, error);
  }
}