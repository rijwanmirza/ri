/**
 * Script to directly add a test URL to campaign 1 with a single click
 * Usage: node add-test-url.js
 */

import { db } from './server/db.js';
import { campaigns, urls } from './shared/schema.js';
import { eq } from 'drizzle-orm';

const campaignId = 1;
const TEST_URL_NAME = `test-url-${Date.now()}`;
const TEST_URL_CLICKS = 1; // 1 click for testing

async function addTestUrl() {
  console.log(`Adding test URL "${TEST_URL_NAME}" with ${TEST_URL_CLICKS} clicks to campaign ${campaignId}...`);
  
  try {
    // First check if the campaign exists
    const campaign = await db.query.campaigns.findFirst({
      where: (c, { eq }) => eq(c.id, campaignId),
    });
    
    if (!campaign) {
      console.error(`❌ Campaign ${campaignId} not found`);
      process.exit(1);
    }
    
    console.log(`Campaign ${campaignId} found: ${campaign.name}`);
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
    console.log(`URL added at: ${newUrl.createdAt.toISOString()}`);
    console.log(`Budget calculated: ${newUrl.budgetCalculated ? 'Yes' : 'No'}`);
    
    // Save the URL name to a file for easier tracking
    const fs = await import('fs');
    fs.writeFileSync('last-test-url.txt', TEST_URL_NAME);
    console.log(`URL name saved to last-test-url.txt for later reference`);
    
    console.log(`\nTo check this URL's budget status, run:`);
    console.log(`node check-test-url.js ${TEST_URL_NAME}`);
    
  } catch (error) {
    console.error(`❌ Error adding test URL:`, error);
  }
}

// Execute the function
addTestUrl();