#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Create necessary directories
const urlBudgetLogsDir = path.join(__dirname, 'url_budget_logs');
const activeUrlBudgetLogsDir = path.join(__dirname, 'Active_Url_Budget_Logs');
// Create directories if they don't exist
if (!fs.existsSync(urlBudgetLogsDir)) {
  fs.mkdirSync(urlBudgetLogsDir, { recursive: true });
  console.log(`Created URL budget logs directory at ${urlBudgetLogsDir}`);
}
if (!fs.existsSync(activeUrlBudgetLogsDir)) {
  fs.mkdirSync(activeUrlBudgetLogsDir, { recursive: true });
  console.log(`Created Active_Url_Budget_Logs directory at ${activeUrlBudgetLogsDir}`);
}
// Set permissions
try {
  exec(`chmod -R 777 ${urlBudgetLogsDir}`);
  exec(`chmod -R 777 ${activeUrlBudgetLogsDir}`);
  console.log('Set permissions on log directories');
} catch (error) {
  console.error('Error setting permissions:', error);
}
// Create a new URL budget logger file
const urlBudgetLoggerPath = path.join(__dirname, 'server', 'url-budget-logger.ts');
// The complete content of the new URL budget logger file
const urlBudgetLoggerContent = `import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { db } from './db';
import { urls, campaigns } from '@shared/schema';
import { eq, and, ne, isNull } from 'drizzle-orm';
/**
 * Class for logging URL budget calculations
 * Logs are saved in format: UrlId|CampaignId|UrlName|Price|Date::Time in HH:MM:SEC[current UTC+00 TIME]
 * Logs are campaign-specific and only created for campaigns with TrafficStar integration
 */
export class UrlBudgetLogger {
  private static instance: UrlBudgetLogger;
  private logDirectory: string;
  
  // Map to track URLs that have been logged by campaign ID
  // Key: campaignId, Value: Set of urlIds that have been logged
  private loggedUrlsByCampaign: Map<number, Set<number>> = new Map();
  private constructor() {
    // Set the log directory path to the root directory
    this.logDirectory = path.join('.', 'url_budget_logs');
    this.ensureLogDirectoryExists();
    
    // Create the symbolic link or directory for Active_Url_Budget_Logs
    const activeLogs = path.join('.', 'Active_Url_Budget_Logs');
    if (!fs.existsSync(activeLogs)) {
      try {
        // Create a directory instead of a symlink
        fs.mkdirSync(activeLogs, { recursive: true });
        console.log(\`Created Active_Url_Budget_Logs directory for easier access\`);
      } catch (error) {
        console.error(\`Failed to create Active_Url_Budget_Logs directory: \${error}\`);
      }
    }
  }
  /**
   * Get singleton instance of the logger
   */
  public static getInstance(): UrlBudgetLogger {
    if (!UrlBudgetLogger.instance) {
      UrlBudgetLogger.instance = new UrlBudgetLogger();
    }
    return UrlBudgetLogger.instance;
  }
  /**
   * Ensure the log directory exists, create if not
   */
  private ensureLogDirectoryExists(): void {
    if (!fs.existsSync(this.logDirectory)) {
      try {
        fs.mkdirSync(this.logDirectory, { recursive: true });
        console.log(\`Created URL budget logs directory at \${this.logDirectory}\`);
      } catch (error) {
        console.error(\`Failed to create URL budget logs directory: \${error}\`);
      }
    }
  }
  /**
   * Get the log file path for a specific campaign
   * @param campaignId Campaign ID
   * @returns Path to the log file
   */
  private getLogFilePath(campaignId: number): string {
    return path.join(this.logDirectory, \`campaign_\${campaignId}_url_budget_logs\`);
  }
  /**
   * Ensure a campaign-specific log file exists
   * @param campaignId Campaign ID
   */
  private ensureCampaignLogFileExists(campaignId: number): void {
    const logFilePath = this.getLogFilePath(campaignId);
    
    if (!fs.existsSync(logFilePath)) {
      try {
        fs.writeFileSync(logFilePath, '');
        console.log(\`Created URL budget log file for campaign \${campaignId} at \${logFilePath}\`);
      } catch (error) {
        console.error(\`Failed to create URL budget log file for campaign \${campaignId}: \${error}\`);
      }
    }
  }
  /**
   * Initialize tracking for a campaign
   * @param campaignId Campaign ID
   */
  private initCampaignTracking(campaignId: number): void {
    // Create log file if it doesn't exist
    this.ensureCampaignLogFileExists(campaignId);
    
    // Initialize tracking set if it doesn't exist
    if (!this.loggedUrlsByCampaign.has(campaignId)) {
      this.loggedUrlsByCampaign.set(campaignId, new Set<number>());
    }
  }
  /**
   * Get the active logs file path
   * @returns Path to the active log file
   */
  private getActiveLogFilePath(): string {
    return path.join('.', 'Active_Url_Budget_Logs', 'Active_Url_Budget_Logs');
  }
  /**
   * Log a URL budget calculation if it hasn't been logged in the current high-spend cycle for this campaign
   * This is an optimized version that supports concurrent logging
   * 
   * @param urlId URL ID
   * @param price Price calculated for remaining clicks
   * @param campaignId Campaign ID
   * @param timestamp Timestamp (optional, defaults to current time)
   * @returns boolean indicating if the URL was logged (true) or skipped because it was already logged (false)
   */
  public async logUrlBudget(
    urlId: number, 
    price: number, 
    campaignId: number, 
    timestamp: Date = new Date()
  ): Promise<boolean> {
    try {
      // First, check if this campaign has TrafficStar integration
      const hasTrafficStar = await this.hasCampaignTrafficStarIntegration(campaignId);
      if (!hasTrafficStar) {
        console.log(\`⚠️ Skipping URL budget log for URL ID \${urlId} - Campaign \${campaignId} has no TrafficStar integration\`);
        return false;
      }
      
      // Check if the URL is active and belongs to this campaign (optimized to reduce DB calls)
      const isValidUrl = await this.isUrlActiveForCampaign(urlId, campaignId);
      if (!isValidUrl) {
        console.log(\`⚠️ Skipping URL budget log for URL ID \${urlId} - URL is not active for campaign \${campaignId}\`);
        return false;
      }
      
      // Initialize tracking for this campaign if needed
      this.initCampaignTracking(campaignId);
      
      // Get tracking set for this campaign
      const loggedUrls = this.loggedUrlsByCampaign.get(campaignId);
      
      // Skip if this URL has already been logged for this campaign
      if (loggedUrls?.has(urlId)) {
        console.log(\`🔄 Skipping duplicate URL budget log for URL ID \${urlId} in campaign \${campaignId} - already logged in this high-spend cycle\`);
        return false;
      }
      
      // Get URL name from database if needed for the log
      let urlName = \`URL-\${urlId}\`;
      try {
        const urlInfo = await db.select({
          name: urls.name
        }).from(urls).where(eq(urls.id, urlId)).limit(1);
        
        if (urlInfo.length > 0) {
          urlName = urlInfo[0].name || urlName;
        }
      } catch (error) {
        // Continue with default name if there's an error
        console.warn(\`⚠️ Could not get name for URL \${urlId}, using default: \${error}\`);
      }
      
      // Ensure log directory and campaign-specific log file exist (done in parallel)
      await Promise.all([
        this.ensureLogDirectoryExists(),
        this.ensureCampaignLogFileExists(campaignId)
      ]);
      
      // Format the log entries
      const date = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
      const time = timestamp.toISOString().split('T')[1].substring(0, 8); // HH:MM:SS
      
      // Format: UrlId|Price|Date::Time
      const logEntryFormat1 = \`\${urlId}|\${price.toFixed(4)}|\${date}::\${time}\\n\`;
      
      // Format: UrlId|CampaignId|UrlName|Price|Date::Time
      const logEntryFormat2 = \`\${urlId}|\${campaignId}|\${urlName}|\${price.toFixed(4)}|\${date}::\${time}\\n\`;
      
      const campaignLogPath = this.getLogFilePath(campaignId);
      const activeLogPath = this.getActiveLogFilePath();
      // Make sure the active log file exists and write both logs in parallel
      const writePromises = [];
      
      if (!fs.existsSync(activeLogPath)) {
        writePromises.push(fsPromises.writeFile(activeLogPath, ''));
      }
      
      // Push both write operations to be executed in parallel
      writePromises.push(fsPromises.appendFile(campaignLogPath, logEntryFormat2));
      writePromises.push(fsPromises.appendFile(activeLogPath, logEntryFormat1));
      
      // Wait for all file operations to complete
      await Promise.all(writePromises);
      
      console.log(\`📝 Logged URL budget for URL ID \${urlId} in campaign \${campaignId}: $\${price.toFixed(4)} at \${date}::\${time}\`);
      
      // Add to set of logged URLs for this campaign
      loggedUrls?.add(urlId);
      return true;
    } catch (error) {
      console.error(\`❌ Failed to log URL budget for URL \${urlId}: \${error}\`);
      return false;
    }
  }
  
  /**
   * Check if a URL is active and belongs to the specified campaign
   * @param urlId URL ID to check
   * @param campaignId Campaign ID to check
   * @returns true if the URL is active and belongs to the campaign, false otherwise
   */
  private async isUrlActiveForCampaign(urlId: number, campaignId: number): Promise<boolean> {
    try {
      const url = await db.query.urls.findFirst({
        where: (url, { eq, and }) => 
          and(
            eq(url.id, urlId),
            eq(url.campaignId, campaignId),
            eq(url.status, 'active')
          )
      });
      
      return !!url;
    } catch (error) {
      console.error(\`❌ Failed to check if URL \${urlId} is active for campaign \${campaignId}: \${error}\`);
      return false;
    }
  }
  /**
   * Check if a URL has already been logged in the current high-spend cycle for a specific campaign
   * @param campaignId Campaign ID
   * @param urlId URL ID to check
   * @returns true if the URL has been logged for this campaign, false otherwise
   */
  public isUrlLogged(campaignId: number, urlId: number): boolean {
    const loggedUrls = this.loggedUrlsByCampaign.get(campaignId);
    return loggedUrls?.has(urlId) || false;
  }
  /**
   * Clear URL budget logs for a specific campaign and reset its tracking set
   * Should be called when campaign spent value drops below $10
   * @param campaignId Campaign ID
   */
  public async clearCampaignLogs(campaignId: number): Promise<void> {
    try {
      // Get the log file path for this campaign
      const logFilePath = this.getLogFilePath(campaignId);
      
      // Check if the file exists before attempting to clear it
      if (fs.existsSync(logFilePath)) {
        // Clear the log file by writing an empty string
        await fsPromises.writeFile(logFilePath, '');
      }
      
      // Get the active log file path
      const activeLogPath = this.getActiveLogFilePath();
      
      // If active log exists, we need to rebuild it from all other campaigns except this one
      if (fs.existsSync(activeLogPath)) {
        try {
          // Clear the active log file first
          await fsPromises.writeFile(activeLogPath, '');
          
          // Get all campaigns with TrafficStar integration except the one being cleared
          const query = \`
            SELECT id, name, trafficstar_campaign_id 
            FROM campaigns 
            WHERE id != $1
            AND trafficstar_campaign_id IS NOT NULL 
            AND trafficstar_campaign_id != ''
          \`;
          
          // Use raw SQL query
          const { pool } = await import('./db');
          const result = await pool.query(query, [campaignId]);
          const otherCampaigns = result.rows;
          
          // Rebuild the active log from other campaign logs
          for (const campaign of otherCampaigns) {
            const campaignLogPath = this.getLogFilePath(campaign.id);
            if (fs.existsSync(campaignLogPath)) {
              // Read the campaign log file
              const fileContent = await fsPromises.readFile(campaignLogPath, 'utf-8');
              const lines = fileContent.split('\\n').filter(line => line.trim() !== '');
              
              // Convert each line to the simplified format and append to active log
              for (const line of lines) {
                const [urlId, _campaignId, _urlName, price, dateTime] = line.split('|');
                // Format the line in requested format: UrlId|Price|Date::Time
                const simplifiedLine = \`\${urlId}|\${price}|\${dateTime}\\n\`;
                await fsPromises.appendFile(activeLogPath, simplifiedLine);
              }
            }
          }
          
          console.log(\`✅ Rebuilt active log after clearing campaign \${campaignId}\`);
        } catch (rebuildError) {
          console.error(\`❌ Failed to rebuild active log: \${rebuildError}\`);
        }
      }
      
      // Clear the set of logged URLs for this campaign
      this.loggedUrlsByCampaign.set(campaignId, new Set<number>());
      
      console.log(\`🧹 Cleared URL budget logs for campaign \${campaignId} - spent value dropped below threshold\`);
    } catch (error) {
      console.error(\`❌ Failed to clear URL budget logs for campaign \${campaignId}: \${error}\`);
    }
  }
  /**
   * Get all URL budget logs for a specific campaign
   * @param campaignId Campaign ID
   * @returns Array of log entries
   */
  public async getCampaignUrlBudgetLogs(campaignId: number): Promise<Array<{urlId: number, campaignId: number, urlName: string, price: string, dateTime: string}>> {
    try {
      const logFilePath = this.getLogFilePath(campaignId);
      
      // Check if the file exists
      if (!fs.existsSync(logFilePath)) {
        return [];
      }
      
      // Read the log file
      const fileContent = await fsPromises.readFile(logFilePath, 'utf-8');
      const lines = fileContent.split('\\n').filter(line => line.trim() !== '');
      
      // Parse each line
      return lines.map(line => {
        const [urlId, cId, urlName, price, dateTime] = line.split('|');
        return {
          urlId: parseInt(urlId, 10),
          campaignId: parseInt(cId, 10),
          urlName: urlName,
          price: price,
          dateTime: dateTime
        };
      });
    } catch (error) {
      console.error(\`❌ Failed to get URL budget logs for campaign \${campaignId}: \${error}\`);
      return [];
    }
  }
  /**
   * Get all URL budget logs across all campaigns
   * @returns Array of log entries
   */
  public async getAllUrlBudgetLogs(): Promise<Array<{urlId: number, campaignId: number, urlName: string, price: string, dateTime: string}>> {
    try {
      // Get all campaigns with TrafficStar integration using raw SQL
      const query = \`
        SELECT id, name, trafficstar_campaign_id 
        FROM campaigns 
        WHERE trafficstar_campaign_id IS NOT NULL 
        AND trafficstar_campaign_id != ''
      \`;
      
      // Import the pool directly to execute the query
      const { pool } = await import('./db');
      const result = await pool.query(query);
      const campaignsWithTrafficStar = result.rows;
      
      console.log(\`Found \${campaignsWithTrafficStar.length} campaigns with TrafficStar integration\`);
      // Combine logs from all campaigns
      let allLogs: Array<{urlId: number, campaignId: number, urlName: string, price: string, dateTime: string}> = [];
      for (const campaign of campaignsWithTrafficStar) {
        console.log(\`Getting logs for campaign ID \${campaign.id}\`);
        const campaignLogs = await this.getCampaignUrlBudgetLogs(campaign.id);
        console.log(\`Found \${campaignLogs.length} logs for campaign ID \${campaign.id}\`);
        allLogs = [...allLogs, ...campaignLogs];
      }
      console.log(\`Total logs found: \${allLogs.length}\`);
      return allLogs;
    } catch (error) {
      console.error(\`❌ Failed to get all URL budget logs: \${error}\`);
      return [];
    }
  }
  /**
   * Check if a campaign has TrafficStar integration
   * @param campaignId Campaign ID
   * @returns true if the campaign has TrafficStar integration, false otherwise
   */
  public async hasCampaignTrafficStarIntegration(campaignId: number): Promise<boolean> {
    try {
      // Use raw SQL to check if campaign has TrafficStar integration
      const { pool } = await import('./db');
      const result = await pool.query(\`
        SELECT 1 
        FROM campaigns 
        WHERE id = $1 
        AND trafficstar_campaign_id IS NOT NULL 
        AND trafficstar_campaign_id != ''
      \`, [campaignId]);
      
      return result.rowCount > 0;
    } catch (error) {
      console.error(\`❌ Failed to check if campaign \${campaignId} has TrafficStar integration: \${error}\`);
      return false;
    }
  }
  /**
   * Clear all URL budget logs (emergency use only)
   * @returns Number of log files deleted
   */
  public async clearAllLogs(): Promise<number> {
    try {
      // Get a list of all log files in the directory
      const files = fs.readdirSync(this.logDirectory);
      
      // Filter to only include campaign log files
      const campaignLogFiles = files.filter(file => file.startsWith('campaign_') && file.endsWith('_url_budget_logs'));
      
      // Clear each file
      for (const file of campaignLogFiles) {
        const filePath = path.join(this.logDirectory, file);
        await fsPromises.writeFile(filePath, '');
      }
      
      // Also clear the active logs file
      const activeLogPath = this.getActiveLogFilePath();
      if (fs.existsSync(activeLogPath)) {
        await fsPromises.writeFile(activeLogPath, '');
      }
      
      // Reset all tracking sets
      this.loggedUrlsByCampaign.clear();
      
      console.log(\`🧹 Cleared all URL budget logs - \${campaignLogFiles.length} files emptied\`);
      return campaignLogFiles.length;
    } catch (error) {
      console.error(\`❌ Failed to clear all URL budget logs: \${error}\`);
      return 0;
    }
  }
}
// Export singleton instance
const urlBudgetLogger = UrlBudgetLogger.getInstance();
export default urlBudgetLogger;
`;
// Create the file
fs.writeFileSync(urlBudgetLoggerPath, urlBudgetLoggerContent);
console.log(`Created new URL budget logger file at ${urlBudgetLoggerPath}`);
// Create a test log file for campaign ID 1
const campaign1LogPath = path.join(urlBudgetLogsDir, 'campaign_1_url_budget_logs');
if (!fs.existsSync(campaign1LogPath)) {
  fs.writeFileSync(campaign1LogPath, '101|1|test-url|0.0100|2025-05-10::23:30:00\n');
  console.log(`Created test log file for campaign 1 at ${campaign1LogPath}`);
}
// Create test active logs file
const activeLogsPath = path.join(activeUrlBudgetLogsDir, 'Active_Url_Budget_Logs');
if (!fs.existsSync(activeLogsPath)) {
  fs.writeFileSync(activeLogsPath, '101|0.0100|2025-05-10::23:30:00\n');
  console.log(`Created test active logs file at ${activeLogsPath}`);
}
// Restart the application
console.log('Restarting the application...');
exec('pm2 restart url-tracker', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error restarting application: ${error.message}`);
    return;
  }
  
  console.log(`Application restarted: ${stdout}`);
  console.log('New URL budget logger has been created successfully!');
});
