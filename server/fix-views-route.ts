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
      
      // Handle the redirect based on the campaign's redirect method
      // This matches the same behavior as the /c/:campaignId route
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
          res.status(307).header("Location", targetUrl).end();
          break;
          
        case "http2_307_temporary":
          // HTTP/2.0 307 Temporary Redirect
          res.setHeader("X-HTTP2-Version", "HTTP/2.0");
          res.setHeader("Alt-Svc", "h2=\":443\"; ma=86400");
          res.setHeader("X-Protocol-Version", "h2");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
          res.setHeader("X-Powered-By", "ViralEngine/2.0");
          res.status(307).header("Location", targetUrl).end();
          break;
          
        case "http2_forced_307":
          // This matches the exact format seen in viralplayer.xyz
          const cookieExpiration = new Date();
          cookieExpiration.setFullYear(cookieExpiration.getFullYear() + 1);
          const cookieExpiryString = cookieExpiration.toUTCString();
          const randomId = Math.random().toString(16).substring(2, 10);
          
          // Set headers matching viralplayer.xyz in their specific order
          res.removeHeader('X-Powered-By');
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
          
          const cfRay = Math.random().toString(16).substring(2, 11) + "a3fe-EWR";
          res.setHeader("cf-ray", cfRay);
          res.setHeader("alt-svc", "h3=\":443\"; ma=86400");
          res.status(307).end();
          break;
          
        case "direct":
        default:
          // Standard redirect (302 Found)
          res.redirect(targetUrl);
          break;
      }
    } catch (error) {
      console.error("Error processing views route:", error);
      res.status(500).json({ message: "Views failed" });
    }
  });
}