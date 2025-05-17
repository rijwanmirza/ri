/**
 * Campaign Threshold Oscillation Fix
 * 
 * This script updates a campaign's thresholds to ensure there's a proper gap 
 * between activation and pause thresholds, preventing oscillation.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure connection
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    // Get campaign ID from command line args
    const args = process.argv.slice(2);
    const campaignId = args[0] ? parseInt(args[0]) : 1; // Default to campaign ID 1
    
    console.log(`Fixing thresholds for campaign ID: ${campaignId}`);
    
    // Get current campaign settings
    const { rows: [campaign] } = await pool.query(
      'SELECT * FROM campaigns WHERE id = $1',
      [campaignId]
    );
    
    if (!campaign) {
      console.error(`Campaign ID ${campaignId} not found`);
      return;
    }
    
    console.log(`Found campaign: ${campaign.name}`);
    console.log(`Current state: ${campaign.last_traffic_sender_status}`);
    console.log(`Spent value: $${campaign.daily_spent || '0.00'}`);
    
    // Get current threshold settings
    const lowSpendPauseThreshold = campaign.min_pause_click_threshold || 5000;
    const lowSpendActivateThreshold = campaign.min_activate_click_threshold || 15000;
    const highSpendPauseThreshold = campaign.high_spend_pause_threshold || 1000;
    const highSpendActivateThreshold = campaign.high_spend_activate_threshold || 5000;
    
    console.log('Current threshold settings:');
    console.log(`- LOW SPEND - Pause at ${lowSpendPauseThreshold}, Activate at ${lowSpendActivateThreshold}`);
    console.log(`- HIGH SPEND - Pause at ${highSpendPauseThreshold}, Activate at ${highSpendActivateThreshold}`);
    
    // Calculate proper gaps to prevent oscillation
    const minLowGap = Math.ceil(lowSpendPauseThreshold * 1.15); // 15% higher
    const minHighGap = Math.ceil(highSpendPauseThreshold * 1.15); // 15% higher
    
    // Calculate proper activate thresholds if needed
    const newLowActivateThreshold = lowSpendActivateThreshold < minLowGap ? minLowGap : lowSpendActivateThreshold;
    const newHighActivateThreshold = highSpendActivateThreshold < minHighGap ? minHighGap : highSpendActivateThreshold;
    
    if (lowSpendActivateThreshold < minLowGap) {
      console.log(`⚠️ LOW SPEND activate threshold (${lowSpendActivateThreshold}) is too close to pause threshold (${lowSpendPauseThreshold})`);
      console.log(`Updating to ${newLowActivateThreshold} to prevent oscillation`);
    }
    
    if (highSpendActivateThreshold < minHighGap) {
      console.log(`⚠️ HIGH SPEND activate threshold (${highSpendActivateThreshold}) is too close to pause threshold (${highSpendPauseThreshold})`);
      console.log(`Updating to ${newHighActivateThreshold} to prevent oscillation`);
    }
    
    // Update campaign with fixed thresholds
    const result = await pool.query(
      `UPDATE campaigns 
       SET min_activate_click_threshold = $1, 
           high_spend_activate_threshold = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [newLowActivateThreshold, newHighActivateThreshold, campaignId]
    );
    
    console.log(`✅ Successfully updated campaign thresholds to prevent oscillation`);
    
    // Reset campaign state based on spent value
    const spentValue = campaign.daily_spent ? parseFloat(campaign.daily_spent) : 0;
    const isHighSpend = spentValue >= 10.0;
    
    let newState;
    if (isHighSpend) {
      newState = 'high_spend_waiting';
      console.log(`Setting campaign to 'high_spend_waiting' state due to high spend value ($${spentValue.toFixed(2)} >= $10.00)`);
    } else {
      newState = 'low_spend';
      console.log(`Setting campaign to 'low_spend' state due to low spend value ($${spentValue.toFixed(2)} < $10.00)`);
    }
    
    // Update the state
    const stateResult = await pool.query(
      `UPDATE campaigns 
       SET last_traffic_sender_status = $1,
           last_traffic_sender_action = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [newState, campaignId]
    );
    
    console.log(`✅ Successfully reset campaign ${campaignId} state to '${newState}'`);
    console.log('Campaign oscillation fix completed successfully');
  } catch (error) {
    console.error('Error fixing campaign thresholds:', error);
  } finally {
    await pool.end();
  }
}

// Run the main function
main();