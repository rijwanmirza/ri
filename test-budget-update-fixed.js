/**
 * Test script to manually add a URL to campaign 1 and test if the budget gets updated after 9 minutes
 * Use this to verify the high-spend budget calculation fix
 */

import { db } from './server/db.js';
import { campaigns, urls } from './shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { fixedCheckForNewUrlsAfterBudgetCalculation } from './server/high-spend-fix.js';

const campaignId = 1;
const TEST_URL_NAME = `test-budget-${Date.now()}`;
const TEST_URL_CLICKS = 1; // 1 click for testing

/**
 * Add test URL to campaign 1
 */
async function addTestUrl() {
  console.log(`Adding test URL "${TEST_URL_NAME}" with ${TEST_URL_CLICKS} clicks to campaign ${campaignId}...`);
  
  try {
    // First check if the campaign exists and is in high_spend_budget_updated state
    const campaign = await db.query.campaigns.findFirst({
      where: (c, { eq }) => eq(c.id, campaignId),
    });
    
    if (!campaign) {
      console.error(`❌ Campaign ${campaignId} not found`);
      process.exit(1);
    }
    
    if (!campaign.highSpendBudgetCalcTime) {
      console.error(`❌ Campaign ${campaignId} doesn't have a high-spend budget calculation timestamp`);
      console.error('The campaign needs to be in high_spend_budget_updated state for this test to work');
      process.exit(1);
    }
    
    console.log(`Campaign ${campaignId} budget calc time: ${campaign.highSpendBudgetCalcTime}`);
    console.log(`Campaign state: ${campaign.trafficGeneratorState || 'unknown'}`);
    
    // Create the test URL
    const [newUrl] = await db.insert(urls)
      .values({
        campaignId,
        name: TEST_URL_NAME,
        url: 'https://www.youtube.com/watch?v=test123',
        clickLimit: TEST_URL_CLICKS,
        clicks: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        budgetCalculated: false // Important: this flag indicates if the URL is included in budget
      })
      .returning();
    
    console.log(`✅ Successfully added URL ID ${newUrl.id} with name ${newUrl.name}`);
    console.log(`Now waiting for the next Traffic Generator check...`);
    console.log(`Expected outcome: URL will be detected and budget will be updated after 9 minutes`);
    console.log(`\nYou can monitor by running:`);
    console.log(`node -e "const { db } = require('./server/db.js'); db.select().from('urls').where({ name: '${TEST_URL_NAME}' }).then(console.log)"`);
    
    // Now manually trigger the check to see if it's detected
    console.log(`\nManually testing detection...`);
    if (campaign.trafficstarCampaignId) {
      await fixedCheckForNewUrlsAfterBudgetCalculation(campaignId, campaign.trafficstarCampaignId);
    } else {
      console.log(`⚠️ Campaign doesn't have TrafficStar ID - skipping manual test`);
    }
  } catch (error) {
    console.error(`❌ Error adding test URL:`, error);
  }
}

// Execute the test
addTestUrl();