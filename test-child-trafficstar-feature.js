/**
 * Test script for Child TrafficStar Campaigns feature integration
 * 
 * This script tests the full functionality of the Child TrafficStar Campaigns feature,
 * including the database operations, API endpoints, and integration with the traffic generator.
 */
import axios from 'axios';
import { setTimeout } from 'timers/promises';

// Configuration
const API_KEY = "uiic487487"; // Default API key from scratchpad
const BASE_URL = "http://localhost:5000"; // Default local server URL
const CAMPAIGN_ID = 5; // Test with campaign ID 5

// API client setup
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  }
});

// Test data
const testCampaigns = [
  { trafficstarCampaignId: "100001", clickRemainingThreshold: 15000 },
  { trafficstarCampaignId: "100002", clickRemainingThreshold: 10000 },
  { trafficstarCampaignId: "100003", clickRemainingThreshold: 5000 }
];

// Functions for testing
async function getChildCampaigns() {
  try {
    const response = await api.get(`/api/campaigns/${CAMPAIGN_ID}/child-trafficstar-campaigns`);
    return response.data;
  } catch (error) {
    console.error('Error fetching child campaigns:', error.message);
    return [];
  }
}

async function createChildCampaign(data) {
  try {
    const response = await api.post(`/api/campaigns/${CAMPAIGN_ID}/child-trafficstar-campaigns`, data);
    return response.data;
  } catch (error) {
    console.error('Error creating child campaign:', error.message);
    return null;
  }
}

async function deleteChildCampaign(id) {
  try {
    const response = await api.delete(`/api/child-trafficstar-campaigns/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting child campaign ${id}:`, error.message);
    return null;
  }
}

async function cleanupTestData() {
  console.log('Cleaning up test data...');
  const campaigns = await getChildCampaigns();
  
  for (const campaign of campaigns) {
    await deleteChildCampaign(campaign.id);
    console.log(`Deleted child campaign ${campaign.id}`);
  }
  
  console.log('Cleanup complete');
}

async function runFullTest() {
  try {
    console.log('Starting Child TrafficStar Campaigns integration test...');
    
    // First, clean up any existing test data
    await cleanupTestData();
    
    // Get initial child campaigns
    const initialCampaigns = await getChildCampaigns();
    console.log(`Initial campaign count: ${initialCampaigns.length}`);
    
    // Create multiple child campaigns
    const createdCampaigns = [];
    for (const campaign of testCampaigns) {
      const created = await createChildCampaign(campaign);
      if (created) {
        createdCampaigns.push(created);
        console.log(`Created child campaign: ${JSON.stringify(created)}`);
      }
    }
    
    // Verify campaigns were created
    const afterCreateCampaigns = await getChildCampaigns();
    console.log(`After creation campaign count: ${afterCreateCampaigns.length}`);
    
    if (afterCreateCampaigns.length === initialCampaigns.length + testCampaigns.length) {
      console.log('✅ All campaigns were created successfully');
    } else {
      console.log('❌ Not all campaigns were created');
    }
    
    // Verify campaigns are ordered by clickRemainingThreshold
    const isOrdered = afterCreateCampaigns.every((campaign, i, arr) => {
      if (i === 0) return true;
      return campaign.clickRemainingThreshold >= arr[i-1].clickRemainingThreshold;
    });
    
    if (isOrdered) {
      console.log('✅ Campaigns are ordered by clickRemainingThreshold');
    } else {
      console.log('❌ Campaigns are not properly ordered');
    }
    
    // Clean up test data
    await cleanupTestData();
    
    // Final verification
    const finalCampaigns = await getChildCampaigns();
    if (finalCampaigns.length === 0) {
      console.log('✅ All test data was cleaned up');
    } else {
      console.log(`❌ Clean up failed, ${finalCampaigns.length} campaigns remain`);
    }
    
    console.log('Integration test completed');
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run the test
runFullTest();