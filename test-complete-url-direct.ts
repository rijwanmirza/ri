/**
 * Script to test that URLs that change from 'active' to 'complete' before 
 * the 9-minute waiting period are still properly counted in budget calculations
 */

import { db } from './server/db';
import { campaigns, urls } from './shared/schema';
import { eq } from 'drizzle-orm';
import { fixedCheckForNewUrlsAfterBudgetCalc } from './server/high-spend-fix';
import fs from 'fs';

const campaignId = 1;
const TEST_URL_NAME = `test-complete-${Date.now()}`;
const TEST_URL_CLICKS = 1; // 1 click for testing

/**
 * Add test URL to campaign 1 and then immediately mark it as 'complete'
 */
async function addAndCompleteTestUrl() {
  console.log(`🧪 Testing budget calculation for URLs that complete before 9 minutes`);
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
    
    console.log(`Campaign ${campaignId} found: ${campaign.name}`);
    console.log(`Campaign state: ${campaign.trafficGeneratorState || 'unknown'}`);
    console.log(`Budget calculation time: ${campaign.highSpendBudgetCalcTime.toISOString()}`);
    
    // Step 1: Create the test URL (status: active)
    const [newUrl] = await db.insert(urls)
      .values({
        campaignId,
        name: TEST_URL_NAME,
        targetUrl: 'https://www.youtube.com/watch?v=test-complete',
        clickLimit: TEST_URL_CLICKS,
        originalClickLimit: TEST_URL_CLICKS,
        clicks: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        budgetCalculated: false // Important: this flag indicates if the URL is included in budget
      })
      .returning();
    
    console.log(`✅ Step 1: Added URL ID ${newUrl.id} with name ${newUrl.name}`);
    console.log(`   URL status: ${newUrl.status}`);
    console.log(`   Budget calculated: ${newUrl.budgetCalculated ? 'Yes' : 'No'}`);
    
    // Step 2: Immediately update the URL to 'complete' status to simulate a URL that becomes
    // complete before the 9-minute waiting period is over
    const [updatedUrl] = await db.update(urls)
      .set({
        status: 'complete',
        clicks: TEST_URL_CLICKS, // Set clicks equal to clickLimit to mark it as complete
        updatedAt: new Date()
      })
      .where(eq(urls.id, newUrl.id))
      .returning();
    
    console.log(`✅ Step 2: Updated URL ID ${updatedUrl.id} status to 'complete'`);
    console.log(`   New status: ${updatedUrl.status}`);
    console.log(`   Budget calculated: ${updatedUrl.budgetCalculated ? 'Yes' : 'No'}`);
    
    // Save the URL details to a file for easier tracking
    fs.writeFileSync('complete-test-url.txt', JSON.stringify({
      name: TEST_URL_NAME,
      id: newUrl.id,
      createdAt: newUrl.createdAt,
      campaignId
    }, null, 2));
    
    console.log(`\n📝 URL details saved to complete-test-url.txt for reference`);
    
    // Step 3: Manually trigger a check to verify this URL is detected by our fixed function
    console.log(`\n🔍 Step 3: Testing if URL is detected by our fixed code...`);
    const detectedUrls = await fixedCheckForNewUrlsAfterBudgetCalc(campaignId);
    
    if (detectedUrls.length > 0) {
      console.log(`✅ URL detected by our fixed code! Found ${detectedUrls.length} URLs, including our test URL`);
      
      // Check if our specific URL is in the list
      const ourUrl = detectedUrls.find(url => url.name === TEST_URL_NAME);
      if (ourUrl) {
        console.log(`✅ Our test URL was specifically found in the detected URLs list`);
        console.log(`   Status: ${ourUrl.status}`);
      } else {
        console.log(`❌ Our test URL was NOT found among the detected URLs`);
      }
    } else {
      console.log(`❌ No URLs detected by our fixed code check`);
    }
    
    console.log(`\n⏱️ Test setup complete!`);
    console.log(`The URL has been created with 'complete' status.`);
    console.log(`Our fixed code should detect this URL and update its budget after 9 minutes.`);
    
    console.log(`\n📊 To manually check this test later, run:`);
    console.log(`npx tsx check-complete-url-direct.ts`);
  } catch (error) {
    console.error(`❌ Error in test:`, error);
  }
}

// Execute the test
addAndCompleteTestUrl();