/**
 * This file contains a fixed version of the /r/:campaignId/:urlId route
 * with proper redirect method analytics tracking
 */

import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { urlClickLogsManager } from "./url-click-logs-manager";
import { redirectLogsManager } from "./redirect-logs-manager";
import { 
  ultraFastMetaRefresh,
  turboDoubleMetaRefresh, 
  turboBridgePage,
  hyperFastHttp307,
  http2TurboRedirect,
  optimizedDirectRedirect
} from './high-performance-redirects';
import { trackRedirectMethod } from "./fix-redirect-analytics";

export function registerFixedRedirectRoute(app: Express) {
  // Unregister the original route by registering a new one with the same path
  // This will replace the original implementation with our fixed version
  app.get("/r/:campaignId/:urlId", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId, 10);
      const urlId = parseInt(req.params.urlId, 10);
      
      if (isNaN(campaignId) || isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid campaign or URL ID" });
      }
      
      console.log(`Processing redirect for campaign ID ${campaignId}, URL ID ${urlId}`);
      
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
      
      // Get performance measurement start time
      const startTime = process.hrtime();
      
      // Increment click count
      await storage.incrementUrlClicks(urlId);
      
      // Also log the click to the URL click logs system for time-based filtering
      try {
        urlClickLogsManager.logClick(urlId).catch(err => {
          console.error("Error logging URL click:", err);
        });
      } catch (clickLogError) {
        console.error("Error logging URL click:", clickLogError);
      }
      
      // Record campaign click data
      try {
        storage.recordCampaignClick(campaignId, urlId).catch(err => {
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
      
      // Calculate processing time
      const endTime = process.hrtime(startTime);
      const processingTimeMs = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
      
      console.log(`Processed redirect for URL ID ${urlId} in ${processingTimeMs}ms`);
      
      // ============= BEGIN NEW CODE ================
      // Handle the redirect based on the campaign's redirect method
      // Use our helper function to both select a redirect method and track it in analytics
      const redirectResult = await trackRedirectMethod(url, campaign);
      let targetUrl = redirectResult.url;
      // ============= END NEW CODE ================
      
      // Determine which redirect method to use
      switch (campaign.redirectMethod) {
        case "meta_refresh":
          return ultraFastMetaRefresh(res, targetUrl);
          
        case "double_meta_refresh":
          return turboDoubleMetaRefresh(res, targetUrl);
          
        case "bridge_page":
          return turboBridgePage(res, targetUrl);
          
        case "http_307":
          return hyperFastHttp307(res, targetUrl);
          
        case "http2_turbo":
          return http2TurboRedirect(res, targetUrl);
          
        default:
          return optimizedDirectRedirect(res, targetUrl);
      }
    } catch (error) {
      console.error("Error processing redirect:", error);
      res.status(500).json({ message: "Redirect failed" });
    }
  });
}