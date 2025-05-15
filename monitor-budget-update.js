/**
 * Script to monitor the budget update status of a test URL
 * Run this to check if the URL's budgetCalculated flag is updated after 9 minutes
 */

import { db } from './server/db.js';
import { urls } from './shared/schema.js';
import { eq } from 'drizzle-orm';

// The URL name is passed as a command line argument
const TEST_URL_NAME = process.argv[2];

if (!TEST_URL_NAME) {
  console.error('❌ Please provide the test URL name as a command line argument');
  console.error('Example: node monitor-budget-update.js test-budget-1685432156789');
  process.exit(1);
}

async function monitorTestUrl() {
  try {
    // Find the test URL
    const testUrl = await db.select()
      .from(urls)
      .where(eq(urls.name, TEST_URL_NAME))
      .limit(1);
    
    if (!testUrl || testUrl.length === 0) {
      console.error(`❌ Test URL with name "${TEST_URL_NAME}" not found`);
      process.exit(1);
    }
    
    const url = testUrl[0];
    
    // Calculate how long ago the URL was created
    const createdAt = new Date(url.createdAt);
    const waitDuration = Date.now() - createdAt.getTime();
    const waitMinutes = Math.floor(waitDuration / (60 * 1000));
    
    console.log(`URL Information:`);
    console.log(`- ID: ${url.id}`);
    console.log(`- Name: ${url.name}`);
    console.log(`- Status: ${url.status}`);
    console.log(`- Budget Calculated: ${url.budgetCalculated ? '✓ YES' : '✗ NO'}`);
    console.log(`- Created: ${createdAt.toISOString()} (${waitMinutes} minutes ago)`);
    console.log(`- Click Limit: ${url.clickLimit}`);
    console.log(`- Clicks: ${url.clicks}`);
    
    if (waitMinutes >= 9) {
      if (url.budgetCalculated) {
        console.log(`\n✅ SUCCESS: URL budget was calculated after the 9-minute waiting period!`);
      } else {
        console.log(`\n❌ FAILURE: URL budget was NOT calculated even though ${waitMinutes} minutes have passed!`);
        console.log('This suggests the budget calculation fix might not be working correctly.');
      }
    } else {
      console.log(`\n⏱️ Still waiting: ${waitMinutes}/9 minutes have passed since URL creation`);
      console.log(`Check again in ${9 - waitMinutes} minutes.`);
    }
  } catch (error) {
    console.error(`❌ Error monitoring test URL:`, error);
  }
}

// Execute the monitoring
monitorTestUrl();