/**
 * Fixed URL finder function for high spend budget calculation
 * 
 * This function gets URLs that were added after the initial budget calculation,
 * including both active and completed URLs (but not others like deleted/rejected).
 * 
 * @param campaignId The campaign ID
 * @param calcTime The timestamp of when the initial budget calculation occurred
 * @returns An array of URLs
 */
import { db } from './db';
import { urls, campaigns } from '../shared/schema';
import { eq, and, or, sql, gt } from 'drizzle-orm';

export async function findNewUrlsAddedAfterBudgetCalc(campaignId: number, calcTime: Date) {
  try {
    // Get URLs with status 'active' or 'complete' that were added after budget calculation
    // and haven't had their budget calculated yet
    return await db.select()
      .from(urls)
      .where(
        and(
          eq(urls.campaignId, campaignId),
          sql`${urls.createdAt} > ${calcTime}`,
          eq(urls.budgetCalculated, false),
          or(
            eq(urls.status, 'active'),
            eq(urls.status, 'complete')
          )
        )
      );
  } catch (error) {
    console.error(`Error finding new URLs after budget calculation for campaign ${campaignId}:`, error);
    return [];
  }
}