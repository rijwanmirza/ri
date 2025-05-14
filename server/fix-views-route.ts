/**
 * This file contains a fixed version of the /views/:customPath route
 * with proper redirect method analytics tracking
 */

import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { urlClickLogsManager } from "./url-click-logs-manager";
import { redirectLogsManager } from "./redirect-logs-manager";
import { trackRedirectMethod } from "./fix-redirect-analytics";
import { db } from "./db";

export function registerFixedViewsRoute(app: Express) {
  // Unregister the original route by registering a new one with the same path
  // This will replace the original implementation with our fixed version
  console.log('🔄 Registered fixed views route handler for /views/:customPath');
  
  app.get("/views/:customPath", async (req: Request, res: Response) => {
    console.log(`🔎 Received request for /views/${req.params.customPath}`);
    try {
      const customPath = req.params.customPath;
      
      if (!customPath) {
        return res.status(400).json({ message: "Custom path is required" });
      }
      
      console.log(`Processing custom path: ${customPath}`);
      
      // Get the campaign by custom path
      let campaign = await storage.getCampaignByCustomPath(customPath);
      
      if (!campaign) {
        console.log(`Campaign not found with custom path: ${customPath}`);
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Try to get campaign data with SQL for testing
      try {
        // Query campaign directly to see exact column values
        const campaignData = await db.execute(`
          SELECT id, name, custom_path, custom_redirector_enabled, redirect_method, 
                 linkedin_redirection_enabled, facebook_redirection_enabled, 
                 whatsapp_redirection_enabled, google_meet_redirection_enabled,
                 google_search_redirection_enabled, google_play_redirection_enabled
          FROM campaigns WHERE id = ${campaign.id}
        `);
        console.log(`RAW Campaign Data:`, JSON.stringify(campaignData.rows[0]));
        
        // Enhance campaign object with any missing properties
        campaign = {
          ...campaign,
          // Map database column names to code property names
          customRedirectorEnabled: campaign.customRedirectorEnabled || campaignData.rows[0].custom_redirector_enabled === 't',
          useCustomRedirector: campaign.useCustomRedirector || campaignData.rows[0].custom_redirector_enabled === 't',
          // Handle redirect method settings
          useLinkedinRedirector: campaign.useLinkedinRedirector || campaignData.rows[0].linkedin_redirection_enabled === 't',
          useFacebookRedirector: campaign.useFacebookRedirector || campaignData.rows[0].facebook_redirection_enabled === 't',
          useWhatsappRedirector: campaign.useWhatsappRedirector || campaignData.rows[0].whatsapp_redirection_enabled === 't',
          useGoogleMeetRedirector: campaign.useGoogleMeetRedirector || campaignData.rows[0].google_meet_redirection_enabled === 't',
          useGoogleSearchRedirector: campaign.useGoogleSearchRedirector || campaignData.rows[0].google_search_redirection_enabled === 't',
          useGooglePlayRedirector: campaign.useGooglePlayRedirector || campaignData.rows[0].google_play_redirection_enabled === 't',
        };
      } catch (err) {
        console.error('Error getting raw campaign data:', err);
      }
      
      // Debugging campaign properties
      console.log(`Found campaign: ID=${campaign.id}, Name=${campaign.name}`);
      console.log(`Campaign custom redirector setting:`, 
        campaign.customRedirectorEnabled || campaign.useCustomRedirector || false);
      console.log(`Campaign redirect method: ${campaign.redirectMethod}`);
      
      // Get all URLs for this campaign that are active
      const urls = await storage.getUrls(campaign.id);
      console.log(`Retrieved ${urls.length} URLs for campaign ${campaign.id}`);
      
      // Use status === 'active' instead of isActive
      const activeUrls = urls.filter(url => url.status === 'active');
      console.log(`Found ${activeUrls.length} active URLs for campaign with custom path: ${customPath}`);
      
      if (activeUrls.length === 0) {
        console.log(`No active URLs found for campaign with custom path: ${customPath}`);
        return res.status(404).json({ message: "No active URLs found for this campaign" });
      }
      
      // Select a random URL from the active ones
      const randomUrl = activeUrls[Math.floor(Math.random() * activeUrls.length)];
      console.log(`Selected URL: ${randomUrl.id}, ${randomUrl.name}, ${randomUrl.targetUrl}`);
      console.log(`Selected URL ID ${randomUrl.id} (${randomUrl.name}) for redirect`);
      
      // Increment click count
      await storage.incrementUrlClicks(randomUrl.id);
      
      // Also log the click to the URL click logs system for time-based filtering
      try {
        urlClickLogsManager.logClick(randomUrl.id).catch(err => {
          console.error("Error logging URL click for views page:", err);
        });
      } catch (clickLogError) {
        console.error("Error logging URL click for views page:", clickLogError);
      }
      
      // Record campaign click data
      try {
        storage.recordCampaignClick(campaign.id, randomUrl.id).catch(err => {
          console.error("Error recording campaign click for views page:", err);
        });
        
        // Log the redirect in our redirect logs system with Indian timezone
        redirectLogsManager.logRedirect(campaign.id, randomUrl.id).catch(err => {
          console.error("Error logging redirect for views page:", err);
        });
      } catch (analyticsError) {
        // Log but don't block the redirect if click recording fails
        console.error("Failed to record campaign click for views page:", analyticsError);
      }
      
      // No need to invalidate cache for now as we're always fetching fresh URLs
      // cache invalidation logic is already handled in storage.getUrls
      
      // ============= BEGIN NEW CODE ================
      // Handle the redirect based on the campaign's redirect method
      // Use our helper function to both select a redirect method and track it in analytics
      const redirectResult = await trackRedirectMethod(randomUrl, campaign);
      let targetUrl = redirectResult.url;
      // ============= END NEW CODE ================
      
      // Instead of using an iframe, perform a direct redirect
      console.log(`Redirecting to target URL: ${targetUrl}`);
      
      // Use an HTTP 302 redirect which is more compatible with all browsers and platforms
      return res.redirect(302, targetUrl);
    } catch (error) {
      console.error("Error processing views route:", error);
      res.status(500).json({ message: "Views failed" });
    }
  });
}