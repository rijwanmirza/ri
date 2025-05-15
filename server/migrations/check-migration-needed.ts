import { pool } from "../db";

/** 
 * Check if budget update time field migration is needed
 * @returns {Promise<boolean>} true if migration is needed, false otherwise
 */
export async function isBudgetUpdateTimeMigrationNeeded(): Promise<boolean> {
  try {
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Check if the budget_update_time column exists in the campaigns table
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'budget_update_time';
      `);
      
      // If the column doesn't exist, we need to perform the migration
      return result.rows.length === 0;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Error checking for budget update time field:', error);
    // If there's an error, assume migration is needed
    return true;
  }
}

/** 
 * Check if TrafficStar fields migration is needed
 * @returns {Promise<boolean>} true if migration is needed, false otherwise
 */
export async function isTrafficStarFieldsMigrationNeeded(): Promise<boolean> {
  try {
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Check if the trafficstar_campaign_id column exists in the campaigns table
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'trafficstar_campaign_id';
      `);
      
      // If the column doesn't exist, we need to perform the migration
      return result.rows.length === 0;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Error checking for TrafficStar fields:', error);
    // If there's an error, assume migration is needed
    return true;
  }
}

/** 
 * Check if custom redirector toggle migration is needed
 * @returns {Promise<boolean>} true if migration is needed, false otherwise
 */
export async function isCustomRedirectorToggleMigrationNeeded(): Promise<boolean> {
  try {
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Check if the use_custom_redirector column exists in the campaign_paths table
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'campaign_paths' 
        AND column_name = 'use_custom_redirector';
      `);
      
      // If the column doesn't exist, we need to perform the migration
      return result.rows.length === 0;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Error checking for custom redirector toggle field:', error);
    // If there's an error, assume migration is needed
    return true;
  }
}