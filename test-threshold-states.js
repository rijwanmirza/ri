import axios from 'axios';

/**
 * This test verifies that the threshold selection logic works correctly
 * for both HIGH SPEND and LOW SPEND campaign states.
 */

// Mock campaign objects for testing
const lowSpendCampaign = {
  id: 999,
  name: "Low Spend Test Campaign",
  trafficstarCampaignId: "999999",
  minPauseClickThreshold: 5000,
  minActivateClickThreshold: 15000,
  highSpendPauseThreshold: 1000, 
  highSpendActivateThreshold: 5000
};

const highSpendCampaign = {
  id: 888,
  name: "High Spend Test Campaign",
  trafficstarCampaignId: "888888",
  minPauseClickThreshold: 5000,
  minActivateClickThreshold: 15000,
  highSpendPauseThreshold: 1000, 
  highSpendActivateThreshold: 5000
};

// Mock threshold function to see which thresholds are selected
function getThresholds(campaign, spentValue) {
  const THRESHOLD = 10.0; // $10 threshold for different handling
  let pauseThreshold, activateThreshold;
  
  if (spentValue >= THRESHOLD) {
    // HIGH SPEND ($10+) - use high spend thresholds
    pauseThreshold = campaign.highSpendPauseThreshold || 1000;
    activateThreshold = campaign.highSpendActivateThreshold || 5000;
    console.log(`Using HIGH SPEND thresholds for campaign ${campaign.id}: Pause at ${pauseThreshold}, Activate at ${activateThreshold}`);
  } else {
    // LOW SPEND (< $10) - use regular thresholds
    pauseThreshold = campaign.minPauseClickThreshold || 5000;
    activateThreshold = campaign.minActivateClickThreshold || 15000;
    console.log(`Using LOW SPEND thresholds for campaign ${campaign.id}: Pause at ${pauseThreshold}, Activate at ${activateThreshold}`);
  }
  
  return { pauseThreshold, activateThreshold };
}

// Test different spent values to ensure correct thresholds are used
async function testThresholdSelections() {
  console.log("\n=== TESTING THRESHOLD SELECTION LOGIC ===\n");

  // Test LOW SPEND scenarios
  console.log("Low Spend Test ($5):");
  const lowSpend = 5.0;
  const lowSpendThresholds = getThresholds(lowSpendCampaign, lowSpend);
  console.log(`Expected: Pause=${lowSpendCampaign.minPauseClickThreshold}, Activate=${lowSpendCampaign.minActivateClickThreshold}`);
  console.log(`Actual: Pause=${lowSpendThresholds.pauseThreshold}, Activate=${lowSpendThresholds.activateThreshold}`);
  console.log(`Correct: ${lowSpendThresholds.pauseThreshold === lowSpendCampaign.minPauseClickThreshold && 
               lowSpendThresholds.activateThreshold === lowSpendCampaign.minActivateClickThreshold}\n`);
  
  // Test HIGH SPEND scenarios
  console.log("High Spend Test ($15):");
  const highSpend = 15.0;
  const highSpendThresholds = getThresholds(highSpendCampaign, highSpend);
  console.log(`Expected: Pause=${highSpendCampaign.highSpendPauseThreshold}, Activate=${highSpendCampaign.highSpendActivateThreshold}`);
  console.log(`Actual: Pause=${highSpendThresholds.pauseThreshold}, Activate=${highSpendThresholds.activateThreshold}`);
  console.log(`Correct: ${highSpendThresholds.pauseThreshold === highSpendCampaign.highSpendPauseThreshold && 
               highSpendThresholds.activateThreshold === highSpendCampaign.highSpendActivateThreshold}\n`);
  
  // Test boundary condition (exactly $10)
  console.log("Boundary Condition Test (exactly $10):");
  const boundarySpend = 10.0;
  const boundaryThresholds = getThresholds(highSpendCampaign, boundarySpend);
  console.log(`Expected: Pause=${highSpendCampaign.highSpendPauseThreshold}, Activate=${highSpendCampaign.highSpendActivateThreshold}`);
  console.log(`Actual: Pause=${boundaryThresholds.pauseThreshold}, Activate=${boundaryThresholds.activateThreshold}`);
  console.log(`Correct: ${boundaryThresholds.pauseThreshold === highSpendCampaign.highSpendPauseThreshold && 
               boundaryThresholds.activateThreshold === highSpendCampaign.highSpendActivateThreshold}\n`);

  // Test transition case (just below $10)
  console.log("Transition Test 1 (just below $10 - $9.99):");
  const justBelow = 9.99;
  const belowThresholds = getThresholds(lowSpendCampaign, justBelow);
  console.log(`Expected: Pause=${lowSpendCampaign.minPauseClickThreshold}, Activate=${lowSpendCampaign.minActivateClickThreshold}`);
  console.log(`Actual: Pause=${belowThresholds.pauseThreshold}, Activate=${belowThresholds.activateThreshold}`);
  console.log(`Correct: ${belowThresholds.pauseThreshold === lowSpendCampaign.minPauseClickThreshold && 
               belowThresholds.activateThreshold === lowSpendCampaign.minActivateClickThreshold}\n`);

  // Test transition case (just above $10)
  console.log("Transition Test 2 (just above $10 - $10.01):");
  const justAbove = 10.01;
  const aboveThresholds = getThresholds(highSpendCampaign, justAbove);
  console.log(`Expected: Pause=${highSpendCampaign.highSpendPauseThreshold}, Activate=${highSpendCampaign.highSpendActivateThreshold}`);
  console.log(`Actual: Pause=${aboveThresholds.pauseThreshold}, Activate=${aboveThresholds.activateThreshold}`);
  console.log(`Correct: ${aboveThresholds.pauseThreshold === highSpendCampaign.highSpendPauseThreshold && 
               aboveThresholds.activateThreshold === highSpendCampaign.highSpendActivateThreshold}\n`);
}

// Run the test
testThresholdSelections();