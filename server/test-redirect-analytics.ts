/**
 * Test route handler for validating redirect analytics
 * This endpoint increments the redirect analytics counter for a specific URL and method
 */

import type { Express, Request, Response } from "express";
import { urlRedirectAnalytics } from "./url-redirect-analytics";

export function registerTestRedirectAnalyticsRoutes(app: Express) {
  app.get("/api/test-redirect-analytics/:urlId/:method", async (req: Request, res: Response) => {
    try {
      const urlId = parseInt(req.params.urlId, 10);
      const method = req.params.method;
      
      if (isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }
      
      if (!method || !["linkedin", "facebook", "whatsapp", "google_meet", "google_search", "google_play", "direct"].includes(method)) {
        return res.status(400).json({ message: "Invalid redirect method" });
      }
      
      console.log(`🧪 Testing redirect analytics for URL ID ${urlId}, method: ${method}`);
      
      // Increment the redirect count
      await urlRedirectAnalytics.incrementRedirectCount(urlId, method);
      
      // Get the updated analytics
      const analytics = await urlRedirectAnalytics.getRedirectAnalytics(urlId);
      
      return res.status(200).json({
        message: `Successfully incremented ${method} redirect count for URL ID ${urlId}`,
        analytics
      });
    } catch (error) {
      console.error("Error in test-redirect-analytics route:", error);
      return res.status(500).json({ message: "Test failed" });
    }
  });
  
  app.post("/api/test-redirect-analytics/:urlId/reset", async (req: Request, res: Response) => {
    try {
      const urlId = parseInt(req.params.urlId, 10);
      
      if (isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }
      
      console.log(`🧹 Resetting redirect analytics for URL ID ${urlId}`);
      
      // Reset the analytics
      await urlRedirectAnalytics.resetRedirectAnalytics(urlId);
      
      return res.status(200).json({
        message: `Successfully reset redirect analytics for URL ID ${urlId}`
      });
    } catch (error) {
      console.error("Error in reset-redirect-analytics route:", error);
      return res.status(500).json({ message: "Reset failed" });
    }
  });
}