/**
 * Force Campaign Active
 * 
 * This script forcibly activates a campaign and sets its state to a special
 * "force_activated" status that will make the traffic generator aggressively
 * maintain it in the active state despite external interference.
 */

// TrafficStar API settings
const API_KEY = 'TraffiCS10928';
const BASE_URL = 'https://admin.trafficstar.io/api/v1';
const CAMPAIGN_ID = 1019777; // Your campaign ID in TrafficStar

// Get the campaign ID from command line if provided
const args = process.argv.slice(2);
const campaignId = args[0] ? parseInt(args[0]) : 1; // Default to campaign ID 1 in our system

// Use fetch for API calls (available in Node.js without extra libraries)
const forceCampaignActive = async () => {
  try {
    console.log(`Forcing campaign ${CAMPAIGN_ID} to active state...`);
    
    // 1. Set end time to today at 23:59
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const endTimeStr = `${formattedDate} 23:59:00`;
    
    // Set the end time
    const endTimeUrl = `${BASE_URL}/campaigns/${CAMPAIGN_ID}/end-time`;
    console.log(`Setting end time to ${endTimeStr}...`);
    
    const endTimeResponse = await fetch(endTimeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY
      },
      body: JSON.stringify({ end_time: endTimeStr })
    });
    
    if (!endTimeResponse.ok) {
      throw new Error(`Failed to set end time: ${endTimeResponse.status} ${endTimeResponse.statusText}`);
    }
    
    console.log(`✅ Successfully set end time to ${endTimeStr}`);
    
    // 2. Activate the campaign
    const activateUrl = `${BASE_URL}/campaigns/${CAMPAIGN_ID}/activate`;
    console.log(`Activating campaign ${CAMPAIGN_ID}...`);
    
    const activateResponse = await fetch(activateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY
      }
    });
    
    if (!activateResponse.ok) {
      throw new Error(`Failed to activate campaign: ${activateResponse.status} ${activateResponse.statusText}`);
    }
    
    console.log(`✅ Successfully activated campaign ${CAMPAIGN_ID}`);
    
    // 3. Update the campaign status in our database
    console.log(`Setting database status to force_activated...`);
    
    // Since we need database access here, we'll need to either:
    // - Use the database directly (requires importing it)
    // - Use a separate endpoint to update the status
    // - Create a file that will be read by the traffic generator
    
    // For now, we'll create a marker file that the traffic generator can check
    const fs = require('fs');
    fs.writeFileSync('force_campaign_active.flag', JSON.stringify({
      campaignId: campaignId,
      trafficstarCampaignId: CAMPAIGN_ID,
      timestamp: new Date().toISOString(),
      action: 'force_activated'
    }));
    
    console.log(`✅ Created marker file for campaign status update`);
    console.log(`✅ Campaign ${CAMPAIGN_ID} has been forcibly activated`);
    
    // We'll need to run this file regularly to ensure the campaign stays active
    console.log(`\nTo keep this campaign active, add this command to cron to run every 10 minutes:`);
    console.log(`*/10 * * * * cd /path/to/app && node force-campaign-active.js ${campaignId}`);
  } catch (error) {
    console.error(`❌ Error forcing campaign active:`, error);
  }
};

// Run the function
forceCampaignActive();