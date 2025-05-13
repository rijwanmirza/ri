import { db } from './db';
import { eq } from 'drizzle-orm';
import { Pool } from '@neondatabase/serverless';

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
      
      // Use direct SQL query for better compatibility
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      try {
        // Try to update existing record
        await pool.query(`
          INSERT INTO url_redirect_analytics (url_id, ${columnName})
          VALUES ($1, 1)
          ON CONFLICT (url_id) 
          DO UPDATE SET 
            ${columnName} = url_redirect_analytics.${columnName} + 1,
            updated_at = NOW()
        `, [urlId]);
        
        console.log(`📊 Recorded ${redirectMethod} redirect for URL ID ${urlId}`);
      } finally {
        // Always release the pool when done
        await pool.end();
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
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      try {
        const result = await pool.query(`
          SELECT * FROM url_redirect_analytics 
          WHERE url_id = $1
        `, [urlId]);
        
        if (!result || result.rows.length === 0) {
          // Return empty analytics if none exist
          return {
            urlId,
            linkedin_redirects: 0,
            facebook_redirects: 0,
            whatsapp_redirects: 0,
            google_meet_redirects: 0,
            google_search_redirects: 0,
            google_play_redirects: 0,
            direct_redirects: 0
          };
        }
        
        return result.rows[0];
      } finally {
        await pool.end();
      }
    } catch (error) {
      console.error('❌ Error fetching redirect analytics:', error);
      return {
        urlId,
        linkedin_redirects: 0,
        facebook_redirects: 0,
        whatsapp_redirects: 0,
        google_meet_redirects: 0,
        google_search_redirects: 0,
        google_play_redirects: 0,
        direct_redirects: 0
      };
    }
  }
  
  /**
   * Get column name based on redirect method
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
}

// Export a singleton instance
export const urlRedirectAnalytics = new UrlRedirectAnalytics();