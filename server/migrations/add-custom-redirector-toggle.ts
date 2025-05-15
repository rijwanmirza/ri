import { pool } from "../db";

/**
 * Migration to add the useCustomRedirector column to campaign_paths table
 */
export async function addCustomRedirectorToggle() {
  try {
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Check if the column already exists
      const checkColumnSql = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'campaign_paths' 
        AND column_name = 'use_custom_redirector';
      `;
      
      const { rows: columnCheckResult } = await client.query(checkColumnSql);
      
      // If column doesn't exist, add it
      if (columnCheckResult.length === 0) {
        console.log('Adding useCustomRedirector column to campaign_paths table...');
        
        const addColumnSql = `
          ALTER TABLE campaign_paths 
          ADD COLUMN use_custom_redirector BOOLEAN DEFAULT TRUE;
        `;
        
        await client.query(addColumnSql);
        
        console.log('✅ Successfully added the useCustomRedirector column');
        return { 
          success: true, 
          message: "Added useCustomRedirector column to campaign_paths table" 
        };
      } else {
        console.log('Column useCustomRedirector already exists in campaign_paths table');
        return { 
          success: true, 
          message: "Column useCustomRedirector already exists in campaign_paths table" 
        };
      }
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('❌ Error adding useCustomRedirector column:', error);
    return { 
      success: false, 
      message: `Failed to add useCustomRedirector column: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}