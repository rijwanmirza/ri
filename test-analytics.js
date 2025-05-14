const axios = require('axios');

// Default API key
const apiKey = 'TraffiCS10928';

// Test redirect methods for a specific URL
async function testRedirectMethods(urlId) {
  const methods = ['linkedin', 'facebook', 'whatsapp', 'google_meet', 'google_search', 'google_play', 'direct'];
  
  console.log(`Testing redirect methods for URL ID: ${urlId}`);
  
  // First, get the current analytics for this URL
  try {
    const analyticsBefore = await axios.get(
      `http://localhost:5000/api/urls/${urlId}/redirect-analytics`,
      { headers: { 'X-API-Key': apiKey } }
    );
    
    console.log('Before testing - Current redirect analytics:');
    console.log(JSON.stringify(analyticsBefore.data, null, 2));
    
    // Test each redirect method
    for (const method of methods) {
      console.log(`Testing redirect method: ${method}`);
      try {
        // Use our test analytics endpoint to increment the redirect count
        const response = await axios.get(
          `http://localhost:5000/api/test-redirect-analytics/${urlId}/${method}`,
          { headers: { 'X-API-Key': apiKey } }
        );
        
        console.log(`${method} test response:`, response.data);
      } catch (error) {
        console.error(`Error testing method ${method}:`, error.message);
        if (error.response) {
          console.error('Response:', error.response.data);
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Check analytics after testing
    const analyticsAfter = await axios.get(
      `http://localhost:5000/api/urls/${urlId}/redirect-analytics`,
      { headers: { 'X-API-Key': apiKey } }
    );
    
    console.log('\nAfter testing - Updated redirect analytics:');
    console.log(JSON.stringify(analyticsAfter.data, null, 2));
    
    // Compare before and after
    console.log('\nChanges in redirect analytics:');
    for (const method of methods) {
      const before = analyticsBefore.data[`${method}Redirects`] || 0;
      const after = analyticsAfter.data[`${method}Redirects`] || 0;
      console.log(`${method}: ${before} → ${after} (${after - before > 0 ? '+' : ''}${after - before})`);
    }
    
  } catch (error) {
    console.error('Error in test:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// URL ID to test (use 245 from the original test or another valid URL ID)
const urlId = process.argv[2] || 245;

// Run the test
testRedirectMethods(urlId);