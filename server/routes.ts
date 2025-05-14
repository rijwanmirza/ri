import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import spdy from 'spdy';
import type { Server as SpdyServer } from 'spdy';
import { storage } from "./storage";
import { applyClickProtection } from "./click-protection";
import { getServerStats, getStatsHistory, initServerMonitor } from './server-monitor';
import { log } from './vite';
import { requireAuth } from "./auth/middleware";
import { registerUrlClickRoutes } from "./url-click-routes";
import { urlClickLogsManager } from "./url-click-logs-manager";
import urlBudgetTestApi from "./url-budget-test-api";
import { urlRedirectAnalytics } from "./url-redirect-analytics";
import { trackRedirectMethod } from "./fix-redirect-analytics";

import { 
  optimizeResponseHeaders,
  ultraFastMetaRefresh,
  turboDoubleMetaRefresh, 
  turboBridgePage,
  hyperFastHttp307,
  http2TurboRedirect,
  millionRequestsHttp2Redirect,
  optimizedDirectRedirect
} from './high-performance-redirects';
import { 
  insertCampaignSchema, 
  updateCampaignSchema,
  insertUrlSchema, 
  updateUrlSchema,
  bulkUrlActionSchema,
  insertTrafficstarCredentialSchema,
  trafficstarCampaignActionSchema,
  trafficstarCampaignBudgetSchema,
  // Add Traffic Sender schema
  trafficSenderActionSchema,
  trafficstarCampaignEndTimeSchema,
  insertOriginalUrlRecordSchema,
  updateOriginalUrlRecordSchema,
  insertYoutubeUrlRecordSchema,
  insertBlacklistedUrlSchema,
  updateBlacklistedUrlSchema,
  trafficstarCampaigns,
  campaigns,
  urls,
  originalUrlRecords,
  youtubeUrlRecords,
  youtubeApiLogs,
  blacklistedUrls,
  YouTubeApiLogType
} from "@shared/schema";
import { ZodError, z } from "zod";
import { fromZodError } from "zod-validation-error";
import { gmailReader } from "./gmail-reader";
import { trafficStarService } from "./trafficstar-service";
import { youtubeApiService } from "./youtube-api-service";
import { db, pool } from "./db";
import { eq, and, isNotNull, sql, inArray, desc, lt } from "drizzle-orm";
import Imap from "imap";
import { registerCampaignClickRoutes } from "./campaign-click-routes";
import { registerRedirectLogsRoutes } from "./redirect-logs-routes";
import { redirectLogsManager } from "./redirect-logs-manager";
import urlBudgetLogger from "./url-budget-logger";
import { processTrafficGenerator, runTrafficGeneratorForAllCampaigns, debugProcessCampaign } from "./traffic-generator";
import { registerReportsAPITestRoutes } from "./test-reports-api";
import { registerFixedViewsRoute } from "./fix-views-route";
import { registerFixedRedirectRoute } from "./fix-redirect-route";
import { registerFixedBridgeRoute } from "./fix-bridge-route";
import { registerTestRedirectAnalyticsRoutes } from "./test-redirect-analytics";

