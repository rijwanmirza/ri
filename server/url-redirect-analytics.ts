import { db } from './db';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { urlRedirectAnalytics as urlRedirectAnalyticsTable } from '@shared/schema';

/**
 * Track and manage redirect analytics for URLs
 * Keeps count of how many times each redirect method is used
 */
export class UrlRedirectAnalytics {
  /**
   * Increment the redirect count for a specific method
   * @param urlId URL ID
   * @param redirectMethod Redirect method used (linkedin, facebook, whatsapp, etc.)
   */
  async incrementRedirectCount(urlId: number, redirectMethod: string): Promise<void> {
    try {
      // Convert the method name to database column name
      const columnName = this.getColumnName(redirectMethod);
      const drizzleColumnName = this.getDrizzleColumnName(redirectMethod);
      
      // Use the drizzle DB instance which has proper connection pooling
      // This is more reliable than creating a new pool for each request
      try {
        // Check if record exists first
        const existing = await db.select()
          .from(urlRedirectAnalyticsTable)
          .where(eq(urlRedirectAnalyticsTable.urlId, urlId));
        
        if (existing && existing.length > 0) {
          // Update existing record using raw SQL to avoid complex Drizzle expression building
          await db.execute(sql`
            UPDATE url_redirect_analytics
            SET ${sql.raw(`${columnName} = ${columnName} + 1`)},
                updated_at = NOW()
            WHERE url_id = ${urlId}
          `);
        } else {
          // Create new record with default values for all columns
          const values: any = {
            urlId, // Use camelCase for Drizzle ORM
            linkedinRedirects: 0,
            facebookRedirects: 0,
            whatsappRedirects: 0,
            googleMeetRedirects: 0,
            googleSearchRedirects: 0,
            googlePlayRedirects: 0,
            directRedirects: 0,
          };
          
          // Set the specific redirect method count to 1
          values[drizzleColumnName] = 1;
          
          // Insert new record
          await db.insert(urlRedirectAnalyticsTable).values(values);
        }
        
        console.log(`📊 Recorded ${redirectMethod} redirect for URL ID ${urlId}`);
      } catch (dbError) {
        console.error('❌ Database error recording redirect analytics:', dbError);
      }
    } catch (error) {
      console.error('❌ Error recording redirect analytics:', error);
    }
  }
  
  /**
   * Get redirect analytics for a URL
   * @param urlId URL ID
   */
  async getRedirectAnalytics(urlId: number): Promise<any> {
    try {
      // Use drizzle instance which has proper connection pooling
      try {
        const results = await db.select()
          .from(urlRedirectAnalyticsTable)
          .where(eq(urlRedirectAnalyticsTable.urlId, urlId));
        
        if (!results || results.length === 0) {
          // Return empty analytics if none exist using the field names from client interface
          return {
            id: null,
            url_id: urlId,
            direct_redirects: 0,
            linkedin_redirects: 0,
            facebook_redirects: 0,
            whatsapp_redirects: 0,
            google_meet_redirects: 0,
            google_search_redirects: 0,
            google_play_redirects: 0
          };
        }
        
        // Map the drizzle column names to match the React component interface
        console.log(`Found analytics for URL ID ${urlId}:`, results[0]);
        return {
          id: results[0].id,
          url_id: results[0].urlId,
          direct_redirects: results[0].directRedirects,
          linkedin_redirects: results[0].linkedinRedirects,
          facebook_redirects: results[0].facebookRedirects,
          whatsapp_redirects: results[0].whatsappRedirects,
          google_meet_redirects: results[0].googleMeetRedirects,
          google_search_redirects: results[0].googleSearchRedirects,
          google_play_redirects: results[0].googlePlayRedirects
        };
      } catch (dbError) {
        console.error('❌ Database error fetching redirect analytics:', dbError);
        throw dbError;
      }
    } catch (error) {
      console.error('❌ Error fetching redirect analytics:', error);
      return {
        id: null,
        url_id: urlId,
        direct_redirects: 0,
        linkedin_redirects: 0,
        facebook_redirects: 0,
        whatsapp_redirects: 0,
        google_meet_redirects: 0,
        google_search_redirects: 0,
        google_play_redirects: 0
      };
    }
  }
  
  /**
   * Get raw SQL column name based on redirect method
   */
  private getColumnName(redirectMethod: string): string {
    switch (redirectMethod) {
      case 'linkedin':
        return 'linkedin_redirects';
      case 'facebook':
        return 'facebook_redirects';
      case 'whatsapp':
        return 'whatsapp_redirects';
      case 'google_meet':
        return 'google_meet_redirects';
      case 'google_search':
        return 'google_search_redirects';
      case 'google_play':
        return 'google_play_redirects';
      default:
        return 'direct_redirects';
    }
  }
  
  /**
   * Get Drizzle ORM camelCase column name based on redirect method
   */
  private getDrizzleColumnName(redirectMethod: string): string {
    switch (redirectMethod) {
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
  
  /**
   * DEBUG: Reset analytics for testing
   * @param urlId URL ID
   */
  async resetRedirectAnalytics(urlId: number): Promise<void> {
    try {
      await db.delete(urlRedirectAnalyticsTable)
        .where(eq(urlRedirectAnalyticsTable.urlId, urlId));
      console.log(`🧹 Reset redirect analytics for URL ID ${urlId}`);
    } catch (error) {
      console.error('❌ Error resetting redirect analytics:', error);
    }
  }
}

// Export a singleton instance
export const urlRedirectAnalytics = new UrlRedirectAnalytics();