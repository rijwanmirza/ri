/**
 * Force Proper Campaign State
 * 
 * This script forces a campaign to stay in its proper state based on remaining clicks
 * and prevents external systems from overriding our desired state.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import axios from 'axios';

// Configure connection
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// TrafficStar API endpoints
const BASE_URL = 'https://admin.trafficstar.io/api/v1';
const API_KEY = 'TraffiCS10928'; // Default API key

async function main() {
  try {
    // Get campaign ID from command line args
    const args = process.argv.slice(2);
    const campaignId = args[0] ? parseInt(args[0]) : 1; // Default to campaign ID 1
    const force = args[1] === 'force'; // Optional force flag
    
    console.log(`Fixing campaign state for ID: ${campaignId}`);
    
    // Get campaign details
    const { rows: [campaign] } = await pool.query(
      'SELECT * FROM campaigns WHERE id = $1',
      [campaignId]
    );
    
    if (!campaign) {
      console.error(`Campaign ID ${campaignId} not found`);
      process.exit(1);
    }
    
    console.log(`Found campaign: ${campaign.name}`);
    console.log(`Current state: ${campaign.last_traffic_sender_status}`);
    console.log(`TrafficStar ID: ${campaign.trafficstar_campaign_id}`);
    console.log(`Spent value: $${campaign.daily_spent || '0.00'}`);
    
    // Get current threshold settings
    const lowSpendPauseThreshold = campaign.min_pause_click_threshold || 5000;
    const lowSpendActivateThreshold = campaign.min_activate_click_threshold || 15000;
    const highSpendPauseThreshold = campaign.high_spend_pause_threshold || 1000;
    const highSpendActivateThreshold = campaign.high_spend_activate_threshold || 5000;
    
    console.log('Current threshold settings:');
    console.log(`- LOW SPEND - Pause at ${lowSpendPauseThreshold}, Activate at ${lowSpendActivateThreshold}`);
    console.log(`- HIGH SPEND - Pause at ${highSpendPauseThreshold}, Activate at ${highSpendActivateThreshold}`);
    
    // Get all active URLs for this campaign
    const { rows: urls } = await pool.query(
      'SELECT * FROM urls WHERE campaign_id = $1 AND status = $2',
      [campaignId, 'active']
    );
    
    console.log(`Found ${urls.length} active URLs for campaign ${campaignId}`);
    
    // Calculate total remaining clicks
    let totalRemainingClicks = 0;
    for (const url of urls) {
      const remainingClicks = url.click_limit - url.clicks;
      const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
      totalRemainingClicks += validRemaining;
      console.log(`URL ID: ${url.id}, remaining: ${validRemaining} clicks`);
    }
    
    console.log(`Total remaining clicks: ${totalRemainingClicks}`);
    
    // Determine correct state based on spent value and remaining clicks
    const spentValue = campaign.daily_spent ? parseFloat(campaign.daily_spent) : 0;
    const isHighSpend = spentValue >= 10.0;
    
    let MINIMUM_CLICKS_THRESHOLD, ACTIVATE_CLICKS_THRESHOLD;
    
    if (isHighSpend) {
      // HIGH SPEND: use high spend thresholds
      MINIMUM_CLICKS_THRESHOLD = highSpendPauseThreshold;
      ACTIVATE_CLICKS_THRESHOLD = highSpendActivateThreshold;
      console.log(`Using HIGH SPEND thresholds: Pause at ${MINIMUM_CLICKS_THRESHOLD}, Activate at ${ACTIVATE_CLICKS_THRESHOLD}`);
    } else {
      // LOW SPEND: use regular thresholds
      MINIMUM_CLICKS_THRESHOLD = lowSpendPauseThreshold;
      ACTIVATE_CLICKS_THRESHOLD = lowSpendActivateThreshold;
      console.log(`Using LOW SPEND thresholds: Pause at ${MINIMUM_CLICKS_THRESHOLD}, Activate at ${ACTIVATE_CLICKS_THRESHOLD}`);
    }
    
    // Determine if campaign should be active or paused
    let shouldBeActive = totalRemainingClicks >= ACTIVATE_CLICKS_THRESHOLD;
    let shouldBePaused = totalRemainingClicks < MINIMUM_CLICKS_THRESHOLD;
    
    // If in the hysteresis zone, maintain current state to prevent oscillation
    if (!shouldBeActive && !shouldBePaused) {
      console.log(`Campaign is in hysteresis zone (${MINIMUM_CLICKS_THRESHOLD} <= ${totalRemainingClicks} < ${ACTIVATE_CLICKS_THRESHOLD})`);
      
      // Check current state to determine action
      const isCurrentlyActive = ['auto_reactivated_low_spend', 'reactivated_during_monitoring'].includes(campaign.last_traffic_sender_status);
      
      if (isCurrentlyActive) {
        console.log('Currently active, will maintain active state to prevent oscillation');
        shouldBeActive = true;
      } else {
        console.log('Currently paused, will maintain paused state to prevent oscillation');
        shouldBePaused = true;
      }
    }
    
    // Check current TrafficStar status
    console.log(`Checking current TrafficStar status for campaign ID: ${campaign.trafficstar_campaign_id}`);
    
    try {
      const response = await axios.get(`${BASE_URL}/campaigns/${campaign.trafficstar_campaign_id}`, {
        headers: { 'X-API-KEY': API_KEY }
      });
      
      const campaignData = response.data;
      const currentlyActive = campaignData.active === true || campaignData.status === 'enabled';
      
      console.log(`TrafficStar campaign current status: ${currentlyActive ? 'active' : 'paused'}`);
      
      // Force the correct state if needed
      if (shouldBeActive && !currentlyActive) {
        console.log(`Campaign should be ACTIVE but is currently PAUSED - activating campaign`);
        
        // Set end time to today at 23:59 UTC
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const endTimeStr = `${formattedDate} 23:59:00`;
        
        // Update end time
        await axios.post(`${BASE_URL}/campaigns/${campaign.trafficstar_campaign_id}/end-time`, 
          { end_time: endTimeStr },
          { headers: { 'X-API-KEY': API_KEY } }
        );
        console.log(`Set campaign end time to ${endTimeStr}`);
        
        // Activate the campaign
        await axios.post(`${BASE_URL}/campaigns/${campaign.trafficstar_campaign_id}/activate`, 
          {}, 
          { headers: { 'X-API-KEY': API_KEY } }
        );
        console.log(`Successfully activated campaign ${campaign.trafficstar_campaign_id}`);
        
        // Update the campaign status in our database
        await pool.query(
          `UPDATE campaigns 
           SET last_traffic_sender_status = $1, 
               last_traffic_sender_action = NOW(),
               updated_at = NOW()
           WHERE id = $2`,
          ['force_activated', campaignId]
        );
        console.log(`Updated campaign ${campaignId} status to 'force_activated' in database`);
      } 
      else if (shouldBePaused && currentlyActive) {
        console.log(`Campaign should be PAUSED but is currently ACTIVE - pausing campaign`);
        
        // Pause the campaign
        await axios.post(`${BASE_URL}/campaigns/${campaign.trafficstar_campaign_id}/pause`, 
          {}, 
          { headers: { 'X-API-KEY': API_KEY } }
        );
        console.log(`Successfully paused campaign ${campaign.trafficstar_campaign_id}`);
        
        // Update the campaign status in our database
        await pool.query(
          `UPDATE campaigns 
           SET last_traffic_sender_status = $1, 
               last_traffic_sender_action = NOW(),
               updated_at = NOW()
           WHERE id = $2`,
          ['force_paused', campaignId]
        );
        console.log(`Updated campaign ${campaignId} status to 'force_paused' in database`);
      }
      else {
        console.log(`Campaign is already in the correct state (${shouldBeActive ? 'ACTIVE' : 'PAUSED'})`);
        
        if (force) {
          // Force update the state even if it appears correct
          if (shouldBeActive) {
            await axios.post(`${BASE_URL}/campaigns/${campaign.trafficstar_campaign_id}/activate`, 
              {}, 
              { headers: { 'X-API-KEY': API_KEY } }
            );
            console.log(`Force activated campaign ${campaign.trafficstar_campaign_id}`);
          } else {
            await axios.post(`${BASE_URL}/campaigns/${campaign.trafficstar_campaign_id}/pause`, 
              {}, 
              { headers: { 'X-API-KEY': API_KEY } }
            );
            console.log(`Force paused campaign ${campaign.trafficstar_campaign_id}`);
          }
          
          // Update the database state
          await pool.query(
            `UPDATE campaigns 
             SET last_traffic_sender_status = $1, 
                 last_traffic_sender_action = NOW(),
                 updated_at = NOW()
             WHERE id = $2`,
            [shouldBeActive ? 'force_activated' : 'force_paused', campaignId]
          );
          console.log(`Updated campaign ${campaignId} status to '${shouldBeActive ? 'force_activated' : 'force_paused'}' in database`);
        }
      }
      
      console.log('Campaign state check completed successfully');
    } catch (error) {
      console.error('Error checking or updating TrafficStar campaign status:', error);
    }
  } catch (error) {
    console.error('Error in script:', error);
  } finally {
    await pool.end();
  }
}

// Run the main function
main();