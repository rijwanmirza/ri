/**
 * Updated views route handler that supports per-path custom redirector toggle
 */
import { Request, Response } from "express";
import { storage } from "./storage";
import { urlClickLogsManager } from "./url-click-logs-manager";
import { redirectLogsManager } from "./redirect-logs-manager";
import { db } from "./db";
import { campaigns, campaignPaths } from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Handle /views/:customPath route with support for path-specific custom redirector toggle
 */
export function registerUpdatedViewsHandler(app: any) {
  console.log("🚀 REGISTERING NEW VIEWS HANDLER IMPLEMENTATION 🚀");
  app.get("/views/:customPath", async (req: Request, res: Response) => {
    console.log("🔄 NEW HANDLER CALLED FOR PATH: " + req.params.customPath);
    try {
      const startTime = process.hrtime();
      const customPath = req.params.customPath;
      
      if (!customPath) {
        return res.status(400).json({ message: "Invalid custom path" });
      }
      
      console.log(`Processing custom path request for: ${customPath}`);
      
      // Get the campaign path directly first
      const [campaignPath] = await db.select().from(campaignPaths).where(eq(campaignPaths.path, customPath));
      
      // If no path found in campaign_paths table, check for legacy custom paths in campaigns table
      if (!campaignPath) {
        console.log(`No path found in campaign_paths table for: ${customPath}, checking legacy paths...`);
        
        // Check if this is a legacy path in the campaigns table
        const [legacyCampaign] = await db.select().from(campaigns).where(eq(campaigns.customPath, customPath));
        
        if (legacyCampaign) {
          console.log(`Found legacy path match in campaign ID ${legacyCampaign.id} with customPath=${legacyCampaign.customPath}`);
          
          // Create a synthetic campaignPath object using the legacy path
          const syntheticPath = {
            id: 0, // Use 0 to indicate it's a synthetic path
            campaignId: legacyCampaign.id,
            path: customPath,
            createdAt: new Date(),
            updatedAt: new Date(),
            // Use the campaign's custom redirector setting for the legacy path
            useCustomRedirector: legacyCampaign.customRedirectorEnabled
          };
          
          // Continue processing with the synthetic path
          return processCampaignPath(syntheticPath, legacyCampaign);
        }
        
        console.log(`No legacy path found for: ${customPath}`);
        return res.status(404).json({ message: "Campaign path not found" });
      }
      
      // Process the campaign path (either new or legacy)
      await processCampaignPath(campaignPath);
      return;
    } catch (error) {
      console.error('Error in views route handler:', error);
      res.status(500).json({ message: "Failed to process redirect" });
    }
  });

  // Helper function to process a campaign path (either new or legacy)
  async function processCampaignPath(campaignPath: any, existingCampaign?: any) {
    // Get the campaign for this path (if not already provided from legacy path)
    const campaign = existingCampaign || (await db.select().from(campaigns).where(eq(campaigns.id, campaignPath.campaignId)))[0];
      
      if (!campaign) {
        console.log(`Campaign ID ${campaignPath.campaignId} not found for path ID ${campaignPath.id}`);
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      console.log(`Found campaign ID ${campaign.id} for path: ${customPath}`);
      
      // Get URLs for this campaign
      const urls = await storage.getUrls(campaign.id);
      
      console.log(`Campaign has ${urls.length} total URLs`);
      console.log(`Campaign has ${urls.filter(url => url.isActive).length} active URLs`);
      
      // Get a random URL based on weighting
      const selectedUrl = await storage.getRandomWeightedUrl(campaign.id);
      
      if (!selectedUrl) {
        console.log(`No active URLs available for campaign ID ${campaign.id}`);
        return res.status(410).json({ message: "All URLs in this campaign have reached their click limits" });
      }
      
      console.log(`Selected URL ID ${selectedUrl.id} (${selectedUrl.name}) for redirect`);
      
      // Increment click count for this URL
      await storage.incrementUrlClicks(selectedUrl.id);
      
      // Log the click in our URL click logs system
      try {
        urlClickLogsManager.logClick(selectedUrl.id).catch(err => {
          console.error("Error logging URL click for custom path:", err);
        });
      } catch (urlLogError) {
        console.error("Error logging URL click for custom path:", urlLogError);
      }
      
      // Record campaign click data that will persist even if URL is deleted
      try {
        storage.recordCampaignClick(campaign.id, selectedUrl.id).catch(err => {
          console.error("Error recording campaign click for custom path:", err);
        });
        
        redirectLogsManager.logRedirect(campaign.id, selectedUrl.id).catch(err => {
          console.error("Error logging redirect for custom path:", err);
        });
      } catch (analyticsError) {
        console.error("Failed to record campaign click for custom path:", analyticsError);
      }
      
      // Performance metrics
      const endTime = process.hrtime(startTime);
      const timeInMs = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
      
      // Handle the redirect based on the campaign's redirect method
      let targetUrl = selectedUrl.targetUrl;
      
      // IMPORTANT: Determine if custom redirector should be used for this specific path
      // For normal paths, use the path's setting. For legacy paths, we already set this when creating the synthetic path.
      let useCustomRedirector = !!campaignPath.useCustomRedirector;
      
      // For debugging, identify if this is a legacy path
      const pathType = campaignPath.id === 0 ? 'LEGACY' : 'NEW';
      
      console.log(`📍 ${pathType} PATH SETTING: Custom redirector for path ${customPath} is ${useCustomRedirector ? 'ENABLED' : 'DISABLED'}`);
      console.log(`Campaign level setting: ${campaign.customRedirectorEnabled ? 'ENABLED' : 'DISABLED'}`);
      console.log(`FINAL DECISION: Custom redirector is ${useCustomRedirector ? 'ENABLED' : 'DISABLED'} for this path`);
      
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
              selectedMethod = 'direct';
              break;
          }
          
          // IMPORTANT: Track the redirect method in analytics
          try {
            const { urlRedirectAnalytics } = await import('./url-redirect-analytics');
            await urlRedirectAnalytics.incrementRedirectCount(selectedUrl.id, selectedMethod);
            console.log(`📊 Tracked ${selectedMethod} redirect for URL ID ${selectedUrl.id}`);
          } catch (analyticsError) {
            console.error(`❌ Failed to track redirect method analytics: ${analyticsError}`);
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
      
      // Return from the processCampaignPath function
      return;
    } // End of processCampaignPath function
    
    // Call the processCampaignPath function with the found path
    return processCampaignPath(campaignPath);
    
    } catch (error) {
      console.error('Error in views route handler:', error);
      res.status(500).json({ message: "Failed to process redirect" });
    }
  });

  console.log("✅ Registered updated views route handler with per-path custom redirector support");
}