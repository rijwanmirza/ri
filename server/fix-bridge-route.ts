/**
 * This file contains a fixed version of the /r/bridge/:campaignId/:urlId route
 * with proper redirect method analytics tracking
 */

import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { urlClickLogsManager } from "./url-click-logs-manager";
import { redirectLogsManager } from "./redirect-logs-manager";
import { trackRedirectMethod } from "./fix-redirect-analytics";

export function registerFixedBridgeRoute(app: Express) {
  // Unregister the original route by registering a new one with the same path
  // This will replace the original implementation with our fixed version
  app.get("/r/bridge/:campaignId/:urlId", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId, 10);
      const urlId = parseInt(req.params.urlId, 10);
      
      if (isNaN(campaignId) || isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid campaign or URL ID" });
      }
      
      console.log(`Processing bridge redirect for campaign ID ${campaignId}, URL ID ${urlId}`);
      
      // Get the campaign and URL
      const [campaign, url] = await Promise.all([
        storage.getCampaign(campaignId),
        storage.getUrl(urlId),
      ]);
      
      if (!campaign) {
        console.log(`Campaign not found with ID ${campaignId}`);
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      if (!url) {
        console.log(`URL not found with ID ${urlId}`);
        return res.status(404).json({ message: "URL not found" });
      }
      
      if (!url.isActive) {
        console.log(`URL with ID ${urlId} is not active`);
        return res.status(403).json({ message: "URL is not active" });
      }
      
      // Increment click count
      await storage.incrementUrlClicks(urlId);
      
      // Also log the click to the URL click logs system for time-based filtering
      try {
        urlClickLogsManager.logClick(urlId).catch(err => {
          console.error("Error logging URL click for bridge page:", err);
        });
      } catch (clickLogError) {
        console.error("Error logging URL click for bridge page:", clickLogError);
      }
      
      // Record campaign click data
      try {
        storage.recordCampaignClick(campaignId, urlId).catch(err => {
          console.error("Error recording campaign click for bridge page:", err);
        });
        
        // Log the redirect in our redirect logs system with Indian timezone
        redirectLogsManager.logRedirect(campaignId, urlId).catch(err => {
          console.error("Error logging redirect for bridge page:", err);
        });
      } catch (analyticsError) {
        // Log but don't block the redirect if click recording fails
        console.error("Failed to record campaign click for bridge page:", analyticsError);
      }

      // ============= BEGIN NEW CODE ================
      // Handle the redirect based on the campaign's redirect method
      // Use our helper function to both select a redirect method and track it in analytics
      const redirectResult = await trackRedirectMethod(url, campaign);
      let targetUrl = redirectResult.url;
      // ============= END NEW CODE ================
      
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
      res.setHeader("Link", `<${targetUrl}>; rel=preload; as=document`); // Preload hint
      
      // Ultra-minimal HTML with zero whitespace and preloaded resources
      res.send(`<!DOCTYPE html><html><head><link rel="preload" href="${targetUrl}" as="document"><meta http-equiv="refresh" content="0;url=${targetUrl}"><script>location.href="${targetUrl}"</script></head><body></body></html>`);
    } catch (error) {
      console.error("Error processing bridge redirect:", error);
      res.status(500).json({ message: "Redirect failed" });
    }
  });
}