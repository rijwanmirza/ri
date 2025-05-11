import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const { Pool } = pg;
async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  try {
    // List all tables
    console.log('--- Database Tables ---');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables:', tablesResult.rows.map(r => r.table_name).join(', '));
    // Check campaigns table structure
    console.log('\n--- Campaigns Table Structure ---');
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'campaigns'
    `);
    console.log('Columns:', columnsResult.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
    // Check campaigns with TrafficStar
    console.log('\n--- Campaigns with TrafficStar Integration ---');
    const campaignsResult = await pool.query(`
      SELECT id, name, trafficstar_campaign_id 
      FROM campaigns 
      WHERE trafficstar_campaign_id IS NOT NULL AND trafficstar_campaign_id != ''
    `);
    
    if (campaignsResult.rows.length === 0) {
      console.log('No campaigns with TrafficStar integration found');
    } else {
      console.log(`Found ${campaignsResult.rows.length} campaigns with TrafficStar integration:`);
      campaignsResult.rows.forEach(campaign => {
        console.log(`  ID: ${campaign.id}, Name: ${campaign.name}, TrafficStar ID: ${campaign.trafficstar_campaign_id}`);
        
        // Create a log file for this campaign
        const logDir = path.join('/var/www/UrlCampaignTracker', 'url_budget_logs');
        const logFile = path.join(logDir, `campaign_${campaign.id}_url_budget_logs`);
        
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        
        fs.writeFileSync(logFile, `101|${campaign.id}|test-url|0.0100|2025-05-11::00:30:00\n`);
        fs.chmodSync(logFile, 0o777); // Make file writable by everyone
        console.log(`  Created log file: ${logFile}`);
        
        // Also create the active logs file
        const activeDir = path.join('/var/www/UrlCampaignTracker', 'Active_Url_Budget_Logs');
        const activeFile = path.join(activeDir, 'Active_Url_Budget_Logs');
        
        if (!fs.existsSync(activeDir)) {
          fs.mkdirSync(activeDir, { recursive: true });
        }
        
        fs.writeFileSync(activeFile, `101|0.0100|2025-05-11::00:30:00\n`);
        fs.chmodSync(activeFile, 0o777); // Make file writable by everyone
        console.log(`  Created active logs file: ${activeFile}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}
main().catch(console.error);
