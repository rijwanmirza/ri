/**
 * Script to check the budget status of a test URL
 * Usage: node check-test-url.js [url_name]
 * 
 * If no URL name is provided, it will try to read from last-test-url.txt
 */

import { db } from './server/db.js';
import { urls } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';

// Get URL name from command line or from file
let TEST_URL_NAME = process.argv[2];

if (!TEST_URL_NAME) {
  try {
    if (fs.existsSync('last-test-url.txt')) {
      TEST_URL_NAME = fs.readFileSync('last-test-url.txt', 'utf8').trim();
      console.log(`Using URL name from last-test-url.txt: ${TEST_URL_NAME}`);
    } else {
      console.error('❌ No URL name provided and last-test-url.txt not found');
      console.error('Usage: node check-test-url.js [url_name]');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error reading last-test-url.txt:', error);
    console.error('Usage: node check-test-url.js [url_name]');
    process.exit(1);
  }
}

async function checkTestUrl() {
  try {
    // Find the test URL
    const testUrls = await db.select()
      .from(urls)
      .where(eq(urls.name, TEST_URL_NAME));
    
    if (!testUrls || testUrls.length === 0) {
      console.error(`❌ Test URL with name "${TEST_URL_NAME}" not found`);
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
    console.log(`- Status: ${url.status}`);
    console.log(`- Budget Calculated: ${url.budgetCalculated ? '✓ YES' : '✗ NO'}`);
    console.log(`- Created: ${createdAt.toISOString()}`);
    console.log(`- Time since creation: ${waitMinutes} minutes, ${waitSeconds} seconds`);
    console.log(`- Click Limit: ${url.clickLimit}`);
    console.log(`- Clicks: ${url.clicks}`);
    
    if (waitMinutes >= 9) {
      if (url.budgetCalculated) {
        console.log(`\n✅ SUCCESS: URL budget was calculated after the 9-minute waiting period!`);
        console.log(`This confirms our fix is working correctly.`);
      } else {
        console.log(`\n❌ FAILURE: URL budget was NOT calculated even though ${waitMinutes} minutes have passed!`);
        console.log(`This suggests the budget calculation fix might not be working correctly.`);
        console.log(`You may need to check the server logs to see what's happening.`);
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
checkTestUrl();