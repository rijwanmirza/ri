/**
 * Updated views route handler that supports per-path custom redirector toggle
 */
import { Request, Response } from "express";
import { storage } from "./storage";
import { urlClickLogsManager } from "./url-click-logs-manager";
import { redirectLogsManager } from "./redirect-logs-manager";

/**
 * Handle /views/:customPath route with support for path-specific custom redirector toggle
 */
export function registerUpdatedViewsHandler(app: any) {
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
      
      // Determine if custom redirector should be used for this specific path
      let useCustomRedirector = campaign.customRedirectorEnabled;
      
      // Find the matching path from campaign.paths to check its useCustomRedirector setting
      if (campaign.paths && Array.isArray(campaign.paths)) {
        const matchingPath = campaign.paths.find(path => path.path === customPath);
        
        if (matchingPath) {
          // Use the path-specific setting to override the campaign-level setting
          useCustomRedirector = matchingPath.useCustomRedirector;
          console.log(`📍 Path-specific custom redirector setting for ${customPath}: ${useCustomRedirector ? 'ENABLED' : 'DISABLED'}`);
        } else {
          console.log(`📍 No matching campaign path found for ${customPath}, using campaign-level setting: ${useCustomRedirector ? 'ENABLED' : 'DISABLED'}`);
        }
      } else {
        console.log(`📍 No paths available for campaign, using campaign-level setting: ${useCustomRedirector ? 'ENABLED' : 'DISABLED'}`);
      }
      
      // Check if custom redirector is enabled for this campaign and this specific path
      if (useCustomRedirector) {
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
      } else {
        console.log(`🔀 Custom redirector is DISABLED for this path "${customPath}", using direct URL`);
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
          res.setHeader("expect-ct", "max-age=604800, report-uri=\"https://report-uri.cloudflare.com/cdn-cgi/beacon/expect-ct\"");
          res.setHeader("x-content-type-options", "nosniff");
          res.setHeader("set-cookie", `__cfduid=${randomId}; expires=${cookieExpiryString}; path=/; domain=.viralplayer.xyz; HttpOnly; SameSite=Lax`);
          res.setHeader("cf-ray", `${Math.random().toString(16).substring(2, 8)}-${Math.random().toString(16).substring(2, 5)}`);
          
          // Actually send the 307 status code
          res.status(307).end();
          break;
          
        case "direct":
        default:
          // Simplest method: HTTP 302 redirect
          res.redirect(targetUrl);
          break;
      }
    } catch (error) {
      console.error('Error in views route handler:', error);
      res.status(500).json({ message: "Failed to process redirect" });
    }
  });

  console.log("✅ Registered updated views route handler with per-path custom redirector support");
}