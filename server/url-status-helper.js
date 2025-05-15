/**
 * URL Status Helper
 * 
 * This helper provides functions to query URLs with specific statuses
 * without breaking existing functionality.
 */

const { db } = require('./db');

/**
 * Get URLs added after budget calculation for a campaign, including both active and completed URLs
 * This specifically addresses the bug where URLs that were completed during the 9-minute window weren't counted
 * 
 * @param {number} campaignId - The campaign ID
 * @param {Date} calcTime - The calculation time
 * @returns {Promise<Array>} - Array of URLs
 */
async function getUrlsAddedAfterBudgetCalc(campaignId, calcTime) {
  try {
    // Use raw SQL to avoid any issues with field names or imports
    const query = `
      SELECT * FROM urls 
      WHERE campaign_id = $1 
      AND created_at > $2 
      AND budget_calculated = false
      AND (status = 'active' OR status = 'complete')
    `;
    
    const result = await db.query(query, [campaignId, calcTime]);
    return result.rows;
  } catch (error) {
    console.error(`Error finding URLs after budget calculation: ${error.message}`);
    return [];
  }
}

module.exports = {
  getUrlsAddedAfterBudgetCalc
};