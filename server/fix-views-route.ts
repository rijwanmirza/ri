/**
 * This file contains a fixed version of the /views/:customPath route
 * with proper redirect method analytics tracking
 */

import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { urlClickLogsManager } from "./url-click-logs-manager";
import { redirectLogsManager } from "./redirect-logs-manager";
import { trackRedirectMethod } from "./fix-redirect-analytics";

export function registerFixedViewsRoute(app: Express) {
  // Unregister the original route by registering a new one with the same path
  // This will replace the original implementation with our fixed version
  app.get("/views/:customPath", async (req: Request, res: Response) => {
    try {
      const customPath = req.params.customPath;
      
      if (!customPath) {
        return res.status(400).json({ message: "Custom path is required" });
      }
      
      console.log(`Processing custom path: ${customPath}`);
      
      // Get the campaign by custom path
      const campaign = await storage.getCampaignByCustomPath(customPath);
      
      if (!campaign) {
        console.log(`Campaign not found with custom path: ${customPath}`);
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Get all URLs for this campaign that are active
      const urls = await storage.getUrls(campaign.id);
      const activeUrls = urls.filter(url => url.isActive);
      
      if (activeUrls.length === 0) {
        console.log(`No active URLs found for campaign with custom path: ${customPath}`);
        return res.status(404).json({ message: "No active URLs found for this campaign" });
      }
      
      // Select a random URL from the active ones
      const randomUrl = activeUrls[Math.floor(Math.random() * activeUrls.length)];
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
      
      // Invalidate cache for the campaign - force refresh on next fetch
      try {
        // Try to invalidate cache if available
        if (storage.getUrls.cache && typeof storage.getUrls.cache.invalidate === 'function') {
          storage.getUrls.cache.invalidate(campaign.id);
        }
      } catch (cacheError) {
        console.log("Cache invalidation not available or failed:", cacheError);
      }
      
      // ============= BEGIN NEW CODE ================
      // Handle the redirect based on the campaign's redirect method
      // Use our helper function to both select a redirect method and track it in analytics
      const redirectResult = await trackRedirectMethod(randomUrl, campaign);
      let targetUrl = redirectResult.url;
      // ============= END NEW CODE ================
      
      // Prepare the page with the iframe
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${campaign.name || 'Campaign View'}</title>
          <style>
            body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
            iframe { border: none; width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
          </style>
        </head>
        <body>
          <iframe src="${targetUrl}" allowfullscreen></iframe>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error("Error processing views route:", error);
      res.status(500).json({ message: "Views failed" });
    }
  });
}