const { Pool } = require('pg');

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixBlacklistedUrlsTable() {
  const client = await pool.connect();
  try {
    console.log('Starting database fix for blacklisted_urls table...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Check current columns in blacklisted_urls table
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'blacklisted_urls'
    `);
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    console.log('Existing columns:', existingColumns);
    
    // Add target_url column if it doesn't exist
    if (!existingColumns.includes('target_url')) {
      console.log('Adding target_url column...');
      await client.query(`ALTER TABLE blacklisted_urls ADD COLUMN target_url TEXT;`);
      
      // If 'url' column exists, copy data from url to target_url
      if (existingColumns.includes('url')) {
        console.log('Copying data from url column to target_url column...');
        await client.query(`UPDATE blacklisted_urls SET target_url = url WHERE target_url IS NULL;`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Database fix completed successfully!');
    
    // Print current schema for verification
    const updatedSchema = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'blacklisted_urls';
    `);
    console.log('Current blacklisted_urls schema:');
    console.table(updatedSchema.rows);
    
  } catch (err) {
    // Roll back transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error during database fix:', err);
  } finally {
    client.release();
  }
}

// Run the function
fixBlacklistedUrlsTable();