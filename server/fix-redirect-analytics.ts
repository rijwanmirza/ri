/**
 * Helper module for properly tracking redirect method analytics
 * Provides a consistent implementation for all redirect routes
 */

import { urlRedirectAnalytics } from './url-redirect-analytics';

// Possible redirect methods
type RedirectMethod = 
  | 'linkedin' 
  | 'facebook' 
  | 'whatsapp' 
  | 'google_meet' 
  | 'google_search' 
  | 'google_play' 
  | 'direct';

type RedirectResult = {
  method: RedirectMethod;
  url: string;
}

/**
 * Track and increment redirect analytics while selecting a redirect method
 * 
 * @param url The URL to redirect to
 * @param campaign The campaign containing redirect method settings
 * @returns The redirect URL and method used
 */
export async function trackRedirectMethod(url: any, campaign: any): Promise<RedirectResult> {
  try {
    console.log(`🔀 Determining redirect method for URL ID ${url.id}, campaign ID ${campaign.id}`);
    
    // Default to direct redirect if custom redirector is not enabled
    if (!campaign.customRedirectorEnabled) {
      console.log(`🔀 Custom redirector disabled for campaign ${campaign.id}, using direct method`);
      
      // Track the direct redirect in analytics
      await urlRedirectAnalytics.incrementRedirectCount(url.id, 'direct');
      
      return { 
        method: 'direct',
        url: url.targetUrl
      };
    }
    
    // Get the enabled redirect methods from the campaign
    const enabledMethods: RedirectMethod[] = [];
    
    if (campaign.linkedinRedirectionEnabled) {
      enabledMethods.push('linkedin');
    }
    if (campaign.facebookRedirectionEnabled) {
      enabledMethods.push('facebook');
    }
    if (campaign.whatsappRedirectionEnabled) {
      enabledMethods.push('whatsapp');
    }
    if (campaign.googleMeetRedirectionEnabled) {
      enabledMethods.push('google_meet');
    }
    if (campaign.googleSearchRedirectionEnabled) {
      enabledMethods.push('google_search');
    }
    if (campaign.googlePlayRedirectionEnabled) {
      enabledMethods.push('google_play');
    }
    
    // If no methods are enabled, default to LinkedIn (safety measure)
    if (enabledMethods.length === 0) {
      console.log(`⚠️ No redirect methods enabled for campaign ${campaign.id}, defaulting to LinkedIn`);
      enabledMethods.push('linkedin');
    }
    
    // Randomly select one of the enabled methods
    const randomMethod = enabledMethods[Math.floor(Math.random() * enabledMethods.length)];
    console.log(`🔀 Randomly selected redirect method: ${randomMethod} for campaign ${campaign.id}`);
    
    // Generate the redirect URL based on the selected method
    let redirectUrl = url.targetUrl;
    let targetUrl = url.targetUrl;
    
    // Ensure URL has http/https
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }
    
    // Build the redirect URL based on the selected method
    switch (randomMethod) {
      case 'linkedin':
        // LinkedIn redirection format with feed-detail for better referrer appearance
        redirectUrl = `https://www.linkedin.com/safety/go?url=${encodeURIComponent(targetUrl)}&trk=feed-detail_comments-list_comment-text`;
        break;
      case 'facebook':
        // Facebook link sharing redirection format
        redirectUrl = `https://l.facebook.com/l.php?u=${encodeURIComponent(targetUrl)}`;
        break;
      case 'whatsapp':
        // WhatsApp redirection format - updated to use l.wl.co format exactly as specified
        redirectUrl = `https://l.wl.co/l?u=${targetUrl}`;
        break;
      case 'google_meet':
        // Google Meet redirection format
        redirectUrl = `https://meet.google.com/linkredirect?dest=${encodeURIComponent(targetUrl)}`;
        break;
      case 'google_search':
        // Google Search redirection format
        redirectUrl = `https://www.google.com/url?q=${encodeURIComponent(targetUrl)}`;
        break;
      case 'google_play':
        // Google Play redirection format - exact format as specified
        redirectUrl = `https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&url=${targetUrl}`;
        break;
      default:
        // Direct redirect without any intermediary
        redirectUrl = targetUrl;
        break;
    }
    
    // Track the redirect in analytics
    await urlRedirectAnalytics.incrementRedirectCount(url.id, randomMethod);
    
    console.log(`🔀 Applied custom redirection method: ${randomMethod} for campaign ${campaign.id}`);
    console.log(`🔀 Redirecting through ${randomMethod.charAt(0).toUpperCase() + randomMethod.slice(1)}: ${redirectUrl}`);
    
    return {
      method: randomMethod,
      url: redirectUrl
    };
  } catch (error) {
    console.error('Error applying redirect method:', error);
    
    // Fall back to direct redirect if there is an error
    try {
      await urlRedirectAnalytics.incrementRedirectCount(url.id, 'direct');
    } catch (analyticsError) {
      console.error('Error recording direct redirect fallback:', analyticsError);
    }
    
    return {
      method: 'direct',
      url: url.targetUrl
    };
  }
}