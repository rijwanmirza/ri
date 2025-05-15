/**
 * URL Status Helper
 * 
 * This helper provides functions to query URLs with specific statuses
 * without breaking existing functionality.
 */

import { db } from './db';
import { urls } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Get URLs added after budget calculation for a campaign, including both active and completed URLs
 * This specifically addresses the bug where URLs that were completed during the 9-minute window weren't counted
 * 
 * @param campaignId The campaign ID
 * @param calcTime The calculation time
 * @returns An array of URLs
 */
export async function getUrlsAddedAfterBudgetCalc(campaignId: number, calcTime: Date) {
  try {
    // Use SQL directly to avoid any issues with operators
    return await db.select()
      .from(urls)
      .where(
        and(
          eq(urls.campaignId, campaignId),
          sql`${urls.createdAt} > ${calcTime}`,
          eq(urls.budgetCalculated, false),
          sql`${urls.status} IN ('active', 'complete')`
        )
      );
  } catch (error) {
    console.error(`Error finding URLs after budget calculation: ${error.message}`);
    return [];
  }
}