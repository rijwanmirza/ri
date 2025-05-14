/**
 * Test script for Child TrafficStar Campaigns feature
 * 
 * This script tests the backend functionality of the Child TrafficStar Campaigns feature
 * by directly interacting with the API endpoints to create, fetch, update, and delete
 * child campaigns for a given parent campaign.
 */
import axios from 'axios';

// Configuration
const API_KEY = "uiic487487"; // Default API key from scratchpad
const BASE_URL = "http://localhost:5000"; // Default local server URL
const CAMPAIGN_ID = 5; // Test with campaign ID 5

// Test data
const testCampaign = {
  trafficstarCampaignId: "123456",
  clickRemainingThreshold: 5000
};

// Set up axios with API key header
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
  }
});

// Test functions
async function testCreateChildCampaign() {
  console.log("Testing creating a child campaign...");
  try {
    const response = await api.post(`/api/campaigns/${CAMPAIGN_ID}/child-trafficstar-campaigns`, testCampaign);
    console.log("Created child campaign:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error creating child campaign:", error.response?.data || error.message);
    throw error;
  }
}

async function testGetChildCampaigns() {
  console.log("Testing fetching child campaigns...");
  try {
    const response = await api.get(`/api/campaigns/${CAMPAIGN_ID}/child-trafficstar-campaigns`);
    console.log("Child campaigns:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching child campaigns:", error.response?.data || error.message);
    throw error;
  }
}

async function testDeleteChildCampaign(id) {
  console.log(`Testing deleting child campaign with ID ${id}...`);
  try {
    const response = await api.delete(`/api/child-trafficstar-campaigns/${id}`);
    console.log("Delete response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error deleting child campaign:", error.response?.data || error.message);
    throw error;
  }
}

// Run all tests
async function runTests() {
  try {
    console.log("Starting Child TrafficStar Campaigns tests...");
    
    // First get existing campaigns
    const existingCampaigns = await testGetChildCampaigns();
    
    // Create a new child campaign
    const createdCampaign = await testCreateChildCampaign();
    
    // Get updated list of campaigns
    const updatedCampaigns = await testGetChildCampaigns();
    
    // Verify that the new campaign was added
    if (updatedCampaigns.length !== existingCampaigns.length + 1) {
      console.error("Expected campaigns count to increase by 1 after creation");
    } else {
      console.log("✅ Campaign count increased as expected");
    }
    
    // Delete the created campaign
    if (createdCampaign && createdCampaign.id) {
      await testDeleteChildCampaign(createdCampaign.id);
      
      // Verify deletion
      const afterDeleteCampaigns = await testGetChildCampaigns();
      if (afterDeleteCampaigns.length !== existingCampaigns.length) {
        console.error("Expected campaigns count to return to original after deletion");
      } else {
        console.log("✅ Campaign count returned to original after deletion");
      }
    }
    
    console.log("All tests completed!");
  } catch (error) {
    console.error("Error running tests:", error);
  }
}

// Run the tests
runTests();