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
    if (!campaign.useCustomRedirector) {
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
    
    if (campaign.useLinkedinRedirector) {
      enabledMethods.push('linkedin');
    }
    if (campaign.useFacebookRedirector) {
      enabledMethods.push('facebook');
    }
    if (campaign.useWhatsappRedirector) {
      enabledMethods.push('whatsapp');
    }
    if (campaign.useGoogleMeetRedirector) {
      enabledMethods.push('google_meet');
    }
    if (campaign.useGoogleSearchRedirector) {
      enabledMethods.push('google_search');
    }
    if (campaign.useGooglePlayRedirector) {
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
        redirectUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(targetUrl)}`;
        break;
      case 'facebook':
        redirectUrl = `https://l.facebook.com/l.php?u=${encodeURIComponent(targetUrl)}`;
        break;
      case 'whatsapp':
        redirectUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(targetUrl)}`;
        break;
      case 'google_meet':
        redirectUrl = `https://meet.google.com/linkredirect?dest=${encodeURIComponent(targetUrl)}`;
        break;
      case 'google_search':
        // Format: https://www.google.com/url?q=ACTUAL_URL
        redirectUrl = `https://www.google.com/url?q=${encodeURIComponent(targetUrl)}`;
        break;
      case 'google_play':
        // Format: https://play.google.com/store/apps/details?id=com.example.app&referrer=ACTUAL_URL
        redirectUrl = `https://play.google.com/store/apps/collection/cluster?clp=ogonCiEKG3Byb21vdGVkX2V4cGVyaWVuY2VfMjAyMTA4MTASBRICU0U%3D:S:ANO1ljJ65K8&gsr=CiqiCicKIQobcHJvbW90ZWRfZXhwZXJpZW5jZV8yMDIxMDgxMBIFAgJTRA%3D%3D:S:ANO1ljLQBdA&redirect=${encodeURIComponent(targetUrl)}`;
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