/**
 * Script to check the budget status of a test URL that was created with 'complete' status
 * This tests if URLs that transition to 'complete' before the 9-minute waiting period
 * are still properly counted in budget calculations.
 */

import { db } from './server/db';
import { urls } from './shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';

async function checkCompleteTestUrl() {
  try {
    // Try to read the URL details from the file
    let urlDetails;
    try {
      if (fs.existsSync('complete-test-url.txt')) {
        const fileContent = fs.readFileSync('complete-test-url.txt', 'utf8');
        urlDetails = JSON.parse(fileContent);
        console.log(`📝 Found test URL details in complete-test-url.txt`);
      } else {
        console.error('❌ No test URL details found in complete-test-url.txt');
        console.error('Please run test-complete-url-direct.ts first');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error reading complete-test-url.txt:', error);
      process.exit(1);
    }
    
    // Find the test URL in the database
    const testUrls = await db.select()
      .from(urls)
      .where(eq(urls.name, urlDetails.name));
    
    if (!testUrls || testUrls.length === 0) {
      console.error(`❌ Test URL with name "${urlDetails.name}" not found in database`);
      process.exit(1);
    }
    
    const url = testUrls[0];
    
    // Calculate how long ago the URL was created
    const createdAt = new Date(url.createdAt);
    const now = new Date();
    const waitDuration = now.getTime() - createdAt.getTime();
    const waitMinutes = Math.floor(waitDuration / (60 * 1000));
    const waitSeconds = Math.floor(waitDuration / 1000) % 60;
    
    console.log(`\n📊 URL Information at ${now.toISOString()}:`);
    console.log(`- ID: ${url.id}`);
    console.log(`- Name: ${url.name}`);
    console.log(`- Status: ${url.status} (should be 'complete' or 'completed')`);
    console.log(`- Budget Calculated: ${url.budgetCalculated ? '✓ YES' : '✗ NO'}`);
    console.log(`- Created: ${createdAt.toISOString()}`);
    console.log(`- Time since creation: ${waitMinutes} minutes, ${waitSeconds} seconds`);
    console.log(`- Click Limit: ${url.clickLimit}`);
    console.log(`- Clicks: ${url.clicks}`);
    
    if (waitMinutes >= 9) {
      if (url.budgetCalculated) {
        console.log(`\n✅ SUCCESS: 'complete' URL budget was calculated after the 9-minute waiting period!`);
        console.log(`This confirms our fix is working correctly and 'complete' URLs are counted.`);
      } else {
        console.log(`\n❌ FAILURE: 'complete' URL budget was NOT calculated even though ${waitMinutes} minutes have passed!`);
        console.log(`This suggests the budget calculation fix for 'complete' URLs might not be working correctly.`);
        console.log(`Check the server logs to see what's happening during budget calculation.`);
      }
    } else {
      console.log(`\n⏱️ Still waiting: ${waitMinutes} minutes, ${waitSeconds} seconds have passed since URL creation`);
      console.log(`Budget should be calculated after 9 minutes (${9 - waitMinutes} minutes, ${60 - waitSeconds} seconds remaining)`);
    }
  } catch (error) {
    console.error(`❌ Error checking test URL:`, error);
  }
}

// Execute the function
checkCompleteTestUrl();