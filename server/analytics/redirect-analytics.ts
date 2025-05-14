import { db } from '../db';
import { eq } from 'drizzle-orm';
import { urlRedirectAnalytics } from '@shared/schema';

/**
 * Service to handle URL redirect analytics
 */
export class RedirectAnalyticsService {
  /**
   * Increment the redirect count for a specific method
   * @param urlId The URL ID
   * @param method The redirect method used
   */
  async incrementRedirectCount(urlId: number, method: string): Promise<void> {
    try {
      console.log(`📊 Recording redirect for URL ID ${urlId} using method: ${method}`);
      
      // Get or create analytics record for this URL
      const [existingRecord] = await db
        .select()
        .from(urlRedirectAnalytics)
        .where(eq(urlRedirectAnalytics.urlId, urlId));
      
      if (!existingRecord) {
        // Create new record if none exists
        await db.insert(urlRedirectAnalytics).values({
          urlId,
          [this.getColumnName(method)]: 1
        });
        return;
      }
      
      // Update the existing record
      const updateValues: Record<string, any> = {};
      const columnName = this.getColumnName(method);
      updateValues[columnName] = (existingRecord[columnName as keyof typeof existingRecord] as number || 0) + 1;
      
      await db
        .update(urlRedirectAnalytics)
        .set({
          ...updateValues,
          updatedAt: new Date()
        })
        .where(eq(urlRedirectAnalytics.urlId, urlId));
      
    } catch (error) {
      console.error('❌ Error incrementing redirect count:', error);
    }
  }
  
  /**
   * Get redirect stats for a URL
   * @param urlId The URL ID
   */
  async getRedirectStats(urlId: number) {
    try {
      const [stats] = await db
        .select()
        .from(urlRedirectAnalytics)
        .where(eq(urlRedirectAnalytics.urlId, urlId));
      
      if (!stats) {
        // Create default record if none exists
        const newRecord = {
          urlId,
          linkedinRedirects: 0,
          facebookRedirects: 0,
          whatsappRedirects: 0,
          googleMeetRedirects: 0,
          googleSearchRedirects: 0,
          googlePlayRedirects: 0,
          directRedirects: 0
        };
        
        await db.insert(urlRedirectAnalytics).values(newRecord);
        return newRecord;
      }
      
      return stats;
    } catch (error) {
      console.error('❌ Error getting redirect stats:', error);
      return {
        linkedinRedirects: 0,
        facebookRedirects: 0,
        whatsappRedirects: 0,
        googleMeetRedirects: 0,
        googleSearchRedirects: 0,
        googlePlayRedirects: 0,
        directRedirects: 0
      };
    }
  }
  
  /**
   * Get column name for database from redirect method string
   */
  private getColumnName(method: string): string {
    switch (method) {
      case 'linkedin':
        return 'linkedinRedirects';
      case 'facebook':
        return 'facebookRedirects';
      case 'whatsapp':
        return 'whatsappRedirects';
      case 'google_meet':
        return 'googleMeetRedirects';
      case 'google_search':
        return 'googleSearchRedirects';
      case 'google_play':
        return 'googlePlayRedirects';
      default:
        return 'directRedirects';
    }
  }
}

// Export singleton instance
export const redirectAnalytics = new RedirectAnalyticsService();