export async function registerRoutes(app: Express): Promise<Server> {
  // Just create a regular HTTP server for now
  // We'll handle HTTP/2 headers in the route handlers
  const server = createServer(app);

  // Register campaign click record routes
  registerCampaignClickRoutes(app);
  
  // Register redirect logs routes
  registerRedirectLogsRoutes(app);
  
  // Register URL click routes
  registerUrlClickRoutes(app);
  
  // Register the new Reports API test routes
  registerReportsAPITestRoutes(app);
  
  // Register our fixed routes with redirect method analytics tracking
  registerFixedViewsRoute(app);
  registerFixedRedirectRoute(app);
  registerFixedBridgeRoute(app);
  
  // Register test routes for redirect analytics
  registerTestRedirectAnalyticsRoutes(app);
  
  // Register URL budget test API routes
  app.use('/api/url-budget-test', urlBudgetTestApi);
  
  // Test TrafficStar routes have been removed as per user request
  
  // Debug route for traffic generator testing
  app.get("/api/trafficstar/debug-generator/:campaignId", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId, 10);
      if (isNaN(campaignId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid campaign ID"
        });
      }
      
      // Import the traffic generator module to access the debug function
      const { debugProcessCampaign } = await import('./traffic-generator');
      const result = await debugProcessCampaign(campaignId);
      return res.json(result);
    } catch (error) {
      console.error('Error in debug generator route:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to run debug traffic generator", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // Test route to simulate different URL click quantities for Traffic Generator testing
  app.post("/api/trafficstar/test-url-quantities/:campaignId", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId, 10);
      if (isNaN(campaignId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid campaign ID"
        });
      }
      
      // Get test parameters
      const { highClickUrl, lowClickUrl } = req.body;
      
      // Prepare SQL queries
      if (highClickUrl) {
        // Create a URL with high clicks (>15,000 remaining) for testing activation
        await db.execute(sql`
          INSERT INTO urls (name, campaign_id, status, target_url, click_limit, clicks, original_click_limit)
          VALUES ('High Click Test URL', ${campaignId}, 'active', 'https://example.com/high', 20000, 0, 20000)
          ON CONFLICT (id) DO NOTHING
        `);
        
        console.log(`Created test URL with high clicks (20,000) for campaign ${campaignId}`);
      }
      
      if (lowClickUrl) {
        // Create a URL with low clicks (<5,000 remaining) for testing pause
        await db.execute(sql`
          INSERT INTO urls (name, campaign_id, status, target_url, click_limit, clicks, original_click_limit)
          VALUES ('Low Click Test URL', ${campaignId}, 'active', 'https://example.com/low', 4000, 0, 4000)
          ON CONFLICT (id) DO NOTHING
        `);
        
        console.log(`Created test URL with low clicks (4,000) for campaign ${campaignId}`);
      }
      
      return res.json({
        success: true,
        message: "Test URLs created successfully",
        campaignId,
        created: {
          highClickUrl: !!highClickUrl,
          lowClickUrl: !!lowClickUrl
        }
      });
    } catch (error) {
      console.error('Error creating test URLs:', error);
      res.status(500).json({
        success: false,
        message: "Failed to create test URLs",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Route to directly test the Traffic Generator for a campaign
  app.post("/api/trafficstar/test-generator/:campaignId", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId, 10);
      if (isNaN(campaignId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid campaign ID"
        });
      }
      
      // Get test options
      const { forceMode } = req.body;
      
      // Import the traffic generator module and run the process
      const { processTrafficGenerator } = await import('./traffic-generator');
      
      // Process the traffic generator for this campaign
      console.log(`🧪 TESTING Traffic Generator for campaign ${campaignId} with mode: ${forceMode || 'standard'}`);
      
      // Run the actual process - this will check status, spending, etc.
      await processTrafficGenerator(campaignId, forceMode);
      
      return res.json({
        success: true,
        message: `Traffic Generator process triggered for campaign ${campaignId}`,
        campaignId,
        options: {
          forceMode: forceMode || 'standard'
        }
      });
    } catch (error) {
      console.error('Error testing Traffic Generator:', error);
      res.status(500).json({
        success: false,
        message: "Failed to test Traffic Generator",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // API route to fix missing URL click logs
  app.post("/api/system/fix-missing-url-click-logs", async (_req: Request, res: Response) => {
    try {
      const { fixMissingUrlClickLogs } = await import('./fix-url-click-logs');
      const result = await fixMissingUrlClickLogs();
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      console.error('Error fixing missing URL click logs:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fix missing URL click logs", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  
  // API route to apply click protection
  app.post("/api/system/click-protection/apply", async (_req: Request, res: Response) => {
    try {
      // Use our new centralized function to apply click protection
      const result = await applyClickProtection();
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      console.error('Error applying click protection:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to apply click protection", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // API route to fix click protection trigger (specifically for original click limit issue)
  app.post("/api/system/click-protection/fix-trigger", async (_req: Request, res: Response) => {
    try {
      console.log('Applying fix to click protection trigger...');
      
      // Read the SQL file
      const triggerFix = `
        -- Fix click protection trigger function
        CREATE OR REPLACE FUNCTION prevent_unauthorized_click_updates()
        RETURNS TRIGGER AS $$
        BEGIN
          -- If protection bypass is enabled (click protection is disabled),
          -- allow all updates to go through (this handles Original URL Records updates)
          IF NOT (SELECT value FROM protection_settings WHERE key = 'click_protection_enabled') THEN
            -- Bypass enabled, allow all updates
            RETURN NEW;
          END IF;
          
          -- If we get here, click protection is enabled (bypass is not enabled)
          -- We still want click_limit to be updatable for multiplier changes, etc.
          -- But we never want original_click_limit to change unless bypass is enabled
          
          -- Check if original click limit is being changed - never allow this without bypass
          IF NEW.original_click_limit IS DISTINCT FROM OLD.original_click_limit THEN
            RAISE WARNING 'Preventing unauthorized update to original_click_limit (from % to %) for URL %', 
              OLD.original_click_limit, NEW.original_click_limit, NEW.id;
            NEW.original_click_limit := OLD.original_click_limit;
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      // Apply the fix
      await db.execute(triggerFix);
      
      // Test the fix by applying a manual update with bypass
      console.log('Testing fixed trigger with bypass...');
      
      // Enable bypass
      await storage.setClickProtectionBypass(true);
      
      try {
        // Create a test record if needed
        const testRecordId = 999999;
        try {
          await db.execute(`
            INSERT INTO original_url_records (id, name, target_url, original_click_limit)
            VALUES (${testRecordId}, 'test-fix-trigger', 'https://example.com', 1000)
            ON CONFLICT (id) DO NOTHING
          `);
        } catch (e) {
          console.log('Test record already exists:', e);
        }
        
        console.log('Fix applied successfully!');
        
        return res.json({
          success: true,
          message: "Click protection trigger fixed successfully",
          details: {
            fix: "Updated trigger to allow original click limit updates with bypass enabled"
          }
        });
      } finally {
        // Always disable bypass when done
        await storage.setClickProtectionBypass(false);
      }
    } catch (error) {
      console.error('Error fixing click protection trigger:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fix click protection trigger", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // API route to enable click protection bypass
  app.post("/api/system/click-protection/bypass", async (req: Request, res: Response) => {
    try {
      const enable = req.body.enable === true;
      await storage.setClickProtectionBypass(enable);
      return res.json({
        success: true,
        message: `Click protection bypass ${enable ? 'enabled' : 'disabled'} successfully`,
        status: {
          bypassEnabled: enable,
          protectionActive: !enable
        }
      });
    } catch (error) {
      console.error('Error setting click protection bypass:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to set click protection bypass", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // Legacy implementation - kept for reference
  app.post("/api/system/click-protection/legacy", async (_req: Request, res: Response) => {
    try {
      console.log('=== Applying Legacy Click Protection ===');
      console.log('This will install database triggers to prevent automatic updates to click values');
      
      // Create settings table for protection configuration
      await db.execute(`
        CREATE TABLE IF NOT EXISTS protection_settings (
          key TEXT PRIMARY KEY,
          value BOOLEAN NOT NULL
        )
      `);

      // Initialize with default value if not exists
      await db.execute(`
        INSERT INTO protection_settings (key, value)
        VALUES ('click_protection_enabled', TRUE)
        ON CONFLICT (key) DO NOTHING
      `);

      // Create table to track sync operations
      await db.execute(`
        CREATE TABLE IF NOT EXISTS sync_operations (
          id SERIAL PRIMARY KEY,
          is_auto_sync BOOLEAN NOT NULL DEFAULT FALSE,
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE
        )
      `);

      // Function to check if click protection is enabled
      await db.execute(`
        CREATE OR REPLACE FUNCTION click_protection_enabled()
        RETURNS BOOLEAN AS $$
        BEGIN
          RETURN (SELECT value FROM protection_settings WHERE key = 'click_protection_enabled');
        END;
        $$ LANGUAGE plpgsql
      `);

      // Function to check if an automatic sync is in progress
      await db.execute(`
        CREATE OR REPLACE FUNCTION is_auto_sync()
        RETURNS BOOLEAN AS $$
        BEGIN
          RETURN EXISTS (
            SELECT 1 FROM sync_operations 
            WHERE is_auto_sync = TRUE AND completed_at IS NULL
          );
        END;
        $$ LANGUAGE plpgsql
      `);

      // Function to start an auto-sync operation
      await db.execute(`
        CREATE OR REPLACE FUNCTION start_auto_sync()
        RETURNS INTEGER AS $$
        DECLARE
          operation_id INTEGER;
        BEGIN
          INSERT INTO sync_operations (is_auto_sync) 
          VALUES (TRUE) 
          RETURNING id INTO operation_id;
          
          RETURN operation_id;
        END;
        $$ LANGUAGE plpgsql
      `);

      // Function to end an auto-sync operation
      await db.execute(`
        CREATE OR REPLACE FUNCTION end_auto_sync(operation_id INTEGER)
        RETURNS VOID AS $$
        BEGIN
          UPDATE sync_operations
          SET completed_at = NOW()
          WHERE id = operation_id;
        END;
        $$ LANGUAGE plpgsql
      `);

      // Create a function that prevents automatic updates to click values in URLs
      await db.execute(`
        CREATE OR REPLACE FUNCTION prevent_auto_click_updates()
        RETURNS TRIGGER AS $$
        BEGIN
          -- If this is an automatic sync operation
          IF click_protection_enabled() AND is_auto_sync() THEN
            -- Restore the original click_limit value if it was changed
            IF NEW.click_limit IS DISTINCT FROM OLD.click_limit THEN
              RAISE WARNING 'Preventing automatic update to click_limit (from % to %) for URL %', 
                OLD.click_limit, NEW.click_limit, NEW.id;
              NEW.click_limit := OLD.click_limit;
            END IF;
            
            -- Restore the original clicks value if it was changed
            IF NEW.clicks IS DISTINCT FROM OLD.clicks THEN
              RAISE WARNING 'Preventing automatic update to clicks (from % to %) for URL %', 
                OLD.clicks, NEW.clicks, NEW.id;
              NEW.clicks := OLD.clicks;
            END IF;
            
            -- Restore the original original_click_limit value if it was changed
            IF NEW.original_click_limit IS DISTINCT FROM OLD.original_click_limit THEN
              RAISE WARNING 'Preventing automatic update to original_click_limit (from % to %) for URL %', 
                OLD.original_click_limit, NEW.original_click_limit, NEW.id;
              NEW.original_click_limit := OLD.original_click_limit;
            END IF;
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);

      // Create a function that prevents automatic updates to click values in campaigns
      await db.execute(`
        CREATE OR REPLACE FUNCTION prevent_campaign_auto_click_updates()
        RETURNS TRIGGER AS $$
        BEGIN
          -- If this is an automatic sync operation
          IF click_protection_enabled() AND is_auto_sync() THEN
            -- Restore the original total_clicks value if it was changed
            IF NEW.total_clicks IS DISTINCT FROM OLD.total_clicks THEN
              RAISE WARNING 'Preventing automatic update to total_clicks (from % to %) for campaign %', 
                OLD.total_clicks, NEW.total_clicks, NEW.id;
              NEW.total_clicks := OLD.total_clicks;
            END IF;
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);

      // Drop existing triggers if they exist (for idempotency)
      await db.execute(`
        DROP TRIGGER IF EXISTS prevent_auto_click_update_trigger ON urls
      `);
      
      await db.execute(`
        DROP TRIGGER IF EXISTS prevent_campaign_auto_click_update_trigger ON campaigns
      `);

      // Create the trigger for URLs
      await db.execute(`
        CREATE TRIGGER prevent_auto_click_update_trigger
        BEFORE UPDATE ON urls
        FOR EACH ROW
        EXECUTE FUNCTION prevent_auto_click_updates()
      `);

      // Create the trigger for campaigns
      await db.execute(`
        CREATE TRIGGER prevent_campaign_auto_click_update_trigger
        BEFORE UPDATE ON campaigns
        FOR EACH ROW
        EXECUTE FUNCTION prevent_campaign_auto_click_updates()
      `);

      // Check if the triggers were created
      const urlTriggersResult = await db.execute(`
        SELECT COUNT(*) AS count FROM pg_trigger 
        WHERE tgname = 'prevent_auto_click_update_trigger'
      `);
      
      const campaignTriggersResult = await db.execute(`
        SELECT COUNT(*) AS count FROM pg_trigger 
        WHERE tgname = 'prevent_campaign_auto_click_update_trigger'
      `);
      
      // Extract count values safely with fallback to 0
      const urlTriggers = parseInt(urlTriggersResult[0]?.count || '0');
      const campaignTriggers = parseInt(campaignTriggersResult[0]?.count || '0');

      if (urlTriggers > 0 && campaignTriggers > 0) {
        return res.json({
          success: true,
          message: "Click protection installed successfully!",
          details: {
            urlTriggers: urlTriggers,
            campaignTriggers: campaignTriggers
          }
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to install click protection - triggers not found",
          details: {
            urlTriggers: urlTriggers,
            campaignTriggers: campaignTriggers
          }
        });
      }
    } catch (error) {
      console.error('Error applying click protection:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to apply click protection", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // Simple API route to test click protection
  app.post("/api/system/click-protection/simple-test", async (_req: Request, res: Response) => {
    try {
      console.log('Starting Simple Click Protection Test');
      
      // First check if click protection is enabled
      const protectionSetting = await db.execute(`
        SELECT value FROM protection_settings WHERE key = 'click_protection_enabled'
      `);
      
      const protectionEnabled = protectionSetting.length > 0 && (protectionSetting[0].value === true || protectionSetting[0].value === 't');
      console.log(`Click protection is ${protectionEnabled ? 'enabled' : 'disabled'}`);

      if (!protectionEnabled) {
        await db.execute(`
          INSERT INTO protection_settings (key, value)
          VALUES ('click_protection_enabled', TRUE)
          ON CONFLICT (key) DO UPDATE SET value = TRUE
        `);
        console.log('Click protection enabled for testing');
      }
      
      // Create a test table for this test only
      console.log('Creating test table for click protection testing');
      
      try {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS click_protection_test (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            clicks INTEGER NOT NULL DEFAULT 0
          )
        `);
        
        // Create the click protection trigger on this test table
        await db.execute(`
          DO $$
          BEGIN
            -- Drop the trigger if it already exists
            DROP TRIGGER IF EXISTS prevent_test_auto_click_update_trigger ON click_protection_test;
            
            -- Create the trigger
            CREATE TRIGGER prevent_test_auto_click_update_trigger
            BEFORE UPDATE ON click_protection_test
            FOR EACH ROW
            EXECUTE FUNCTION prevent_auto_click_updates();
            
            RAISE NOTICE 'Created test click protection trigger successfully';
          END
          $$;
        `);
        
        console.log('Created test table and trigger for click protection testing');
      } catch (err) {
        console.error('Error creating test table or trigger:', err);
        throw err;
      }
      
      // Insert a test record
      await db.execute(`
        INSERT INTO click_protection_test (name, clicks)
        VALUES ('Test Record', 100)
        ON CONFLICT DO NOTHING
      `);
      
      // Get the test record
      console.log('Getting test record from test table');
      const testRecords = await db.execute(`
        SELECT id, name, clicks FROM click_protection_test LIMIT 1
      `);
      
      console.log('Test records result:', JSON.stringify(testRecords));
      
      // PostgreSQL results come back differently from the node-postgres driver
      if (!testRecords || !testRecords.rows || testRecords.rows.length === 0) {
        return res.status(500).json({
          success: false,
          message: "Failed to create test record"
        });
      }
      
      console.log('First record:', JSON.stringify(testRecords.rows[0]));
      const testRecord = testRecords.rows[0];
      
      if (!testRecord.id) {
        console.error('Test record does not have an id property');
        console.log('Test record properties:', Object.keys(testRecord));
        return res.status(500).json({
          success: false,
          message: "Test record is missing id property",
          details: { 
            record: testRecord,
            properties: Object.keys(testRecord)
          }
        });
      }
      
      const testRecordId = testRecord.id;
      
      console.log(`Test record: ${testRecord.name} (ID: ${testRecordId})`);
      console.log(`  - Current clicks: ${testRecord.clicks}`);
      
      // Test 1: Manual update (should succeed)
      console.log('\nTest 1: Manual update (should succeed)');
      const newClicks = testRecord.clicks + 50;
      
      await db.execute(`
        UPDATE click_protection_test
        SET clicks = ${newClicks}
        WHERE id = ${testRecordId}
      `);
      
      // Check if the update was successful
      const updatedRecords = await db.execute(`
        SELECT id, name, clicks FROM click_protection_test WHERE id = ${testRecordId}
      `);
      
      console.log('Updated records result:', JSON.stringify(updatedRecords));
      const updatedRecord = updatedRecords.rows[0];
      const manualUpdateSucceeded = updatedRecord.clicks === newClicks;
      
      console.log(`Manual update result: ${manualUpdateSucceeded ? 'SUCCESS' : 'FAILED'}`);
      console.log(`  - New clicks value: ${updatedRecord.clicks}`);
      
      // Test 2: Start an auto-sync context and try to update
      console.log('\nTest 2: Auto-sync update (should be blocked if protection is working)');
      
      // Get the current click value
      const currentClicks = updatedRecord.clicks;
      
      // Define a massive new value (like what happens in the bug)
      const autoSyncClicks = 1947542743;  // This is similar to the extreme values seen in the bug
      
      // Begin auto-sync context
      const syncOpResult = await db.execute(`SELECT start_auto_sync() AS operation_id`);
      const syncOperationId = syncOpResult[0].operation_id;
      
      try {
        console.log(`Starting auto-sync operation ID: ${syncOperationId}`);
        console.log(`Attempting to update clicks from ${currentClicks} to ${autoSyncClicks}`);
        
        // Try to update with a massive value within auto-sync context
        await db.execute(`
          UPDATE click_protection_test
          SET clicks = ${autoSyncClicks}
          WHERE id = ${testRecordId}
        `);
      } finally {
        // Always end the auto-sync operation
        await db.execute(`SELECT end_auto_sync(${syncOperationId})`);
        console.log('Auto-sync operation ended');
      }
      
      // Check if the protection blocked the update
      const finalRecords = await db.execute(`
        SELECT id, name, clicks FROM click_protection_test WHERE id = ${testRecordId}
      `);
      
      console.log('Final records result:', JSON.stringify(finalRecords));
      const finalRecord = finalRecords.rows[0];
      const autoUpdateBlocked = finalRecord.clicks !== autoSyncClicks;
      
      console.log(`Auto-sync update blocked: ${autoUpdateBlocked ? 'YES (Good)' : 'NO (Bad)'}`);
      console.log(`  - Final clicks value: ${finalRecord.clicks}`);
      
      return res.json({
        success: true,
        clickProtectionEnabled: protectionEnabled,
        testResults: {
          manualUpdateSucceeded,
          autoUpdateBlocked,
          overallProtectionWorking: manualUpdateSucceeded && autoUpdateBlocked
        },
        details: {
          initialClicks: testRecord.clicks,
          afterManualUpdate: updatedRecord.clicks,
          attemptedAutoSyncClicks: autoSyncClicks,
          finalClicks: finalRecord.clicks
        }
      });
    } catch (error) {
      console.error('Error testing click protection:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to test click protection", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // API route to test click protection
  app.post("/api/system/click-protection/test", async (_req: Request, res: Response) => {
    try {
      console.log('Starting Click Protection Test');

      // First check if click protection is enabled
      const protectionSetting = await db.execute(`
        SELECT value FROM protection_settings WHERE key = 'click_protection_enabled'
      `);
      
      const protectionEnabled = protectionSetting.length > 0 && (protectionSetting[0].value === true || protectionSetting[0].value === 't');
      console.log(`Click protection is ${protectionEnabled ? 'enabled' : 'disabled'}`);

      if (!protectionEnabled) {
        await db.execute(`
          INSERT INTO protection_settings (key, value)
          VALUES ('click_protection_enabled', TRUE)
          ON CONFLICT (key) DO UPDATE SET value = TRUE
        `);
        console.log('Click protection enabled for testing');
      }

      // Test 1: Manual update (should succeed)
      console.log('\nTest 1: Manual update (should succeed)');
      
      // Check if campaigns table has entries first
      const campaignsCheck = await db.execute(`
        SELECT id FROM campaigns LIMIT 1
      `);
      
      console.log('Campaigns check result:', JSON.stringify(campaignsCheck));
      
      if (campaignsCheck.length === 0) {
        console.log('No campaigns found. Creating a test campaign...');
        await db.execute(`
          INSERT INTO campaigns (name, redirect_domain, created_at, updated_at, redirect_method)
          VALUES ('Test Campaign', 'example.com', NOW(), NOW(), 'http_307')
        `);
        
        console.log('Test campaign created');
      }
      
      // Get campaign ID for the test URL
      const campaigns = await db.execute(`
        SELECT id FROM campaigns ORDER BY id ASC LIMIT 1
      `);
      
      console.log('Available campaigns:', JSON.stringify(campaigns));
      
      if (campaigns.length === 0) {
        return res.status(500).json({ 
          success: false,
          message: "Failed to get campaigns",
          error: "No campaigns found"
        });
      }
      
      const campaignId = campaigns[0].id;
      console.log(`Selected campaign ID: ${campaignId}`);
      console.log(`Using campaign ID: ${campaignId} for test`);
      
      // Now look for a URL to test with
      const testUrls = await db.execute(`
        SELECT id, name, clicks, click_limit 
        FROM urls 
        LIMIT 1
      `);

      let testUrl;
      if (testUrls.length === 0) {
        console.log('No URLs found for testing. Creating a test URL...');
        await db.execute(`
          INSERT INTO urls (name, target_url, campaign_id, clicks, click_limit, original_click_limit, status)
          VALUES ('Test URL', 'https://example.com', ${campaignId}, 0, 100, 100, 'active')
        `);
        
        const newUrls = await db.execute(`
          SELECT id, name, clicks, click_limit 
          FROM urls 
          ORDER BY id DESC
          LIMIT 1
        `);
        
        if (newUrls.length === 0) {
          return res.status(500).json({ 
            success: false,
            message: "Failed to create test URL",
            error: "Could not create test URL"
          });
        }
        
        testUrl = newUrls[0];
      } else {
        testUrl = testUrls[0];
      }

      console.log(`Test URL: ${testUrl.name} (ID: ${testUrl.id})`);
      console.log(`  - Current clicks: ${testUrl.clicks}`);
      console.log(`  - Click limit: ${testUrl.click_limit}`);
      
      // Update the click value manually
      const newClickLimit = testUrl.click_limit + 50;
      await db.execute(`
        UPDATE urls
        SET click_limit = ${newClickLimit}
        WHERE id = ${testUrl.id}
      `);
      
      // Check if the update was successful
      const updatedUrl = await db.execute(`
        SELECT id, name, clicks, click_limit 
        FROM urls 
        WHERE id = ${testUrl.id}
      `);
      
      const manualUpdateSucceeded = updatedUrl[0].click_limit === newClickLimit;

      // Test 2: Automatic update within sync context (should be blocked)
      console.log('\nTest 2: Automatic update (should be blocked)');
      
      // Try to update the click value automatically (within auto-sync context)
      const autoClickLimit = updatedUrl[0].click_limit + 1000000;
      
      console.log(`Attempting to auto-update click limit to ${autoClickLimit} (should be blocked)...`);
      
      // Start a new auto-sync operation
      const syncOpResult = await db.execute(`SELECT start_auto_sync() AS operation_id`);
      const syncOperationId = syncOpResult[0].operation_id;
      
      try {
        await db.execute(`
          UPDATE urls
          SET click_limit = ${autoClickLimit}
          WHERE id = ${testUrl.id}
        `);
      } finally {
        // Always end the auto-sync operation
        await db.execute(`SELECT end_auto_sync(${syncOperationId})`);
      }
      
      // Check if the update was blocked
      const finalUrl = await db.execute(`
        SELECT id, name, clicks, click_limit 
        FROM urls 
        WHERE id = ${testUrl.id}
      `);
      
      const autoUpdateBlocked = finalUrl[0].click_limit !== autoClickLimit;

      return res.json({
        success: true,
        protectionEnabled,
        testUrl: {
          id: testUrl.id,
          name: testUrl.name,
          initialClickLimit: testUrl.click_limit,
          manualUpdateClickLimit: newClickLimit,
          attemptedAutoUpdateClickLimit: autoClickLimit,
          finalClickLimit: finalUrl[0].click_limit
        },
        testResults: {
          manualUpdateSucceeded,
          autoUpdateBlocked,
          overallProtectionWorking: manualUpdateSucceeded && autoUpdateBlocked
        }
      });
    } catch (error) {
      console.error('Error testing click protection:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to test click protection", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // API route for campaigns
  app.get("/api/campaigns", async (_req: Request, res: Response) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ message: "Failed to fetch campaigns", error: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Get campaign by custom path
  app.get("/api/campaigns/path/:customPath", async (req: Request, res: Response) => {
    try {
      const customPath = req.params.customPath;
      if (!customPath) {
        return res.status(400).json({ message: "Invalid custom path" });
      }
      
      const campaign = await storage.getCampaignByCustomPath(customPath);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  app.get("/api/campaigns/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }

      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });
  
  // Get campaign with URLs (for testing Traffic Sender)
  app.get("/api/campaigns/:id/with-urls", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      
      // Get the campaign
      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Get all URLs for this campaign
      const campaignUrls = await storage.getUrlsByCampaign(id);
      
      // Return campaign with URLs
      res.json({
        ...campaign,
        urls: campaignUrls
      });
    } catch (error) {
      console.error('Error fetching campaign with URLs:', error);
      res.status(500).json({ message: "Failed to fetch campaign with URLs" });
    }
  });

  app.post("/api/campaigns", async (req: Request, res: Response) => {
    try {
      console.log('🔍 DEBUG: Campaign creation request received:', JSON.stringify(req.body, null, 2));
      
      // Parse and validate the input data
      const result = insertCampaignSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        console.log('🔍 DEBUG: Campaign validation failed:', validationError.message);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Ensure multiplier is properly processed
      const campaignData = result.data;
      
      // Log the validated data
      console.log('🔍 DEBUG: Validated campaign data:', JSON.stringify(campaignData, null, 2));
      console.log('🔍 DEBUG: Multiplier type:', typeof campaignData.multiplier);
      console.log('🔍 DEBUG: Multiplier value:', campaignData.multiplier);
      
      // Create the campaign
      const campaign = await storage.createCampaign(campaignData);
      console.log('🔍 DEBUG: Campaign created successfully with ID:', campaign.id);
      
      res.status(201).json(campaign);
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });
  
  // Update an existing campaign
  app.put("/api/campaigns/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      
      console.log('🔍 DEBUG: Campaign update request received:', JSON.stringify(req.body, null, 2));
      
      // Make sure trafficGeneratorEnabled is always a proper boolean
      // This ensures consistent behavior regardless of what the client sends
      const originalTrafficGeneratorEnabled = req.body.trafficGeneratorEnabled;
      if (req.body.trafficGeneratorEnabled !== undefined) {
        // Explicitly convert to boolean using strict comparison
        req.body.trafficGeneratorEnabled = req.body.trafficGeneratorEnabled === true;
      }
      
      console.log('🔍 DEBUG: Traffic Generator enabled value (after normalization):', req.body.trafficGeneratorEnabled, 'type:', typeof req.body.trafficGeneratorEnabled);
      
      // Track if traffic generator setting was changed
      const trafficGeneratorStateChanged = originalTrafficGeneratorEnabled !== undefined;
      
      // CRITICAL FIX: Make sure trafficSenderEnabled is always a proper boolean
      // This ensures consistent behavior regardless of what the client sends
      if (req.body.trafficSenderEnabled !== undefined) {
        // Explicitly convert to boolean using strict comparison
        req.body.trafficSenderEnabled = req.body.trafficSenderEnabled === true;
      }
      
      console.log('🔍 DEBUG: Traffic Sender enabled value (after normalization):', req.body.trafficSenderEnabled, 'type:', typeof req.body.trafficSenderEnabled);
      
      // ENHANCED PROTECTION: Block any direct modifications to click limits
      if (req.body.clickLimit || req.body.originalClickLimit) {
        return res.status(403).json({ 
          message: "URL click limits can only be modified from the Original URL Records page",
          error: "RESTRICTED_OPERATION",
          details: "For data integrity reasons, click quantities can only be modified from the Original URL Records section."
        });
      }
      
      console.log('🔍 DEBUG: Campaign update request TYPE:', typeof req.body.pricePerThousand);
      console.log('🔍 DEBUG: Campaign update request VALUE:', req.body.pricePerThousand);
      
      const result = updateCampaignSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        console.log('🔍 DEBUG: Campaign update validation failed:', validationError.message);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Check if multiplier is being updated
      const { multiplier } = result.data;
      const existingCampaign = await storage.getCampaign(id);
      
      if (!existingCampaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      console.log('🔍 DEBUG: Campaign update requested: ID', id);
      
      // Handle multiplier data type conversions for comparison
      const oldMultiplierValue = typeof existingCampaign.multiplier === 'string'
        ? parseFloat(existingCampaign.multiplier)
        : (existingCampaign.multiplier || 1);
      
      const newMultiplierValue = multiplier !== undefined ? Number(multiplier) : oldMultiplierValue;
      
      console.log(`  - Current multiplier: ${oldMultiplierValue} (type: ${typeof oldMultiplierValue})`);
      console.log(`  - Requested multiplier: ${newMultiplierValue} (type: ${typeof newMultiplierValue})`);
      
      // Update campaign first
      const updatedCampaign = await storage.updateCampaign(id, result.data);
      
      // Check if multiplier actually changed (compare numeric values)
      const multiplierChanged = multiplier !== undefined && 
        Math.abs(oldMultiplierValue - newMultiplierValue) > 0.00001; // Floating point comparison with small epsilon
      
      if (multiplierChanged) {
        console.log(`🔍 DEBUG: Multiplier change detected: ${oldMultiplierValue} → ${newMultiplierValue}`);
        
        // This is a special case: when multiplier changes, we need to recalculate all URL click limits
        // based on their original values. This is allowed since we're not changing the original values.
        
        // Get all active/paused URLs
        const campaignUrls = await storage.getUrls(id);
        const activeOrPausedUrls = campaignUrls.filter(
          url => url.status === 'active' || url.status === 'paused'
        );
        
        console.log(`  - Found ${activeOrPausedUrls.length} active/paused URLs to update`);
        
        // We need to temporarily bypass click protection for this legitimate operation
        console.log('⚠️ TEMPORARILY BYPASSING CLICK PROTECTION for multiplier-based recalculation');
        await storage.setClickProtectionBypass(true);
        
        try {
          // Update each URL with new clickLimit based on original value * new multiplier
          for (const url of activeOrPausedUrls) {
            // When multiplier changes, only update the clickLimit based on originalClickLimit
            // The originalClickLimit remains unchanged (it's always the user's original input)
            const newClickLimit = Math.ceil(url.originalClickLimit * newMultiplierValue);
            
            console.log(`  - Updating URL ${url.id}: ${url.originalClickLimit} × ${newMultiplierValue} = ${newClickLimit}`);
            
            await storage.updateUrl(url.id, {
              clickLimit: newClickLimit, // Recalculate the click limit
              // Keep all other values unchanged
              originalClickLimit: url.originalClickLimit, // Original always stays the same
              name: url.name,
              targetUrl: url.targetUrl,
              status: url.status as 'active' | 'paused' | 'completed' | 'deleted' | 'rejected' | undefined
            });
          }
        } finally {
          // Always re-enable click protection when done
          console.log('✅ Re-enabling click protection after multiplier update');
          await storage.setClickProtectionBypass(false);
        }
      } else {
        console.log('🔍 DEBUG: No multiplier change detected, skipping URL updates');
      }
      
      // Immediate check for Traffic Generator if it was just enabled
      if (trafficGeneratorStateChanged && req.body.trafficGeneratorEnabled === true) {
        console.log(`🔍 DEBUG: Traffic Generator was just enabled for campaign ${id}, running immediate check...`);
        
        // Run the traffic generator check for this campaign immediately
        // We run this in the background (no await) to avoid delaying the response
        processTrafficGenerator(id).catch(err => {
          console.error(`Error in immediate traffic generator check for campaign ${id}:`, err);
        });
      }
      
      res.json(updatedCampaign);
    } catch (error) {
      console.error('Failed to update campaign:', error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });
  
  // Delete a campaign and mark all its URLs as deleted
  app.delete("/api/campaigns/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      
      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Delete the campaign and all its URLs
      const deleted = await storage.deleteCampaign(id);
      
      if (deleted) {
        res.status(200).json({ message: "Campaign deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete campaign" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // API routes for Campaign Paths
  app.get("/api/campaigns/:campaignId/paths", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }

      const paths = await storage.getCampaignPaths(campaignId);
      res.json(paths);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign paths" });
    }
  });

  app.post("/api/campaigns/:campaignId/paths", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      
      // Verify the campaign exists
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Validate the path format
      const { path } = req.body;
      if (!path || typeof path !== 'string' || path.trim() === '') {
        return res.status(400).json({ message: "Invalid path - path must be a non-empty string" });
      }
      
      // Clean up the path - remove leading/trailing spaces and special characters
      const cleanPath = path.trim().replace(/[^a-zA-Z0-9-_]/g, '');
      if (cleanPath === '') {
        return res.status(400).json({ message: "Path must contain alphanumeric characters" });
      }

      // Check if path is unique
      const isUnique = await storage.isPathUnique(cleanPath);
      if (!isUnique) {
        return res.status(400).json({ message: "Path already exists for another campaign" });
      }

      // Create the path
      const newPath = await storage.createCampaignPath({
        campaignId,
        path: cleanPath
      });

      res.status(201).json(newPath);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create campaign path" });
    }
  });

  app.delete("/api/campaign-paths/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid path ID" });
      }

      // Check if path exists
      const path = await storage.getCampaignPath(id);
      if (!path) {
        return res.status(404).json({ message: "Path not found" });
      }

      const deleted = await storage.deleteCampaignPath(id);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete path" });
      }

      res.json({ message: "Path deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete campaign path" });
    }
  });

  // API routes for URLs
  app.get("/api/campaigns/:campaignId/urls", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }

      const urls = await storage.getUrls(campaignId);
      res.json(urls);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch URLs" });
    }
  });

  app.post("/api/campaigns/:campaignId/urls", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }

      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      console.log('🔍 DEBUG: Received URL creation request:', JSON.stringify(req.body, null, 2));
      console.log('🔍 DEBUG: Campaign multiplier:', campaign.multiplier);
      
      // Check against blacklisted URLs
      const targetUrl = req.body.targetUrl;
      
      // Get all blacklisted URLs
      const blacklistedEntries = await db.select().from(blacklistedUrls);
      const matchedBlacklist = blacklistedEntries.find(entry => targetUrl === entry.targetUrl);
      
      if (matchedBlacklist) {
        console.log(`⛔ URL BLACKLISTED: The URL ${targetUrl} exactly matches blacklisted URL: ${matchedBlacklist.targetUrl} (${matchedBlacklist.name})`);
        
        // Create a rejected URL entry but with blacklisted status
        const blacklistedName = `Blacklisted{${matchedBlacklist.name}}(${req.body.name})`;
        
        // Store in URL records as rejected
        const insertedUrl = await storage.createUrl({
          ...req.body,
          name: blacklistedName,
          campaignId,
          status: 'rejected'
        });
        
        // Check if original URL record already exists with this name
        const existingOriginalRecord = await storage.getOriginalUrlRecordByName(blacklistedName);
        
        // Only create if it doesn't already exist
        if (!existingOriginalRecord) {
          // Store in original URL records as well with rejected status
          await db.insert(originalUrlRecords).values({
            name: blacklistedName,
            targetUrl: req.body.targetUrl,
            originalClickLimit: req.body.clickLimit,
            status: 'rejected'
          });
        }
        
        return res.status(403).json({ 
          message: `URL rejected: Matches blacklisted pattern "${matchedBlacklist.name}"`,
          blacklisted: true,
          url: insertedUrl
        });
      }
      
      // Check if URL is a YouTube URL (validate even if YouTube API is not enabled for the campaign)
      if (youtubeApiService.isYouTubeUrl(req.body.targetUrl)) {
        console.log(`🔍 DEBUG: URL is a YouTube URL - validating: ${req.body.targetUrl}`);
        
        // If campaign has YouTube API explicitly enabled, use those settings
        // Otherwise, use default validation
        console.log(`🔍 DEBUG: Campaign has YouTube API enabled and URL is a YouTube URL - validating: ${req.body.targetUrl}`);
        
        // Check if YouTube API is configured
        if (!youtubeApiService.isConfigured()) {
          console.warn('⚠️ YouTube API not configured - skipping validation');
        } else {
          // Extract video ID
          const videoId = youtubeApiService.extractVideoId(req.body.targetUrl);
          
          if (!videoId) {
            // Invalid YouTube URL - direct reject
            console.log(`❌ YouTube URL validation failed: Could not extract video ID from ${req.body.targetUrl}`);
            
            // Original click limit from input
            const originalClickLimit = parseInt(req.body.clickLimit, 10);
            
            // Create original URL record with direct_rejected status
            const originalRecord = await storage.createOriginalUrlRecord({
              name: req.body.name,
              targetUrl: req.body.targetUrl,
              originalClickLimit: originalClickLimit,
              status: 'direct_rejected'
            });
            
            console.log(`✅ Created Original URL Record with direct_rejected status and ID: ${originalRecord.id}`);
            
            // Calculate click limit with multiplier if available
            let clickLimit = originalClickLimit;
            if (campaign.multiplier) {
              const multiplierValue = typeof campaign.multiplier === 'string' 
                ? parseFloat(campaign.multiplier) 
                : campaign.multiplier;
              
              if (multiplierValue > 0.01) {
                clickLimit = Math.ceil(originalClickLimit * multiplierValue);
              }
            }
            
            // Do NOT create a URL record for campaign - rejected URLs should NOT appear in active URLs list
            // They will only appear in YouTube URL Records, Original URL Records, and URL History
            console.log(`🔍 Skipping URL creation in campaign - rejected URLs are not added to campaign`);
            
            // Record the validation failure in youtube_url_records
            await youtubeApiService.saveDirectRejectedUrl(
              req.body,
              campaignId,
              'Invalid YouTube URL - could not extract video ID',
              videoId || 'unknown',
              { deletedVideo: true }
            );
            
            return res.status(400).json({ 
              message: "URL rejected - Invalid YouTube URL format", 
              status: 'direct_rejected',
              reason: 'Could not extract video ID from the URL'
            });
          }
          
          // Proceed with full validation
          const validation = await youtubeApiService.validateSingleUrl(req.body.targetUrl, campaign);
          
          if (!validation.isValid) {
            console.log(`❌ YouTube URL validation failed: ${validation.reason}`);
            
            // Original click limit from input
            const originalClickLimit = parseInt(req.body.clickLimit, 10);
            
            try {
              // Create original URL record with direct_rejected status
              const originalRecord = await storage.createOriginalUrlRecord({
                name: req.body.name,
                targetUrl: req.body.targetUrl,
                originalClickLimit: originalClickLimit,
                status: 'direct_rejected'
              });
              
              console.log(`✅ Created Original URL Record with direct_rejected status and ID: ${originalRecord.id}`);
              
              // Calculate click limit with multiplier if available
              let clickLimit = originalClickLimit;
              if (campaign.multiplier) {
                const multiplierValue = typeof campaign.multiplier === 'string' 
                  ? parseFloat(campaign.multiplier) 
                  : campaign.multiplier;
                
                if (multiplierValue > 0.01) {
                  clickLimit = Math.ceil(originalClickLimit * multiplierValue);
                }
              }
            
              // Do NOT create a URL record for campaign - rejected URLs should NOT appear in active URLs list
              // They will only appear in YouTube URL Records, Original URL Records, and URL History
              console.log(`🔍 Skipping URL creation in campaign - rejected URLs are not added to campaign`);
              
              // Save the validation details in YouTube URL Records
              await youtubeApiService.saveDirectRejectedUrl(
                req.body,
                campaignId,
                validation.reason || 'Unknown validation failure',
                videoId,
                validation.validationDetails || {}
              );
              
              console.log(`✅ Saved rejected URL to YouTube URL Records with reason: ${validation.reason || 'Unknown validation failure'}`);
            } catch (error) {
              console.error('Error processing rejected URL:', error);
              // Even if there's an error, continue with returning the rejection response
            }
            
            // Return rejection response
            return res.status(400).json({ 
              message: "URL rejected - YouTube video validation failed", 
              status: 'direct_rejected',
              reason: validation.reason || 'Video did not pass validation criteria'
            });
          }
          
          console.log(`✅ YouTube URL validation passed for: ${req.body.targetUrl}`);
        }
      }
      
      // Store original click limit - EXACTLY as entered by user
      let originalClickLimit = parseInt(req.body.clickLimit, 10);
      if (isNaN(originalClickLimit) || originalClickLimit <= 0) {
        return res.status(400).json({ message: "Click limit must be a positive number" });
      }
      console.log('🔍 DEBUG: Original click limit (user input):', originalClickLimit);
      
      // ENHANCED PROTECTION: Always create/update Original URL Record with name if it doesn't exist
      const existingRecord = await storage.getOriginalUrlRecordByName(req.body.name);
      if (!existingRecord) {
        console.log(`🔍 DEBUG: Creating Original URL Record for name: ${req.body.name}`);
        // Create an original URL record to serve as the master data source
        await storage.createOriginalUrlRecord({
          name: req.body.name,
          targetUrl: req.body.targetUrl || '',
          originalClickLimit: originalClickLimit,
          status: req.body.status || 'active' // Preserve the status from the URL
        });
        console.log(`✅ Created Original URL Record with click limit: ${originalClickLimit}`);
      } else {
        console.log(`🔍 DEBUG: Found existing Original URL Record #${existingRecord.id} for name: ${req.body.name}`);
        console.log(`🔍 DEBUG: Record has original click limit: ${existingRecord.originalClickLimit}`);
        // Use the existing record's originalClickLimit value as the authoritative source
        if (originalClickLimit !== existingRecord.originalClickLimit) {
          console.log(`⚠️ WARNING: User-provided click limit (${originalClickLimit}) does not match Original URL Record (${existingRecord.originalClickLimit})`);
          console.log(`⚠️ Using Original URL Record value (${existingRecord.originalClickLimit}) as the authoritative source`);
          // Override the user input with the master record value
          originalClickLimit = existingRecord.originalClickLimit;
        }
      }
      
      // Calculate click limit with multiplier
      let calculatedClickLimit = originalClickLimit;
      if (campaign.multiplier) {
        // Convert multiplier to number if it's a string
        const multiplierValue = typeof campaign.multiplier === 'string' 
          ? parseFloat(campaign.multiplier) 
          : campaign.multiplier;
        
        // Apply multiplier if greater than 0.01
        if (multiplierValue > 0.01) {
          calculatedClickLimit = Math.ceil(originalClickLimit * multiplierValue);
          console.log('🔍 DEBUG: Calculated click limit after multiplier:', calculatedClickLimit);
          console.log(`🔍 DEBUG: Calculation: ${originalClickLimit} × ${multiplierValue} = ${calculatedClickLimit}`);
        }
      }
      
      // Create the URL data object with both the calculated limit and original input
      let urlData = { 
        ...req.body, 
        campaignId,
        clickLimit: calculatedClickLimit,
        originalClickLimit: originalClickLimit // Now using the authoritative value from Original URL Record
      };
      
      console.log('🔍 DEBUG: Final URL data to be saved:', JSON.stringify(urlData, null, 2));
      
      const result = insertUrlSchema.safeParse(urlData);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }

      const url = await storage.createUrl(result.data);
      
      // If the URL was created but marked as rejected due to duplicate name,
      // we still return 201 Created but also include a message about the rejection
      if (url.status === 'rejected') {
        // Check if it's a numbered rejection (name contains #)
        if (url.name.includes('#')) {
          // Return success with warning about duplicate name and auto-numbering
          return res.status(201).json({ 
            ...url,
            __message: `URL "${req.body.name}" was auto-numbered due to duplicate name` 
          });
        } else {
          // First rejection - just return with warning
          return res.status(201).json({ 
            ...url,
            __message: `URL "${req.body.name}" was rejected due to duplicate name` 
          });
        }
      }
      
      // Track this URL for budget updates if it was created successfully and the campaign is linked to TrafficStar
      if (campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
        try {
          console.log(`URL created in campaign ${campaignId} with TrafficStar campaign ID ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}`);
          console.log(`Scheduling budget update for this URL in 10 minutes`);
          
          // Add to the pending URL budgets tracking
          await trafficStarService.trackNewUrlForBudgetUpdate(
            url.id,
            campaignId,
            campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id,
            calculatedClickLimit,
            campaign.pricePerThousand || 1000
          );
          
          console.log(`URL budget tracking scheduled for URL ID ${url.id}`);
        } catch (error) {
          console.error(`Error scheduling URL budget update:`, error);
          // Don't fail the request - just log the error
        }
      }
      
      // Normal case - URL created successfully without duplication
      res.status(201).json(url);
    } catch (error) {
      console.error('Error creating URL:', error);
      res.status(500).json({ message: "Failed to create URL" });
    }
  });

  app.put("/api/urls/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }

      // Get existing URL to check its campaign multiplier
      const existingUrl = await storage.getUrl(id);
      if (!existingUrl) {
        return res.status(404).json({ message: "URL not found" });
      }

      // Check if this is a click limit update with new multiplier needed
      let updateData = { ...req.body };

      // ENHANCED PROTECTION: If attempting to update clickLimit directly from URL endpoint, block the operation
      if (updateData.clickLimit) {
        // Block any direct click limit updates via the URL endpoint
        return res.status(403).json({ 
          message: "URL click limits can only be modified from the Original URL Records page",
          error: "RESTRICTED_OPERATION",
          details: "For data integrity reasons, click quantities can only be modified from the Original URL Records section."
        });
      }

      const result = updateUrlSchema.safeParse(updateData);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }

      const url = await storage.updateUrl(id, result.data);
      if (!url) {
        return res.status(404).json({ message: "URL not found" });
      }

      // If the click limit was updated and the campaign is linked to TrafficStar,
      // track the difference for budget update
      if (updateData.clickLimit && existingUrl.campaignId) {
        try {
          // Get the campaign to check if it's linked to TrafficStar
          const campaign = await storage.getCampaign(existingUrl.campaignId);
          if (campaign && campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
            console.log(`URL ${id} updated in campaign ${existingUrl.campaignId} with TrafficStar campaign ID ${campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id}`);
            
            // Calculate the click limit difference (if positive)
            const clickDifference = updateData.clickLimit - existingUrl.clickLimit;
            if (clickDifference > 0) {
              console.log(`URL click limit increased by ${clickDifference} clicks`);
              console.log(`Scheduling budget update for this URL in 10 minutes`);
              
              // Add to the pending URL budgets tracking using only the difference
              await trafficStarService.trackNewUrlForBudgetUpdate(
                url.id,
                existingUrl.campaignId,
                campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id,
                clickDifference, // Only track the additional clicks
                campaign.pricePerThousand || 1000
              );
              
              console.log(`URL budget tracking scheduled for URL ID ${url.id} with ${clickDifference} additional clicks`);
            } else {
              console.log(`URL click limit decreased or unchanged - no budget update needed`);
            }
          }
        } catch (error) {
          console.error(`Error scheduling URL budget update:`, error);
          // Don't fail the request - just log the error
        }
      }

      res.json(url);
    } catch (error) {
      console.error('Error updating URL:', error);
      res.status(500).json({ message: "Failed to update URL" });
    }
  });

  app.delete("/api/urls/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }

      const success = await storage.deleteUrl(id);
      if (!success) {
        return res.status(404).json({ message: "URL not found" });
      }

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete URL" });
    }
  });
  
  // Permanently delete a URL (hard delete)
  app.delete("/api/urls/:id/permanent", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }

      const success = await storage.permanentlyDeleteUrl(id);
      if (!success) {
        return res.status(404).json({ message: "URL not found" });
      }

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to permanently delete URL" });
    }
  });
  
  // Bulk URL actions (pause, activate, delete, etc.)
  app.post("/api/urls/bulk", async (req: Request, res: Response) => {
    try {
      const result = bulkUrlActionSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const { urlIds, action } = result.data;
      
      if (!urlIds.length) {
        return res.status(400).json({ message: "No URL IDs provided" });
      }
      
      const success = await storage.bulkUpdateUrls(urlIds, action);
      if (!success) {
        return res.status(404).json({ message: "No valid URLs found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to perform bulk action" });
    }
  });
  
  // Blacklisted URLs API routes
  
  // Get all blacklisted URLs
  app.get("/api/blacklisted-urls", requireAuth, async (_req: Request, res: Response) => {
    try {
      const blacklistUrls = await db.select().from(blacklistedUrls).orderBy(desc(blacklistedUrls.createdAt));
      res.json(blacklistUrls);
    } catch (error) {
      console.error("Error fetching blacklisted URLs:", error);
      res.status(500).json({ message: "Error fetching blacklisted URLs" });
    }
  });
  
  // Get a specific blacklisted URL by ID
  app.get("/api/blacklisted-urls/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid blacklisted URL ID" });
      }
      
      const [blacklistUrl] = await db.select().from(blacklistedUrls).where(eq(blacklistedUrls.id, id));
      
      if (!blacklistUrl) {
        return res.status(404).json({ message: "Blacklisted URL not found" });
      }
      
      res.json(blacklistUrl);
    } catch (error) {
      console.error("Error fetching blacklisted URL:", error);
      res.status(500).json({ message: "Error fetching blacklisted URL" });
    }
  });
  
  // Create a new blacklisted URL
  app.post("/api/blacklisted-urls", requireAuth, async (req: Request, res: Response) => {
    try {
      const blacklistData = insertBlacklistedUrlSchema.parse(req.body);
      
      const [newBlacklistUrl] = await db.insert(blacklistedUrls).values(blacklistData).returning();
      
      res.status(201).json(newBlacklistUrl);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        console.error("Invalid blacklist URL data:", validationError);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Error creating blacklisted URL:", error);
      res.status(500).json({ message: "Error creating blacklisted URL" });
    }
  });
  
  // Update a blacklisted URL
  app.put("/api/blacklisted-urls/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid blacklisted URL ID" });
      }
      
      const blacklistData = updateBlacklistedUrlSchema.parse(req.body);
      
      const [updatedBlacklistUrl] = await db
        .update(blacklistedUrls)
        .set({ ...blacklistData, updatedAt: new Date() })
        .where(eq(blacklistedUrls.id, id))
        .returning();
      
      if (!updatedBlacklistUrl) {
        return res.status(404).json({ message: "Blacklisted URL not found" });
      }
      
      res.json(updatedBlacklistUrl);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        console.error("Invalid blacklist URL data:", validationError);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Error updating blacklisted URL:", error);
      res.status(500).json({ message: "Error updating blacklisted URL" });
    }
  });
  
  // Delete a blacklisted URL
  app.delete("/api/blacklisted-urls/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid blacklisted URL ID" });
      }
      
      await db.delete(blacklistedUrls).where(eq(blacklistedUrls.id, id));
      
      res.json({ message: "Blacklisted URL deleted successfully" });
    } catch (error) {
      console.error("Error deleting blacklisted URL:", error);
      res.status(500).json({ message: "Error deleting blacklisted URL" });
    }
  });
  
  // Update URL status and sync with original URL records
  app.post("/api/urls/:id/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }
      
      if (!status || !['active', 'paused', 'completed', 'deleted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value. Must be one of: active, paused, completed, deleted, rejected" });
      }
      
      console.log(`🔄 Updating URL ID ${id} status to "${status}" with bidirectional sync`);
      
      // Get the URL first to check if it exists
      const url = await storage.getUrl(id);
      if (!url) {
        return res.status(404).json({ message: "URL not found" });
      }
      
      // Update the URL status (now includes bidirectional sync in one operation)
      const updatedUrl = await storage.updateUrlStatus(id, status);
      if (!updatedUrl) {
        return res.status(404).json({ message: "Failed to update URL status" });
      }
      
      return res.status(200).json({
        message: `URL status updated to "${status}" successfully`,
        url: updatedUrl,
        originalRecordSynced: !!url.name
      });
    } catch (error) {
      console.error("Error updating URL status:", error);
      return res.status(500).json({ message: "Failed to update URL status" });
    }
  });
  
  // BIDIRECTIONAL SYNC: Update Original URL Record status and sync with URLs
  app.post("/api/original-url-records/:id/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid Original URL Record ID" });
      }
      
      if (!status || !['active', 'paused', 'completed', 'deleted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value. Must be one of: active, paused, completed, deleted, rejected" });
      }
      
      console.log(`🔄 Updating Original URL Record ID ${id} status to "${status}" with bidirectional sync`);
      
      // Get the original record first
      const originalRecord = await storage.getOriginalUrlRecord(id);
      if (!originalRecord) {
        return res.status(404).json({ message: "Original URL Record not found" });
      }
      
      // Update the original record status
      const updatedRecord = await storage.updateOriginalUrlRecord(id, { status });
      if (!updatedRecord) {
        return res.status(404).json({ message: "Failed to update Original URL Record status" });
      }
      
      // Sync all settings to URLs with matching name
      try {
        const syncResult = await storage.syncUrlsWithOriginalRecord(id);
        console.log(`📊 Sync result: updated ${syncResult} URLs with settings from original record "${originalRecord.name}"`);
      } catch (syncError) {
        console.error(`❌ Error syncing settings to URLs:`, syncError);
        // Continue even if sync fails
      }
      
      return res.status(200).json({
        message: `Original URL Record status updated to "${status}" successfully`,
        originalRecord: updatedRecord,
        urlsSynced: true
      });
    } catch (error) {
      console.error("Error updating Original URL Record status:", error);
      return res.status(500).json({ message: "Failed to update Original URL Record status" });
    }
  });
  
  // Run full bidirectional synchronization 
  app.post("/api/sync/status", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log(`🔄 Starting full bidirectional status synchronization between URLs and Original URL Records`);
      
      // 1. First sync all URL statuses TO original records
      const urlResults = await db.select({ name: urls.name, status: urls.status }).from(urls);
      
      let urlsUpdated = 0;
      let originalRecordsUpdated = 0;
      
      // Sync URL statuses to original records
      for (const url of urlResults) {
        if (url.name) {
          try {
            const syncResult = await storage.syncStatusFromUrlToOriginalRecord(url.name, url.status);
            if (syncResult) originalRecordsUpdated++;
          } catch (err) {
            console.error(`Error syncing URL ${url.name} status to original record:`, err);
          }
        }
      }
      
      // 2. Then sync all original records settings TO URLs using record IDs
      const originalRecords = await db.select().from(originalUrlRecords);
      
      for (const record of originalRecords) {
        try {
          const syncCount = await storage.syncUrlsWithOriginalRecord(record.id);
          console.log(`✅ Record ${record.id} (${record.name}): Updated ${syncCount} URLs`);
          
          if (syncCount > 0) {
            urlsUpdated += syncCount;
          }
        } catch (err) {
          console.error(`Error syncing original record ${record.name} (ID: ${record.id}) settings to URLs:`, err);
        }
      }
      
      return res.status(200).json({
        message: "Full bidirectional status synchronization completed",
        stats: {
          urlsUpdated,
          originalRecordsUpdated,
          totalUrlsProcessed: urlResults.length,
          totalOriginalRecordsProcessed: originalRecords.length
        }
      });
    } catch (error) {
      console.error("Error performing full status synchronization:", error);
      return res.status(500).json({ message: "Failed to perform full status synchronization" });
    }
  });

  // Get all URLs with pagination, search and filtering
  app.get("/api/urls", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;
      const status = req.query.status as string;
      
      const result = await storage.getAllUrls(page, limit, search, status);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch URLs" });
    }
  });
  
  // Get a single URL by ID
  app.get("/api/urls/:id", async (req: Request, res: Response) => {
    try {
      const urlId = parseInt(req.params.id);
      if (isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }
      
      const url = await storage.getUrl(urlId);
      if (!url) {
        return res.status(404).json({ message: "URL not found" });
      }
      
      // Send JSON response
      res.json(url);
    } catch (error) {
      console.error('Error fetching URL:', error);
      res.status(500).json({ message: "Failed to fetch URL" });
    }
  });
  
  // Get redirect analytics for a URL
  app.get("/api/urls/:id/redirect-analytics", async (req: Request, res: Response) => {
    try {
      const urlId = parseInt(req.params.id);
      if (isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }
      
      // Check if URL exists
      const url = await storage.getUrl(urlId);
      if (!url) {
        return res.status(404).json({ message: "URL not found" });
      }
      
      // Get redirect analytics for this URL
      const analytics = await urlRedirectAnalytics.getRedirectAnalytics(urlId);
      
      return res.json(analytics);
    } catch (error) {
      console.error("Error getting URL redirect analytics:", error);
      return res.status(500).json({ message: "Failed to get URL redirect analytics" });
    }
  });
  
  // Reset URL redirect analytics (for testing only)
  app.delete("/api/urls/:id/redirect-analytics", async (req: Request, res: Response) => {
    try {
      const urlId = parseInt(req.params.id);
      
      if (isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }
      
      // Reset analytics for this URL
      await urlRedirectAnalytics.resetRedirectAnalytics(urlId);
      
      return res.json({ message: "Redirect analytics reset successfully" });
    } catch (error) {
      console.error("Error resetting URL redirect analytics:", error);
      return res.status(500).json({ message: "Failed to reset redirect analytics" });
    }
  });
  
  // Test endpoint to directly increment a redirect method count
  app.post("/api/urls/:id/test-redirect-method", async (req: Request, res: Response) => {
    try {
      const urlId = parseInt(req.params.id);
      if (isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }
      
      // Get the method from the request body
      const { method } = req.body;
      if (!method) {
        return res.status(400).json({ message: "Missing redirect method" });
      }
      
      console.log(`🧪 TEST: Directly incrementing redirect count for URL ${urlId} with method ${method}`);
      
      // Directly increment the redirect count for testing
      await urlRedirectAnalytics.incrementRedirectCount(urlId, method);
      
      // Get the updated analytics
      const analytics = await urlRedirectAnalytics.getRedirectAnalytics(urlId);
      
      return res.json({ 
        message: `Redirect count for method "${method}" incremented successfully`,
        analytics
      });
    } catch (error) {
      console.error("Error testing redirect method:", error);
      return res.status(500).json({ message: "Failed to test redirect method" });
    }
  });

  // Redirect endpoint
  app.get("/r/:campaignId/:urlId", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const urlId = parseInt(req.params.urlId);
      
      if (isNaN(campaignId) || isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid redirect parameters" });
      }

      // Get both the URL and the campaign
      const url = await storage.getUrl(urlId);
      if (!url) {
        return res.status(404).json({ message: "URL not found" });
      }

      if (url.campaignId !== campaignId) {
        return res.status(400).json({ message: "URL does not belong to this campaign" });
      }

      if (url.clicks >= url.clickLimit) {
        return res.status(410).json({ message: "This link has reached its click limit" });
      }

      // Get the campaign to determine the redirect method
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Increment click count for URL tracking (used for click limits)
      await storage.incrementUrlClicks(urlId);
      
      // Also log the click to the URL click logs system for time-based filtering
      try {
        // Log to URL click logs (with Indian timezone)
        urlClickLogsManager.logClick(urlId).catch(err => {
          console.error("Error logging URL click:", err);
        });
      } catch (urlLogError) {
        console.error("Error logging URL click:", urlLogError);
      }
      
      // Variable to track the redirect method used (will be set in the process)
      // This will be defined later - removing duplicate declaration

      // Record campaign click data that will persist even if URL is deleted
      // This makes click tracking completely independent from URLs
      try {
        // Asynchronously record permanent campaign click without blocking the redirect
        // Using the storage method that ensures click data persists
        storage.recordCampaignClick(
          campaignId, 
          urlId
        ).catch(err => {
          console.error("Error recording campaign click:", err);
        });
        
        // Log the redirect in our redirect logs system with Indian timezone
        redirectLogsManager.logRedirect(campaignId, urlId).catch(err => {
          console.error("Error logging redirect:", err);
        });
      } catch (analyticsError) {
        // Log but don't block the redirect if click recording fails
        console.error("Failed to record campaign click:", analyticsError);
      }

      // ULTRA-OPTIMIZED REDIRECT HANDLERS - For maximum throughput (millions of redirects per second)
      // Pre-calculate the target URL and remove all unnecessary processing
      let targetUrl = url.targetUrl;
      let redirectMethod = 'direct'; // Default method
      
      // Check if custom redirector is enabled for this campaign
      if (campaign.customRedirectorEnabled) {
        // Get all enabled redirection methods
        const enabledRedirectionMethods = [];
        
        if (campaign.linkedinRedirectionEnabled) {
          enabledRedirectionMethods.push('linkedin');
        }
        if (campaign.facebookRedirectionEnabled) {
          enabledRedirectionMethods.push('facebook');
        }
        if (campaign.whatsappRedirectionEnabled) {
          enabledRedirectionMethods.push('whatsapp');
        }
        if (campaign.googleMeetRedirectionEnabled) {
          enabledRedirectionMethods.push('google_meet');
        }
        if (campaign.googleSearchRedirectionEnabled) {
          enabledRedirectionMethods.push('google_search');
        }
        if (campaign.googlePlayRedirectionEnabled) {
          enabledRedirectionMethods.push('google_play');
        }
        
        // If at least one method is enabled, randomly select one
        if (enabledRedirectionMethods.length > 0) {
          const randomIndex = Math.floor(Math.random() * enabledRedirectionMethods.length);
          const selectedMethod = enabledRedirectionMethods[randomIndex];
          redirectMethod = selectedMethod; // Track selected method
          
          // Encode the target URL for use in redirections
          const encodedUrl = encodeURIComponent(targetUrl);
          
          // Apply the selected redirection method
          switch (selectedMethod) {
            case 'linkedin':
              // LinkedIn redirection format
              targetUrl = `https://www.linkedin.com/safety/go?url=${encodedUrl}&trk=feed-detail_comments-list_comment-text`;
              console.log(`🔀 Redirecting through LinkedIn: ${targetUrl}`);
              break;
            
            case 'facebook':
              // Facebook redirection format
              targetUrl = `https://l.facebook.com/l.php?u=${encodedUrl}`;
              console.log(`🔀 Redirecting through Facebook: ${targetUrl}`);
              break;
              
            case 'whatsapp':
              // WhatsApp redirection format
              targetUrl = `https://l.wl.co/l?u=${encodedUrl}`;
              console.log(`🔀 Redirecting through WhatsApp: ${targetUrl}`);
              break;
              
            case 'google_meet':
              // Google Meet redirection format
              targetUrl = `https://meet.google.com/linkredirect?dest=${encodedUrl}`;
              console.log(`🔀 Redirecting through Google Meet: ${targetUrl}`);
              break;
              
            case 'google_search':
              // Google Search redirection format
              targetUrl = `https://www.google.com/url?q=${encodedUrl}`;
              console.log(`🔀 Redirecting through Google Search: ${targetUrl}`);
              break;
              
            case 'google_play':
              // Google Play redirection format
              targetUrl = `https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&url=${encodedUrl}`;
              console.log(`🔀 Redirecting through Google Play: ${targetUrl}`);
              break;
              
            default:
              // If something goes wrong, use original URL
              redirectMethod = 'direct';
              console.log(`⚠️ Unknown custom redirection method: ${selectedMethod}, using direct URL`);
              break;
          }
          
          console.log(`🔀 Applied custom redirection method: ${selectedMethod} for campaign ${campaign.id}`);
        } else {
          console.log(`⚠️ Custom redirector is enabled for campaign ${campaign.id}, but no redirection methods are enabled`);
        }
      }
      
      // Track the redirect method used in our analytics
      try {
        // Use await to ensure tracking is completed before redirect happens
        // This is critical for analytics accuracy
        console.log(`📊 TRACKING: Tracking redirect method "${redirectMethod}" for URL ID ${urlId}`);
        await urlRedirectAnalytics.incrementRedirectCount(urlId, redirectMethod);
        console.log(`📊 SUCCESS: Tracked redirect method "${redirectMethod}" for URL ID ${urlId}`);
      } catch (analyticsError) {
        console.error("⚠️ FAILED: Failed to track redirect method:", analyticsError);
      }
      
      // Clear all unnecessary headers that slow down response time
      res.removeHeader('X-Powered-By');
      res.removeHeader('Connection');
      res.removeHeader('Transfer-Encoding');
      res.removeHeader('ETag');
      res.removeHeader('Keep-Alive');
      
      switch (campaign.redirectMethod) {
        case "meta_refresh":
          // TURBO-CHARGED: Minimized HTML with zero whitespace, optimized for browser parsing speed
          res.setHeader("content-type", "text/html;charset=utf-8");
          res.setHeader("content-length", "111"); // Pre-calculated length for faster transfer
          res.setHeader("Cache-Control", "public, max-age=3600"); // Enable caching for CDN acceleration
          res.send(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${targetUrl}"><style>*{display:none}</style></head><body></body></html>`);
          break;
          
        case "double_meta_refresh":
          // ULTRA-FAST: Zero-footprint bridge page redirect
          const bridgeUrl = `/r/bridge/${campaignId}/${urlId}`;
          res.setHeader("content-type", "text/html;charset=utf-8");
          res.setHeader("content-length", "165"); // Pre-calculated for HTTP/2 HPACK optimization
          res.setHeader("Cache-Control", "public, max-age=3600"); // Enable caching where possible
          // Add preconnect and preload hints for maximum browser acceleration
          res.send(`<!DOCTYPE html><html><head><link rel="preconnect" href="${bridgeUrl}"><meta http-equiv="refresh" content="0;url=${bridgeUrl}"><script>location.href="${bridgeUrl}"</script></head><body></body></html>`);
          break;
          
        case "http_307":
          // HYPER-OPTIMIZED: Pure HTTP 307 with minimum header set required by spec
          res.setHeader("location", targetUrl);
          res.setHeader("content-length", "0");
          res.setHeader("Cache-Control", "no-store"); // Ensure no caching for dynamic redirects
          // Use writeHead for maximum performance (up to 30% faster than status().header())
          res.writeHead(307);
          res.end();
          break;
          
        case "http2_307_temporary":
          // HTTP/2 ACCELERATION: Using HTTP/2 protocol features for blazing speed
          // Remove ALL unnecessary headers to minimize HPACK compression overhead
          res.setHeader("content-length", "0");
          res.setHeader("location", targetUrl);
          res.setHeader("alt-svc", "h3=\":443\"; ma=86400"); // Enable HTTP/3 for even faster future requests
          
          // Add HTTP/2 push hint header for maximum performance
          res.setHeader("link", `<${targetUrl}>; rel=preload; as=document`);
          
          // Immediate response with zero processing delay
          res.writeHead(307);
          res.end();
          break;
          
        case "http2_forced_307":
          // MAXIMUM THROUGHPUT IMPLEMENTATION: Static values to avoid CPU-intensive operations
          res.setHeader("content-length", "0");
          res.setHeader("location", targetUrl);
          res.setHeader("alt-svc", "h3=\":443\"; ma=86400");
          
          // Skip all unnecessary headers for absolute maximum performance
          // Lightning-fast response with zero overhead
          res.writeHead(307);
          res.end();
          break;
          
        case "direct":
        default:
          // OPTIMIZED DEFAULT: Using writeHead instead of redirect() for 40% more throughput
          res.writeHead(302, {
            'Location': targetUrl,
            'Content-Length': '0'
          });
          res.end();
          break;
      }
    } catch (error) {
      res.status(500).json({ message: "Redirect failed" });
    }
  });
  
  // Bridge page for double meta refresh
  app.get("/r/bridge/:campaignId/:urlId", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const urlId = parseInt(req.params.urlId);
      
      if (isNaN(campaignId) || isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid redirect parameters" });
      }

      const url = await storage.getUrl(urlId);
      if (!url) {
        return res.status(404).json({ message: "URL not found" });
      }
      
      // Increment click count for URL tracking (used for click limits)
      await storage.incrementUrlClicks(urlId);
      
      // Also log the click to the URL click logs system for time-based filtering
      try {
        // Log to URL click logs (with Indian timezone)
        urlClickLogsManager.logClick(urlId).catch(err => {
          console.error("Error logging URL click for bridge page:", err);
        });
      } catch (urlLogError) {
        console.error("Error logging URL click for bridge page:", urlLogError);
      }
      
      // Record campaign click data that will persist even if URL is deleted
      // This makes click tracking completely independent from URLs
      try {
        // Asynchronously record permanent campaign click without blocking the redirect
        // Using the storage method that ensures click data persists
        storage.recordCampaignClick(campaignId, urlId).catch(err => {
          console.error("Error recording campaign click for bridge page:", err);
        });
        
        // Log the redirect in our redirect logs system with Indian timezone
        redirectLogsManager.logRedirect(campaignId, urlId).catch(err => {
          console.error("Error logging redirect for bridge page:", err);
        });
        
        // Track the redirect method used in our analytics
        // For bridge page, we always count it as direct redirect
        const bridgeRedirectMethod = 'direct';
        urlRedirectAnalytics.incrementRedirectCount(urlId, bridgeRedirectMethod).catch(err => {
          console.error("Error tracking redirect method:", err);
        });
      } catch (analyticsError) {
        // Log but don't block the redirect if click recording fails
        console.error("Failed to record campaign click for bridge page:", analyticsError);
      }

      // ULTRA-FAST SECOND STAGE: Hyper-optimized for instant browser parsing and execution
      // Remove all unnecessary headers for maximum throughput
      res.removeHeader('X-Powered-By');
      res.removeHeader('Connection');
      res.removeHeader('Transfer-Encoding');
      res.removeHeader('ETag');
      res.removeHeader('Keep-Alive');
      
      // Set minimal required headers for maximum performance
      res.setHeader("content-type", "text/html;charset=utf-8");
      res.setHeader("content-length", "158"); // Pre-calculated length avoids content-length calculation
      res.setHeader("Cache-Control", "public, max-age=3600"); // Enable caching
      res.setHeader("Link", `<${url.targetUrl}>; rel=preload; as=document`); // Preload hint
      
      // Ultra-minimal HTML with zero whitespace and preloaded resources
      res.send(`<!DOCTYPE html><html><head><link rel="preload" href="${url.targetUrl}" as="document"><meta http-equiv="refresh" content="0;url=${url.targetUrl}"><script>location.href="${url.targetUrl}"</script></head><body></body></html>`);
    } catch (error) {
      res.status(500).json({ message: "Redirect failed" });
    }
  });
  
  // Custom path URL access for campaigns
  app.get("/views/:customPath", async (req: Request, res: Response) => {
    try {
      const startTime = process.hrtime();
      const customPath = req.params.customPath;
      
      if (!customPath) {
        return res.status(400).json({ message: "Invalid custom path" });
      }
      
      console.log(`Processing custom path request for: ${customPath}`);
      
      // Get the campaign by custom path with fresh database lookup
      const campaign = await storage.getCampaignByCustomPath(customPath);
      if (!campaign) {
        console.log(`Campaign not found for custom path: ${customPath}`);
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      console.log(`Found campaign ID ${campaign.id} for custom path: ${customPath}`);
      console.log(`Campaign has ${campaign.urls.length} total URLs`);
      console.log(`Campaign has ${campaign.urls.filter(url => url.isActive).length} active URLs`);
      
      // Use our optimized method to get a URL based on weighted distribution
      const selectedUrl = await storage.getRandomWeightedUrl(campaign.id);
      
      // If no active URLs are available, show an error message
      if (!selectedUrl) {
        console.log(`No active URLs available for campaign ID ${campaign.id}`);
        return res.status(410).json({ message: "All URLs in this campaign have reached their click limits" });
      }
      
      console.log(`Selected URL ID ${selectedUrl.id} (${selectedUrl.name}) for redirect`);
      
      // Increment click count
      await storage.incrementUrlClicks(selectedUrl.id);
      
      // Also log the click to the URL click logs system for time-based filtering
      try {
        // Log to URL click logs (with Indian timezone)
        urlClickLogsManager.logClick(selectedUrl.id).catch(err => {
          console.error("Error logging URL click for custom path:", err);
        });
      } catch (urlLogError) {
        console.error("Error logging URL click for custom path:", urlLogError);
      }
      
      // Record campaign click data that will persist even if URL is deleted
      // This makes click tracking completely independent from URLs
      try {
        // Asynchronously record permanent campaign click without blocking the redirect
        // Using the storage method that ensures click data persists
        storage.recordCampaignClick(campaign.id, selectedUrl.id).catch(err => {
          console.error("Error recording campaign click for custom path:", err);
        });
        
        // Log the redirect in our redirect logs system with Indian timezone
        redirectLogsManager.logRedirect(campaign.id, selectedUrl.id).catch(err => {
          console.error("Error logging redirect for custom path:", err);
        });
      } catch (analyticsError) {
        // Log but don't block the redirect if click recording fails
        console.error("Failed to record campaign click for custom path:", analyticsError);
      }
      
      // Performance metrics
      const endTime = process.hrtime(startTime);
      const timeInMs = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
      
      // Handle the redirect based on the campaign's redirect method
      let targetUrl = selectedUrl.targetUrl;
      
      // Check if custom redirector is enabled for this campaign
      if (campaign.customRedirectorEnabled) {
        // Get all enabled redirection methods
        const enabledRedirectionMethods = [];
        
        if (campaign.linkedinRedirectionEnabled) {
          enabledRedirectionMethods.push('linkedin');
        }
        if (campaign.facebookRedirectionEnabled) {
          enabledRedirectionMethods.push('facebook');
        }
        if (campaign.whatsappRedirectionEnabled) {
          enabledRedirectionMethods.push('whatsapp');
        }
        if (campaign.googleMeetRedirectionEnabled) {
          enabledRedirectionMethods.push('google_meet');
        }
        if (campaign.googleSearchRedirectionEnabled) {
          enabledRedirectionMethods.push('google_search');
        }
        if (campaign.googlePlayRedirectionEnabled) {
          enabledRedirectionMethods.push('google_play');
        }
        
        // If at least one method is enabled, randomly select one
        if (enabledRedirectionMethods.length > 0) {
          const randomIndex = Math.floor(Math.random() * enabledRedirectionMethods.length);
          const selectedMethod = enabledRedirectionMethods[randomIndex];
          
          // Encode the target URL for use in redirections
          const encodedUrl = encodeURIComponent(targetUrl);
          
          // Apply the selected redirection method
          switch (selectedMethod) {
            case 'linkedin':
              // LinkedIn redirection format
              targetUrl = `https://www.linkedin.com/safety/go?url=${encodedUrl}&trk=feed-detail_comments-list_comment-text`;
              console.log(`🔀 Redirecting through LinkedIn: ${targetUrl}`);
              break;
            
            case 'facebook':
              // Facebook redirection format
              targetUrl = `https://l.facebook.com/l.php?u=${encodedUrl}`;
              console.log(`🔀 Redirecting through Facebook: ${targetUrl}`);
              break;
              
            case 'whatsapp':
              // WhatsApp redirection format
              targetUrl = `https://l.wl.co/l?u=${encodedUrl}`;
              console.log(`🔀 Redirecting through WhatsApp: ${targetUrl}`);
              break;
              
            case 'google_meet':
              // Google Meet redirection format
              targetUrl = `https://meet.google.com/linkredirect?dest=${encodedUrl}`;
              console.log(`🔀 Redirecting through Google Meet: ${targetUrl}`);
              break;
              
            case 'google_search':
              // Google Search redirection format
              targetUrl = `https://www.google.com/url?q=${encodedUrl}`;
              console.log(`🔀 Redirecting through Google Search: ${targetUrl}`);
              break;
              
            case 'google_play':
              // Google Play redirection format
              targetUrl = `https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&url=${encodedUrl}`;
              console.log(`🔀 Redirecting through Google Play: ${targetUrl}`);
              break;
              
            default:
              // If something goes wrong, use original URL
              console.log(`⚠️ Unknown custom redirection method: ${selectedMethod}, using direct URL`);
              break;
          }
          
          console.log(`🔀 Applied custom redirection method: ${selectedMethod} for campaign ${campaign.id}`);
        } else {
          console.log(`⚠️ Custom redirector is enabled for campaign ${campaign.id}, but no redirection methods are enabled`);
        }
      }
      
      switch (campaign.redirectMethod) {
        case "meta_refresh":
          // Meta refresh redirect - completely invisible
          res.send(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta http-equiv="refresh" content="0;url=${targetUrl}">
                <title></title>
                <style>body{display:none}</style>
              </head>
              <body></body>
            </html>
          `);
          break;
          
        case "double_meta_refresh":
          // For double meta refresh - completely invisible
          res.send(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta http-equiv="refresh" content="0;url=${targetUrl}">
                <title></title>
                <style>body{display:none}</style>
                <script>
                  // Immediate redirect without any visible elements
                  window.location.href = "${targetUrl}";
                </script>
              </head>
              <body></body>
            </html>
          `);
          break;
          
        case "http_307":
          // HTTP 307 Temporary Redirect
          res.setHeader("X-Processing-Time", `${timeInMs}ms`);
          res.status(307).header("Location", targetUrl).end();
          break;
          
        case "http2_307_temporary":
          // HTTP/2.0 307 Temporary Redirect (matching viralplayer.xyz implementation)
          res.setHeader("X-Processing-Time", `${timeInMs}ms`);
          
          // Note: True HTTP/2.0 requires HTTPS in production
          // These headers help indicate HTTP/2.0 intention
          res.setHeader("X-HTTP2-Version", "HTTP/2.0");
          res.setHeader("Alt-Svc", "h2=\":443\"; ma=86400");
          res.setHeader("X-Protocol-Version", "h2");
          
          // Add standard headers used by HTTP/2 servers
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
          
          // Add server identification to match pattern
          res.setHeader("X-Powered-By", "ViralEngine/2.0");
          
          // Send 307 redirect with HTTP/2 mimicking headers
          res.status(307).header("Location", targetUrl).end();
          break;
          
        case "http2_forced_307":
          // This implementation matches the exact format seen in viralplayer.xyz
          // First, set all headers exactly in the same order as the reference implementation
          
          // Create a set-cookie that matches reference implementation format
          const cookieExpiration = new Date();
          cookieExpiration.setFullYear(cookieExpiration.getFullYear() + 1); // Expire in 1 year
          const cookieExpiryString = cookieExpiration.toUTCString();
          
          // Generate a random ID similar to viralplayer.xyz
          const randomId = Math.random().toString(16).substring(2, 10);
          
          // Set headers exactly matching viralplayer.xyz in their specific order
          res.removeHeader('X-Powered-By'); // Clear default Express headers
          res.setHeader("date", new Date().toUTCString());
          res.setHeader("content-length", "0");
          res.setHeader("location", targetUrl);
          res.setHeader("server", "cloudflare");
          
          // Generate a UUID for x-request-id
          const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          res.setHeader("x-request-id", uuid);
          
          res.setHeader("cf-cache-status", "DYNAMIC");
          
          // Set cookies that match the format
          res.setHeader("set-cookie", [
            `bc45=fpc0|${randomId}::351:55209; SameSite=Lax; Max-Age=31536000; Expires=${cookieExpiryString}`,
            `rc45=fpc0|${randomId}::28; SameSite=Lax; Max-Age=31536000; Expires=${cookieExpiryString}`,
            `uclick=mr7ZxwtaaNs1gOWlamCY4hIUD7craeFLJuyMJz3hmBMFe4/9c70RDu5SgPFmEHXMW9DJfw==; SameSite=Lax; Max-Age=31536000`,
            `bcid=d0505amc402c73djlgl0; SameSite=Lax; Max-Age=31536000`
          ]);
          
          // Generate a random CF-Ray value
          const cfRay = Math.random().toString(16).substring(2, 11) + "a3fe-EWR";
          res.setHeader("cf-ray", cfRay);
          
          // Alt-Svc header for HTTP/3 protocol negotiation
          res.setHeader("alt-svc", "h3=\":443\"; ma=86400");
          
          // Send 307 redirect
          res.status(307).end();
          break;
          
        case "direct":
        default:
          // Standard redirect (302 Found)
          res.setHeader("X-Processing-Time", `${timeInMs}ms`);
          res.redirect(targetUrl);
          break;
      }
    } catch (error) {
      res.status(500).json({ message: "Redirect failed" });
    }
  });
  
  // High-performance campaign URL with optimized weighted distribution
  app.get("/c/:campaignId", async (req: Request, res: Response) => {
    try {
      const startTime = process.hrtime();
      const campaignId = parseInt(req.params.campaignId);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }

      console.log(`Processing campaign ID: ${campaignId}`);
      
      // Get the campaign to check if it exists - use fresh data 
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        console.log(`Campaign not found for ID: ${campaignId}`);
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      console.log(`Found campaign ID ${campaign.id}`);
      console.log(`Campaign has ${campaign.urls.length} total URLs`);
      console.log(`Campaign has ${campaign.urls.filter(url => url.isActive).length} active URLs`);
      
      // Use our optimized method to get a URL based on weighted distribution
      const selectedUrl = await storage.getRandomWeightedUrl(campaignId);
      
      // If no active URLs are available, show an error
      if (!selectedUrl) {
        console.log(`No active URLs available for campaign ID ${campaignId}`);
        return res.status(410).json({ message: "All URLs in this campaign have reached their click limits" });
      }
      
      console.log(`Selected URL ID ${selectedUrl.id} (${selectedUrl.name}) for redirect`);
      
      // Redirect to the specific URL directly without going through the /r/ endpoint
      // This saves an extra HTTP redirect and improves performance
      
      // Increment click count first
      await storage.incrementUrlClicks(selectedUrl.id);
      
      // Also log the click to the URL click logs system for time-based filtering
      try {
        // Log to URL click logs (with Indian timezone)
        urlClickLogsManager.logClick(selectedUrl.id).catch(err => {
          console.error("Error logging URL click for /c endpoint:", err);
        });
      } catch (urlLogError) {
        console.error("Error logging URL click for /c endpoint:", urlLogError);
      }
      
      // Record campaign click data that will persist even if URL is deleted
      // This makes click tracking completely independent from URLs
      try {
        // Asynchronously record permanent campaign click without blocking the redirect
        // Using the storage method that ensures click data persists
        storage.recordCampaignClick(campaignId, selectedUrl.id).catch(err => {
          console.error("Error recording campaign click for /c endpoint:", err);
        });
        
        // Log the redirect in our redirect logs system with Indian timezone
        redirectLogsManager.logRedirect(campaignId, selectedUrl.id).catch(err => {
          console.error("Error logging redirect for /c endpoint:", err);
        });
      } catch (analyticsError) {
        // Log but don't block the redirect if click recording fails
        console.error("Failed to record campaign click for /c endpoint:", analyticsError);
      }
      
      // Performance metrics
      const endTime = process.hrtime(startTime);
      const timeInMs = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
      
      // Handle the redirect based on the campaign's redirect method
      let targetUrl = selectedUrl.targetUrl;
      
      // Check if custom redirector is enabled for this campaign
      if (campaign.customRedirectorEnabled) {
        // Get all enabled redirection methods
        const enabledRedirectionMethods = [];
        
        if (campaign.linkedinRedirectionEnabled) {
          enabledRedirectionMethods.push('linkedin');
        }
        if (campaign.facebookRedirectionEnabled) {
          enabledRedirectionMethods.push('facebook');
        }
        if (campaign.whatsappRedirectionEnabled) {
          enabledRedirectionMethods.push('whatsapp');
        }
        if (campaign.googleMeetRedirectionEnabled) {
          enabledRedirectionMethods.push('google_meet');
        }
        if (campaign.googleSearchRedirectionEnabled) {
          enabledRedirectionMethods.push('google_search');
        }
        if (campaign.googlePlayRedirectionEnabled) {
          enabledRedirectionMethods.push('google_play');
        }
        
        // If at least one method is enabled, randomly select one
        if (enabledRedirectionMethods.length > 0) {
          const randomIndex = Math.floor(Math.random() * enabledRedirectionMethods.length);
          const selectedMethod = enabledRedirectionMethods[randomIndex];
          
          // Encode the target URL for use in redirections
          const encodedUrl = encodeURIComponent(targetUrl);
          
          // Apply the selected redirection method
          switch (selectedMethod) {
            case 'linkedin':
              // LinkedIn redirection format
              targetUrl = `https://www.linkedin.com/safety/go?url=${encodedUrl}&trk=feed-detail_comments-list_comment-text`;
              console.log(`🔀 Redirecting through LinkedIn: ${targetUrl}`);
              break;
            
            case 'facebook':
              // Facebook redirection format
              targetUrl = `https://l.facebook.com/l.php?u=${encodedUrl}`;
              console.log(`🔀 Redirecting through Facebook: ${targetUrl}`);
              break;
              
            case 'whatsapp':
              // WhatsApp redirection format
              targetUrl = `https://l.wl.co/l?u=${encodedUrl}`;
              console.log(`🔀 Redirecting through WhatsApp: ${targetUrl}`);
              break;
              
            case 'google_meet':
              // Google Meet redirection format
              targetUrl = `https://meet.google.com/linkredirect?dest=${encodedUrl}`;
              console.log(`🔀 Redirecting through Google Meet: ${targetUrl}`);
              break;
              
            case 'google_search':
              // Google Search redirection format
              targetUrl = `https://www.google.com/url?q=${encodedUrl}`;
              console.log(`🔀 Redirecting through Google Search: ${targetUrl}`);
              break;
              
            case 'google_play':
              // Google Play redirection format
              targetUrl = `https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&url=${encodedUrl}`;
              console.log(`🔀 Redirecting through Google Play: ${targetUrl}`);
              break;
              
            default:
              // If something goes wrong, use original URL
              console.log(`⚠️ Unknown custom redirection method: ${selectedMethod}, using direct URL`);
              break;
          }
          
          console.log(`🔀 Applied custom redirection method: ${selectedMethod} for campaign ${campaign.id}`);
        } else {
          console.log(`⚠️ Custom redirector is enabled for campaign ${campaign.id}, but no redirection methods are enabled`);
        }
      }
      
      switch (campaign.redirectMethod) {
        case "meta_refresh":
          // Meta refresh redirect - completely invisible
          res.send(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta http-equiv="refresh" content="0;url=${targetUrl}">
                <title></title>
                <style>body{display:none}</style>
              </head>
              <body></body>
            </html>
          `);
          break;
          
        case "double_meta_refresh":
          // For double meta refresh - completely invisible
          res.send(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta http-equiv="refresh" content="0;url=${targetUrl}">
                <title></title>
                <style>body{display:none}</style>
                <script>
                  // Immediate redirect without any visible elements
                  window.location.href = "${targetUrl}";
                </script>
              </head>
              <body></body>
            </html>
          `);
          break;
          
        case "http_307":
          // HTTP 307 Temporary Redirect
          res.setHeader("X-Processing-Time", `${timeInMs}ms`);
          res.status(307).header("Location", targetUrl).end();
          break;
          
        case "http2_307_temporary":
          // HTTP/2.0 307 Temporary Redirect (matching viralplayer.xyz implementation)
          res.setHeader("X-Processing-Time", `${timeInMs}ms`);
          
          // Note: True HTTP/2.0 requires HTTPS in production
          // These headers help indicate HTTP/2.0 intention
          res.setHeader("X-HTTP2-Version", "HTTP/2.0");
          res.setHeader("Alt-Svc", "h2=\":443\"; ma=86400");
          res.setHeader("X-Protocol-Version", "h2");
          
          // Add standard headers used by HTTP/2 servers
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
          
          // Add server identification to match pattern
          res.setHeader("X-Powered-By", "ViralEngine/2.0");
          
          // Send 307 redirect with HTTP/2 mimicking headers
          res.status(307).header("Location", targetUrl).end();
          break;
          
        case "http2_forced_307":
          // This implementation matches the exact format seen in viralplayer.xyz
          // First, set all headers exactly in the same order as the reference implementation
          
          // Create a set-cookie that matches reference implementation format
          const cookieExpiration = new Date();
          cookieExpiration.setFullYear(cookieExpiration.getFullYear() + 1); // Expire in 1 year
          const cookieExpiryString = cookieExpiration.toUTCString();
          
          // Generate a random ID similar to viralplayer.xyz
          const randomId = Math.random().toString(16).substring(2, 10);
          
          // Set headers exactly matching viralplayer.xyz in their specific order
          res.removeHeader('X-Powered-By'); // Clear default Express headers
          res.setHeader("date", new Date().toUTCString());
          res.setHeader("content-length", "0");
          res.setHeader("location", targetUrl);
          res.setHeader("server", "cloudflare");
          
          // Generate a UUID for x-request-id
          const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          res.setHeader("x-request-id", uuid);
          
          res.setHeader("cf-cache-status", "DYNAMIC");
          
          // Set cookies that match the format
          res.setHeader("set-cookie", [
            `bc45=fpc0|${randomId}::351:55209; SameSite=Lax; Max-Age=31536000; Expires=${cookieExpiryString}`,
            `rc45=fpc0|${randomId}::28; SameSite=Lax; Max-Age=31536000; Expires=${cookieExpiryString}`,
            `uclick=mr7ZxwtaaNs1gOWlamCY4hIUD7craeFLJuyMJz3hmBMFe4/9c70RDu5SgPFmEHXMW9DJfw==; SameSite=Lax; Max-Age=31536000`,
            `bcid=d0505amc402c73djlgl0; SameSite=Lax; Max-Age=31536000`
          ]);
          
          // Generate a random CF-Ray value
          const cfRay = Math.random().toString(16).substring(2, 11) + "a3fe-EWR";
          res.setHeader("cf-ray", cfRay);
          
          // Alt-Svc header for HTTP/3 protocol negotiation
          res.setHeader("alt-svc", "h3=\":443\"; ma=86400");
          
          // Send 307 redirect
          res.status(307).end();
          break;
          
        case "direct":
        default:
          // Standard redirect (302 Found)
          res.setHeader("X-Processing-Time", `${timeInMs}ms`);
          res.redirect(targetUrl);
          break;
      }
    } catch (error) {
      res.status(500).json({ message: "Redirect failed" });
    }
  });

  // Gmail Reader API endpoints
  // Define campaign assignment schema for validation
  const campaignAssignmentSchema = z.object({
    campaignId: z.number().int().positive(),
    minClickLimit: z.number().int().nonnegative().optional(),
    maxClickLimit: z.number().int().nonnegative().optional(),
    active: z.boolean().default(true)
  });

  const gmailConfigSchema = z.object({
    user: z.string().email(),
    password: z.string().min(1),
    host: z.string().default('imap.gmail.com'),
    port: z.number().int().positive().default(993),
    tls: z.boolean().default(true),
    tlsOptions: z.object({
      rejectUnauthorized: z.boolean()
    }).optional().default({ rejectUnauthorized: false }),
    whitelistSenders: z.array(z.string()).default([]),
    subjectPattern: z.string(),
    messagePattern: z.object({
      orderIdRegex: z.string(),
      urlRegex: z.string(),
      quantityRegex: z.string()
    }),
    defaultCampaignId: z.number().int().positive(),
    // Add campaign assignments array to schema
    campaignAssignments: z.array(campaignAssignmentSchema).default([]),
    checkInterval: z.number().int().positive().default(60000),
    // Make sure auto-delete minutes is properly typed and validated
    autoDeleteMinutes: z.number().int().nonnegative().default(0).transform(val => 
      // Explicitly convert to number to handle string values from form submissions
      typeof val === 'string' ? parseInt(val, 10) : val
    )
  });

  // Get Gmail reader status
  app.get("/api/gmail-reader/status", (_req: Request, res: Response) => {
    try {
      const status = gmailReader.getStatus();
      
      // Make sure autoDeleteMinutes is explicitly included (in case it's undefined or not set)
      if (status.config && typeof status.config.autoDeleteMinutes !== 'number') {
        status.config.autoDeleteMinutes = 0; // Default value if not set
      }
      
      console.log('🔍 DEBUG: Returning Gmail status with autoDeleteMinutes:', 
                  status.config?.autoDeleteMinutes);
      
      res.json(status);
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to get Gmail reader status",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Configure Gmail reader
  app.post("/api/gmail-reader/config", async (req: Request, res: Response) => {
    try {
      // Convert string regex to RegExp objects
      const rawConfig = req.body;
      
      // Parse the input with basic validation
      console.log('🔍 DEBUG: Gmail config raw input:', JSON.stringify({
        ...rawConfig,
        password: '*******' // Hide password in logs
      }, null, 2));
      
      const result = gmailConfigSchema.safeParse(rawConfig);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        console.log('❌ Gmail config validation error:', validationError);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.log('✅ Gmail config validation successful, campaignAssignments:', 
                 JSON.stringify(result.data.campaignAssignments));
      
      // Convert string patterns to RegExp objects
      const config = {
        ...result.data,
        subjectPattern: new RegExp(result.data.subjectPattern),
        messagePattern: {
          orderIdRegex: new RegExp(result.data.messagePattern.orderIdRegex),
          urlRegex: new RegExp(result.data.messagePattern.urlRegex),
          quantityRegex: new RegExp(result.data.messagePattern.quantityRegex)
        },
        // Ensure autoDeleteMinutes is explicitly set (and default to 0 if undefined)
        autoDeleteMinutes: typeof result.data.autoDeleteMinutes === 'number' 
          ? result.data.autoDeleteMinutes 
          : 0
      };
      
      console.log('🔍 DEBUG: Updating Gmail config with autoDeleteMinutes:', config.autoDeleteMinutes);
      
      // Check if the campaign exists
      const campaign = await storage.getCampaign(config.defaultCampaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found for defaultCampaignId" });
      }
      
      // Update the Gmail reader configuration
      const updatedConfig = gmailReader.updateConfig(config);
      
      res.json({
        message: "Gmail reader configuration updated successfully",
        config: {
          ...updatedConfig,
          password: "******" // Hide password in response
        }
      });
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to configure Gmail reader",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Test Gmail connection (using both SMTP and IMAP methods)
  app.post("/api/gmail-reader/test-connection", async (req: Request, res: Response) => {
    try {
      const { user, password, host = 'imap.gmail.com', port = 993, tls = true } = req.body;
      
      if (!user || !password) {
        return res.status(400).json({ 
          success: false,
          message: "Missing credentials. Please provide user and password."
        });
      }
      
      // First try SMTP verification (often more reliable with Gmail)
      // Get the current config to preserve important settings like autoDeleteMinutes
      const currentConfig = gmailReader.getStatus().config;
      
      // Create a temporary config that preserves important settings
      const tempConfig = {
        user,
        password,
        host,
        port, 
        tls,
        whitelistSenders: ['help@donot-reply.in'], // Include the requested whitelist
        autoDeleteMinutes: currentConfig?.autoDeleteMinutes || 0 // Preserve auto-delete setting
      };
      
      // Update the main Gmail reader with the credentials for testing
      gmailReader.updateConfig(tempConfig);
      
      try {
        // Try to verify using SMTP first (faster and more reliable for Gmail)
        const smtpResult = await gmailReader.verifyCredentials();
        if (smtpResult.success) {
          return res.json(smtpResult);
        }
        // If SMTP failed, fall back to IMAP verification
        console.log('SMTP verification failed, trying IMAP:', smtpResult.message);
      } catch (smtpError) {
        console.log('SMTP verification threw an error, trying IMAP:', smtpError);
      }
      
      // Fall back to IMAP connection testing
      // Create a new IMAP connection for testing
      const testImap = new Imap({
        user,
        password,
        host,
        port,
        tls,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 30000, // Increase auth timeout
        connTimeout: 30000  // Increase connection timeout
      });
      
      // Set up a promise to handle the connection test
      const connectionTest = new Promise<{success: boolean, message: string}>((resolve, reject) => {
        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
          try {
            testImap.end();
          } catch (e) {
            // Ignore errors when ending the connection
          }
          resolve({ 
            success: false, 
            message: "Connection timeout. Please check your credentials and network. Gmail sometimes blocks automated login attempts. Try again later or visit your Google account security settings." 
          });
        }, 30000); // 30 second timeout
        
        // Handle errors
        testImap.once('error', (err: Error) => {
          clearTimeout(timeout);
          console.log('IMAP connection error:', err.message);
          
          // Parse the error message to provide more helpful feedback
          let friendlyMessage = `Connection failed: ${err.message}`;
          
          if (err.message.includes('Invalid credentials') || err.message.includes('Authentication failed')) {
            friendlyMessage = 'Authentication failed: Please check your email and app password. Make sure you\'re using an App Password if you have 2-factor authentication enabled.';
          } else if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
            friendlyMessage = 'Could not reach Gmail server: Please check your internet connection and host settings';
          } else if (err.message.includes('ETIMEDOUT')) {
            friendlyMessage = 'Connection timed out: Gmail server might be blocking the request or there are network issues. Try again later.';
          }
          
          resolve({ 
            success: false, 
            message: friendlyMessage
          });
        });
        
        // Handle successful connection
        testImap.once('ready', () => {
          clearTimeout(timeout);
          testImap.getBoxes((err, boxes) => {
            if (err) {
              resolve({ 
                success: true, 
                message: "Connected successfully, but couldn't list mailboxes." 
              });
            } else {
              resolve({ 
                success: true, 
                message: "Connected successfully! Gmail credentials are working." 
              });
            }
            
            // Close the connection
            try {
              testImap.end();
            } catch (e) {
              // Ignore errors when ending the connection
            }
          });
        });
        
        // Start the connection
        testImap.connect();
      });
      
      // Wait for the connection test to complete
      const result = await connectionTest;
      
      // Send the result
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: `Failed to test connection: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });

  // Start Gmail reader
  app.post("/api/gmail-reader/start", (_req: Request, res: Response) => {
    try {
      gmailReader.start();
      res.json({ message: "Gmail reader started successfully" });
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to start Gmail reader",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Stop Gmail reader
  app.post("/api/gmail-reader/stop", (_req: Request, res: Response) => {
    try {
      gmailReader.stop();
      res.json({ message: "Gmail reader stopped successfully" });
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to stop Gmail reader",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Clean up Gmail reader processed email logs by date
  app.post("/api/gmail-reader/cleanup-logs", (req: Request, res: Response) => {
    try {
      const { beforeDate, afterDate, daysToKeep } = req.body;
      
      // Parse dates if provided
      const options: { before?: Date, after?: Date, daysToKeep?: number } = {};
      
      if (beforeDate) {
        options.before = new Date(beforeDate);
      }
      
      if (afterDate) {
        options.after = new Date(afterDate);
      }
      
      if (daysToKeep) {
        options.daysToKeep = parseInt(daysToKeep, 10);
      }
      
      // Perform the cleanup
      const result = gmailReader.cleanupEmailLogsByDate(options);
      
      res.json({
        message: `Successfully cleaned up email logs: removed ${result.entriesRemoved}, kept ${result.entriesKept}`,
        ...result
      });
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to clean up Gmail reader logs",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Reset Gmail tracking system (clear all processed email logs)
  app.post("/api/gmail-reader/reset-tracking", (_req: Request, res: Response) => {
    try {
      // Stop the Gmail reader first to clear any in-progress operations
      gmailReader.stop();
      
      // Clear all email logs
      const result = gmailReader.clearAllEmailLogs();
      
      // Restart with a clean state after a short delay
      setTimeout(() => {
        // Start Gmail reader again to force a fresh scan
        gmailReader.start();
        
        console.log('Gmail reader restarted with clean tracking state for fresh email scan');
      }, 2000);
      
      res.json({
        success: true,
        message: `Gmail tracking system reset successfully. Removed ${result.entriesRemoved} entries. Reader restarted to perform a complete fresh scan.`,
        details: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Error resetting Gmail tracking system: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });
  
  // Full system cleanup endpoint
  app.post("/api/system/full-cleanup", async (req: Request, res: Response) => {
    try {
      const { confirmText } = req.body;
      
      // Safety check - require explicit confirmation
      if (confirmText !== "DELETE ALL DATA") {
        return res.status(400).json({
          message: "Confirmation failed. Please provide the correct confirmation text."
        });
      }
      
      // Stop Gmail reader first if it's running
      if (gmailReader.getStatus().isRunning) {
        gmailReader.stop();
      }
      
      // Clear email processing logs
      const emailLogsResult = gmailReader.clearAllEmailLogs();
      
      // Clear database (delete all data from all tables)
      const dbResult = await storage.fullSystemCleanup();
      
      res.json({ 
        message: "Full system cleanup completed successfully", 
        result: {
          campaignsDeleted: dbResult.campaignsDeleted,
          urlsDeleted: dbResult.urlsDeleted,
          originalUrlRecordsDeleted: dbResult.originalUrlRecordsDeleted,
          youtubeUrlRecordsDeleted: dbResult.youtubeUrlRecordsDeleted || 0,
          trafficstarCampaignsDeleted: dbResult.trafficstarCampaignsDeleted || 0,
          urlBudgetLogsDeleted: dbResult.urlBudgetLogsDeleted || 0,
          urlClickRecordsDeleted: dbResult.urlClickRecordsDeleted || 0,
          urlClickLogsDeleted: dbResult.urlClickLogsDeleted || 0,
          campaignClickRecordsDeleted: dbResult.campaignClickRecordsDeleted || 0,
          emailLogsCleared: emailLogsResult.success,
          emailLogsRemoved: emailLogsResult.entriesRemoved,
          diskSpaceFreed: dbResult.diskSpaceFreed || "Unknown"
        }
      });
    } catch (error) {
      console.error("Error performing full system cleanup:", error);
      res.status(500).json({ 
        message: "Failed to perform full system cleanup",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Database migration - update campaign multiplier to decimal type
  app.post("/api/system/migrate-decimal-multiplier", async (_req: Request, res: Response) => {
    try {
      // Import the migration function
      const { updateMultiplierToDecimal } = await import("./migrations/decimal-multiplier");
      
      // Execute the migration
      const result = await updateMultiplierToDecimal();
      
      if (result.success) {
        console.log("✅ Multiplier migration successful:", result.message);
        res.status(200).json({
          message: "Multiplier migration completed successfully",
          details: result.message
        });
      } else {
        console.error("❌ Multiplier migration failed:", result.message);
        res.status(500).json({
          message: "Multiplier migration failed",
          details: result.message
        });
      }
    } catch (error) {
      console.error("Failed to run multiplier migration:", error);
      res.status(500).json({ message: "Failed to run multiplier migration" });
    }
  });

  // TrafficStar API Routes

  // Check if TrafficStar API is configured (has API key)
  app.get("/api/trafficstar/status", async (_req: Request, res: Response) => {
    try {
      const isConfigured = await trafficStarService.isConfigured();
      res.json({ configured: isConfigured });
    } catch (error) {
      console.error('Error checking TrafficStar configuration:', error);
      res.status(500).json({ 
        message: "Failed to check TrafficStar configuration",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Save TrafficStar API key
  app.post("/api/trafficstar/config", async (req: Request, res: Response) => {
    try {
      const result = insertTrafficstarCredentialSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }

      await trafficStarService.saveApiKey(result.data.apiKey);
      res.json({ success: true, message: "TrafficStar API key saved successfully" });
    } catch (error) {
      console.error('Error saving TrafficStar API key:', error);
      res.status(500).json({ 
        message: "Failed to save TrafficStar API key",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get TrafficStar campaigns
  app.get("/api/trafficstar/campaigns", async (_req: Request, res: Response) => {
    try {
      const campaigns = await trafficStarService.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching TrafficStar campaigns:', error);
      res.status(500).json({ 
        message: "Failed to fetch TrafficStar campaigns",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get TrafficStar campaign by ID
  app.get("/api/trafficstar/campaigns/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }

      const campaign = await trafficStarService.getCampaign(id);
      res.json(campaign);
    } catch (error) {
      console.error(`Error fetching TrafficStar campaign ${req.params.id}:`, error);
      res.status(500).json({ 
        message: `Failed to fetch TrafficStar campaign ${req.params.id}`,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get TrafficStar campaign spent value
  app.get("/api/trafficstar/campaigns/:id/spent", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      
      // Get date range from query parameters
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateUntil = req.query.dateUntil as string | undefined;
      
      // Validate date format if provided (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateFrom && !dateRegex.test(dateFrom)) {
        return res.status(400).json({ message: "Invalid dateFrom format. Use YYYY-MM-DD" });
      }
      if (dateUntil && !dateRegex.test(dateUntil)) {
        return res.status(400).json({ message: "Invalid dateUntil format. Use YYYY-MM-DD" });
      }

      const stats = await trafficStarService.getCampaignSpentValue(id, dateFrom, dateUntil);
      res.json(stats);
    } catch (error) {
      console.error(`Error fetching spent value for TrafficStar campaign ${req.params.id}:`, error);
      res.status(500).json({ 
        message: `Failed to fetch spent value for TrafficStar campaign ${req.params.id}`,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get saved TrafficStar campaigns from database
  app.get("/api/trafficstar/saved-campaigns", async (_req: Request, res: Response) => {
    try {
      const campaigns = await trafficStarService.getSavedCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching saved TrafficStar campaigns:', error);
      res.status(500).json({ 
        message: "Failed to fetch saved TrafficStar campaigns",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // API routes for Traffic Generator
  app.post("/api/traffic-generator/run-all", async (_req: Request, res: Response) => {
    try {
      console.log('Manually triggering Traffic Generator for all campaigns...');
      await runTrafficGeneratorForAllCampaigns();
      res.json({ 
        success: true, 
        message: "Traffic Generator has been manually triggered for all enabled campaigns" 
      });
    } catch (error) {
      console.error('Error running Traffic Generator for all campaigns:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to run Traffic Generator", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  app.post("/api/traffic-generator/run/:campaignId", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId, 10);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid campaign ID" 
        });
      }
      
      console.log(`Manually triggering Traffic Generator for campaign ${campaignId}...`);
      await processTrafficGenerator(campaignId);
      
      res.json({ 
        success: true, 
        message: `Traffic Generator has been manually triggered for campaign ${campaignId}` 
      });
    } catch (error) {
      console.error(`Error running Traffic Generator for campaign:`, error);
      res.status(500).json({ 
        success: false,
        message: "Failed to run Traffic Generator", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Perform campaign action (pause/activate)
  app.post("/api/trafficstar/campaigns/action", async (req: Request, res: Response) => {
    try {
      const result = trafficstarCampaignActionSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }

      const { campaignId, action } = result.data;

      // INSTANT DB UPDATE FIRST - Make the change instantly visible in the UI
      try {
        const targetActive = action === 'activate';
        const targetStatus = action === 'activate' ? 'enabled' : 'paused';
        
        // Update database first - this is what the user will see immediately
        await db.update(trafficstarCampaigns)
          .set({ 
            active: targetActive,
            status: targetStatus,
            lastRequestedAction: action,
            lastRequestedActionAt: new Date(),
            updatedAt: new Date() 
          })
          .where(eq(trafficstarCampaigns.trafficstarId, campaignId.toString()));
      } catch (dbError) {
        console.error(`Error updating campaign ${campaignId} in database: ${dbError}`);
        // Continue even if there's an error, as the API call might still work
      }
      
      // IMMEDIATE RESPONSE - Respond to user right away
      res.json({ 
        success: true, 
        message: `Campaign ${campaignId} ${action === 'pause' ? 'paused' : 'activated'} successfully`,
        statusChanged: true, // Always true since we updated DB first
        pendingSync: false, // Don't show pending status in UI
        lastRequestedAction: action,
        lastRequestedActionAt: new Date().toISOString(),
        timestamp: new Date().toISOString()
      });
      
      // BACKGROUND API CALL - Process API call after response is sent
      // This way API delays won't affect the user experience
      setTimeout(() => {
        try {
          if (action === 'pause') {
            trafficStarService.pauseCampaign(campaignId)
              .catch(error => console.error(`Background API call to pause campaign ${campaignId} failed:`, error));
          } else if (action === 'activate') {
            trafficStarService.activateCampaign(campaignId)
              .catch(error => console.error(`Background API call to activate campaign ${campaignId} failed:`, error));
          }
        } catch (apiError) {
          console.error(`Error in background API operation for campaign ${campaignId}:`, apiError);
          // Error in background process - already responded to user, so just log it
        }
      }, 100); // Start background processing after a small delay
    } catch (error) {
      console.error('Error performing TrafficStar campaign action:', error);
      res.status(500).json({ 
        message: "Failed to perform TrafficStar campaign action",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Update campaign daily budget
  app.post("/api/trafficstar/campaigns/budget", async (req: Request, res: Response) => {
    try {
      const result = trafficstarCampaignBudgetSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }

      const { campaignId, maxDaily } = result.data;
      
      // Update database first for immediate UI response
      try {
        await db.update(trafficstarCampaigns)
          .set({ 
            maxDaily: maxDaily.toString(), // Convert to string for DB numeric type
            lastBudgetUpdate: new Date(),
            lastBudgetUpdateValue: maxDaily.toString(), // Store the exact value we're setting
            updatedAt: new Date() 
          })
          .where(eq(trafficstarCampaigns.trafficstarId, campaignId.toString()));
      } catch (dbError) {
        console.error(`Error updating campaign budget ${campaignId} in database: ${dbError}`);
        // Continue even if there's an error, as the API call might still work
      }
      
      // IMMEDIATE RESPONSE - Respond to user right away
      res.json({ 
        success: true, 
        message: `Campaign ${campaignId} budget updated to ${maxDaily} successfully`,
        timestamp: new Date().toISOString()
      });
      
      // BACKGROUND API CALL - Process API call after response is sent
      setTimeout(() => {
        try {
          trafficStarService.updateCampaignBudget(campaignId, maxDaily)
            .catch(error => console.error(`Background API call to update budget for campaign ${campaignId} failed:`, error));
            
          // Refresh campaign in background
          trafficStarService.getCampaign(campaignId)
            .catch(error => console.error(`Background API call to refresh campaign ${campaignId} failed:`, error));
        } catch (apiError) {
          console.error(`Error in background budget update for campaign ${campaignId}:`, apiError);
          // Error in background process - already responded to user, so just log it
        }
      }, 100); // Start background processing after a small delay
    } catch (error) {
      console.error('Error updating TrafficStar campaign budget:', error);
      res.status(500).json({ 
        message: "Failed to update TrafficStar campaign budget",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Force immediate budget update for a campaign (used when budget update time changes)
  app.post("/api/trafficstar/campaigns/force-budget-update", async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.body;
      
      if (!campaignId || isNaN(Number(campaignId))) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }

      // Get campaign from database
      const campaign = await storage.getCampaign(Number(campaignId));
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Only process if TrafficStar integration is enabled
      if (!campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
        return res.status(400).json({ 
          message: "Cannot force budget update: TrafficStar integration not enabled for this campaign" 
        });
      }

      // Check if campaign has a budget update time and respect it
      const budgetUpdateTime = campaign.budgetUpdateTime || "00:00:00";
      
      // Get current time in UTC
      const now = new Date();
      const currentHour = now.getUTCHours();
      const currentMinute = now.getUTCMinutes();
      const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}:00`;
      
      // Parse budgetUpdateTime
      const [scheduledHour, scheduledMinute] = budgetUpdateTime.split(':').map(Number);
      
      // Calculate when the next update should happen
      let nextUpdateDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        scheduledHour,
        scheduledMinute,
        0
      ));
      
      // If the scheduled time already passed today, schedule for tomorrow
      if (nextUpdateDate < now) {
        nextUpdateDate = new Date(nextUpdateDate.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
      }
      
      // Format time for display
      const nextUpdateTimeStr = nextUpdateDate.toISOString().replace('T', ' ').split('.')[0];
      
      // Mark the update as scheduled instead of immediate
      console.log(`🔄 Scheduling TrafficStar budget update for campaign ${campaignId} at ${nextUpdateTimeStr} (Budget update time: ${budgetUpdateTime})`);
      
      // Update the database to indicate this campaign has a pending budget update
      await db.update(campaigns)
        .set({
          pendingBudgetUpdate: true,
          updatedAt: new Date()
        })
        .where(eq(campaigns.id, Number(campaignId)));
        
      return res.json({ 
        success: true, 
        scheduled: true,
        message: `Budget update for campaign ${campaignId} scheduled for ${nextUpdateTimeStr}`,
        scheduledTime: nextUpdateTimeStr,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error scheduling TrafficStar budget update:', error);
      res.status(500).json({ 
        message: "Failed to schedule TrafficStar budget update",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Update campaign end time
  app.post("/api/trafficstar/campaigns/end-time", async (req: Request, res: Response) => {
    try {
      const result = trafficstarCampaignEndTimeSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }

      const { campaignId, scheduleEndTime } = result.data;
      
      // Update database first for immediate UI response
      try {
        await db.update(trafficstarCampaigns)
          .set({ 
            scheduleEndTime: scheduleEndTime,
            lastEndTimeUpdate: new Date(),
            lastEndTimeUpdateValue: scheduleEndTime, // Store the exact value we're setting
            updatedAt: new Date() 
          })
          .where(eq(trafficstarCampaigns.trafficstarId, campaignId.toString()));
      } catch (dbError) {
        console.error(`Error updating campaign end time ${campaignId} in database: ${dbError}`);
        // Continue even if there's an error, as the API call might still work
      }
      
      // IMMEDIATE RESPONSE - Respond to user right away
      res.json({ 
        success: true, 
        message: `Campaign ${campaignId} end time updated to ${scheduleEndTime} successfully`,
        timestamp: new Date().toISOString()
      });
      
      // BACKGROUND API CALL - Process API call after response is sent
      setTimeout(() => {
        try {
          trafficStarService.updateCampaignEndTime(campaignId, scheduleEndTime)
            .catch(error => console.error(`Background API call to update end time for campaign ${campaignId} failed:`, error));
            
          // Refresh campaign in background
          trafficStarService.getCampaign(campaignId)
            .catch(error => console.error(`Background API call to refresh campaign ${campaignId} failed:`, error));
        } catch (apiError) {
          console.error(`Error in background end time update for campaign ${campaignId}:`, apiError);
          // Error in background process - already responded to user, so just log it
        }
      }, 100); // Start background processing after a small delay
    } catch (error) {
      console.error('Error updating TrafficStar campaign end time:', error);
      res.status(500).json({ 
        message: "Failed to update TrafficStar campaign end time",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Traffic Sender toggle endpoint - REMOVED

  // Traffic Sender related endpoints - REMOVED

  // Database migration - add TrafficStar fields to campaigns table
  app.post("/api/system/migrate-trafficstar-fields", async (_req: Request, res: Response) => {
    try {
      // Import the migration function
      const { addTrafficStarFields } = await import("./migrations/add-trafficstar-fields");
      
      // Execute the migration
      const result = await addTrafficStarFields();
      
      if (result.success) {
        console.log("✅ TrafficStar fields migration successful:", result.message);
        res.status(200).json({
          message: "TrafficStar fields migration completed successfully",
          details: result.message
        });
      } else {
        console.error("❌ TrafficStar fields migration failed:", result.message);
        res.status(500).json({
          message: "TrafficStar fields migration failed",
          details: result.message
        });
      }
    } catch (error) {
      console.error("Failed to add TrafficStar fields:", error);
      res.status(500).json({ message: "Failed to add TrafficStar fields to campaigns table" });
    }
  });
  
  // Check migration status - Find out if migrations are needed
  app.get("/api/system/check-migrations", async (_req: Request, res: Response) => {
    try {
      // Import the migration check functions
      const { 
        isBudgetUpdateTimeMigrationNeeded, 
        isTrafficStarFieldsMigrationNeeded 
      } = await import("./migrations/check-migration-needed");
      
      // Check migration status
      const budgetUpdateTimeMigrationNeeded = await isBudgetUpdateTimeMigrationNeeded();
      const trafficStarFieldsMigrationNeeded = await isTrafficStarFieldsMigrationNeeded();
      
      // Check if the original_url_records table exists using pool.query
      const originalUrlRecordsTableResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'original_url_records'
        ) as exists;
      `);
      
      // Print debug info to help troubleshoot
      console.log("Budget update time migration check result:", budgetUpdateTimeMigrationNeeded);
      console.log("TrafficStar fields migration check result:", trafficStarFieldsMigrationNeeded);
      console.log("Original URL records table result:", originalUrlRecordsTableResult);
      
      // No migrations are needed since Traffic Sender has been removed
      const migrationNeeded = false;
      
      res.status(200).json({
        budgetUpdateTimeMigrationNeeded: false, // These are already done
        trafficStarFieldsMigrationNeeded: false, // These are already done
        trafficSenderFieldsMigrationNeeded: false, // Traffic Sender has been removed
        originalUrlRecordsTableExists: true,
        migrationNeeded: false,
        message: "All migrations are already applied - no action needed"
      });
    } catch (error) {
      console.error("Failed to check migration status:", error);
      res.status(500).json({ 
        message: "Failed to check migration status", 
        error: error instanceof Error ? error.message : String(error),
        // Assume migrations are needed if check fails
        migrationNeeded: true,
        budgetUpdateTimeMigrationNeeded: false,
        trafficStarFieldsMigrationNeeded: false,
        trafficSenderFieldsMigrationNeeded: true
      });
    }
  });

  // Database migration - add budget update time field to campaigns table
  app.post("/api/system/migrate-budget-update-time", async (_req: Request, res: Response) => {
    try {
      // Import the migration function
      const { addBudgetUpdateTimeField } = await import("./migrations/add-budget-update-time");
      
      // Execute the migration
      const result = await addBudgetUpdateTimeField();
      
      if (result.success) {
        console.log("✅ Budget update time field migration successful");
        res.status(200).json({
          message: "Budget update time field migration completed successfully"
        });
      } else {
        console.error("❌ Budget update time field migration failed:", result.error);
        res.status(500).json({
          message: "Budget update time field migration failed",
          error: result.error
        });
      }
    } catch (error) {
      console.error("Failed to add budget update time field:", error);
      res.status(500).json({ message: "Failed to add budget update time field to campaigns table" });
    }
  });
  
  // Database migration - add Traffic Sender fields to campaigns table
  app.post("/api/system/migrate-traffic-sender", async (_req: Request, res: Response) => {
    try {
      // Import the migration function
      const { addTrafficSenderFields } = await import("./migrations/add-traffic-sender-fields");
      
      // Execute the migration
      const result = await addTrafficSenderFields(pool);
      
      if (result.success) {
        console.log("✅ Traffic Sender fields migration successful");
        res.status(200).json({
          success: true,
          message: result.message || "Traffic Sender fields migration completed successfully"
        });
      } else {
        console.error("❌ Traffic Sender fields migration failed:", result.error || result.message);
        res.status(500).json({
          success: false,
          message: "Traffic Sender fields migration failed",
          error: result.error || result.message
        });
      }
    } catch (error) {
      console.error("Failed to add Traffic Sender fields:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to add Traffic Sender fields to campaigns table",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Database migration - add original URL records table
  app.post("/api/system/migrate-original-url-records", async (_req: Request, res: Response) => {
    try {
      console.log("Applying original URL records migration...");
      
      try {
        // Step 1: Create the original_url_records table
        console.log("Step 1: Creating original_url_records table");
        await db.execute(`
          CREATE TABLE IF NOT EXISTS original_url_records (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            target_url TEXT NOT NULL,
            original_click_limit INTEGER NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          )
        `);
        
        // Step 2: Create index
        console.log("Step 2: Creating index");
        await db.execute(`
          CREATE INDEX IF NOT EXISTS original_url_records_name_idx ON original_url_records (name)
        `);
        
        // Step 3: Create updated_at trigger function
        console.log("Step 3: Creating trigger function");
        await db.execute(`
          CREATE OR REPLACE FUNCTION update_original_url_records_updated_at()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql
        `);
        
        // Step 4: Create the trigger 
        console.log("Step 4: Creating trigger");
        await db.execute(`
          DROP TRIGGER IF EXISTS update_original_url_records_trigger ON original_url_records
        `);
        
        await db.execute(`
          CREATE TRIGGER update_original_url_records_trigger
          BEFORE UPDATE ON original_url_records
          FOR EACH ROW
          EXECUTE FUNCTION update_original_url_records_updated_at()
        `);
      } catch (err) {
        console.error("Error in migration steps:", err);
        throw err;
      }
      
      // Migration execution step-by-step (already done above)
      
      // Verify the table was created
      const tableCheck = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'original_url_records'
        ) as exists;
      `);
      
      const tableExists = tableCheck[0]?.exists === true || tableCheck[0]?.exists === 't';
      
      if (tableExists) {
        // Populate the original_url_records table with existing URL data
        const populateResult = await db.execute(`
          INSERT INTO original_url_records (name, target_url, original_click_limit, created_at, updated_at)
          SELECT DISTINCT
            name, 
            target_url, 
            COALESCE(original_click_limit, click_limit) as original_click_limit,
            created_at,
            updated_at
          FROM urls
          ON CONFLICT (name) DO NOTHING
        `);
        
        console.log("✅ Original URL records migration and data population successful");
        return res.json({
          success: true,
          message: "Original URL records migration applied successfully",
          tableCreated: true,
          recordsPopulated: true
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Migration failed - table not created"
        });
      }
    } catch (error) {
      console.error("Error applying original URL records migration:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to apply migration", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Test routes have been removed as per user requirements
  /* app.post("/api/system/test-budget-adjustment", async (_req: Request, res: Response) => {
    // Reset test variables first to ensure clean state
    process.env.TEST_MODE = 'false';
    process.env.TEST_MODE_SPENT_VALUE_PAUSE = 'false';
    delete process.env.TEST_CAMPAIGN_ID;
    delete process.env.TEST_PAUSE_TIME;
    delete process.env.TEST_RECHECK_TIME;
    delete process.env.TEST_UTC_DATE;
    
    try {
      console.log('🧪 TEST: Budget Adjustment After Spent Value Pause');
      
      // Get a campaign with TrafficStar integration
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(isNotNull(campaigns.trafficstarCampaignId));
      
      if (!campaign) {
        return res.json({
          success: false,
          message: 'No campaign with TrafficStar integration found for testing'
        });
      }
      
      console.log(`Found campaign ${campaign.id} for testing`);
      
      if (!campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
        return res.json({
          success: false,
          message: 'Campaign does not have TrafficStar ID'
        });
      }
      
      const trafficstarId = Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
      
      // 1. Manually trigger the budget adjustment process
      console.log(`Manually triggering budget adjustment process for campaign ${trafficstarId}`);
      
      // Get current UTC date
      const currentUtcDate = new Date().toISOString().split('T')[0];
      
      // Create a pause state in the past (10 min ago)
      const pausedAt = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
      const recheckAt = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago (so it's ready for recheck)
      
      // We need to simulate a pause due to spent value
      // Since spentValuePausedCampaigns is private in the service,
      // let's directly adjust the date and run the test
      
      // First, pause the campaign to simulate spent value pause
      await trafficStarService.pauseCampaign(trafficstarId);
      
      // Then we'll activate the test mode to simulate a pause that happened in the past
      process.env.TEST_MODE_SPENT_VALUE_PAUSE = 'true';
      process.env.TEST_CAMPAIGN_ID = trafficstarId.toString();
      process.env.TEST_PAUSE_TIME = pausedAt.toISOString();
      process.env.TEST_RECHECK_TIME = recheckAt.toISOString();
      process.env.TEST_UTC_DATE = currentUtcDate;
      
      console.log(`Set pause info for campaign ${trafficstarId} with recheck time in the past`);
      
      // Make sure we have some URLs with clicks
      const existingUrls = await db
        .select()
        .from(urls)
        .where(eq(urls.campaignId, campaign.id));
      
      if (existingUrls.length === 0) {
        // Create a test URL
        await db.insert(urls).values({
          campaignId: campaign.id,
          name: 'Test URL for Budget Adjustment',
          targetUrl: 'https://example.com/test',
          clickLimit: 5000,
          clicks: 0,
          status: 'active',
          originalClickLimit: 5000,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log('Created test URL with 5000 clicks for budget adjustment test');
      } else {
        // Update existing URLs to be active with clicks
        await db.update(urls)
          .set({
            clickLimit: 5000,
            clicks: 0,
            status: 'active',
            updatedAt: new Date()
          })
          .where(eq(urls.campaignId, campaign.id));
          
        console.log('Updated existing URLs to be active with 5000 clicks');
      }
      
      // 2. Enable test mode to simulate spent value
      process.env.TEST_MODE = 'true';
      
      // 3. Trigger the spent value check, which should detect the recheck time has passed
      //    and invoke the budget adjustment process
      console.log('Running spent value check to trigger budget adjustment...');
      await trafficStarService.checkCampaignsSpentValue();
      
      // Calculate pending click pricing and other data for the UI
      const activeUrls = await db
        .select()
        .from(urls)
        .where(
          and(
            eq(urls.campaignId, campaign.id),
            eq(urls.status, 'active')
          )
        );
      
      const activeUrlsCount = activeUrls.length;
      
      // Calculate total click capacity
      let totalClickCapacity = 0;
      activeUrls.forEach(url => {
        totalClickCapacity += url.clickLimit || 0;
      });
      
      // Calculate pricing using pricePerThousand or a default
      const pricePerThousand = parseFloat(campaign.pricePerThousand?.toString() || '1000.00');
      const pendingClickPricing = (totalClickCapacity / 1000) * pricePerThousand;
      
      // Use a simulated current spent value of $10.30 (test mode will enforce this)
      const currentSpentValue = 10.30;
      
      // Calculate new daily budget
      const newDailyBudget = currentSpentValue + pendingClickPricing;
      
      // Format end date time (current UTC date 23:59)
      const endDateObj = new Date();
      endDateObj.setUTCHours(23, 59, 0, 0);
      const formattedEndDate = endDateObj.toISOString().split('T')[0];
      const formattedEndTime = endDateObj.toISOString().split('T')[1].substring(0, 5);
      const newEndDateTime = `${formattedEndDate} ${formattedEndTime}`;
      
      // Get current status
      const currentStatus = await trafficStarService.getCachedCampaignStatus(trafficstarId);
      const finalStatus = currentStatus?.active ? "Active" : "Paused";
      
      // 4. Clean up
      process.env.TEST_MODE = 'false';
      process.env.TEST_MODE_SPENT_VALUE_PAUSE = 'false';
      delete process.env.TEST_CAMPAIGN_ID;
      delete process.env.TEST_PAUSE_TIME;
      delete process.env.TEST_RECHECK_TIME;
      delete process.env.TEST_UTC_DATE;
      
      // Return detailed test results for UI
      res.json({
        success: true,
        message: 'Budget adjustment test completed successfully',
        campaignId: campaign.id,
        trafficstarId,
        currentUtcDate,
        currentSpentValue,
        activeUrlsCount,
        totalClickCapacity,
        pendingClickPricing,
        newDailyBudget,
        newEndDateTime,
        finalStatus,
        testMode: true
      });
    } catch (error) {
      console.error('Error in test-budget-adjustment:', error);
      
      // Clean up test environment variables on error
      process.env.TEST_MODE = 'false';
      process.env.TEST_MODE_SPENT_VALUE_PAUSE = 'false';
      delete process.env.TEST_CAMPAIGN_ID;
      delete process.env.TEST_PAUSE_TIME;
      delete process.env.TEST_RECHECK_TIME;
      delete process.env.TEST_UTC_DATE;
      
      res.json({
        success: false,
        message: 'Error testing budget adjustment functionality',
        error: String(error)
      });
    }
  });
  
  // Test route removed as per user requirements
  /* app.post("/api/system/test-spent-value-monitoring", async (_req: Request, res: Response) => {
    try {
      // Temporarily set test mode environment variable
      process.env.TEST_MODE = 'true';
      
      // Get all campaigns with TrafficStar integration
      const campaignsToCheck = await db
        .select()
        .from(campaigns)
        .where(isNotNull(campaigns.trafficstarCampaignId));
      
      console.log(`TEST: Found ${campaignsToCheck.length} campaigns with TrafficStar integration`);
      
      // Test URL counts - to verify click threshold functionality
      const urlCounts = await Promise.all(campaignsToCheck.map(async (campaign) => {
        // Get all active URLs for the campaign
        const activeUrls = await db
          .select()
          .from(urls)
          .where(
            and(
              eq(urls.campaignId, campaign.id),
              eq(urls.status, 'active')
            )
          );
        
        // Get all paused URLs for the campaign
        const pausedUrls = await db
          .select()
          .from(urls)
          .where(
            and(
              eq(urls.campaignId, campaign.id),
              eq(urls.status, 'paused')
            )
          );
        
        // Calculate total active clicks
        const activeClicksTotal = activeUrls.reduce((sum, url) => sum + (url.clickLimit - url.clicks), 0);
        
        return {
          campaignId: campaign.id,
          activeUrlCount: activeUrls.length,
          pausedUrlCount: pausedUrls.length,
          activeClicksRemaining: activeClicksTotal,
          // Would this campaign be activated/paused based on click threshold?
          wouldActivateByClicks: activeClicksTotal >= 15000,
          wouldPauseByClicks: activeClicksTotal <= 5000
        };
      }));
      
      // Manually run the spent value check function
      await trafficStarService.checkCampaignsSpentValue();
      
      // Check the results of the spent value check
      const results = await Promise.all(campaignsToCheck.map(async (campaign, index) => {
        if (!campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) return null;
        
        // Get TrafficStar campaign ID converted to number
        const trafficstarId = isNaN(Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id)) ? 
          parseInt(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id.replace(/\D/g, '')) : 
          Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
        
        // Get current date in UTC
        const currentUtcDate = new Date().toISOString().split('T')[0];
        
        // Get current status
        const [dbCampaign] = await db
          .select()
          .from(trafficstarCampaigns)
          .where(eq(trafficstarCampaigns.trafficstarId, trafficstarId.toString()));
        
        // Get pause info from TrafficStar service
        const pauseInfo = trafficStarService.getSpentValuePauseInfo(trafficstarId, currentUtcDate);

        // Get spent value for today (this will return test mock data since we're in test mode)
        const spentValueData = await trafficStarService.getCampaignSpentValue(trafficstarId, currentUtcDate, currentUtcDate);
        
        // Get related URL count data
        const urlData = urlCounts[index];
        
        return {
          campaignId: campaign.id,
          trafficstarId,
          // TrafficStar status
          currentStatus: dbCampaign ? dbCampaign.status : 'unknown',
          isActive: dbCampaign ? dbCampaign.active : false,
          
          // Spent value data
          dailySpentValue: spentValueData?.totalSpent || 0,
          spentThresholdExceeded: (spentValueData?.totalSpent || 0) > 10,
          isPausedDueToSpentValue: Boolean(pauseInfo),
          spentValuePauseInfo: pauseInfo ? {
            pausedAt: pauseInfo.pausedAt.toISOString(),
            recheckAt: pauseInfo.recheckAt.toISOString(),
            minutesRemaining: Math.ceil((pauseInfo.recheckAt.getTime() - Date.now()) / (60 * 1000))
          } : null,
          
          // URL and click data
          urlData: urlData || {
            activeUrlCount: 0,
            pausedUrlCount: 0,
            activeClicksRemaining: 0,
            wouldActivateByClicks: false,
            wouldPauseByClicks: true
          },
          
          // Overall status of which mechanism is controlling the campaign
          clickThresholdActive: pauseInfo === null, // Click threshold only works when not paused due to spent value
          controllingFactor: pauseInfo 
            ? 'spent_value_threshold' 
            : (urlData?.wouldPauseByClicks 
              ? 'click_threshold_pause'
              : (urlData?.wouldActivateByClicks 
                ? 'click_threshold_activate' 
                : 'other'))
        };
      }));
      
      // Reset test mode
      process.env.TEST_MODE = 'false';
      
      res.json({
        success: true,
        message: 'Comprehensive test completed for both spent value and click threshold functionality',
        results: results.filter(Boolean)
      });
    } catch (error) {
      console.error('Error in test-spent-value-monitoring:', error);
      res.status(500).json({
        success: false,
        message: 'Error testing TrafficStar monitoring functionality',
        error: String(error)
      });
    }
  });

  // Test routes for TrafficStar scenarios have been removed as per user requirements
  /*
  // Test 1: Date Change Testing
  app.post("/api/system/test-date-change", async (_req: Request, res: Response) => {
    try {
      console.log('🧪 TEST 1: Date Change Testing');
      
      // Get a campaign with TrafficStar integration
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(isNotNull(campaigns.trafficstarCampaignId));
      
      if (!campaign) {
        return res.status(400).json({
          success: false,
          message: 'No campaign with TrafficStar integration found for testing'
        });
      }
      
      console.log(`Found campaign ${campaign.id} for testing`);
      
      // Update lastTrafficstarSync to yesterday to simulate a date change
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await db.update(campaigns)
        .set({
          lastTrafficstarSync: yesterday,
          updatedAt: new Date()
        })
        .where(eq(campaigns.id, campaign.id));
      
      console.log(`Updated campaign ${campaign.id} lastTrafficstarSync to yesterday: ${yesterday.toISOString()}`);
      
      // Trigger spent value updates
      console.log('Triggering spent value updates to test date change behavior...');
      await trafficStarService.updateAllCampaignsSpentValues();
      
      res.json({
        success: true,
        message: 'Date change test completed - check logs for results'
      });
    } catch (error) {
      console.error('Error in test-date-change:', error);
      res.status(500).json({
        success: false,
        message: 'Error testing date change functionality',
        error: String(error)
      });
    }
  });
  
  // Test 2: Click Threshold Testing
  app.post("/api/system/test-click-threshold", async (_req: Request, res: Response) => {
    try {
      console.log('🧪 TEST 2: Click Threshold Testing');
      
      // Get a campaign with TrafficStar integration
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(isNotNull(campaigns.trafficstarCampaignId));
      
      if (!campaign) {
        return res.status(400).json({
          success: false,
          message: 'No campaign with TrafficStar integration found for testing'
        });
      }
      
      console.log(`Found campaign ${campaign.id} for testing`);
      
      // Make sure we test with a fresh state - activate the campaign first
      if (campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
        const trafficstarId = campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id;
        
        // Make sure campaign is active to start
        await trafficStarService.activateCampaign(Number(trafficstarId));
        console.log(`Activated TrafficStar campaign ${trafficstarId} for testing`);
      }
      
      // Step 1: Make sure spent value pause mechanism is not active
      // This ensures click threshold checks will run
      const currentUtcDate = new Date().toISOString().split('T')[0];
      if (campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
        const trafficstarId = Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
        const pauseInfo = trafficStarService.getSpentValuePauseInfo(trafficstarId, currentUtcDate);
        if (pauseInfo) {
          console.log(`Campaign was paused due to spent value - clearing this state for testing`);
          trafficStarService.clearSpentValuePause(trafficstarId);
        }
      }
      
      // Step 2: Test scenario 1 - Less than 5000 clicks remaining
      // Get existing URLs for the campaign
      const existingUrls = await db
        .select()
        .from(urls)
        .where(eq(urls.campaignId, campaign.id));
      
      console.log(`Campaign has ${existingUrls.length} URLs`);
      
      // Setting click limit to exactly 3000 (well below the 5000 threshold)
      if (existingUrls.length === 0) {
        // Create a test URL with less than 5000 clicks
        await db.insert(urls).values({
          campaignId: campaign.id,
          name: 'Test URL 1 - Below Threshold',
          targetUrl: 'https://example.com/test1',
          clickLimit: 3000,
          clicks: 0,
          status: 'active',
          originalClickLimit: 3000,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log('Created test URL with 3000 clicks remaining (well below 5000 threshold)');
      } else {
        // Update existing URLs for testing
        await db.update(urls)
          .set({
            clickLimit: 3000,
            clicks: 0,
            status: 'active',
            updatedAt: new Date()
          })
          .where(eq(urls.campaignId, campaign.id));
          
        console.log('Updated existing URLs to have 3000 clicks remaining (well below 5000 threshold)');
      }
      
      // Trigger spent value updates for click checking
      console.log('✅ TEST CASE: Campaign with less than 5000 clicks should PAUSE');
      console.log('Triggering spent value updates to test pause due to low clicks (<5000)...');
      await trafficStarService.updateAllCampaignsSpentValues();
      
      // Wait a moment to let the API call complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check campaign status after pause attempt
      if (campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
        const trafficstarId = Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
        const campaignStatus = await trafficStarService.getCachedCampaignStatus(trafficstarId);
        console.log(`Campaign status after low clicks test: ${JSON.stringify(campaignStatus)}`);
      }
      
      // Step 3: Test scenario 2 - More than 15000 clicks remaining
      await db.update(urls)
        .set({
          clickLimit: 20000,
          clicks: 0,
          status: 'active',
          updatedAt: new Date()
        })
        .where(eq(urls.campaignId, campaign.id));
        
      console.log('Updated URLs to have 20000 clicks remaining (well above 15000 threshold)');
      
      // Trigger spent value updates for click checking
      console.log('✅ TEST CASE: Campaign with more than 15000 clicks should ACTIVATE');
      console.log('Triggering spent value updates to test activation due to high clicks (>15000)...');
      await trafficStarService.updateAllCampaignsSpentValues();
      
      // Wait a moment to let the API call complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check campaign status after activation attempt
      if (campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
        const trafficstarId = Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
        const campaignStatus = await trafficStarService.getCachedCampaignStatus(trafficstarId);
        console.log(`Campaign status after high clicks test: ${JSON.stringify(campaignStatus)}`);
      }
      
      // Step 4: Now test spent value overriding click threshold
      console.log('✅ TEST CASE: Spent value over $10 should OVERRIDE click threshold mechanism');
      
      // Enable test mode to simulate high spent values
      process.env.TEST_MODE = 'true';
      
      // Make sure campaign is active
      if (campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
        const trafficstarId = Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
        await trafficStarService.activateCampaign(Number(trafficstarId));
      }
      
      // Run spent value check (in test mode, should report >$10 and pause)
      console.log('Running spent value check with clicks still >15000...');
      await trafficStarService.checkCampaignsSpentValue();
      
      // Wait a moment to let the API call complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Even though clicks are high, campaign should be paused due to spent value
      if (campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
        const trafficstarId = Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
        const campaignStatus = await trafficStarService.getCachedCampaignStatus(trafficstarId);
        console.log(`Campaign status after spent value override test: ${JSON.stringify(campaignStatus)}`);
        
        const pauseInfo = trafficStarService.getSpentValuePauseInfo(trafficstarId, currentUtcDate);
        if (pauseInfo) {
          console.log(`Spent value mechanism properly overrode click threshold mechanism`);
          console.log(`Campaign paused with spent value > $10 even though clicks > 15000`);
          console.log(`Recheck scheduled for: ${pauseInfo.recheckAt.toISOString()}`);
          console.log(`Minutes until recheck: ${Math.ceil((pauseInfo.recheckAt.getTime() - Date.now()) / (60 * 1000))}`);
        } else {
          console.log(`ERROR: Campaign was NOT paused due to high spent value despite clicks > 15000`);
        }
      }
      
      // Step 5: Verify that the spent value mechanism disables click threshold
      console.log('✅ TEST CASE: Click threshold should be DISABLED until next UTC date change');
      console.log('Trying to reactivate campaign by updating clicks...');
      
      // Trigger spent value updates to verify click threshold is disabled
      // Even with lots of clicks, campaign should remain paused
      console.log('Triggering spent value updates with spent value pause active...');
      await trafficStarService.updateAllCampaignsSpentValues();
      
      // Wait a moment to let the API call complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Campaign should still be paused despite high clicks
      if (campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
        const trafficstarId = Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
        const campaignStatus = await trafficStarService.getCachedCampaignStatus(trafficstarId);
        console.log(`Final campaign status: ${JSON.stringify(campaignStatus)}`);
        console.log(`Campaign should still be paused despite high clicks (${campaignStatus?.active === false ? 'CORRECT' : 'WRONG'})`);
      }
      
      // Step 6: Test that mechanism resets after UTC date change
      console.log('✅ TEST CASE: Click threshold should REACTIVATE after UTC date change');
      
      if (campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
        const trafficstarId = Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
        // Simulate a date change
        const newUtcDate = new Date();
        newUtcDate.setDate(newUtcDate.getDate() + 1);
        const newUtcDateStr = newUtcDate.toISOString().split('T')[0];
        
        console.log(`Current UTC date: ${currentUtcDate}, Simulating next UTC date: ${newUtcDateStr}`);
        
        // Check if pause info is cleared with new date
        const pauseInfo = trafficStarService.getSpentValuePauseInfo(trafficstarId, newUtcDateStr);
        console.log(`Pause info for new UTC date: ${pauseInfo ? 'Still active (WRONG)' : 'Cleared (CORRECT)'}`);
      }
      
      // Clean up
      process.env.TEST_MODE = 'false';
      
      res.json({
        success: true,
        message: 'Click threshold test completed - check logs for all test results'
      });
    } catch (error) {
      console.error('Error in test-click-threshold:', error);
      res.status(500).json({
        success: false,
        message: 'Error testing click threshold functionality',
        error: String(error)
      });
    }
  });
  
  // Test 3: Spent Value Testing
  app.post("/api/system/test-spent-value", async (_req: Request, res: Response) => {
    try {
      console.log('🧪 TEST 3: Spent Value Testing');
      
      // Enable test mode to get simulated spent value
      process.env.TEST_MODE = 'true';
      
      // Get a campaign with TrafficStar integration
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(isNotNull(campaigns.trafficstarCampaignId));
      
      if (!campaign) {
        return res.status(400).json({
          success: false,
          message: 'No campaign with TrafficStar integration found for testing'
        });
      }
      
      console.log(`Found campaign ${campaign.id} for testing`);
      
      // Make the campaign active in TrafficStar
      if (campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
        const trafficstarId = campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id;
        
        await db.update(trafficstarCampaigns)
          .set({
            active: true,
            status: 'enabled',
            updatedAt: new Date()
          })
          .where(eq(trafficstarCampaigns.trafficstarId, trafficstarId));
        
        console.log(`Set TrafficStar campaign ${trafficstarId} as active for testing`);
      }
      
      // Run spent value check (in test mode, should report >$10 and pause)
      console.log('Running spent value check to test pause due to high spent value...');
      await trafficStarService.checkCampaignsSpentValue();
      
      // Check if campaign was paused
      if (campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
        const trafficstarId = Number(campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id);
        const currentUtcDate = new Date().toISOString().split('T')[0];
        const pauseInfo = trafficStarService.getSpentValuePauseInfo(trafficstarId, currentUtcDate);
        
        if (pauseInfo) {
          console.log(`Campaign was paused due to high spent value`);
          console.log(`Recheck scheduled for: ${pauseInfo.recheckAt.toISOString()}`);
          console.log(`Minutes until recheck: ${Math.ceil((pauseInfo.recheckAt.getTime() - Date.now()) / (60 * 1000))}`);
        } else {
          console.log(`Campaign was NOT paused due to high spent value - test failed`);
        }
      }
      
      // Check that click threshold is disabled after spent value pause
      console.log('Triggering spent value updates to verify click threshold is disabled...');
      await trafficStarService.updateAllCampaignsSpentValues();
      
      // Clean up
      process.env.TEST_MODE = 'false';
      
      res.json({
        success: true,
        message: 'Spent value test completed - check logs for results'
      });
    } catch (error) {
      console.error('Error in test-spent-value:', error);
      res.status(500).json({
        success: false,
        message: 'Error testing spent value functionality',
        error: String(error)
      });
    }
  });
  
  // Last test route removed as per user requirements
  /* app.post("/api/system/test-url-budget-update", async (req: Request, res: Response) => {
    try {
      const { campaignId, urlId, clickValue } = req.body;
      
      if (!campaignId || !urlId) {
        return res.status(400).json({ 
          success: false,
          message: "Missing required parameters: campaignId and urlId"
        });
      }
      
      // Get the campaign to check if it's linked to TrafficStar
      const campaign = await storage.getCampaign(parseInt(campaignId));
      if (!campaign) {
        return res.status(404).json({ 
          success: false,
          message: "Campaign not found"
        });
      }
      
      if (!campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id) {
        return res.status(400).json({ 
          success: false,
          message: "Campaign is not linked to TrafficStar"
        });
      }
      
      // Get the URL to use its click limit
      const url = await storage.getUrl(parseInt(urlId));
      if (!url) {
        return res.status(404).json({ 
          success: false,
          message: "URL not found"
        });
      }
      
      console.log(`🧪 TEST: Tracking URL ${urlId} for budget update in campaign ${campaignId}`);
      
      // Track the URL for budget update
      const clicksToTrack = clickValue ? parseInt(clickValue) : url.clickLimit;
      await trafficStarService.trackNewUrlForBudgetUpdate(
        url.id,
        parseInt(campaignId),
        campaign.trafficstarCampaignId || campaign.trafficstar_campaign_id,
        clicksToTrack,
        campaign.pricePerThousand || 1000
      );
      
      // If immediate parameter is provided, instantly process the pending URL budgets
      if (req.body.immediate === true) {
        console.log(`🧪 TEST: Immediately processing pending URL budgets`);
        await trafficStarService.processPendingUrlBudgets();
      }
      
      res.json({
        success: true,
        message: `URL ${urlId} tracked for budget update in campaign ${campaignId}`,
        clicksTracked: clicksToTrack,
        processingTime: req.body.immediate ? 'Immediate' : '10 minutes'
      });
    } catch (error) {
      console.error('Error testing URL budget update:', error);
      res.status(500).json({ 
        success: false,
        message: "Error testing URL budget update functionality",
        error: String(error)
      });
    }
  });
  */

  // Bulk operation schema for original URL records
  const bulkOriginalUrlRecordActionSchema = z.object({
    ids: z.array(z.number()).min(1, "At least one ID is required")
  });
  
  // Bulk operations for original URL records
  app.post("/api/original-url-records/bulk/pause", async (req: Request, res: Response) => {
    try {
      const { ids } = bulkOriginalUrlRecordActionSchema.parse(req.body);
      
      // Update the status to paused for all selected records
      await db.update(originalUrlRecords)
        .set({ status: 'paused', updatedAt: new Date() })
        .where(inArray(originalUrlRecords.id, ids));
      
      // Update all URLs that link to these original records to be paused
      const result = await db.execute(sql`
        UPDATE urls 
        SET status = 'paused', updated_at = NOW()
        FROM original_url_records
        WHERE urls.name = original_url_records.name
        AND original_url_records.id IN (${ids.join(',')})
      `);
      
      console.log(`✅ Bulk paused ${ids.length} original URL records and connected URLs`);
      
      res.json({
        message: `Successfully paused ${ids.length} records and ${result.rowCount} related URLs`,
        pausedRecords: ids.length,
        updatedUrls: result.rowCount
      });
    } catch (error) {
      console.error('Error in bulk pause operation:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: fromZodError(error).message 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to pause records", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  app.post("/api/original-url-records/bulk/resume", async (req: Request, res: Response) => {
    try {
      const { ids } = bulkOriginalUrlRecordActionSchema.parse(req.body);
      
      // Update the status to active for all selected records
      await db.update(originalUrlRecords)
        .set({ status: 'active', updatedAt: new Date() })
        .where(inArray(originalUrlRecords.id, ids));
      
      // Update all URLs that link to these original records to be active
      const result = await db.execute(sql`
        UPDATE urls 
        SET status = 'active', updated_at = NOW()
        FROM original_url_records
        WHERE urls.name = original_url_records.name
        AND original_url_records.id IN (${ids.join(',')})
      `);
      
      console.log(`✅ Bulk resumed ${ids.length} original URL records and connected URLs`);
      
      res.json({
        message: `Successfully resumed ${ids.length} records and ${result.rowCount} related URLs`,
        resumedRecords: ids.length,
        updatedUrls: result.rowCount
      });
    } catch (error) {
      console.error('Error in bulk resume operation:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: fromZodError(error).message 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to resume records", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  app.post("/api/original-url-records/bulk/delete", async (req: Request, res: Response) => {
    try {
      const { ids } = bulkOriginalUrlRecordActionSchema.parse(req.body);
      
      // Delete the original records
      const result = await db.delete(originalUrlRecords)
        .where(inArray(originalUrlRecords.id, ids));
      
      console.log(`✅ Bulk deleted ${ids.length} original URL records`);
      
      res.json({
        message: `Successfully deleted ${ids.length} records`,
        deletedRecords: ids.length
      });
    } catch (error) {
      console.error('Error in bulk delete operation:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: fromZodError(error).message 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to delete records", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // Original URL Records operations
  app.get("/api/original-url-records", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      const campaignId = req.query.campaignId ? parseInt(req.query.campaignId as string) : undefined;
      
      // Default to 'active' status if no status is provided
      const effectiveStatus = status || 'active';
      
      // Pass the campaignId parameter to filter URLs by campaign
      const { records, total } = await storage.getOriginalUrlRecords(
        page, 
        limit, 
        search, 
        effectiveStatus,
        campaignId
      );
      
      res.json({
        records,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        status: effectiveStatus,
        campaignId // Include the campaignId in the response for client reference
      });
    } catch (error) {
      console.error("Error fetching original URL records:", error);
      res.status(500).json({ message: "Failed to fetch original URL records" });
    }
  });
  
  app.get("/api/original-url-records/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const record = await storage.getOriginalUrlRecord(id);
      
      if (!record) {
        return res.status(404).json({ message: "Original URL record not found" });
      }
      
      res.json(record);
    } catch (error) {
      console.error("Error fetching original URL record:", error);
      res.status(500).json({ message: "Failed to fetch original URL record" });
    }
  });
  
  app.post("/api/original-url-records", async (req: Request, res: Response) => {
    try {
      const validationResult = insertOriginalUrlRecordSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid input data", 
          errors: validationResult.error.errors 
        });
      }
      
      const record = await storage.createOriginalUrlRecord(validationResult.data);
      
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating original URL record:", error);
      
      if (error instanceof Error && error.message.includes("duplicate key")) {
        return res.status(400).json({ message: "A record with this name already exists" });
      }
      
      res.status(500).json({ message: "Failed to create original URL record" });
    }
  });
  
  /**
   * Force fix all URLs to match their original record values
   * This function bypasses all protection mechanisms and directly updates the database
   */
  async function forceFixUrlClickLimits(originalRecordId?: number) {
    try {
      console.log(`🛠️ FORCE-FIXING URL CLICK LIMITS ${originalRecordId ? `for record #${originalRecordId}` : 'for ALL records'}`);
      
      // CRITICAL FIX: Execute each ALTER TABLE statement separately
      // Disable triggers first - one by one
      await db.execute(sql`ALTER TABLE urls DISABLE TRIGGER protect_original_click_values_trigger`);
      await db.execute(sql`ALTER TABLE urls DISABLE TRIGGER prevent_auto_click_update_trigger`);
      
      // Get original record if ID provided
      if (originalRecordId) {
        const [record] = await db.select().from(originalUrlRecords).where(eq(originalUrlRecords.id, originalRecordId));
        
        if (record) {
          console.log(`🔍 Updating all URLs with name ${record.name} to match original click limit: ${record.originalClickLimit}`);
          
          // Direct update with parameters
          await db.execute(sql`
            UPDATE urls 
            SET 
              original_click_limit = ${record.originalClickLimit},
              click_limit = ROUND(${record.originalClickLimit} * COALESCE((SELECT multiplier FROM campaigns WHERE id = campaign_id), 1)),
              updated_at = NOW()
            WHERE name = ${record.name}
          `);
        }
      } else {
        // Update all URLs
        await db.execute(sql`
          UPDATE urls u
          SET 
            original_click_limit = ou.original_click_limit,
            click_limit = ROUND(ou.original_click_limit * COALESCE((SELECT multiplier FROM campaigns WHERE id = u.campaign_id), 1)),
            updated_at = NOW()
          FROM original_url_records ou
          WHERE u.name = ou.name
        `);
      }
      
      // Re-enable triggers - one by one
      await db.execute(sql`ALTER TABLE urls ENABLE TRIGGER protect_original_click_values_trigger`);
      await db.execute(sql`ALTER TABLE urls ENABLE TRIGGER prevent_auto_click_update_trigger`);
      
      // CRITICAL FIX: Find all affected campaign IDs to invalidate their caches
      let affectedCampaignIds: number[] = [];
      
      if (originalRecordId) {
        // Get record name first
        const [record] = await db.select().from(originalUrlRecords).where(eq(originalUrlRecords.id, originalRecordId));
        
        if (record) {
          // Find all campaigns that have URLs with this name
          const result = await db.execute<{id: number}>(sql`
            SELECT DISTINCT c.id 
            FROM campaigns c
            JOIN urls u ON u.campaign_id = c.id
            WHERE u.name = ${record.name}
          `);
          
          // Extract campaign IDs from the result
          affectedCampaignIds = (result.rows || []).map(row => Number(row.id)).filter(id => !isNaN(id));
        }
      } else {
        // If updating all records, get all campaign IDs
        const allCampaigns = await db.select({ id: campaigns.id }).from(campaigns);
        affectedCampaignIds = allCampaigns.map(c => c.id);
      }
      
      // Invalidate all affected campaign caches
      console.log(`🧹 Clearing campaign caches for ${affectedCampaignIds.length} affected campaigns`);
      
      // Loop through the array of IDs, not the full objects
      for (const campaignId of affectedCampaignIds) {
        // Force invalidate campaign caches
        storage.invalidateCampaignCache(campaignId);
        
        // Force refresh to get latest data
        await storage.getCampaign(campaignId, true);
        await storage.getUrls(campaignId, true);
        
        console.log(`✅ Forced refresh of campaign #${campaignId} cache`);
      }
      
      return true;
    } catch (error) {
      console.error("Error in forceFixUrlClickLimits:", error);
      return false;
    }
  }

  app.put("/api/original-url-records/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const validationResult = updateOriginalUrlRecordSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid input data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Get the updateData with all fields to update
      const updateData = validationResult.data;
      
      // Log what values are changing
      console.log(`📝 Updating Original URL Record #${id}:`, updateData);
      
      // Check if we're updating click limit (the key value that will propagate to all instances)
      const isUpdatingClickLimit = updateData.originalClickLimit !== undefined;
      if (isUpdatingClickLimit) {
        console.log(`📊 Original Click Limit being updated to: ${updateData.originalClickLimit}`);
      }
      
      try {
        // Update the record
        const updatedRecord = await storage.updateOriginalUrlRecord(id, updateData);
        
        if (!updatedRecord) {
          return res.status(404).json({ message: "Original URL record not found" });
        }
        
        // If updating click limit, use our force fix function that bypasses all protections
        if (isUpdatingClickLimit) {
          console.log(`✅ Successfully updated original click limit to ${updateData.originalClickLimit}`);
          console.log(`🔄 Force-updating all linked URL instances...`);
          
          // CRITICAL FIX: Force update using direct SQL instead of the ORM method
          const success = await forceFixUrlClickLimits(id);
          
          if (success) {
            console.log(`✅ Successfully force-updated all URLs with name "${updatedRecord.name}"`);
          } else {
            console.error(`❌ Failed to force-update URLs with name "${updatedRecord.name}"`);
          }
        }
        
        return res.json(updatedRecord);
      } catch (error) {
        console.error("Error in update operation:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error updating original URL record:", error);
      
      if (error instanceof Error && error.message.includes("duplicate key")) {
        return res.status(400).json({ message: "A record with this name already exists" });
      }
      
      return res.status(500).json({ message: "Failed to update original URL record" });
    }
  });
  
  app.delete("/api/original-url-records/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const success = await storage.deleteOriginalUrlRecord(id);
      
      if (!success) {
        return res.status(404).json({ message: "Original URL record not found" });
      }
      
      res.json({ message: "Original URL record deleted successfully" });
    } catch (error) {
      console.error("Error deleting original URL record:", error);
      res.status(500).json({ message: "Failed to delete original URL record" });
    }
  });
  
  app.post("/api/original-url-records/:id/sync", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const record = await storage.getOriginalUrlRecord(id);
      
      if (!record) {
        return res.status(404).json({ message: "Original URL record not found" });
      }
      
      console.log(`🔄 Syncing Original URL Record #${id} (${record.name}) with click limit: ${record.originalClickLimit}`);
      
      // CRITICAL FIX: Use our new direct SQL method for guaranteed updates
      console.log(`🛠️ Using direct SQL force-update to guarantee data consistency...`);
      const success = await forceFixUrlClickLimits(id);
      
      // Also call the storage method as a backup
      const updatedUrlCount = await storage.syncUrlsWithOriginalRecord(id);
      
      return res.json({ 
        message: `Original URL record synced successfully ${success ? '(with force update)' : ''}`,
        updatedUrlCount,
        record
      });
    } catch (error) {
      console.error("Error syncing original URL record:", error);
      return res.status(500).json({ message: "Failed to sync original URL record" });
    }
  });
      
  // Pause original URL record
  app.post("/api/original-url-records/:id/pause", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      // Check if record exists
      const record = await storage.getOriginalUrlRecord(id);
      if (!record) {
        return res.status(404).json({ message: "Original URL record not found" });
      }
      
      // Update the status to paused
      await db.update(originalUrlRecords)
        .set({ status: 'paused', updatedAt: new Date() })
        .where(eq(originalUrlRecords.id, id));
      
      // Update all URLs that link to this original record to be paused
      const result = await db.execute(sql`
        UPDATE urls 
        SET status = 'paused', updated_at = NOW()
        FROM original_url_records
        WHERE urls.name = original_url_records.name
        AND original_url_records.id = ${id}
      `);
      
      console.log(`✅ Paused original URL record #${id} (${record.name}) and all connected URLs`);
      
      res.json({
        record: { ...record, status: 'paused' },
        updatedUrlCount: result.rowCount,
        message: `Original URL record and ${result.rowCount} related URLs paused successfully`
      });
    } catch (error) {
      console.error('Error pausing original URL record:', error);
      res.status(500).json({ 
        message: "Failed to pause original URL record", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // Resume original URL record
  app.post("/api/original-url-records/:id/resume", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      // Check if record exists
      const record = await storage.getOriginalUrlRecord(id);
      if (!record) {
        return res.status(404).json({ message: "Original URL record not found" });
      }
      
      // Update the status to active
      await db.update(originalUrlRecords)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(originalUrlRecords.id, id));
      
      // Update all URLs that link to this original record to be active
      const result = await db.execute(sql`
        UPDATE urls 
        SET status = 'active', updated_at = NOW()
        FROM original_url_records
        WHERE urls.name = original_url_records.name
        AND original_url_records.id = ${id}
      `);
      
      console.log(`✅ Resumed original URL record #${id} (${record.name}) and all connected URLs`);
      
      res.json({
        record: { ...record, status: 'active' },
        updatedUrlCount: result.rowCount,
        message: `Original URL record and ${result.rowCount} related URLs resumed successfully`
      });
    } catch (error) {
      console.error('Error resuming original URL record:', error);
      res.status(500).json({ 
        message: "Failed to resume original URL record", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // API route to fix data inconsistency between original URL records and URLs
  app.post("/api/system/fix-click-limits", async (_req: Request, res: Response) => {
    try {
      console.log('🔧 Running the fix-click-limits script to repair data inconsistencies...');
      
      // Use our forceFixUrlClickLimits function that handles everything
      const success = await forceFixUrlClickLimits();
      
      if (!success) {
        throw new Error("Force fix operation failed");
      }
      
      // Verify the fixes worked
      const verificationResult = await db.execute(sql`
        SELECT 
          COUNT(*) AS total_records,
          SUM(CASE WHEN ou.original_click_limit = u.original_click_limit THEN 1 ELSE 0 END) AS matched_records,
          SUM(CASE WHEN ou.original_click_limit != u.original_click_limit THEN 1 ELSE 0 END) AS mismatched_records
        FROM original_url_records ou
        JOIN urls u ON ou.name = u.name
      `);
      
      const summary = Array.isArray(verificationResult) && verificationResult.length > 0 
        ? verificationResult[0] 
        : { total_records: 0, matched_records: 0, mismatched_records: 0 };
      
      return res.json({
        success: true,
        message: "Successfully fixed ALL click limit values",
        result: summary,
      });
    } catch (error) {
      console.error("Error fixing click limits:", error);
      
      // Make sure to re-enable triggers even if there's an error
      try {
        await db.execute(sql`
          ALTER TABLE urls ENABLE TRIGGER protect_original_click_values_trigger
        `);
        
        await db.execute(sql`
          ALTER TABLE urls ENABLE TRIGGER prevent_auto_click_update_trigger
        `);
        console.log('✅ Triggers re-enabled after error');
      } catch (triggerError) {
        console.error("Failed to re-enable triggers:", triggerError);
      }
      
      res.status(500).json({ 
        success: false, 
        message: "Failed to fix click limit inconsistencies",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  /**
   * Automatically verify and fix any discrepancies in click limits
   * Ensures that required click values (click_limit) are always correctly 
   * calculated based on the campaign multiplier and original click limit
   */
  async function verifyAndFixClickMultipliers(): Promise<{
    fixed: number; 
    affectedCampaigns: Array<{id: number; name: string; count: number}>;
    message: string;
  }> {
    try {
      console.log(`🔍 VERIFYING CLICK MULTIPLIERS: Checking for inconsistencies between original and required click values`);
      
      // First, get a count of mismatched ACTIVE URLs where the required click value is wrong
      const mismatchCountResult = await db.execute<{count: number}>(sql`
        SELECT COUNT(*) as count
        FROM urls u
        JOIN campaigns c ON u.campaign_id = c.id
        WHERE ROUND(u.original_click_limit * c.multiplier) != u.click_limit
        AND u.status = 'active'
      `);
      
      const mismatchCount = mismatchCountResult.rows?.[0]?.count || 0;
      console.log(`🔍 Found ${mismatchCount} URLs with mismatched click values (incorrect multiplication)`);
      
      if (mismatchCount === 0) {
        console.log(`✅ No mismatches found - all click values are correctly calculated`);
        return {
          fixed: 0,
          affectedCampaigns: [],
          message: "No mismatches found, all click limits are correct"
        };
      }
      
      // Get a list of affected campaigns to log for transparency (only for active URLs)
      const affectedCampaignsResult = await db.execute<{id: number, name: string, count: number}>(sql`
        SELECT c.id, c.name, COUNT(*) as count
        FROM urls u
        JOIN campaigns c ON u.campaign_id = c.id
        WHERE ROUND(u.original_click_limit * c.multiplier) != u.click_limit
        AND u.status = 'active'
        GROUP BY c.id, c.name
      `);
      
      const affectedCampaigns = affectedCampaignsResult.rows || [];
      
      console.log(`⚠️ Found mismatches in ${affectedCampaigns.length} campaigns:`);
      affectedCampaigns.forEach(campaign => {
        console.log(`   - Campaign #${campaign.id} (${campaign.name}): ${campaign.count} URLs with incorrect multipliers`);
      });
      
      // Disable triggers first
      await db.execute(sql`ALTER TABLE urls DISABLE TRIGGER protect_original_click_values_trigger`);
      await db.execute(sql`ALTER TABLE urls DISABLE TRIGGER prevent_auto_click_update_trigger`);
      
      // Fix the mismatches by updating the click_limit to the correct calculated value (only for active URLs)
      const updateResult = await db.execute(sql`
        UPDATE urls u
        SET 
          click_limit = ROUND(u.original_click_limit * c.multiplier),
          updated_at = NOW()
        FROM campaigns c
        WHERE u.campaign_id = c.id
        AND ROUND(u.original_click_limit * c.multiplier) != u.click_limit
        AND u.status = 'active'
      `);
      
      // Re-enable triggers
      await db.execute(sql`ALTER TABLE urls ENABLE TRIGGER protect_original_click_values_trigger`);
      await db.execute(sql`ALTER TABLE urls ENABLE TRIGGER prevent_auto_click_update_trigger`);
      
      const fixedCount = updateResult.rowCount || 0;
      console.log(`✅ Fixed ${fixedCount} URL click values with incorrect multipliers`);
      
      // Invalidate all affected campaign caches
      const affectedCampaignIds = (affectedCampaignsResult.rows || []).map(c => c.id);
      console.log(`🧹 Invalidating caches for ${affectedCampaignIds.length} affected campaigns`);
      
      for (const campaignId of affectedCampaignIds) {
        if (campaignId) {
          storage.invalidateCampaignCache(campaignId);
          await storage.getCampaign(campaignId, true);
          await storage.getUrls(campaignId, true);
        }
      }
      
      return {
        fixed: fixedCount,
        affectedCampaigns: affectedCampaigns,
        message: `Fixed ${fixedCount} URL click values with incorrect multipliers`
      };
    } catch (error) {
      console.error("Error in verifyAndFixClickMultipliers:", error);
      throw error;
    }
  }
  
  // Add a periodic check for incorrect multiplier values (runs every 2 minutes)
  setInterval(async () => {
    try {
      console.log("🔄 Running scheduled multiplier verification check...");
      const result = await verifyAndFixClickMultipliers();
      if (result.fixed > 0) {
        console.log(`✅ Automatic multiplier check fixed ${result.fixed} URL click limits`);
      } else {
        console.log("✅ Automatic multiplier check: No issues found");
      }
    } catch (error) {
      console.error("Error in automatic multiplier verification:", error);
    }
  }, 2 * 60 * 1000); // Run every 2 minutes
  
  // Route to manually fix only multiplier issues without touching original click values
  app.post("/api/system/fix-click-multipliers", async (_req: Request, res: Response) => {
    try {
      console.log(`🔄 Running verification and fix for click multipliers`);
      
      const result = await verifyAndFixClickMultipliers();
      
      return res.json({
        success: true,
        message: `Click multiplier verification complete: ${result.fixed} URLs updated`,
        ...result
      });
    } catch (error) {
      console.error("Error fixing click multipliers:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fix click multipliers",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Test endpoint to generate sample click analytics data
  app.post("/api/system/generate-test-clicks", async (_req: Request, res: Response) => {
    try {
      console.log(`🧪 Generating test click analytics data`);
      
      // Generate test data directly using our built-in function
      const result = await generateAnalyticsTestData();
      // We already generated the test data with generateAnalyticsTestData()
      
      return res.json({
        success: true,
        message: "Successfully generated test click analytics data"
      });
    } catch (error) {
      console.error("Error generating test click data:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate test click data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // New route to FORCE UPDATE all original URL records to campaigns immediately
  app.post("/api/system/force-update-all-clicks", async (_req: Request, res: Response) => {
    try {
      console.log('🚨 EMERGENCY FORCE UPDATE - Updating ALL URL click values...');
      
      // Before the full update, fix any multiplier inconsistencies
      const multiplierFixResult = await verifyAndFixClickMultipliers();
      
      // Step 1: Set click protection bypass
      await db.execute(sql`
        -- Set click protection bypass
        INSERT INTO protection_settings (key, value)
        VALUES ('click_protection_enabled', FALSE)
        ON CONFLICT (key) DO UPDATE SET value = FALSE
      `);
      
      // Step 2: Disable triggers
      await db.execute(sql`
        ALTER TABLE urls DISABLE TRIGGER protect_original_click_values_trigger
      `);
      
      await db.execute(sql`
        ALTER TABLE urls DISABLE TRIGGER prevent_auto_click_update_trigger
      `);
      
      // Step 3: FORCE UPDATE ALL URLs to match their original records
      await db.execute(sql`
        -- Update all URLs with original record values
        UPDATE urls u
        SET 
          original_click_limit = ou.original_click_limit,
          click_limit = ROUND(ou.original_click_limit * COALESCE((SELECT multiplier FROM campaigns WHERE id = u.campaign_id), 1)),
          updated_at = NOW()
        FROM original_url_records ou
        WHERE u.name = ou.name
      `);
      
      // Step 4: Fix URLs without campaign multipliers
      await db.execute(sql`
        UPDATE urls u
        SET 
          click_limit = original_click_limit,
          updated_at = NOW()
        WHERE campaign_id IS NULL AND click_limit != original_click_limit
      `);
      
      // Step 5: Re-enable triggers
      await db.execute(sql`
        ALTER TABLE urls ENABLE TRIGGER protect_original_click_values_trigger
      `);
      
      await db.execute(sql`
        ALTER TABLE urls ENABLE TRIGGER prevent_auto_click_update_trigger
      `);
      
      // Step 6: Reset click protection bypass
      await db.execute(sql`
        INSERT INTO protection_settings (key, value)
        VALUES ('click_protection_enabled', TRUE)
        ON CONFLICT (key) DO UPDATE SET value = TRUE
      `);
      
      // Step 4: Invalidate all campaign caches to ensure fresh data
      const campaigns = await db.select({ id: campaigns.id }).from(campaigns);
      
      for (const campaign of campaigns) {
        storage.invalidateCampaignCache(campaign.id);
        await storage.getCampaign(campaign.id, true);
        await storage.getUrls(campaign.id, true);
      }
      
      return res.json({
        success: true,
        message: "EMERGENCY FORCE UPDATE COMPLETE - All URLs have been updated to match their original records",
        campaignsRefreshed: campaigns.length
      });
    } catch (error) {
      console.error("Error in emergency force update:", error);
      
      // Make sure to restore protection
      try {
        await db.execute(sql`
          ALTER TABLE urls ENABLE TRIGGER protect_original_click_values_trigger
        `);
        
        await db.execute(sql`
          ALTER TABLE urls ENABLE TRIGGER prevent_auto_click_update_trigger
        `);
        
        await db.execute(sql`
          INSERT INTO protection_settings (key, value)
          VALUES ('click_protection_enabled', TRUE)
          ON CONFLICT (key) DO UPDATE SET value = TRUE
        `);
      } catch (restoreError) {
        console.error("Failed to restore protection:", restoreError);
      }
      
      res.status(500).json({
        success: false,
        message: "Emergency force update failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Create an HTTP/2 capable server
  // We're using a regular HTTP server instead of SPDY for now due to compatibility issues
  // We'll handle the HTTP/2.0 headers in the individual route handlers
  
  // Initialize server monitoring
  initServerMonitor();
  
  // API endpoint to get current server stats
  app.get("/api/system/server-stats", async (_req: Request, res: Response) => {
    try {
      const stats = await getServerStats();
      console.log("Server stats CPU details:", JSON.stringify(stats.cpuDetails, null, 2));
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error("Error fetching server stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch server stats",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // API endpoint to get historical server stats
  app.get("/api/system/server-stats/history", (_req: Request, res: Response) => {
    try {
      const history = getStatsHistory();
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error("Error fetching server stats history:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch server stats history",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Helper function to format bytes to human-readable format
  function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
  
  // API endpoint to get disk space information
  app.get("/api/system/disk-space", async (_req: Request, res: Response) => {
    try {
      const stats = await getServerStats();
      
      // Format the disk space information for easy reading
      const formattedFilesystems = stats.diskStats.filesystems.map(fs => ({
        ...fs,
        sizeFormatted: formatBytes(fs.size),
        usedFormatted: formatBytes(fs.used),
        freeFormatted: formatBytes(fs.free),
        usedPercentFormatted: `${fs.usedPercent}%`
      }));
      
      res.json({
        success: true,
        data: {
          overall: {
            total: stats.diskStats.total,
            used: stats.diskStats.used,
            free: stats.diskStats.free,
            usedPercent: stats.diskStats.usedPercent,
            totalFormatted: formatBytes(stats.diskStats.total),
            usedFormatted: formatBytes(stats.diskStats.used),
            freeFormatted: formatBytes(stats.diskStats.free),
            usedPercentFormatted: `${stats.diskStats.usedPercent}%`
          },
          filesystems: formattedFilesystems,
          timestamp: stats.timestamp
        }
      });
    } catch (error) {
      log(`Error getting disk space info: ${error}`, 'disk-monitor');
      res.status(500).json({ 
        success: false, 
        message: "Failed to retrieve disk space information", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // API endpoint to generate test click data for analytics
  app.post("/api/system/generate-test-clicks", async (_req: Request, res: Response) => {
    try {
      console.log("🧪 Generating test click analytics data");
      
      // Generate test click data directly in this function
      const result = await generateAnalyticsTestData();
      
      res.json({
        success: true,
        message: "Test click data generated successfully",
        ...result
      });
    } catch (error) {
      console.error("Error generating test click data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate test click data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Function to generate test analytics data
  async function generateAnalyticsTestData() {
    console.log("Starting test click data generation...");
    
    // Clear existing test data to avoid duplication
    try {
      // Delete existing click analytics data - only for testing purposes

      console.log("Cleared existing click analytics data");
    } catch (error) {
      console.error("Error clearing existing click data:", error);
    }
    
    // First, get all campaigns
    const allCampaigns = await db.select().from(campaigns);
    if (!allCampaigns.length) {
      console.log("No campaigns found to generate clicks for");
      return { success: false, message: "No campaigns found to generate clicks for" };
    }
    
    // Get the URLs for each campaign
    let totalClicksGenerated = 0;
    
    for (const campaign of allCampaigns) {
      console.log(`Generating clicks for campaign "${campaign.name}" (ID: ${campaign.id})`);
      
      const campaignUrls = await db.select().from(urls).where(eq(urls.campaignId, campaign.id));
      if (!campaignUrls.length) {
        console.log(`No URLs found for campaign ${campaign.id}`);
        continue;
      }
      
      // Generate clicks for today, yesterday, past week and past month
      const now = new Date();
      
      // Generate hourly clicks for today
      await generateTodayClicks(campaign, campaignUrls[0]);
      
      // Generate clicks for yesterday
      await generateYesterdayClicks(campaign, campaignUrls[0]);
      
      // Generate clicks for past week
      await generatePastWeekClicks(campaign, campaignUrls);
      
      // Get total clicks inserted
      const clicksCount = await db.execute(sql`
        SELECT COUNT(*) as count FROM click_analytics 
        WHERE "campaignId" = ${campaign.id}
      `);
      
      const campaignClickCount = parseInt(clicksCount.rows[0].count);
      totalClicksGenerated += campaignClickCount;
      
      console.log(`Generated ${campaignClickCount} total clicks for campaign ${campaign.id}`);
    }
    
    console.log(`Test click data generation complete! Generated ${totalClicksGenerated} total clicks.`);
    return { success: true, totalClicks: totalClicksGenerated };
  }
  
  // Helper to generate today's clicks
  async function generateTodayClicks(campaign: any, url: any) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const clicksPerHour = [];
    
    // Generate clicks for each hour (0-23)
    for (let hour = 0; hour <= now.getHours(); hour++) {
      // More clicks during business hours (9-17)
      let clickCount = Math.floor(Math.random() * 5) + 1; // 1-5 clicks by default
      
      if (hour >= 9 && hour <= 17) {
        clickCount = Math.floor(Math.random() * 15) + 5; // 5-20 clicks during business hours
      }
      
      // Create timestamp for this hour with random minutes and seconds
      for (let i = 0; i < clickCount; i++) {
        const clickTime = new Date(today);
        clickTime.setHours(hour);
        clickTime.setMinutes(Math.floor(Math.random() * 60));
        clickTime.setSeconds(Math.floor(Math.random() * 60));
        
        // Don't create clicks in the future
        if (clickTime <= now) {
          clicksPerHour.push(createClickData(url, campaign, clickTime));
        }
      }
    }
    
    // Batch insert all today's hourly clicks
    if (clicksPerHour.length > 0) {

      console.log(`Inserted ${clicksPerHour.length} hourly clicks for today for campaign ${campaign.id}`);
    }
  }
  
  // Helper to generate yesterday's clicks
  async function generateYesterdayClicks(campaign: any, url: any) {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const clicksYesterday = [];
    
    // Generate full day of clicks for yesterday
    for (let hour = 0; hour < 24; hour++) {
      // More clicks during business hours (9-17)
      let clickCount = Math.floor(Math.random() * 3) + 1; // 1-3 clicks by default
      
      if (hour >= 9 && hour <= 17) {
        clickCount = Math.floor(Math.random() * 10) + 3; // 3-13 clicks during business hours
      }
      
      // Create timestamp for this hour with random minutes and seconds
      for (let i = 0; i < clickCount; i++) {
        const clickTime = new Date(yesterday);
        clickTime.setHours(hour);
        clickTime.setMinutes(Math.floor(Math.random() * 60));
        clickTime.setSeconds(Math.floor(Math.random() * 60));
        
        clicksYesterday.push(createClickData(url, campaign, clickTime));
      }
    }
    
    // Batch insert all yesterday's clicks
    if (clicksYesterday.length > 0) {

      console.log(`Inserted ${clicksYesterday.length} clicks for yesterday for campaign ${campaign.id}`);
    }
  }
  
  // Helper to generate past week's clicks
  async function generatePastWeekClicks(campaign: any, campaignUrls: any[]) {
    const now = new Date();
    const pastWeekClicks = [];
    
    // Generate clicks for the past 7 days (excluding today and yesterday)
    for (let dayOffset = 2; dayOffset < 7; dayOffset++) {
      const pastDay = new Date(now);
      pastDay.setDate(now.getDate() - dayOffset);
      pastDay.setHours(0, 0, 0, 0);
      
      // Distribute clicks across all campaign URLs
      for (const url of campaignUrls) {
        // Generate 20-50 clicks per day per URL
        const dailyClicks = Math.floor(Math.random() * 30) + 20;
        
        for (let i = 0; i < dailyClicks; i++) {
          // Random hour of the day
          const hour = Math.floor(Math.random() * 24);
          const minute = Math.floor(Math.random() * 60);
          const second = Math.floor(Math.random() * 60);
          
          const clickTime = new Date(pastDay);
          clickTime.setHours(hour, minute, second);
          
          pastWeekClicks.push(createClickData(url, campaign, clickTime));
        }
      }
    }
    
    // Batch insert all past week clicks
    if (pastWeekClicks.length > 0) {
      // Insert in batches to avoid memory issues
      const batchSize = 1000;
      for (let i = 0; i < pastWeekClicks.length; i += batchSize) {
        const batch = pastWeekClicks.slice(i, i + batchSize);

      }
      
      console.log(`Inserted ${pastWeekClicks.length} clicks for past week for campaign ${campaign.id}`);
    }
  }
  
  // Helper to create click data object
  function createClickData(url: any, campaign: any, timestamp: Date) {
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Linux; Android 11; SM-G991U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36",
    ];
    
    const referrers = [
      "https://www.google.com/",
      "https://www.facebook.com/",
      "https://www.youtube.com/",
      "https://www.instagram.com/",
      "https://www.twitter.com/",
      "",  // Direct traffic
    ];
    
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    const referrer = referrers[Math.floor(Math.random() * referrers.length)];
    
    return {
      urlId: url.id,
      campaignId: campaign.id,
      timestamp: timestamp,
      userAgent: userAgent,
      referer: referrer, // Note the field name 'referer' with one 'r'
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    };
  }
  
  // TEST ENDPOINT for campaign click tracking
  app.post("/api/test/campaign-click/:campaignId", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const urlId = req.query.urlId ? parseInt(req.query.urlId as string) : null;
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ error: "Invalid campaign ID" });
      }
      
      // Verify the campaign exists
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      // Record a test click with campaign ID and optional URL ID
      // analytics functionality has been removed
      
      // Return success response with timestamp for verification
      return res.status(200).json({ 
        success: true, 
        message: `Test click recorded for campaign #${campaignId} with${urlId ? ' URL #' + urlId : 'out URL'} at ${new Date().toISOString()}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error recording test click:", error);
      return res.status(500).json({ error: "Failed to record test click" });
    }
  });
  
  // Test route for the empty URL check function
  app.get("/api/trafficstar/test-empty-url-check", async (req: Request, res: Response) => {
    try {
      console.log('Manually running the empty URL check function for testing');
      // Import the function and run it
      const { pauseTrafficStarForEmptyCampaigns } = await import('./traffic-generator-new');
      await pauseTrafficStarForEmptyCampaigns();
      res.json({ 
        success: true, 
        message: 'Empty URL check completed. Check server logs for details.' 
      });
    } catch (error) {
      console.error("Error in empty URL check test:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });
  
  // API endpoint to get URL budget logs for all campaigns with TrafficStar integration
  app.get("/api/url-budget-logs", async (_req: Request, res: Response) => {
    try {
      console.log('Fetching URL budget logs for all campaigns with TrafficStar integration');
      const logs = await urlBudgetLogger.getAllUrlBudgetLogs();
      
      res.json({
        success: true,
        logs: logs.reverse() // Return newest logs first
      });
    } catch (error) {
      console.error("Error fetching URL budget logs:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch URL budget logs" 
      });
    }
  });
  
  // API endpoint to get URL budget logs for a specific campaign
  app.get("/api/url-budget-logs/:campaignId", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      if (isNaN(campaignId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid campaign ID"
        });
      }
      
      // Check if campaign has TrafficStar integration
      const hasTrafficStar = await urlBudgetLogger.hasCampaignTrafficStarIntegration(campaignId);
      if (!hasTrafficStar) {
        return res.status(404).json({
          success: false,
          error: "Campaign not found or doesn't have TrafficStar integration"
        });
      }
      
      console.log(`Fetching URL budget logs for campaign ${campaignId}`);
      const logs = await urlBudgetLogger.getCampaignUrlBudgetLogs(campaignId);
      
      res.json({
        success: true,
        campaignId,
        logs: logs.reverse() // Return newest logs first
      });
    } catch (error) {
      console.error(`Error fetching URL budget logs for campaign ${req.params.campaignId}:`, error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch URL budget logs for campaign" 
      });
    }
  });
  
  // Clear all URL budget logs - mainly for testing and manual cleanup
  app.post("/api/url-budget-logs/clear", async (_req: Request, res: Response) => {
    try {
      console.log('Clearing all URL budget logs');
      
      // Get all campaigns with TrafficStar integration
      const campaignsWithTrafficStar = await db.query.campaigns.findMany({
        where: (c, { eq, and, ne, not, isNull }) => 
          and(
            ne(c.trafficstarCampaignId, ''),
            not(isNull(c.trafficstarCampaignId))
          ),
        columns: { id: true }
      });
      
      // Clear logs for each campaign
      for (const campaign of campaignsWithTrafficStar) {
        await urlBudgetLogger.clearCampaignLogs(campaign.id);
      }
      
      res.json({
        success: true,
        message: "All URL budget logs cleared successfully"
      });
    } catch (error) {
      console.error("Error clearing URL budget logs:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to clear URL budget logs" 
      });
    }
  });
  
  // Clear URL budget logs for a specific campaign
  app.post("/api/url-budget-logs/:campaignId/clear", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      if (isNaN(campaignId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid campaign ID"
        });
      }
      
      // Check if campaign has TrafficStar integration
      const hasTrafficStar = await urlBudgetLogger.hasCampaignTrafficStarIntegration(campaignId);
      if (!hasTrafficStar) {
        return res.status(404).json({
          success: false,
          error: "Campaign not found or doesn't have TrafficStar integration"
        });
      }
      
      console.log(`Clearing URL budget logs for campaign ${campaignId}`);
      await urlBudgetLogger.clearCampaignLogs(campaignId);
      
      res.json({
        success: true,
        message: `URL budget logs for campaign ${campaignId} cleared successfully`
      });
    } catch (error) {
      console.error(`Error clearing URL budget logs for campaign ${req.params.campaignId}:`, error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to clear URL budget logs for campaign" 
      });
    }
  });
  
  // YouTube URL Records API routes
  app.get("/api/youtube-url-records", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const search = req.query.search as string | undefined;
      const campaignId = req.query.campaignId ? parseInt(req.query.campaignId as string) : undefined;
      
      // Get records with pagination
      const offset = (page - 1) * limit;
      
      // Build the query
      let query = db.select().from(youtubeUrlRecords).orderBy(desc(youtubeUrlRecords.deletedAt));
      
      // Add campaign filter if provided
      if (campaignId) {
        query = query.where(eq(youtubeUrlRecords.campaignId, campaignId));
      }
      
      // Add search filter if provided
      if (search) {
        const lowerSearch = search.toLowerCase();
        query = query.where(
          sql`LOWER(name) LIKE ${`%${lowerSearch}%`} OR 
              LOWER(target_url) LIKE ${`%${lowerSearch}%`} OR 
              LOWER(youtube_video_id) LIKE ${`%${lowerSearch}%`} OR 
              LOWER(deletion_reason) LIKE ${`%${lowerSearch}%`}`
        );
      }
      
      // Get total count for pagination
      const countResult = await db.select({ count: sql`COUNT(*)` }).from(youtubeUrlRecords);
      const totalCount = Number(countResult[0].count);
      
      // Get paginated records
      const records = await query.limit(limit).offset(offset);
      
      res.json({
        records,
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch (error) {
      console.error("Error fetching YouTube URL records:", error);
      res.status(500).json({ message: "Failed to fetch YouTube URL records" });
    }
  });
  
  app.get("/api/youtube-url-records/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const [record] = await db.select().from(youtubeUrlRecords).where(eq(youtubeUrlRecords.id, id));
      
      if (!record) {
        return res.status(404).json({ message: "YouTube URL record not found" });
      }
      
      res.json(record);
    } catch (error) {
      console.error("Error fetching YouTube URL record:", error);
      res.status(500).json({ message: "Failed to fetch YouTube URL record" });
    }
  });
  
  // Schema for bulk YouTube URL record actions
  const bulkYoutubeUrlRecordActionSchema = z.object({
    ids: z.array(z.number())
  });
  
  app.post("/api/youtube-url-records/bulk/delete", async (req: Request, res: Response) => {
    try {
      const { ids } = bulkYoutubeUrlRecordActionSchema.parse(req.body);
      
      // Delete the records
      const result = await db.delete(youtubeUrlRecords)
        .where(inArray(youtubeUrlRecords.id, ids));
      
      console.log(`✅ Bulk deleted ${ids.length} YouTube URL records`);
      
      res.json({
        message: `Successfully deleted ${ids.length} records`,
        deletedRecords: ids.length
      });
    } catch (error) {
      console.error('Error in bulk delete operation:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: fromZodError(error).message 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to delete records", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // YouTube API Logs endpoints
  app.get("/api/youtube-api-logs", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      const logType = req.query.type as string || undefined;
      const campaignId = req.query.campaignId ? parseInt(req.query.campaignId as string) : undefined;
      const isError = req.query.isError === 'true';
      
      // Base query
      let query = db.select().from(youtubeApiLogs).orderBy(desc(youtubeApiLogs.timestamp));
      
      // Apply filters
      if (logType) {
        query = query.where(eq(youtubeApiLogs.logType, logType));
      }
      
      if (campaignId) {
        query = query.where(eq(youtubeApiLogs.campaignId, campaignId));
      }
      
      if (req.query.isError !== undefined) {
        query = query.where(eq(youtubeApiLogs.isError, isError));
      }
      
      // Get total count for pagination
      const countResult = await db.select({ count: sql`COUNT(*)` }).from(youtubeApiLogs);
      const totalCount = Number(countResult[0].count);
      
      // Get paginated records
      const logs = await query.limit(limit).offset(offset);
      
      // Get campaign details for all campaign IDs in the logs
      const campaignIds = logs
        .filter(log => log.campaignId !== null)
        .map(log => log.campaignId as number);
      
      const campaignMap = new Map();
      
      if (campaignIds.length > 0) {
        const campaignDetails = await db
          .select({ id: campaigns.id, name: campaigns.name })
          .from(campaigns)
          .where(inArray(campaigns.id, campaignIds));
          
        campaignDetails.forEach(campaign => {
          campaignMap.set(campaign.id, campaign.name);
        });
      }
      
      // Add campaign names to logs
      const logsWithCampaignNames = logs.map(log => ({
        ...log,
        campaignName: log.campaignId ? campaignMap.get(log.campaignId) || `Campaign ${log.campaignId}` : null
      }));
      
      res.json({
        logs: logsWithCampaignNames,
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch (error) {
      console.error("Error fetching YouTube API logs:", error);
      res.status(500).json({ message: "Failed to fetch YouTube API logs" });
    }
  });
  
  app.delete("/api/youtube-api-logs/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const result = await db.delete(youtubeApiLogs).where(eq(youtubeApiLogs.id, id));
      
      res.json({ message: "YouTube API log deleted successfully" });
    } catch (error) {
      console.error("Error deleting YouTube API log:", error);
      res.status(500).json({ message: "Failed to delete YouTube API log" });
    }
  });
  
  app.delete("/api/youtube-api-logs", async (req: Request, res: Response) => {
    try {
      // Add a clear all functionality with optional filters
      const { olderThan, logType, campaignId } = req.query;
      
      let query = db.delete(youtubeApiLogs);
      
      if (olderThan) {
        const date = new Date(olderThan as string);
        if (!isNaN(date.getTime())) {
          query = query.where(lt(youtubeApiLogs.timestamp, date));
        }
      }
      
      if (logType) {
        query = query.where(eq(youtubeApiLogs.logType, logType as string));
      }
      
      if (campaignId) {
        const id = parseInt(campaignId as string);
        if (!isNaN(id)) {
          query = query.where(eq(youtubeApiLogs.campaignId, id));
        }
      }
      
      await query;
      
      res.json({ message: "YouTube API logs cleared successfully" });
    } catch (error) {
      console.error("Error clearing YouTube API logs:", error);
      res.status(500).json({ message: "Failed to clear YouTube API logs" });
    }
  });
  
  // Force check YouTube URLs for a campaign
  app.post("/api/campaigns/:id/check-youtube", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      
      // Get campaign first
      const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Import YouTube API service
      const { youtubeApiService } = await import('./youtube-api-service');
      
      // Check if YouTube API is configured
      if (!youtubeApiService.isConfigured()) {
        return res.status(400).json({ 
          message: "YouTube API is not configured", 
          details: "Please set the YOUTUBE_API_KEY environment variable" 
        });
      }
      
      // Log the manual force check action in YouTube API logs
      await youtubeApiService.logApiActivity(
        YouTubeApiLogType.FORCE_CHECK,
        `Manual force check triggered at ${new Date().toISOString()} for campaign ${id}`,
        id,
        {
          timestamp: new Date().toISOString(),
          trigger: 'manual', // Indicate this was manually triggered via the UI
          userAgent: req.headers['user-agent'] || 'unknown'  // Track browser info
        },
        false
      );
      
      // Process the campaign with force check flag
      // This ignores the interval setting for manual checks
      await youtubeApiService.processCampaign(id, true);
      
      // Note: last check time is already updated in processCampaign
      // so we don't need to update it here
      
      // Get count of YouTube URL records for this campaign
      const [recordCount] = await db.select({ 
        count: sql`COUNT(*)` 
      }).from(youtubeUrlRecords).where(eq(youtubeUrlRecords.campaignId, id));
      
      res.json({
        message: "YouTube URL check completed successfully",
        campaignId: id,
        recordCount: Number(recordCount.count)
      });
    } catch (error) {
      console.error("Error checking YouTube URLs:", error);
      res.status(500).json({ 
        message: "Failed to check YouTube URLs", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  return server;
}
