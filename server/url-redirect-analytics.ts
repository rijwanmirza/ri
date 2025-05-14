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
      console.log(`🔄 ATTEMPTING TO INCREMENT REDIRECT COUNT for URL ID ${urlId}, method: ${redirectMethod}`);
      
      // Convert the method name to database column name
      const columnName = this.getColumnName(redirectMethod);
      const drizzleColumnName = this.getDrizzleColumnName(redirectMethod);
      
      console.log(`🔄 Using column name: ${columnName}, drizzle column name: ${drizzleColumnName}`);
      
      // Use the drizzle DB instance which has proper connection pooling
      // This is more reliable than creating a new pool for each request
      try {
        // Check if record exists first
        console.log(`🔍 Checking if analytics record exists for URL ID ${urlId}`);
        const existing = await db.select()
          .from(urlRedirectAnalyticsTable)
          .where(eq(urlRedirectAnalyticsTable.urlId, urlId));
        
        console.log(`🔍 Found ${existing.length} existing records for URL ID ${urlId}`);
        
        if (existing && existing.length > 0) {
          console.log(`✅ Record exists, updating count for ${redirectMethod}`);
          // Update existing record using raw SQL to avoid complex Drizzle expression building
          const updateResult = await db.execute(sql`
            UPDATE url_redirect_analytics
            SET ${sql.raw(`${columnName} = ${columnName} + 1`)},
                updated_at = NOW()
            WHERE url_id = ${urlId}
          `);
          console.log(`✅ Update result:`, updateResult);
          
          // Verify the update by fetching the record again
          const updated = await db.select()
            .from(urlRedirectAnalyticsTable)
            .where(eq(urlRedirectAnalyticsTable.urlId, urlId));
          console.log(`✅ Updated record:`, updated[0]);
        } else {
          console.log(`✅ No record exists yet, creating new record with ${redirectMethod} = 1`);
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
          
          console.log(`✅ Inserting new record with values:`, values);
          
          // Insert new record
          const insertResult = await db.insert(urlRedirectAnalyticsTable).values(values);
          console.log(`✅ Insert result:`, insertResult);
          
          // Verify the insert by fetching the record
          const inserted = await db.select()
            .from(urlRedirectAnalyticsTable)
            .where(eq(urlRedirectAnalyticsTable.urlId, urlId));
          console.log(`✅ Inserted record:`, inserted[0]);
        }
        
        console.log(`📊 Successfully recorded ${redirectMethod} redirect for URL ID ${urlId}`);
      } catch (dbError) {
        console.error('❌ Database error recording redirect analytics:', dbError);
        console.error(dbError);
      }
    } catch (error) {
      console.error('❌ Error recording redirect analytics:', error);
      console.error(error);
    }
  }
  
  /**
   * Get redirect analytics for a URL
   * @param urlId URL ID
   */
  async getRedirectAnalytics(urlId: number): Promise<any> {
    try {
      console.log(`🔍 Getting redirect analytics for URL ID ${urlId}`);
      
      // Use drizzle instance which has proper connection pooling
      try {
        const results = await db.select()
          .from(urlRedirectAnalyticsTable)
          .where(eq(urlRedirectAnalyticsTable.urlId, urlId));
        
        if (!results || results.length === 0) {
          console.log(`⚠️ No analytics found for URL ID ${urlId}, returning empty data`);
          
          // Return empty analytics with camelCase field names consistent with the API
          const emptyData = {
            id: null,
            urlId: urlId,
            directRedirects: 0,
            linkedinRedirects: 0,
            facebookRedirects: 0,
            whatsappRedirects: 0,
            googleMeetRedirects: 0,
            googleSearchRedirects: 0,
            googlePlayRedirects: 0
          };
          
          // Create a new record in the database with these empty values
          await db.insert(urlRedirectAnalyticsTable).values({
            urlId,
            directRedirects: 0,
            linkedinRedirects: 0,
            facebookRedirects: 0,
            whatsappRedirects: 0,
            googleMeetRedirects: 0,
            googleSearchRedirects: 0,
            googlePlayRedirects: 0
          }).catch(err => {
            console.error(`❌ Failed to create empty analytics record:`, err);
          });
          
          return emptyData;
        }
        
        // Map the drizzle column names to match the React component interface
        // BUT use camelCase rather than snake_case to be consistent with API patterns
        console.log(`✅ Found analytics for URL ID ${urlId}:`, results[0]);
        
        // Return data with camelCase field names
        return {
          id: results[0].id,
          urlId: results[0].urlId,
          directRedirects: results[0].directRedirects || 0,
          linkedinRedirects: results[0].linkedinRedirects || 0,
          facebookRedirects: results[0].facebookRedirects || 0,
          whatsappRedirects: results[0].whatsappRedirects || 0,
          googleMeetRedirects: results[0].googleMeetRedirects || 0,
          googleSearchRedirects: results[0].googleSearchRedirects || 0,
          googlePlayRedirects: results[0].googlePlayRedirects || 0
        };
      } catch (dbError) {
        console.error('❌ Database error fetching redirect analytics:', dbError);
        throw dbError;
      }
    } catch (error) {
      console.error('❌ Error fetching redirect analytics:', error);
      return {
        id: null,
        urlId: urlId,
        directRedirects: 0,
        linkedinRedirects: 0,
        facebookRedirects: 0,
        whatsappRedirects: 0,
        googleMeetRedirects: 0,
        googleSearchRedirects: 0,
        googlePlayRedirects: 0
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