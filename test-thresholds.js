// Test script for thresholds
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testThresholds() {
  try {
    // Get campaigns 
    const { rows: campaigns } = await pool.query(`
      SELECT id, name, 
       min_pause_click_threshold, min_activate_click_threshold,
       high_spend_pause_threshold, high_spend_activate_threshold,
       daily_spent
      FROM campaigns 
      WHERE id IN (1, 4);
    `);
    
    // For each campaign, test the threshold selection logic at different spend values
    for (const campaign of campaigns) {
      console.log(`\nTesting campaign ${campaign.id} - ${campaign.name}:`);
      console.log('Current thresholds:');
      console.log(`- LOW SPEND: Pause at ${campaign.min_pause_click_threshold || 5000}, Activate at ${campaign.min_activate_click_threshold || 15000}`);
      console.log(`- HIGH SPEND: Pause at ${campaign.high_spend_pause_threshold || 1000}, Activate at ${campaign.high_spend_activate_threshold || 5000}`);
      console.log(`- Current spent value: $${Number(campaign.daily_spent || 0).toFixed(4)}`);
      
      console.log('\nTesting with different spent values:');
      testSpendValue(campaign, 0);
      testSpendValue(campaign, 5);
      testSpendValue(campaign, 9.99);
      testSpendValue(campaign, 10);
      testSpendValue(campaign, 15);
      testSpendValue(campaign, 50);
    }
    
    console.log('\nTest complete!');
  } catch (error) {
    console.error('Error during test:', error.message);
  } finally {
    await pool.end();
  }
}

function testSpendValue(campaign, spentValue) {
  const THRESHOLD = 10.0;
  let MINIMUM_CLICKS_THRESHOLD, REMAINING_CLICKS_THRESHOLD;
  
  if (spentValue >= THRESHOLD) {
    // HIGH SPEND: use high spend thresholds
    MINIMUM_CLICKS_THRESHOLD = campaign.high_spend_pause_threshold || 1000;
    REMAINING_CLICKS_THRESHOLD = campaign.high_spend_activate_threshold || 5000;
    console.log(`  HIGH SPEND ($${spentValue.toFixed(2)}) -> Pause: ${MINIMUM_CLICKS_THRESHOLD}, Activate: ${REMAINING_CLICKS_THRESHOLD}`);
  } else {
    // LOW SPEND: use regular thresholds
    MINIMUM_CLICKS_THRESHOLD = campaign.min_pause_click_threshold || 5000;
    REMAINING_CLICKS_THRESHOLD = campaign.min_activate_click_threshold || 15000;
    console.log(`  LOW SPEND ($${spentValue.toFixed(2)}) -> Pause: ${MINIMUM_CLICKS_THRESHOLD}, Activate: ${REMAINING_CLICKS_THRESHOLD}`);
  }
}

// Run the test
testThresholds();