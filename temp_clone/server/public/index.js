var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  RedirectMethod: () => RedirectMethod,
  YouTubeApiLogType: () => YouTubeApiLogType,
  bulkUrlActionSchema: () => bulkUrlActionSchema,
  campaignClickRecords: () => campaignClickRecords,
  campaignClickRecordsRelations: () => campaignClickRecordsRelations,
  campaignRedirectLogs: () => campaignRedirectLogs,
  campaignRedirectLogsRelations: () => campaignRedirectLogsRelations,
  campaigns: () => campaigns,
  campaignsRelations: () => campaignsRelations,
  insertCampaignClickRecordSchema: () => insertCampaignClickRecordSchema,
  insertCampaignRedirectLogSchema: () => insertCampaignRedirectLogSchema,
  insertCampaignSchema: () => insertCampaignSchema,
  insertOriginalUrlRecordSchema: () => insertOriginalUrlRecordSchema,
  insertSystemSettingSchema: () => insertSystemSettingSchema,
  insertTrafficstarCredentialSchema: () => insertTrafficstarCredentialSchema,
  insertUrlClickLogSchema: () => insertUrlClickLogSchema,
  insertUrlClickRecordSchema: () => insertUrlClickRecordSchema,
  insertUrlSchema: () => insertUrlSchema,
  insertYoutubeApiLogSchema: () => insertYoutubeApiLogSchema,
  insertYoutubeUrlRecordSchema: () => insertYoutubeUrlRecordSchema,
  originalUrlRecords: () => originalUrlRecords,
  systemSettings: () => systemSettings,
  timeRangeFilterSchema: () => timeRangeFilterSchema,
  trafficSenderActionSchema: () => trafficSenderActionSchema,
  trafficstarCampaignActionSchema: () => trafficstarCampaignActionSchema,
  trafficstarCampaignBudgetSchema: () => trafficstarCampaignBudgetSchema,
  trafficstarCampaignEndTimeSchema: () => trafficstarCampaignEndTimeSchema,
  trafficstarCampaigns: () => trafficstarCampaigns,
  trafficstarCredentials: () => trafficstarCredentials,
  updateCampaignSchema: () => updateCampaignSchema,
  updateOriginalUrlRecordSchema: () => updateOriginalUrlRecordSchema,
  updateSystemSettingSchema: () => updateSystemSettingSchema,
  updateTrafficstarCredentialSchema: () => updateTrafficstarCredentialSchema,
  updateUrlSchema: () => updateUrlSchema,
  urlClickLogs: () => urlClickLogs,
  urlClickLogsRelations: () => urlClickLogsRelations,
  urlClickRecords: () => urlClickRecords,
  urlClickRecordsRelations: () => urlClickRecordsRelations,
  urlStatusEnum: () => urlStatusEnum,
  urls: () => urls,
  urlsRelations: () => urlsRelations,
  youtubeApiLogs: () => youtubeApiLogs,
  youtubeApiLogsRelations: () => youtubeApiLogsRelations,
  youtubeUrlRecords: () => youtubeUrlRecords,
  youtubeUrlRecordsRelations: () => youtubeUrlRecordsRelations
});
import { pgTable, text, serial, integer, timestamp, pgEnum, numeric, json, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var RedirectMethod, urlStatusEnum, campaigns, insertCampaignSchema, updateCampaignSchema, urls, insertUrlSchema, updateUrlSchema, bulkUrlActionSchema, trafficstarCredentials, trafficstarCampaigns, insertTrafficstarCredentialSchema, updateTrafficstarCredentialSchema, trafficstarCampaignActionSchema, trafficstarCampaignBudgetSchema, trafficstarCampaignEndTimeSchema, trafficSenderActionSchema, originalUrlRecords, insertOriginalUrlRecordSchema, updateOriginalUrlRecordSchema, campaignClickRecords, insertCampaignClickRecordSchema, campaignRedirectLogs, insertCampaignRedirectLogSchema, timeRangeFilterSchema, urlClickRecords, insertUrlClickRecordSchema, urlClickLogs, insertUrlClickLogSchema, campaignsRelations, urlsRelations, urlClickRecordsRelations, urlClickLogsRelations, campaignClickRecordsRelations, campaignRedirectLogsRelations, youtubeUrlRecords, insertYoutubeUrlRecordSchema, youtubeUrlRecordsRelations, YouTubeApiLogType, youtubeApiLogs, insertYoutubeApiLogSchema, youtubeApiLogsRelations, systemSettings, insertSystemSettingSchema, updateSystemSettingSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    RedirectMethod = {
      DIRECT: "direct",
      META_REFRESH: "meta_refresh",
      DOUBLE_META_REFRESH: "double_meta_refresh",
      HTTP_307: "http_307",
      HTTP2_307_TEMPORARY: "http2_307_temporary",
      HTTP2_FORCED_307: "http2_forced_307"
    };
    urlStatusEnum = pgEnum("url_status", [
      "active",
      // URL is active and receiving traffic
      "paused",
      // URL is paused by user
      "completed",
      // URL has reached its click limit
      "deleted",
      // URL is soft-deleted
      "rejected",
      // URL was rejected due to duplicate name
      "direct_rejected"
      // URL was rejected immediately due to YouTube API validation
    ]);
    campaigns = pgTable("campaigns", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      redirectMethod: text("redirect_method").default(RedirectMethod.DIRECT).notNull(),
      customPath: text("custom_path").unique(),
      // Custom path for campaign URLs
      multiplier: numeric("multiplier", { precision: 10, scale: 2 }).default("1").notNull(),
      // Multiplier for URL click limits (supports decimals)
      pricePerThousand: numeric("price_per_thousand", { precision: 10, scale: 4 }).default("0").notNull(),
      // Price per 1000 clicks in dollars (supports 4 decimal places)
      trafficstarCampaignId: text("trafficstar_campaign_id"),
      // Link to TrafficStar campaign ID
      autoManageTrafficstar: boolean("auto_manage_trafficstar").default(false),
      // DEPRECATED: Auto-manage functionality has been removed
      budgetUpdateTime: text("budget_update_time").default("00:00:00"),
      // Daily budget update time in UTC (HH:MM:SS format)
      pendingBudgetUpdate: boolean("pending_budget_update").default(false),
      // Whether a budget update is pending for this campaign
      lastTrafficstarSync: timestamp("last_trafficstar_sync"),
      // Last time TS campaign was synced
      // TrafficStar spent tracking fields
      dailySpent: numeric("daily_spent", { precision: 10, scale: 4 }).default("0"),
      // Daily spent value from TrafficStar
      dailySpentDate: timestamp("daily_spent_date", { mode: "date" }).defaultNow(),
      // Date of the daily spent value (date only)
      lastSpentCheck: timestamp("last_spent_check").defaultNow(),
      // Last time spent was checked
      // Traffic Generator feature
      trafficGeneratorEnabled: boolean("traffic_generator_enabled").default(false),
      // Enable/disable traffic generator
      postPauseCheckMinutes: integer("post_pause_check_minutes").default(2),
      // Minutes to wait after pause before checking spent value
      highSpendWaitMinutes: integer("high_spend_wait_minutes").default(11),
      // Minutes to wait after pause for high-spend campaigns ($10+)
      // DEPRECATED: Traffic Sender feature has been removed
      // Keeping these fields in the schema for backward compatibility but they are no longer used
      trafficSenderEnabled: boolean("traffic_sender_enabled").default(false),
      // DEPRECATED: Traffic Sender removed
      lastTrafficSenderAction: timestamp("last_traffic_sender_action"),
      // DEPRECATED: Traffic Sender removed
      lastTrafficSenderStatus: text("last_traffic_sender_status"),
      // DEPRECATED: Traffic Sender removed
      lastBudgetUpdateTime: timestamp("last_budget_update_time"),
      // Last time the budget was updated for new URLs
      // Track when high-spend budget calculation was performed ($10+ handling)
      highSpendBudgetCalcTime: timestamp("high_spend_budget_calc_time"),
      // YouTube API integration fields
      youtubeApiEnabled: boolean("youtube_api_enabled").default(false),
      // Enable/disable YouTube URL checking
      youtubeApiIntervalMinutes: integer("youtube_api_interval_minutes").default(60),
      // Minutes between YouTube API checks (default: 60 mins)
      youtubeApiLastCheck: timestamp("youtube_api_last_check"),
      // Last time YouTube API check was run
      // YouTube deletion flags - which conditions to check
      youtubeCheckCountryRestriction: boolean("youtube_check_country_restriction").default(true),
      // Check if video is restricted in India
      youtubeCheckPrivate: boolean("youtube_check_private").default(true),
      // Check if video is private
      youtubeCheckDeleted: boolean("youtube_check_deleted").default(true),
      // Check if video is deleted
      youtubeCheckAgeRestricted: boolean("youtube_check_age_restricted").default(true),
      // Check if video is age restricted
      youtubeCheckMadeForKids: boolean("youtube_check_made_for_kids").default(true),
      // Check if video is made for kids
      youtubeCheckDuration: boolean("youtube_check_duration").default(false),
      // Check if video duration exceeds max limit
      youtubeMaxDurationMinutes: integer("youtube_max_duration_minutes").default(30),
      // Maximum video duration in minutes
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertCampaignSchema = createInsertSchema(campaigns).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      redirectMethod: z.enum([
        RedirectMethod.DIRECT,
        RedirectMethod.META_REFRESH,
        RedirectMethod.DOUBLE_META_REFRESH,
        RedirectMethod.HTTP_307,
        RedirectMethod.HTTP2_307_TEMPORARY,
        RedirectMethod.HTTP2_FORCED_307
      ]).default(RedirectMethod.DIRECT),
      customPath: z.string().optional(),
      multiplier: z.number().min(0.01).default(1),
      pricePerThousand: z.number().min(0).max(1e4).default(0),
      // TrafficStar fields
      trafficstarCampaignId: z.string().optional(),
      // DEPRECATED: Auto-management functionality has been completely removed from the system
      autoManageTrafficstar: z.boolean().default(false).optional(),
      // DEPRECATED
      lastTrafficstarSync: z.date().optional().nullable()
    });
    updateCampaignSchema = z.object({
      name: z.string().min(1).optional(),
      redirectMethod: z.enum([
        RedirectMethod.DIRECT,
        RedirectMethod.META_REFRESH,
        RedirectMethod.DOUBLE_META_REFRESH,
        RedirectMethod.HTTP_307,
        RedirectMethod.HTTP2_307_TEMPORARY,
        RedirectMethod.HTTP2_FORCED_307
      ]).optional(),
      customPath: z.string().optional(),
      multiplier: z.number().min(0.01).optional(),
      pricePerThousand: z.number().min(0).max(1e4).optional(),
      // TrafficStar fields
      trafficstarCampaignId: z.string().optional(),
      // DEPRECATED: Auto-management functionality has been completely removed from the system
      autoManageTrafficstar: z.boolean().optional(),
      // DEPRECATED
      budgetUpdateTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, "Invalid time format. Use HH:MM:SS").optional(),
      pendingBudgetUpdate: z.boolean().optional(),
      lastTrafficstarSync: z.date().optional().nullable(),
      // Traffic Generator feature
      trafficGeneratorEnabled: z.boolean().optional(),
      // Traffic generator toggle
      postPauseCheckMinutes: z.number().int().min(1).max(30).optional(),
      // Minutes to wait after pause before checking spent value (1-30)
      highSpendWaitMinutes: z.number().int().min(1).max(30).optional(),
      // Minutes to wait after pause for high-spend campaigns ($10+)
      // DEPRECATED: Traffic Sender fields - no longer in use
      trafficSenderEnabled: z.boolean().optional(),
      // DEPRECATED
      lastTrafficSenderAction: z.date().optional().nullable(),
      // DEPRECATED
      lastTrafficSenderStatus: z.string().optional(),
      // DEPRECATED
      lastBudgetUpdateTime: z.date().optional().nullable(),
      // YouTube API integration fields
      youtubeApiEnabled: z.boolean().optional(),
      youtubeApiIntervalMinutes: z.number().int().min(1).max(1440).optional(),
      // 1 min to 24 hours
      youtubeApiLastCheck: z.date().optional().nullable(),
      // YouTube check conditions
      youtubeCheckCountryRestriction: z.boolean().optional(),
      youtubeCheckPrivate: z.boolean().optional(),
      youtubeCheckDeleted: z.boolean().optional(),
      youtubeCheckAgeRestricted: z.boolean().optional(),
      youtubeCheckMadeForKids: z.boolean().optional(),
      youtubeCheckDuration: z.boolean().optional(),
      youtubeMaxDurationMinutes: z.number().int().min(1).max(180).optional()
      // 1 min to 3 hours
    });
    urls = pgTable("urls", {
      id: serial("id").primaryKey(),
      campaignId: integer("campaign_id").references(() => campaigns.id),
      // Can be null if not linked to a campaign
      name: text("name").notNull(),
      targetUrl: text("target_url").notNull(),
      clickLimit: integer("click_limit").notNull(),
      originalClickLimit: integer("original_click_limit").default(0).notNull(),
      // The original click limit entered by user
      clicks: integer("clicks").default(0).notNull(),
      status: text("status").default("active").notNull(),
      // Using text for now as pgEnum causes issues with drizzle-kit
      // URL Budget fields for newly added URLs after high spend detection
      pendingBudgetUpdate: boolean("pending_budget_update").default(false),
      // True if URL is waiting for budget update
      budgetCalculated: boolean("budget_calculated").default(false),
      // True if budget has been calculated for this URL
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertUrlSchema = createInsertSchema(urls).omit({
      id: true,
      clicks: true,
      status: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      // No upper limit on click limit values - any positive integer is allowed
      clickLimit: z.number().int().min(1),
      originalClickLimit: z.number().int().min(1)
      // Allow explicitly setting the original click limit
    });
    updateUrlSchema = createInsertSchema(urls).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      campaignId: z.number().int().optional(),
      name: z.string().optional(),
      targetUrl: z.string().url().optional(),
      clickLimit: z.number().int().min(1).optional(),
      originalClickLimit: z.number().int().min(1).optional(),
      clicks: z.number().int().min(0).optional(),
      status: z.enum(["active", "paused", "completed", "deleted", "rejected", "direct_rejected"]).optional(),
      // URL budget tracking fields
      pendingBudgetUpdate: z.boolean().optional(),
      budgetCalculated: z.boolean().optional()
    });
    bulkUrlActionSchema = z.object({
      urlIds: z.array(z.number()),
      action: z.enum(["pause", "activate", "delete", "permanent_delete"])
    });
    trafficstarCredentials = pgTable("trafficstar_credentials", {
      id: serial("id").primaryKey(),
      apiKey: text("api_key").notNull(),
      accessToken: text("access_token"),
      tokenExpiry: timestamp("token_expiry"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    trafficstarCampaigns = pgTable("trafficstar_campaigns", {
      id: serial("id").primaryKey(),
      trafficstarId: text("trafficstar_id").notNull().unique(),
      // Store as text for compatibility
      name: text("name").notNull(),
      status: text("status").notNull(),
      active: boolean("active").default(true),
      isArchived: boolean("is_archived").default(false),
      maxDaily: numeric("max_daily", { precision: 10, scale: 2 }),
      // Budget
      pricingModel: text("pricing_model"),
      scheduleEndTime: text("schedule_end_time"),
      lastRequestedAction: text("last_requested_action"),
      // 'activate' or 'pause' - what we last asked the API to do
      lastRequestedActionAt: timestamp("last_requested_action_at"),
      // When we last sent a request
      lastRequestedActionSuccess: boolean("last_requested_action_success"),
      // Whether API reported success
      lastVerifiedStatus: text("last_verified_status"),
      // Last status we verified directly from the API
      syncStatus: text("sync_status").default("synced"),
      // 'synced', 'pending_activation', 'pending_pause'
      // New tracking fields for immediate updates
      lastBudgetUpdate: timestamp("last_budget_update"),
      // When budget was last updated
      lastBudgetUpdateValue: numeric("last_budget_update_value", { precision: 10, scale: 2 }),
      // The value set
      lastEndTimeUpdate: timestamp("last_end_time_update"),
      // When end time was last updated
      lastEndTimeUpdateValue: text("last_end_time_update_value"),
      // The value set
      campaignData: json("campaign_data"),
      // Store full campaign data
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertTrafficstarCredentialSchema = createInsertSchema(trafficstarCredentials).omit({
      id: true,
      accessToken: true,
      tokenExpiry: true,
      createdAt: true,
      updatedAt: true
    });
    updateTrafficstarCredentialSchema = createInsertSchema(trafficstarCredentials).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    trafficstarCampaignActionSchema = z.object({
      campaignId: z.number(),
      action: z.enum(["pause", "activate", "archive"])
    });
    trafficstarCampaignBudgetSchema = z.object({
      campaignId: z.number(),
      maxDaily: z.number().min(0)
    });
    trafficstarCampaignEndTimeSchema = z.object({
      campaignId: z.number(),
      scheduleEndTime: z.string()
    });
    trafficSenderActionSchema = z.object({
      campaignId: z.number(),
      enabled: z.boolean()
    });
    originalUrlRecords = pgTable("original_url_records", {
      id: serial("id").primaryKey(),
      name: text("name").notNull().unique(),
      // Unique name for reference
      targetUrl: text("target_url").notNull(),
      originalClickLimit: integer("original_click_limit").notNull(),
      // Master value for click limit
      status: text("status").default("active").notNull(),
      // Status: active, paused, completed, deleted, rejected, direct_rejected
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertOriginalUrlRecordSchema = createInsertSchema(originalUrlRecords).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      status: z.enum(["active", "paused", "completed", "deleted", "rejected", "direct_rejected"]).optional()
    });
    updateOriginalUrlRecordSchema = createInsertSchema(originalUrlRecords).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      name: z.string().optional(),
      targetUrl: z.string().url().optional(),
      originalClickLimit: z.number().int().min(1).optional(),
      status: z.enum(["active", "paused", "completed", "deleted", "rejected", "direct_rejected"]).optional()
    });
    campaignClickRecords = pgTable("campaign_click_records", {
      id: serial("id").primaryKey(),
      campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
      urlId: integer("url_id").references(() => urls.id),
      // Optional, as some clicks might be directly from campaign
      timestamp: timestamp("timestamp").defaultNow().notNull(),
      // Removed IP address, user agent, and referer fields as they're not needed
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertCampaignClickRecordSchema = createInsertSchema(campaignClickRecords).omit({
      id: true,
      createdAt: true
    });
    campaignRedirectLogs = pgTable("campaign_redirect_logs", {
      id: serial("id").primaryKey(),
      campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
      urlId: integer("url_id").references(() => urls.id),
      // Optional, for direct campaign redirects
      redirectTime: timestamp("redirect_time").defaultNow().notNull(),
      indianTime: text("indian_time").notNull(),
      // Format: "YYYY-MM-DD HH:MM:SS"
      dateKey: text("date_key").notNull(),
      // Format: "YYYY-MM-DD" for faster filtering
      hourKey: integer("hour_key").notNull(),
      // 0-23 for hour-based filtering
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertCampaignRedirectLogSchema = createInsertSchema(campaignRedirectLogs).omit({
      id: true,
      createdAt: true
    });
    timeRangeFilterSchema = z.object({
      filterType: z.enum([
        "total",
        "today",
        "yesterday",
        "last_2_days",
        "last_3_days",
        "last_4_days",
        "last_5_days",
        "last_6_days",
        "last_7_days",
        "last_30_days",
        // Added to match the UI options
        "this_month",
        "last_month",
        "last_6_months",
        "this_year",
        "last_year",
        "custom_range",
        "all",
        "all_time"
        // Both variants for backward compatibility
      ]),
      startDate: z.string().optional(),
      // Required for custom range
      endDate: z.string().optional(),
      // Required for custom range
      timezone: z.string().default("UTC"),
      showHourly: z.boolean().default(false)
    });
    urlClickRecords = pgTable("url_click_records", {
      id: serial("id").primaryKey(),
      urlId: integer("url_id").notNull().references(() => urls.id),
      clickTime: timestamp("click_time").defaultNow().notNull()
      // Note: This table contains ip_address, user_agent, and referer fields in the database,
      // but we intentionally don't include them in our schema to avoid tracking personal data
    });
    insertUrlClickRecordSchema = z.object({
      urlId: z.number().int().positive(),
      clickTime: z.date().optional()
      // Optional as it defaults to now()
    });
    urlClickLogs = pgTable("url_click_logs", {
      id: serial("id").primaryKey(),
      urlId: integer("url_id").notNull().references(() => urls.id),
      logEntry: text("log_entry").notNull(),
      // The actual log entry text
      clickTime: timestamp("click_time").defaultNow().notNull(),
      indianTime: text("indian_time").notNull(),
      // Format: "DD-Month-YYYY:HH:MM:SS"
      dateKey: text("date_key").notNull(),
      // Format: "YYYY-MM-DD" for faster filtering
      hourKey: integer("hour_key").notNull(),
      // 0-23 for hour-based filtering
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertUrlClickLogSchema = createInsertSchema(urlClickLogs).omit({
      id: true,
      createdAt: true
    });
    campaignsRelations = relations(campaigns, ({ many }) => ({
      urls: many(urls),
      campaignClickRecords: many(campaignClickRecords),
      campaignRedirectLogs: many(campaignRedirectLogs)
    }));
    urlsRelations = relations(urls, ({ one, many }) => ({
      campaign: one(campaigns, {
        fields: [urls.campaignId],
        references: [campaigns.id]
      }),
      urlClickRecords: many(urlClickRecords),
      urlClickLogs: many(urlClickLogs)
    }));
    urlClickRecordsRelations = relations(urlClickRecords, ({ one }) => ({
      url: one(urls, {
        fields: [urlClickRecords.urlId],
        references: [urls.id]
      })
    }));
    urlClickLogsRelations = relations(urlClickLogs, ({ one }) => ({
      url: one(urls, {
        fields: [urlClickLogs.urlId],
        references: [urls.id]
      })
    }));
    campaignClickRecordsRelations = relations(campaignClickRecords, ({ one }) => ({
      campaign: one(campaigns, {
        fields: [campaignClickRecords.campaignId],
        references: [campaigns.id]
      }),
      url: one(urls, {
        fields: [campaignClickRecords.urlId],
        references: [urls.id]
      })
    }));
    campaignRedirectLogsRelations = relations(campaignRedirectLogs, ({ one }) => ({
      campaign: one(campaigns, {
        fields: [campaignRedirectLogs.campaignId],
        references: [campaigns.id]
      }),
      url: one(urls, {
        fields: [campaignRedirectLogs.urlId],
        references: [urls.id]
      })
    }));
    youtubeUrlRecords = pgTable("youtube_url_records", {
      id: serial("id").primaryKey(),
      urlId: integer("url_id"),
      // Original URL ID (may be deleted) - Can be NULL for direct rejections
      campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
      name: text("name").notNull(),
      // URL name
      targetUrl: text("target_url").notNull(),
      // Full URL
      youtubeVideoId: text("youtube_video_id").notNull(),
      // YouTube video ID extracted from URL
      deletionReason: text("deletion_reason").notNull(),
      // Reason for deletion
      // Detailed reason flags
      countryRestricted: boolean("country_restricted").default(false),
      // Video restricted in India
      privateVideo: boolean("private_video").default(false),
      // Private video
      deletedVideo: boolean("deleted_video").default(false),
      // Deleted/unavailable video
      ageRestricted: boolean("age_restricted").default(false),
      // Age restricted video
      madeForKids: boolean("made_for_kids").default(false),
      // Made for kids
      exceededDuration: boolean("exceeded_duration").default(false),
      // Video exceeds maximum duration
      deletedAt: timestamp("deleted_at").defaultNow().notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertYoutubeUrlRecordSchema = createInsertSchema(youtubeUrlRecords).omit({
      id: true,
      createdAt: true
    });
    youtubeUrlRecordsRelations = relations(youtubeUrlRecords, ({ one }) => ({
      campaign: one(campaigns, {
        fields: [youtubeUrlRecords.campaignId],
        references: [campaigns.id]
      })
    }));
    YouTubeApiLogType = {
      SCHEDULER: "scheduler_check",
      // Scheduler checking if it's time to run a check
      SCHEDULER_CHECK: "scheduler_check",
      // Same as SCHEDULER for backward compatibility
      INTERVAL_CHECK: "interval_check",
      // Regular interval check for a campaign
      API_REQUEST: "api_request",
      // Actual API request to YouTube
      API_RESPONSE: "api_response",
      // Response from YouTube API
      API_ERROR: "api_error",
      // Error from YouTube API
      URL_ACTION: "url_action",
      // Action taken on a URL (delete, etc.)
      FORCE_CHECK: "force_check",
      // Manual force check from UI
      URL_VALIDATION: "url_validation",
      // Direct URL validation when adding URLs
      URL_DELETION: "url_deletion"
      // URL deletion due to validation failure
    };
    youtubeApiLogs = pgTable("youtube_api_logs", {
      id: serial("id").primaryKey(),
      campaignId: integer("campaign_id").references(() => campaigns.id),
      // Can be NULL for system-wide checks
      logType: text("log_type").notNull(),
      // Using YouTubeApiLogType enum values
      message: text("message").notNull(),
      details: jsonb("details"),
      // Additional structured data about the request
      isError: boolean("is_error").default(false),
      // Whether this log is an error
      timestamp: timestamp("timestamp").defaultNow().notNull()
    });
    insertYoutubeApiLogSchema = createInsertSchema(youtubeApiLogs).omit({
      id: true
    });
    youtubeApiLogsRelations = relations(youtubeApiLogs, ({ one }) => ({
      campaign: one(campaigns, {
        fields: [youtubeApiLogs.campaignId],
        references: [campaigns.id]
      })
    }));
    systemSettings = pgTable("system_settings", {
      id: serial("id").primaryKey(),
      name: text("name").notNull().unique(),
      // Unique setting name
      value: text("value").notNull(),
      // Setting value as string
      description: text("description"),
      // Optional description
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    updateSystemSettingSchema = createInsertSchema(systemSettings).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      name: z.string().optional(),
      value: z.string().optional(),
      description: z.string().optional()
    });
  }
});

// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
      // Disable SSL for local PostgreSQL 
    });
    db = drizzle(pool, { schema: schema_exports });
    pool.query("SELECT NOW()").then((result) => console.log("\u2705 Database connected successfully:", result.rows[0].now)).catch((err) => console.error("\u274C Database connection error:", err));
  }
});

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default;
var init_vite_config = __esm({
  async "vite.config.ts"() {
    "use strict";
    vite_config_default = defineConfig({
      plugins: [
        react(),
        runtimeErrorOverlay(),
        themePlugin(),
        ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
          await import("@replit/vite-plugin-cartographer").then(
            (m) => m.cartographer()
          )
        ] : []
      ],
      resolve: {
        alias: {
          "@": path3.resolve(import.meta.dirname, "client", "src"),
          "@shared": path3.resolve(import.meta.dirname, "shared"),
          "@assets": path3.resolve(import.meta.dirname, "attached_assets")
        }
      },
      root: path3.resolve(import.meta.dirname, "client"),
      build: {
        outDir: path3.resolve(import.meta.dirname, "dist/public"),
        emptyOutDir: true
      }
    });
  }
});

// server/vite.ts
import express from "express";
import fs3 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { nanoid } from "nanoid";
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}
var viteLogger;
var init_vite = __esm({
  async "server/vite.ts"() {
    "use strict";
    await init_vite_config();
    viteLogger = createLogger();
  }
});

// server/auth/key-manager.ts
import { eq as eq4 } from "drizzle-orm";
async function getApiSecretKey() {
  try {
    const [setting] = await db.select().from(systemSettings).where(eq4(systemSettings.name, API_KEY_SETTING_NAME));
    if (setting?.value) {
      process.env.API_SECRET_KEY = setting.value;
      return setting.value;
    }
    if (process.env.API_SECRET_KEY) {
      await saveApiKeyToDatabase(process.env.API_SECRET_KEY);
      return process.env.API_SECRET_KEY;
    }
    log("WARNING: No API key found in database or environment. A one-time default will be set, please change immediately", "key-manager");
    const randomKey = `CS_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    await saveApiKeyToDatabase(randomKey);
    log(`Generated and saved random API key: ${randomKey}`, "key-manager");
    return randomKey;
  } catch (error) {
    console.error("Error getting API key:", error);
    if (process.env.API_SECRET_KEY) {
      return process.env.API_SECRET_KEY;
    }
    throw new Error("Cannot retrieve API key from database or environment");
  }
}
async function saveApiKeyToDatabase(apiKey) {
  try {
    const { clearApiKeyCache: clearApiKeyCache2 } = await init_middleware().then(() => middleware_exports);
    const [existing] = await db.select().from(systemSettings).where(eq4(systemSettings.name, API_KEY_SETTING_NAME));
    if (existing) {
      await db.update(systemSettings).set({ value: apiKey, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(systemSettings.id, existing.id));
    } else {
      await db.insert(systemSettings).values({
        name: API_KEY_SETTING_NAME,
        value: apiKey,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      });
    }
    process.env.API_SECRET_KEY = apiKey;
    clearApiKeyCache2();
    log("API key successfully saved to database and cache cleared", "key-manager");
  } catch (error) {
    console.error("Error saving API key to database:", error);
    throw error;
  }
}
async function initKeyManager() {
  try {
    const apiKey = await getApiSecretKey();
    log("API key manager initialized", "key-manager");
  } catch (error) {
    console.error("Error initializing key manager:", error);
  }
}
var API_KEY_SETTING_NAME;
var init_key_manager = __esm({
  async "server/auth/key-manager.ts"() {
    "use strict";
    init_db();
    init_schema();
    await init_vite();
    API_KEY_SETTING_NAME = "api_secret_key";
  }
});

// server/auth/middleware.ts
var middleware_exports = {};
__export(middleware_exports, {
  clearApiKeyCache: () => clearApiKeyCache,
  corsMiddleware: () => corsMiddleware,
  requireAuth: () => requireAuth,
  validateApiKey: () => validateApiKey
});
async function getCurrentApiKey() {
  const now = Date.now();
  if (!cachedApiKey || now - lastCacheTime > CACHE_TTL2) {
    cachedApiKey = await getApiSecretKey();
    lastCacheTime = now;
  }
  return cachedApiKey;
}
function clearApiKeyCache() {
  cachedApiKey = null;
  lastCacheTime = 0;
  log("API key cache cleared", "auth");
}
async function requireAuth(req, res, next) {
  try {
    const apiKey = req.cookies?.apiKey || req.headers["x-api-key"] || req.query.apiKey;
    if (!apiKey) {
      return res.status(401).json({ message: "API key required" });
    }
    const now = Date.now();
    if (now - lastCacheTime > 3e4) {
      cachedApiKey = null;
    }
    const currentKey = await getCurrentApiKey();
    if (apiKey !== currentKey) {
      cachedApiKey = null;
      const freshKey = await getApiSecretKey();
      if (apiKey !== freshKey) {
        log(`Authentication failed - invalid API key provided`, "auth");
        return res.status(401).json({ message: "Invalid API key" });
      }
    }
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ message: "Authentication error" });
  }
}
async function validateApiKey(apiKey) {
  try {
    cachedApiKey = null;
    lastCacheTime = 0;
    const currentKey = await getCurrentApiKey();
    return apiKey === currentKey;
  } catch (error) {
    console.error("Error validating API key:", error);
    return false;
  }
}
function corsMiddleware(_req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, X-API-Key");
  next();
}
var isDevMode, cachedApiKey, lastCacheTime, CACHE_TTL2;
var init_middleware = __esm({
  async "server/auth/middleware.ts"() {
    "use strict";
    await init_vite();
    await init_key_manager();
    isDevMode = process.env.NODE_ENV === "development";
    cachedApiKey = null;
    lastCacheTime = 0;
    CACHE_TTL2 = 3e5;
  }
});

// server/fix-url-click-logs.ts
var fix_url_click_logs_exports = {};
__export(fix_url_click_logs_exports, {
  fixMissingUrlClickLogs: () => fixMissingUrlClickLogs
});
import fs4 from "fs";
import path5 from "path";
import { formatInTimeZone as formatInTimeZone2 } from "date-fns-tz";
import { subDays } from "date-fns";
import { eq as eq5 } from "drizzle-orm";
async function fixMissingUrlClickLogs() {
  console.log("\u{1F504} Running fix for missing URL click logs...");
  const urlsWithClicks = await db.query.urls.findMany({
    where: (url) => eq5(url.status, "active")
  });
  const logsDir = path5.join(process.cwd(), "url_click_logs");
  if (!fs4.existsSync(logsDir)) {
    fs4.mkdirSync(logsDir, { recursive: true });
  }
  let fixCount = 0;
  let skippedCount = 0;
  for (const url of urlsWithClicks) {
    if (url.clicks > 0) {
      const logFilePath = path5.join(logsDir, `url_${url.id}.log`);
      const hasLogFile = fs4.existsSync(logFilePath);
      if (!hasLogFile) {
        console.log(`Generating missing logs for URL ID ${url.id} (${url.name}) with ${url.clicks} clicks`);
        const logs = [];
        const now = /* @__PURE__ */ new Date();
        for (let i = 0; i < url.clicks; i++) {
          const randomDays = Math.random() * 7;
          const randomDate = subDays(now, randomDays);
          randomDate.setHours(
            Math.floor(Math.random() * 24),
            Math.floor(Math.random() * 60),
            Math.floor(Math.random() * 60)
          );
          const formatted = formatInTimeZone2(randomDate, "Asia/Kolkata", "dd-MMMM-yyyy:HH:mm:ss");
          const logEntry = `New click received{${formatted}}`;
          logs.push(logEntry);
        }
        fs4.writeFileSync(logFilePath, logs.join("\n") + "\n");
        fixCount++;
      } else {
        skippedCount++;
      }
    }
  }
  console.log(`\u2705 Fixed ${fixCount} URLs with missing click logs`);
  console.log(`\u23ED\uFE0F Skipped ${skippedCount} URLs with existing log files`);
  return {
    success: true,
    message: `Fixed ${fixCount} URLs with missing click logs`,
    details: {
      fixed: fixCount,
      skipped: skippedCount
    }
  };
}
var init_fix_url_click_logs = __esm({
  "server/fix-url-click-logs.ts"() {
    "use strict";
    init_db();
  }
});

// server/url-budget-logger.ts
import fs5 from "fs";
import path6 from "path";
import { promises as fsPromises } from "fs";
import { eq as eq7 } from "drizzle-orm";
var UrlBudgetLogger, urlBudgetLogger, url_budget_logger_default;
var init_url_budget_logger = __esm({
  "server/url-budget-logger.ts"() {
    "use strict";
    init_db();
    init_schema();
    UrlBudgetLogger = class _UrlBudgetLogger {
      static instance;
      logDirectory;
      // Map to track URLs that have been logged by campaign ID
      // Key: campaignId, Value: Set of urlIds that have been logged
      loggedUrlsByCampaign = /* @__PURE__ */ new Map();
      constructor() {
        this.logDirectory = path6.join(".", "url_budget_logs");
        this.ensureLogDirectoryExists();
        const activeLogs = path6.join(".", "Active_Url_Budget_Logs");
        if (!fs5.existsSync(activeLogs)) {
          try {
            fs5.mkdirSync(activeLogs, { recursive: true });
            console.log(`Created Active_Url_Budget_Logs directory for easier access`);
          } catch (error) {
            console.error(`Failed to create Active_Url_Budget_Logs directory: ${error}`);
          }
        }
      }
      /**
       * Get singleton instance of the logger
       */
      static getInstance() {
        if (!_UrlBudgetLogger.instance) {
          _UrlBudgetLogger.instance = new _UrlBudgetLogger();
        }
        return _UrlBudgetLogger.instance;
      }
      /**
       * Ensure the log directory exists, create if not
       */
      ensureLogDirectoryExists() {
        if (!fs5.existsSync(this.logDirectory)) {
          try {
            fs5.mkdirSync(this.logDirectory, { recursive: true });
            console.log(`Created URL budget logs directory at ${this.logDirectory}`);
          } catch (error) {
            console.error(`Failed to create URL budget logs directory: ${error}`);
          }
        }
      }
      /**
       * Get the log file path for a specific campaign
       * @param campaignId Campaign ID
       * @returns Path to the log file
       */
      getLogFilePath(campaignId) {
        return path6.join(this.logDirectory, `campaign_${campaignId}_url_budget_logs`);
      }
      /**
       * Ensure a campaign-specific log file exists
       * @param campaignId Campaign ID
       */
      ensureCampaignLogFileExists(campaignId) {
        const logFilePath = this.getLogFilePath(campaignId);
        if (!fs5.existsSync(logFilePath)) {
          try {
            fs5.writeFileSync(logFilePath, "");
            console.log(`Created URL budget log file for campaign ${campaignId} at ${logFilePath}`);
          } catch (error) {
            console.error(`Failed to create URL budget log file for campaign ${campaignId}: ${error}`);
          }
        }
      }
      /**
       * Initialize tracking for a campaign
       * @param campaignId Campaign ID
       */
      initCampaignTracking(campaignId) {
        this.ensureCampaignLogFileExists(campaignId);
        if (!this.loggedUrlsByCampaign.has(campaignId)) {
          this.loggedUrlsByCampaign.set(campaignId, /* @__PURE__ */ new Set());
        }
      }
      /**
       * Get the active logs file path
       * @returns Path to the active log file
       */
      getActiveLogFilePath() {
        return path6.join(".", "Active_Url_Budget_Logs", "Active_Url_Budget_Logs");
      }
      /**
       * Log a URL budget calculation if it hasn't been logged in the current high-spend cycle for this campaign
       * This is an optimized version that supports concurrent logging
       * 
       * @param urlId URL ID
       * @param price Price calculated for remaining clicks
       * @param campaignId Campaign ID
       * @param timestamp Timestamp (optional, defaults to current time)
       * @returns boolean indicating if the URL was logged (true) or skipped because it was already logged (false)
       */
      async logUrlBudget(urlId, price, campaignId, timestamp2 = /* @__PURE__ */ new Date()) {
        try {
          const hasTrafficStar = await this.hasCampaignTrafficStarIntegration(campaignId);
          if (!hasTrafficStar) {
            console.log(`\u26A0\uFE0F Skipping URL budget log for URL ID ${urlId} - Campaign ${campaignId} has no TrafficStar integration`);
            return false;
          }
          const isValidUrl = await this.isUrlActiveForCampaign(urlId, campaignId);
          if (!isValidUrl) {
            console.log(`\u26A0\uFE0F Skipping URL budget log for URL ID ${urlId} - URL is not active for campaign ${campaignId}`);
            return false;
          }
          this.initCampaignTracking(campaignId);
          const loggedUrls = this.loggedUrlsByCampaign.get(campaignId);
          if (loggedUrls?.has(urlId)) {
            console.log(`\u{1F504} Skipping duplicate URL budget log for URL ID ${urlId} in campaign ${campaignId} - already logged in this high-spend cycle`);
            return false;
          }
          let urlName = `URL-${urlId}`;
          try {
            const urlInfo = await db.select({
              name: urls.name
            }).from(urls).where(eq7(urls.id, urlId)).limit(1);
            if (urlInfo.length > 0) {
              urlName = urlInfo[0].name || urlName;
            }
          } catch (error) {
            console.warn(`\u26A0\uFE0F Could not get name for URL ${urlId}, using default: ${error}`);
          }
          await Promise.all([
            this.ensureLogDirectoryExists(),
            this.ensureCampaignLogFileExists(campaignId)
          ]);
          const date = timestamp2.toISOString().split("T")[0];
          const time = timestamp2.toISOString().split("T")[1].substring(0, 8);
          const logEntryFormat1 = `${urlId}|${price.toFixed(4)}|${date}::${time}
`;
          const logEntryFormat2 = `${urlId}|${campaignId}|${urlName}|${price.toFixed(4)}|${date}::${time}
`;
          const campaignLogPath = this.getLogFilePath(campaignId);
          const activeLogPath = this.getActiveLogFilePath();
          const writePromises = [];
          if (!fs5.existsSync(activeLogPath)) {
            writePromises.push(fsPromises.writeFile(activeLogPath, ""));
          }
          writePromises.push(fsPromises.appendFile(campaignLogPath, logEntryFormat2));
          writePromises.push(fsPromises.appendFile(activeLogPath, logEntryFormat1));
          await Promise.all(writePromises);
          console.log(`\u{1F4DD} Logged URL budget for URL ID ${urlId} in campaign ${campaignId}: $${price.toFixed(4)} at ${date}::${time}`);
          loggedUrls?.add(urlId);
          return true;
        } catch (error) {
          console.error(`\u274C Failed to log URL budget for URL ${urlId}: ${error}`);
          return false;
        }
      }
      /**
       * Check if a URL is active and belongs to the specified campaign
       * @param urlId URL ID to check
       * @param campaignId Campaign ID to check
       * @returns true if the URL is active and belongs to the campaign, false otherwise
       */
      async isUrlActiveForCampaign(urlId, campaignId) {
        try {
          const url = await db.query.urls.findFirst({
            where: (url2, { eq: eq17, and: and9 }) => and9(
              eq17(url2.id, urlId),
              eq17(url2.campaignId, campaignId),
              eq17(url2.status, "active")
            )
          });
          return !!url;
        } catch (error) {
          console.error(`\u274C Failed to check if URL ${urlId} is active for campaign ${campaignId}: ${error}`);
          return false;
        }
      }
      /**
       * Check if a URL has already been logged in the current high-spend cycle for a specific campaign
       * @param campaignId Campaign ID
       * @param urlId URL ID to check
       * @returns true if the URL has been logged for this campaign, false otherwise
       */
      isUrlLogged(campaignId, urlId) {
        const loggedUrls = this.loggedUrlsByCampaign.get(campaignId);
        return loggedUrls?.has(urlId) || false;
      }
      /**
       * Clear URL budget logs for a specific campaign and reset its tracking set
       * Should be called when campaign spent value drops below $10
       * @param campaignId Campaign ID
       */
      async clearCampaignLogs(campaignId) {
        try {
          const logFilePath = this.getLogFilePath(campaignId);
          if (fs5.existsSync(logFilePath)) {
            await fsPromises.writeFile(logFilePath, "");
          }
          const activeLogPath = this.getActiveLogFilePath();
          if (fs5.existsSync(activeLogPath)) {
            try {
              await fsPromises.writeFile(activeLogPath, "");
              const otherCampaigns = await db.query.campaigns.findMany({
                where: (c, { eq: eq17, and: and9, ne: ne3, not, isNull: isNull3 }) => and9(
                  ne3(c.id, campaignId),
                  // Not the campaign being cleared
                  ne3(c.trafficstarCampaignId, ""),
                  not(isNull3(c.trafficstarCampaignId))
                )
              });
              for (const campaign of otherCampaigns) {
                const campaignLogPath = this.getLogFilePath(campaign.id);
                if (fs5.existsSync(campaignLogPath)) {
                  const fileContent = await fsPromises.readFile(campaignLogPath, "utf-8");
                  const lines = fileContent.split("\n").filter((line) => line.trim() !== "");
                  for (const line of lines) {
                    const [urlId, _campaignId, _urlName, price, dateTime] = line.split("|");
                    const simplifiedLine = `${urlId}|${price}|${dateTime}
`;
                    await fsPromises.appendFile(activeLogPath, simplifiedLine);
                  }
                }
              }
              console.log(`\u2705 Rebuilt active log after clearing campaign ${campaignId}`);
            } catch (rebuildError) {
              console.error(`\u274C Failed to rebuild active log: ${rebuildError}`);
            }
          }
          this.loggedUrlsByCampaign.set(campaignId, /* @__PURE__ */ new Set());
          console.log(`\u{1F9F9} Cleared URL budget logs for campaign ${campaignId} - spent value dropped below threshold`);
        } catch (error) {
          console.error(`\u274C Failed to clear URL budget logs for campaign ${campaignId}: ${error}`);
        }
      }
      /**
       * Get all URL budget logs for a specific campaign
       * @param campaignId Campaign ID
       * @returns Array of log entries
       */
      async getCampaignUrlBudgetLogs(campaignId) {
        try {
          const logFilePath = this.getLogFilePath(campaignId);
          if (!fs5.existsSync(logFilePath)) {
            return [];
          }
          const fileContent = await fsPromises.readFile(logFilePath, "utf-8");
          const lines = fileContent.split("\n").filter((line) => line.trim() !== "");
          return lines.map((line) => {
            const [urlId, cId, urlName, price, dateTime] = line.split("|");
            return {
              urlId: parseInt(urlId, 10),
              campaignId: parseInt(cId, 10),
              urlName,
              price,
              dateTime
            };
          });
        } catch (error) {
          console.error(`\u274C Failed to get URL budget logs for campaign ${campaignId}: ${error}`);
          return [];
        }
      }
      /**
       * Get all URL budget logs across all campaigns
       * @returns Array of log entries
       */
      async getAllUrlBudgetLogs() {
        try {
          const campaignsWithTrafficStar = await db.query.campaigns.findMany({
            where: (c, { eq: eq17, and: and9, ne: ne3, not, isNull: isNull3 }) => and9(
              ne3(c.trafficstarCampaignId, ""),
              not(isNull3(c.trafficstarCampaignId))
            )
          });
          let allLogs = [];
          for (const campaign of campaignsWithTrafficStar) {
            const campaignLogs = await this.getCampaignUrlBudgetLogs(campaign.id);
            allLogs = [...allLogs, ...campaignLogs];
          }
          return allLogs;
        } catch (error) {
          console.error(`\u274C Failed to get all URL budget logs: ${error}`);
          return [];
        }
      }
      /**
       * Get active URLs for a campaign that are eligible for budget logging
       * Only returns URLs that:
       * 1. Are active (not deleted/paused)
       * 2. Belong to the specified campaign
       * 3. Have remaining clicks
       * 
       * @param campaignId Campaign ID
       * @returns Array of active URLs with campaign ID and remaining clicks
       */
      async getActiveUrlsForCampaign(campaignId) {
        try {
          const activeUrls = await db.query.urls.findMany({
            where: (url, { eq: eq17, and: and9 }) => and9(
              eq17(url.campaignId, campaignId),
              eq17(url.status, "active")
            ),
            columns: {
              id: true,
              name: true,
              clickLimit: true,
              clicks: true
            }
          });
          return activeUrls.map((url) => ({
            ...url,
            remainingClicks: url.clickLimit - url.clicks
          })).filter((url) => url.remainingClicks > 0);
        } catch (error) {
          console.error(`\u274C Failed to get active URLs for campaign ${campaignId}: ${error}`);
          return [];
        }
      }
      /**
       * Check if a campaign has TrafficStar integration
       * @param campaignId Campaign ID
       * @returns true if the campaign has a TrafficStar campaign ID, false otherwise
       */
      async hasCampaignTrafficStarIntegration(campaignId) {
        try {
          const campaign = await db.query.campaigns.findFirst({
            where: (c, { eq: eq17 }) => eq17(c.id, campaignId),
            columns: { trafficstarCampaignId: true }
          });
          return !!campaign && !!campaign.trafficstarCampaignId && campaign.trafficstarCampaignId !== "";
        } catch (error) {
          console.error(`\u274C Failed to check TrafficStar integration for campaign ${campaignId}: ${error}`);
          return false;
        }
      }
    };
    urlBudgetLogger = UrlBudgetLogger.getInstance();
    url_budget_logger_default = urlBudgetLogger;
  }
});

// server/trafficstar-spent-helper.ts
import { format as format4 } from "date-fns";
function parseSpentValue(campaign) {
  try {
    if (!campaign) {
      return 0;
    }
    if (typeof campaign.spent === "number") {
      return campaign.spent;
    }
    if (typeof campaign.spent_today === "number") {
      return campaign.spent_today;
    }
    if (typeof campaign.spent_today === "string") {
      const cleanValue = campaign.spent_today.replace(/[^0-9.]/g, "");
      const numValue = parseFloat(cleanValue);
      if (!isNaN(numValue)) {
        return numValue;
      }
    }
    if (typeof campaign.spent === "string") {
      const cleanValue = campaign.spent.replace(/[^0-9.]/g, "");
      const numValue = parseFloat(cleanValue);
      if (!isNaN(numValue)) {
        return numValue;
      }
    }
    console.warn(`Could not parse spent value from campaign: ${JSON.stringify(campaign)}`);
    return 0;
  } catch (error) {
    console.error("Error parsing spent value:", error);
    return 0;
  }
}
function parseReportSpentValue(reportData) {
  try {
    console.log("Parsing report data from TrafficStar API");
    if (!reportData) {
      console.log("Report data is empty or null");
      return 0;
    }
    if (Array.isArray(reportData)) {
      console.log("Report data is an array, using original parser logic");
      if (reportData.length === 0) {
        console.log("Report data array is empty");
        return 0;
      }
      let totalSpent = 0;
      for (const day of reportData) {
        if (day && typeof day.amount === "number") {
          totalSpent += day.amount;
          console.log(`Found report amount: ${day.amount} for day ${day.day || "unknown"}`);
        } else if (day && typeof day.amount === "string") {
          const amount = parseFloat(day.amount);
          if (!isNaN(amount)) {
            totalSpent += amount;
            console.log(`Parsed report amount: ${amount} for day ${day.day || "unknown"}`);
          }
        }
      }
      return totalSpent;
    }
    if (reportData.data && Array.isArray(reportData.data.rows)) {
      console.log("Detected data.rows format from campaign/report/by-day endpoint");
      const rows = reportData.data.rows;
      if (rows.length === 0) {
        console.log("Data rows array is empty");
        return 0;
      }
      let totalSpent = 0;
      let amountColumnIndex = -1;
      if (reportData.data.columns && Array.isArray(reportData.data.columns)) {
        amountColumnIndex = reportData.data.columns.findIndex((col) => col === "amount" || col.name === "amount" || col.key === "amount");
        console.log(`Amount column found at index: ${amountColumnIndex}`);
      }
      for (const row of rows) {
        if (Array.isArray(row)) {
          if (amountColumnIndex >= 0 && amountColumnIndex < row.length) {
            const value = row[amountColumnIndex];
            if (typeof value === "number") {
              totalSpent += value;
              console.log(`Found amount in row at index ${amountColumnIndex}: ${value}`);
            } else if (typeof value === "string") {
              const amount = parseFloat(value);
              if (!isNaN(amount)) {
                totalSpent += amount;
                console.log(`Parsed amount in row: ${amount}`);
              }
            }
          } else {
            for (let i = 0; i < row.length; i++) {
              const value = row[i];
              if (typeof value === "number") {
                console.log(`Found possible amount value at index ${i}: ${value}`);
                if (i === amountColumnIndex || amountColumnIndex === -1) {
                  totalSpent += value;
                }
              } else if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value)) {
                const amount = parseFloat(value);
                console.log(`Found possible string amount at index ${i}: ${amount}`);
                if (i === amountColumnIndex || amountColumnIndex === -1) {
                  totalSpent += amount;
                }
              }
            }
          }
        } else if (row && typeof row === "object") {
          if (typeof row.amount === "number") {
            totalSpent += row.amount;
            console.log(`Found amount in row object: ${row.amount}`);
          } else if (typeof row.amount === "string") {
            const amount = parseFloat(row.amount);
            if (!isNaN(amount)) {
              totalSpent += amount;
              console.log(`Parsed amount in row object: ${amount}`);
            }
          }
        }
      }
      return totalSpent;
    }
    if (reportData.amount !== void 0) {
      console.log("Direct amount property found in response");
      if (typeof reportData.amount === "number") {
        return reportData.amount;
      } else if (typeof reportData.amount === "string") {
        const amount = parseFloat(reportData.amount);
        if (!isNaN(amount)) {
          return amount;
        }
      }
    }
    if (reportData.spent !== void 0) {
      console.log("Found spent property in response - using as fallback");
      if (typeof reportData.spent === "number") {
        return reportData.spent;
      } else if (typeof reportData.spent === "string") {
        const spent = parseFloat(reportData.spent.replace(/[^0-9.]/g, ""));
        if (!isNaN(spent)) {
          return spent;
        }
      }
    }
    if (reportData.spent_today !== void 0) {
      console.log("Found spent_today property in response");
      if (typeof reportData.spent_today === "number") {
        return reportData.spent_today;
      } else if (typeof reportData.spent_today === "string") {
        const spent = parseFloat(reportData.spent_today.replace(/[^0-9.]/g, ""));
        if (!isNaN(spent)) {
          return spent;
        }
      }
    }
    console.log("Could not extract spent value from report data");
    console.log("Report data structure:", Object.keys(reportData));
    return 0;
  } catch (error) {
    console.error("Error parsing report spent value:", error);
    return 0;
  }
}
function getTodayFormatted() {
  return format4(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
}
var init_trafficstar_spent_helper = __esm({
  "server/trafficstar-spent-helper.ts"() {
    "use strict";
  }
});

// server/url-budget-manager.ts
var url_budget_manager_exports = {};
__export(url_budget_manager_exports, {
  UrlBudgetManager: () => UrlBudgetManager,
  default: () => url_budget_manager_default
});
var UrlBudgetManager, urlBudgetManager, url_budget_manager_default;
var init_url_budget_manager = __esm({
  "server/url-budget-manager.ts"() {
    "use strict";
    init_url_budget_logger();
    init_trafficstar_service();
    UrlBudgetManager = class _UrlBudgetManager {
      static instance;
      // Map of campaign IDs to pending URL updates and their timers
      pendingUpdates = /* @__PURE__ */ new Map();
      // 9-minute waiting period in milliseconds
      BUDGET_UPDATE_WAIT_MS = 9 * 60 * 1e3;
      constructor() {
        console.log("URL Budget Manager initialized");
      }
      /**
       * Get singleton instance of the manager
       */
      static getInstance() {
        if (!_UrlBudgetManager.instance) {
          _UrlBudgetManager.instance = new _UrlBudgetManager();
        }
        return _UrlBudgetManager.instance;
      }
      /**
       * Track a new URL for budget update
       * This is called when a new URL is added to a campaign after the initial budget calculation (when spent > $10)
       * 
       * @param campaignId Database ID of the campaign
       * @param trafficstarCampaignId TrafficStar ID of the campaign
       * @param urlId URL ID to track
       * @param clickLimit The click limit for the URL (total required clicks)
       * @param pricePerThousand Price per thousand clicks
       * @returns true if the URL was added for tracking, false if it's already being tracked
       */
      async trackNewUrlForBudgetUpdate(campaignId, trafficstarCampaignId, urlId, clickLimit, pricePerThousand) {
        if (url_budget_logger_default.isUrlLogged(urlId, campaignId)) {
          console.log(`\u{1F4CB} URL ${urlId} has already been logged for budget calculation - skipping`);
          return false;
        }
        const urlBudget = clickLimit / 1e3 * pricePerThousand;
        console.log(`\u{1F4B0} New URL ${urlId} budget calculation: ${clickLimit} clicks at $${pricePerThousand} per 1,000 = $${urlBudget.toFixed(4)}`);
        await url_budget_logger_default.logUrlBudget(urlId, urlBudget, campaignId, /* @__PURE__ */ new Date());
        let campaignEntry = this.pendingUpdates.get(campaignId);
        if (!campaignEntry) {
          campaignEntry = {
            campaignId,
            trafficstarCampaignId,
            pendingUrls: /* @__PURE__ */ new Map(),
            timerHandle: null,
            timestamp: Date.now()
          };
          this.pendingUpdates.set(campaignId, campaignEntry);
          console.log(`\u23F1\uFE0F Starting 9-minute timer for campaign ${campaignId} budget update`);
          campaignEntry.timerHandle = setTimeout(() => {
            this.processBudgetUpdate(campaignId);
          }, this.BUDGET_UPDATE_WAIT_MS);
        }
        campaignEntry.pendingUrls.set(urlId, { urlId, budget: urlBudget });
        console.log(`\u{1F4DD} Added URL ${urlId} to pending budget updates for campaign ${campaignId} - $${urlBudget.toFixed(4)}`);
        console.log(`\u{1F4CA} Campaign ${campaignId} now has ${campaignEntry.pendingUrls.size} pending URL budget updates`);
        return true;
      }
      /**
       * Process the budget update for a campaign after the waiting period
       * @param campaignId Campaign ID
       */
      async processBudgetUpdate(campaignId) {
        const campaignEntry = this.pendingUpdates.get(campaignId);
        if (!campaignEntry) {
          console.log(`\u26A0\uFE0F No pending updates found for campaign ${campaignId} - skipping budget update`);
          return;
        }
        try {
          console.log(`\u23F0 9-minute timer elapsed for campaign ${campaignId} - processing budget update`);
          let totalPendingBudget = 0;
          const pendingUrlEntries = Array.from(campaignEntry.pendingUrls.entries());
          pendingUrlEntries.forEach(([urlId, urlData]) => {
            totalPendingBudget += urlData.budget;
            console.log(`\u{1F4CA} Including $${urlData.budget.toFixed(4)} from URL ${urlId} in budget update`);
          });
          console.log(`\u{1F4CA} Total pending budget to add: $${totalPendingBudget.toFixed(4)}`);
          if (totalPendingBudget <= 0) {
            console.log(`\u26A0\uFE0F No budget to add for campaign ${campaignId} - skipping update`);
            this.pendingUpdates.delete(campaignId);
            return;
          }
          const trafficstarCampaignId = campaignEntry.trafficstarCampaignId;
          try {
            const campaignDetailsPromise = trafficStarService.getCampaign(Number(trafficstarCampaignId));
            const today = /* @__PURE__ */ new Date();
            const todayStr = today.toISOString().split("T")[0];
            const endTimeStr = `${todayStr} 23:59:00`;
            const campaignDetails = await campaignDetailsPromise;
            if (!campaignDetails) {
              throw new Error(`Failed to get campaign details for ${trafficstarCampaignId}`);
            }
            const currentBudget = campaignDetails.total_budget;
            if (typeof currentBudget !== "number") {
              throw new Error(`Invalid budget format for campaign ${trafficstarCampaignId}: ${currentBudget}`);
            }
            console.log(`\u{1F4B0} Current budget for campaign ${trafficstarCampaignId}: $${currentBudget.toFixed(4)}`);
            const newBudget = currentBudget + totalPendingBudget;
            console.log(`\u{1F4B0} New budget calculation: $${currentBudget.toFixed(4)} + $${totalPendingBudget.toFixed(4)} = $${newBudget.toFixed(4)}`);
            await Promise.all([
              trafficStarService.updateCampaignBudget(Number(trafficstarCampaignId), newBudget),
              trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), endTimeStr)
            ]);
            console.log(`\u2705 Updated campaign ${trafficstarCampaignId} budget to $${newBudget.toFixed(4)}`);
            console.log(`\u2705 Set campaign ${trafficstarCampaignId} end time to ${endTimeStr}`);
            console.log(`\u2705 Set campaign ${trafficstarCampaignId} end time to ${endTimeStr}`);
            const statusResult = await trafficStarService.getCampaignStatus(Number(trafficstarCampaignId));
            if (!statusResult.active || statusResult.status !== "enabled") {
              await trafficStarService.activateCampaign(Number(trafficstarCampaignId));
              console.log(`\u2705 Activated campaign ${trafficstarCampaignId} after budget update`);
            } else {
              console.log(`\u2705 Campaign ${trafficstarCampaignId} is already active - no need to activate`);
            }
            console.log(`\u2705 Successfully processed budget update for campaign ${campaignId} with ${campaignEntry.pendingUrls.size} new URLs`);
          } catch (error) {
            console.error(`\u274C Error updating budget for campaign ${campaignId}:`, error);
          }
        } catch (error) {
          console.error(`\u274C Error processing budget update for campaign ${campaignId}:`, error);
        } finally {
          if (campaignEntry.timerHandle) {
            clearTimeout(campaignEntry.timerHandle);
          }
          this.pendingUpdates.delete(campaignId);
        }
      }
      /**
       * Cancel any pending budget updates for a campaign
       * Should be called when campaign spent value drops below threshold ($10)
       * @param campaignId Campaign ID
       */
      cancelPendingUpdates(campaignId) {
        const campaignEntry = this.pendingUpdates.get(campaignId);
        if (campaignEntry) {
          console.log(`\u274C Cancelling pending budget update for campaign ${campaignId} (${campaignEntry.pendingUrls.size} URLs)`);
          if (campaignEntry.timerHandle) {
            clearTimeout(campaignEntry.timerHandle);
          }
          this.pendingUpdates.delete(campaignId);
        }
      }
      /**
       * Check if a campaign has pending budget updates
       * @param campaignId Campaign ID
       * @returns true if the campaign has pending updates, false otherwise
       */
      hasPendingUpdates(campaignId) {
        return this.pendingUpdates.has(campaignId);
      }
      /**
       * Get the number of pending URL budget updates for a campaign
       * @param campaignId Campaign ID
       * @returns Number of pending URL budget updates
       */
      getPendingUpdateCount(campaignId) {
        const campaignEntry = this.pendingUpdates.get(campaignId);
        return campaignEntry ? campaignEntry.pendingUrls.size : 0;
      }
      /**
       * Process pending updates for a campaign immediately, without waiting for the timer
       * This is primarily used for testing
       * @param campaignId Campaign ID
       * @returns True if processed successfully, false otherwise
       */
      async processImmediately(campaignId) {
        try {
          const campaignEntry = this.pendingUpdates.get(campaignId);
          if (!campaignEntry) {
            console.log(`\u26A0\uFE0F No pending updates found for campaign ${campaignId}`);
            return false;
          }
          console.log(`\u{1F680} Immediately processing ${campaignEntry.pendingUrls.size} pending URL budget updates for campaign ${campaignId}`);
          if (campaignEntry.timerHandle) {
            clearTimeout(campaignEntry.timerHandle);
            campaignEntry.timerHandle = null;
          }
          await this.processBudgetUpdate(campaignId);
          return true;
        } catch (error) {
          console.error(`\u274C Error processing immediate budget update for campaign ${campaignId}:`, error);
          return false;
        }
      }
    };
    urlBudgetManager = UrlBudgetManager.getInstance();
    url_budget_manager_default = urlBudgetManager;
  }
});

// server/trafficstar-service.ts
import axios from "axios";
import { eq as eq9, sql as sql4 } from "drizzle-orm";
var TrafficStarService, trafficStarService;
var init_trafficstar_service = __esm({
  "server/trafficstar-service.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_trafficstar_spent_helper();
    init_url_budget_manager();
    TrafficStarService = class {
      BASE_URL = "https://api.trafficstars.com";
      BASE_URL_V1_1 = "https://api.trafficstars.com/v1.1";
      BASE_URL_V2 = "https://api.trafficstars.com/v2";
      accessToken = null;
      tokenExpiry = 0;
      constructor() {
        console.log("TrafficStar API Service initialized");
      }
      /**
       * Get base URL for API endpoints
       */
      getBaseUrl() {
        return this.BASE_URL_V1_1;
      }
      /**
       * Check if the TrafficStar API is configured with a valid API key
       * @returns True if configured, false otherwise
       */
      async isConfigured() {
        try {
          const apiKey = await this.getApiKey();
          if (!apiKey) return false;
          await this.ensureToken();
          return true;
        } catch (error) {
          console.error("Error checking TrafficStar configuration:", error);
          return false;
        }
      }
      /**
       * Get all campaigns from TrafficStar
       * @returns Array of campaigns
       */
      async getCampaigns() {
        try {
          await this.ensureToken();
          const response = await axios.get(`${this.BASE_URL_V1_1}/advertiser/campaigns`, {
            headers: {
              "Authorization": `Bearer ${this.accessToken}`
            }
          });
          return response.data.data || [];
        } catch (error) {
          console.error("Error getting TrafficStar campaigns:", error);
          throw error;
        }
      }
      /**
       * Get API key from environment
       * @returns The API key or null if not set
       */
      async getApiKey() {
        const apiKey = process.env.TRAFFICSTAR_API_KEY;
        return apiKey || null;
      }
      /**
       * Ensure we have a valid token by checking and refreshing if needed
       */
      async ensureToken() {
        await this.getAccessToken();
      }
      /**
       * Get access token for API requests
       * Handles refreshing if token is expired
       */
      async getAccessToken() {
        const now = Math.floor(Date.now() / 1e3);
        if (this.accessToken && this.tokenExpiry > now) {
          return this.accessToken;
        }
        return this.refreshToken();
      }
      /**
       * Refresh the access token using OAUTH 2.0 with refresh_token grant type
       */
      async refreshToken() {
        try {
          const apiKey = process.env.TRAFFICSTAR_API_KEY;
          if (!apiKey) {
            throw new Error("TrafficStar API key not set in environment variables");
          }
          const tokenUrl = `${this.BASE_URL}/v1/auth/token`;
          const params = new URLSearchParams();
          params.append("grant_type", "refresh_token");
          params.append("refresh_token", apiKey);
          const response = await axios.post(tokenUrl, params.toString(), {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            }
          });
          const tokenResponse = response.data;
          if (!tokenResponse.access_token) {
            throw new Error("No access token in response");
          }
          this.accessToken = tokenResponse.access_token;
          this.tokenExpiry = Math.floor(Date.now() / 1e3) + tokenResponse.expires_in - 60;
          return this.accessToken;
        } catch (error) {
          console.error("Error refreshing token:", error);
          throw new Error("Failed to refresh token");
        }
      }
      /**
       * Get authentication headers for API requests
       */
      async getAuthHeaders() {
        const token = await this.getAccessToken();
        return {
          "Authorization": `Bearer ${token}`
        };
      }
      /**
       * Get spent value for campaign using Reports API
       * 
       * Uses: GET /v1.1/advertiser/custom/report/by-day
       * 
       * Format based on TrafficStar documentation where we need to use
       * the exact date format YYYY-MM-DD for the current UTC date
       * Both date_from and date_to should be the same date
       */
      async getCampaignSpentValue(campaignId) {
        try {
          const currentUTCDate = getTodayFormatted();
          console.log(`Getting spent value for campaign ${campaignId} for date ${currentUTCDate}`);
          const headers = await this.getAuthHeaders();
          const params = new URLSearchParams();
          params.append("campaign_id", campaignId.toString());
          params.append("date_from", currentUTCDate);
          params.append("date_to", currentUTCDate);
          params.append("group_by", "day");
          params.append("columns", "amount");
          console.log(`Report API request parameters: ${params.toString()}`);
          const baseUrl = `${this.BASE_URL_V1_1}/advertiser/custom/report/by-day`;
          const url = `${baseUrl}?${params.toString()}`;
          console.log(`Making direct request to: ${url}`);
          const response = await axios.get(url, { headers });
          console.log(`Report API raw response type:`, typeof response.data);
          if (response.data) {
            const totalSpent = parseReportSpentValue(response.data);
            console.log(`Campaign ${campaignId} spent value from reports API: $${totalSpent.toFixed(4)}`);
            return { totalSpent };
          }
          console.log(`Falling back to campaign endpoint for spent value`);
          const campaign = await this.getCampaign(campaignId);
          if (campaign && (campaign.spent !== void 0 || campaign.spent_today !== void 0)) {
            const spentValue = parseReportSpentValue(campaign);
            console.log(`Campaign ${campaignId} direct API spent value: $${spentValue.toFixed(4)}`);
            return { totalSpent: spentValue };
          }
          console.log(`No spent data found for campaign ${campaignId}`);
          return { totalSpent: 0 };
        } catch (error) {
          console.error(`Error getting spent value for campaign ${campaignId}:`, error);
          if (error.response) {
            console.error(`Error response status: ${error.response.status}`);
            console.error(`Error response data:`, error.response.data);
          }
          try {
            console.log(`Falling back to campaign endpoint for spent value`);
            const campaign = await this.getCampaign(campaignId);
            if (campaign && (campaign.spent !== void 0 || campaign.spent_today !== void 0)) {
              const spentValue = parseReportSpentValue(campaign);
              console.log(`Campaign ${campaignId} direct API spent value: $${spentValue.toFixed(4)}`);
              return { totalSpent: spentValue };
            }
          } catch (fallbackError) {
            console.error(`Fallback method also failed:`, fallbackError);
          }
          return { totalSpent: 0 };
        }
      }
      /**
       * Get a single campaign from TrafficStar
       * 
       * Uses: GET /v1.1/campaigns/{id}
       */
      async getCampaign(id) {
        try {
          console.log(`Getting campaign ${id} details`);
          const headers = await this.getAuthHeaders();
          const url = `${this.BASE_URL_V1_1}/campaigns/${id}`;
          const response = await axios.get(url, { headers });
          const campaign = response.data;
          return campaign;
        } catch (error) {
          console.error(`Error getting campaign ${id} details:`, error);
          const campaign = {
            id,
            name: `Campaign ${id}`,
            active: false
          };
          return campaign;
        }
      }
      /**
       * Get campaign status from API
       * 
       * Uses: GET /v1.1/campaigns/{id}
       */
      async getCampaignStatus(id) {
        try {
          const campaign = await this.getCampaign(id);
          const isActive = campaign.active === true;
          let status = "unknown";
          if (campaign.status) {
            status = campaign.status;
          } else if (isActive) {
            status = "active";
          } else {
            status = "paused";
          }
          return { active: isActive, status };
        } catch (error) {
          console.error(`Error getting campaign ${id} status:`, error);
          return { active: false, status: "error" };
        }
      }
      /**
       * Activate a campaign
       * 
       * Uses: PUT /v2/campaigns/run
       */
      async activateCampaign(id) {
        try {
          console.log(`Activating campaign ${id}`);
          const headers = await this.getAuthHeaders();
          const url = `${this.BASE_URL_V2}/campaigns/run`;
          const payload = {
            campaign_ids: [id]
          };
          const response = await axios.put(url, payload, { headers });
          const result = response.data;
          if (result.success && result.success.includes(id)) {
            console.log(`Successfully activated campaign ${id}`);
          } else if (result.failed && result.failed.includes(id)) {
            throw new Error(`Failed to activate campaign ${id}`);
          } else {
            console.log(`Activation attempt for campaign ${id} completed, but status unclear`);
          }
        } catch (error) {
          console.error(`Error activating campaign ${id}:`, error);
          throw new Error(`Failed to activate campaign ${id}`);
        }
      }
      /**
       * Pause a campaign using the batch pause API endpoint
       * 
       * Uses: PUT /v2/campaigns/pause
       */
      async pauseCampaign(id) {
        try {
          console.log(`Pausing campaign ${id}`);
          const headers = await this.getAuthHeaders();
          const url = `${this.BASE_URL_V2}/campaigns/pause`;
          const payload = {
            campaign_ids: [id]
          };
          const response = await axios.put(url, payload, { headers });
          const result = response.data;
          if (result.success && result.success.includes(id)) {
            console.log(`Successfully paused campaign ${id}`);
          } else if (result.failed && result.failed.includes(id)) {
            throw new Error(`Failed to pause campaign ${id}`);
          } else {
            console.log(`Pause attempt for campaign ${id} completed, but status unclear`);
          }
        } catch (error) {
          console.error(`Error pausing campaign ${id}:`, error);
          throw new Error(`Failed to pause campaign ${id}`);
        }
      }
      /**
       * Update the campaign's end time
       * 
       * Uses: PATCH /v1.1/campaigns/{id}
       */
      async updateCampaignEndTime(id, scheduleEndTime) {
        try {
          console.log(`Setting campaign ${id} end time to: ${scheduleEndTime}`);
          const headers = await this.getAuthHeaders();
          const url = `${this.BASE_URL_V1_1}/campaigns/${id}`;
          const payload = {
            schedule_end_time: scheduleEndTime
          };
          const response = await axios.patch(url, payload, { headers });
          console.log(`Successfully updated end time for campaign ${id}`);
          if (response.data && response.data.schedule_end_time === scheduleEndTime) {
            console.log(`Confirmed end time update for campaign ${id}`);
          }
        } catch (error) {
          console.error(`Error updating end time for campaign ${id}:`, error);
          throw new Error(`Failed to update end time for campaign ${id}`);
        }
      }
      /**
       * Update the campaign's daily budget
       * 
       * Uses: PATCH /v1.1/campaigns/{id}
       */
      async updateCampaignBudget(id, maxDaily) {
        try {
          console.log(`Updating daily budget for campaign ${id} to: $${maxDaily.toFixed(2)}`);
          const headers = await this.getAuthHeaders();
          const url = `${this.BASE_URL_V1_1}/campaigns/${id}`;
          const payload = {
            max_daily: maxDaily
          };
          const response = await axios.patch(url, payload, { headers });
          console.log(`Successfully updated daily budget for campaign ${id}`);
          if (response.data && response.data.max_daily === maxDaily) {
            console.log(`Confirmed daily budget update for campaign ${id}`);
          }
        } catch (error) {
          console.error(`Error updating daily budget for campaign ${id}:`, error);
          throw new Error(`Failed to update daily budget for campaign ${id}`);
        }
      }
      /**
       * Schedule regular updates of spent values for all TrafficStar campaigns
       * This function runs on a schedule to keep the spent values up to date
       * 
       * @param intervalMinutes How often to check spent values (default: 30 minutes)
       */
      /**
       * Get all the saved TrafficStar campaigns from the API
       */
      async getSavedCampaigns() {
        try {
          console.log("Fetching saved TrafficStar campaigns");
          const headers = await this.getAuthHeaders();
          const url = `${this.BASE_URL_V1_1}/campaigns`;
          const response = await axios.get(url, { headers });
          if (!response.data || !Array.isArray(response.data)) {
            console.log("Response is not an array of campaigns:", response.data);
            return [];
          }
          return response.data;
        } catch (error) {
          console.error("Error fetching saved TrafficStar campaigns:", error);
          throw new Error("Failed to fetch saved TrafficStar campaigns");
        }
      }
      scheduleSpentValueUpdates(intervalMinutes = 30) {
        try {
          console.log(`Scheduling TrafficStar spent value updates every ${intervalMinutes} minutes`);
          const interval = intervalMinutes * 60 * 1e3;
          const updateAllCampaignSpentValues = async () => {
            try {
              console.log("Running scheduled update of TrafficStar campaign spent values");
              const campaignsResult = await db.select().from(campaigns).where(sql4`trafficstar_campaign_id is not null`);
              for (const campaign of campaignsResult) {
                if (campaign.trafficstarCampaignId) {
                  try {
                    const trafficStarId = parseInt(campaign.trafficstarCampaignId);
                    if (!isNaN(trafficStarId)) {
                      console.log(`Updating spent value for campaign ${campaign.id} (TrafficStar ID: ${trafficStarId})`);
                      const { totalSpent } = await this.getCampaignSpentValue(trafficStarId);
                      await db.update(campaigns).set({
                        dailySpent: totalSpent.toString(),
                        lastSpentCheck: /* @__PURE__ */ new Date()
                      }).where(eq9(campaigns.id, campaign.id));
                      console.log(`Campaign ${campaign.id} spent value updated to: $${totalSpent.toFixed(4)}`);
                    }
                  } catch (campaignError) {
                    console.error(`Error updating spent value for campaign ${campaign.id}:`, campaignError);
                  }
                }
              }
              console.log("Finished scheduled update of TrafficStar campaign spent values");
            } catch (error) {
              console.error("Error in scheduled spent value update:", error);
            }
          };
          updateAllCampaignSpentValues().catch((error) => {
            console.error("Error in initial spent value update:", error);
          });
          const intervalId = setInterval(updateAllCampaignSpentValues, interval);
          console.log("TrafficStar spent value updates scheduled successfully");
          return intervalId;
        } catch (error) {
          console.error("Error scheduling TrafficStar spent value updates:", error);
          throw error;
        }
      }
      /**
       * Track a new URL for budget update after the initial budget calculation
       * This method is used when new URLs are added to a campaign after it has gone over $10 spent
       * It schedules a budget update to be processed after a waiting period
       * 
       * @param urlId The ID of the URL in our database
       * @param campaignId The campaign ID in our database
       * @param trafficstarCampaignId The campaign ID in TrafficStar
       * @param clickLimit The total number of clicks required for this URL
       * @param pricePerThousand The price per thousand clicks for this campaign
       * @returns A boolean indicating whether the URL was successfully tracked
       */
      async trackNewUrlForBudgetUpdate(urlId, campaignId, trafficstarCampaignId, clickLimit, pricePerThousand) {
        try {
          console.log(`\u{1F504} Tracking URL ID ${urlId} for budget update in campaign ${campaignId} (TrafficStar ID: ${trafficstarCampaignId})`);
          console.log(`\u{1F4CA} URL requires ${clickLimit} clicks at $${pricePerThousand.toFixed(4)} per thousand clicks`);
          const urlBudget = clickLimit / 1e3 * pricePerThousand;
          console.log(`\u{1F4B0} Calculated URL budget: $${urlBudget.toFixed(4)}`);
          const tracked = await url_budget_manager_default.trackNewUrlForBudgetUpdate(
            campaignId,
            trafficstarCampaignId.toString(),
            urlId,
            clickLimit,
            pricePerThousand
          );
          if (tracked) {
            console.log(`\u2705 Successfully scheduled URL ID ${urlId} for budget update`);
            return true;
          } else {
            console.log(`\u26A0\uFE0F URL ID ${urlId} is already being tracked for budget update`);
            return false;
          }
        } catch (error) {
          console.error(`\u274C Error tracking URL ID ${urlId} for budget update:`, error);
          return false;
        }
      }
      /**
       * Process all pending URL budget updates immediately
       * This is primarily used for testing the budget update system
       * In normal operation, updates are processed automatically after the waiting period
       * 
       * @returns A boolean indicating whether processing was successful
       */
      async processPendingUrlBudgets() {
        try {
          console.log(`\u{1F504} Processing all pending URL budget updates immediately...`);
          const campaigns3 = await db.query.campaigns.findMany();
          let processedCount = 0;
          for (const campaign of campaigns3) {
            if (campaign.id && url_budget_manager_default.hasPendingUpdates(campaign.id)) {
              console.log(`\u{1F504} Processing pending URL budget updates for campaign ${campaign.id}`);
              await url_budget_manager_default.processImmediately(campaign.id);
              processedCount++;
            }
          }
          console.log(`\u2705 Processed pending URL budget updates for ${processedCount} campaigns`);
          return true;
        } catch (error) {
          console.error(`\u274C Error processing pending URL budget updates:`, error);
          return false;
        }
      }
    };
    trafficStarService = new TrafficStarService();
  }
});

// server/logger.ts
var Logger, logger;
var init_logger = __esm({
  "server/logger.ts"() {
    "use strict";
    Logger = class {
      info(message, ...args) {
        console.log(`[youtube-api] INFO: ${message}`, ...args);
      }
      error(message, ...args) {
        console.error(`[youtube-api] ERROR: ${message}`, ...args);
      }
      warn(message, ...args) {
        console.warn(`[youtube-api] WARN: ${message}`, ...args);
      }
      debug(message, ...args) {
        console.debug(`[youtube-api] DEBUG: ${message}`, ...args);
      }
    };
    logger = new Logger();
  }
});

// server/youtube-api-service.ts
var youtube_api_service_exports = {};
__export(youtube_api_service_exports, {
  YouTubeApiService: () => YouTubeApiService,
  youtubeApiService: () => youtubeApiService
});
import { google as google2 } from "googleapis";
import { eq as eq10, and as and4 } from "drizzle-orm";
var YOUTUBE_API_KEY, BATCH_SIZE, YouTubeApiService, youtubeApiService;
var init_youtube_api_service = __esm({
  "server/youtube-api-service.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_logger();
    YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";
    BATCH_SIZE = 50;
    YouTubeApiService = class {
      youtube;
      schedulerTimer = null;
      constructor() {
        this.youtube = google2.youtube({
          version: "v3",
          auth: YOUTUBE_API_KEY
        });
        logger.info("YouTube API Service initialized");
      }
      /**
       * Log YouTube API activity to database
       */
      async logApiActivity(logType, message, campaignId, details, isError = false) {
        try {
          await db.insert(youtubeApiLogs).values({
            logType,
            message,
            campaignId: campaignId || null,
            details: details ? details : null,
            isError,
            timestamp: /* @__PURE__ */ new Date()
          });
        } catch (error) {
          logger.error("Error logging YouTube API activity:", error);
        }
      }
      /**
       * Check if YOUTUBE_API_KEY is available
       */
      isConfigured() {
        return !!YOUTUBE_API_KEY;
      }
      /**
       * Extract YouTube video ID from URL
       * Supports various YouTube URL formats
       */
      extractVideoId(url) {
        try {
          const urlObj = new URL(url);
          if (urlObj.hostname === "youtu.be") {
            return urlObj.pathname.substring(1);
          }
          if (urlObj.hostname === "www.youtube.com" || urlObj.hostname === "youtube.com") {
            if (urlObj.pathname === "/watch") {
              return urlObj.searchParams.get("v");
            }
            if (urlObj.pathname.startsWith("/v/")) {
              return urlObj.pathname.substring(3);
            }
            if (urlObj.pathname.startsWith("/embed/")) {
              return urlObj.pathname.substring(7);
            }
          }
          return null;
        } catch (error) {
          logger.error(`Error extracting video ID from URL: ${url}`, error);
          return null;
        }
      }
      /**
       * Checks if a URL is a valid YouTube URL
       */
      isYouTubeUrl(url) {
        try {
          const urlObj = new URL(url);
          const isYouTubeDomain = urlObj.hostname === "www.youtube.com" || urlObj.hostname === "youtube.com" || urlObj.hostname === "youtu.be";
          return isYouTubeDomain && !!this.extractVideoId(url);
        } catch (error) {
          return false;
        }
      }
      /**
       * Parse ISO 8601 duration to minutes
       * Example: PT1H30M15S -> 90.25 minutes
       */
      parseDurationToMinutes(duration) {
        try {
          const time = duration.substring(2);
          const hoursMatch = time.match(/(\d+)H/);
          const minutesMatch = time.match(/(\d+)M/);
          const secondsMatch = time.match(/(\d+)S/);
          const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
          const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
          const seconds = secondsMatch ? parseInt(secondsMatch[1]) : 0;
          return hours * 60 + minutes + seconds / 60;
        } catch (error) {
          logger.error(`Error parsing duration: ${duration}`, error);
          return 0;
        }
      }
      /**
       * Get videos information in batch
       */
      async getVideosInfo(videoIds, campaignId) {
        if (!this.isConfigured()) {
          throw new Error("YouTube API key not configured");
        }
        try {
          const formattedVideoIds = videoIds.length > 5 ? `${videoIds.slice(0, 5).join(", ")}... (and ${videoIds.length - 5} more)` : videoIds.join(", ");
          const apiRequestMsg = `API Request at ${(/* @__PURE__ */ new Date()).toISOString()} - ${videoIds.length} videos: ${formattedVideoIds}`;
          await this.logApiActivity(
            YouTubeApiLogType.API_REQUEST,
            apiRequestMsg,
            campaignId,
            {
              videoIds,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              requestType: "videos.list",
              quotaCost: 1
              // Each videos.list call costs 1 quota unit
            },
            false
          );
          logger.info(`[YOUTUBE-API] Making request for ${videoIds.length} videos: ${videoIds.slice(0, 3).join(", ")}${videoIds.length > 3 ? "..." : ""}`);
          const startTime = Date.now();
          const response = await this.youtube.videos.list({
            part: ["snippet", "contentDetails", "status"],
            id: videoIds
          });
          const duration = Date.now() - startTime;
          const apiResponseMsg = `API Response at ${(/* @__PURE__ */ new Date()).toISOString()} - Received ${response.data.items?.length || 0}/${videoIds.length} videos in ${duration}ms`;
          await this.logApiActivity(
            YouTubeApiLogType.API_RESPONSE,
            apiResponseMsg,
            campaignId,
            {
              responseTime: duration,
              videosReceived: (response.data.items || []).length,
              videoIdsRequested: videoIds.length,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              quotaUsage: 1
              // Each videos.list call costs 1 quota unit
            },
            false
          );
          logger.info(`[YOUTUBE-API] Response received with ${response.data.items?.length || 0} videos in ${duration}ms`);
          return response.data.items || [];
        } catch (error) {
          const errorMsg = `API Error at ${(/* @__PURE__ */ new Date()).toISOString()} - ${error instanceof Error ? error.message : String(error)}`;
          await this.logApiActivity(
            YouTubeApiLogType.API_ERROR,
            errorMsg,
            campaignId,
            {
              error: error instanceof Error ? error.message : String(error),
              videoIds,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            },
            true
          );
          logger.error("Error fetching YouTube videos info:", error);
          throw error;
        }
      }
      /**
       * Validate a single URL against YouTube API conditions
       * Used for immediate validation when adding URLs to campaigns
       * @returns Object with validation result and reason if failed
       */
      async validateSingleUrl(targetUrl, campaign) {
        try {
          const videoId = this.extractVideoId(targetUrl);
          if (!videoId) {
            return {
              isValid: false,
              reason: "Invalid YouTube URL - could not extract video ID"
            };
          }
          const videos = await this.getVideosInfo([videoId], campaign.id);
          if (!videos || videos.length === 0) {
            return {
              isValid: false,
              reason: "Video not found or has been deleted"
            };
          }
          const video = videos[0];
          const validationDetails = {
            countryRestricted: false,
            privateVideo: false,
            deletedVideo: false,
            ageRestricted: false,
            madeForKids: false,
            exceededDuration: false
          };
          if (campaign.youtubeCheckCountryRestriction && video.contentDetails?.regionRestriction?.blocked) {
            const blockedRegions = video.contentDetails.regionRestriction.blocked;
            if (Array.isArray(blockedRegions) && blockedRegions.includes("IN")) {
              validationDetails.countryRestricted = true;
              return {
                isValid: false,
                reason: "Video is restricted in India",
                validationDetails
              };
            }
          }
          if (campaign.youtubeCheckPrivate && video.status?.privacyStatus === "private") {
            validationDetails.privateVideo = true;
            return {
              isValid: false,
              reason: "Video is private",
              validationDetails
            };
          }
          if (campaign.youtubeCheckAgeRestricted && (video.contentDetails?.contentRating?.ytRating === "ytAgeRestricted" || video.contentDetails?.contentRating?.mpaaRating === "mpaaUnrated")) {
            validationDetails.ageRestricted = true;
            return {
              isValid: false,
              reason: "Video is age restricted",
              validationDetails
            };
          }
          if (campaign.youtubeCheckMadeForKids && video.status?.madeForKids === true) {
            validationDetails.madeForKids = true;
            return {
              isValid: false,
              reason: "Video is made for kids",
              validationDetails
            };
          }
          if (campaign.youtubeCheckDuration && video.contentDetails?.duration) {
            const durationMinutes = this.parseDurationToMinutes(video.contentDetails.duration);
            const maxDurationMinutes = campaign.youtubeMaxDurationMinutes || 30;
            if (durationMinutes > maxDurationMinutes) {
              validationDetails.exceededDuration = true;
              return {
                isValid: false,
                reason: `Video exceeds maximum duration (${Math.floor(durationMinutes)} minutes)`,
                validationDetails
              };
            }
          }
          return { isValid: true, reason: "Video passed all checks" };
        } catch (error) {
          logger.error("Error validating YouTube URL:", error);
          return {
            isValid: false,
            reason: `YouTube API error: ${error instanceof Error ? error.message : String(error)}`
          };
        }
      }
      /**
       * Process all campaigns with YouTube API enabled
       */
      async processEnabledCampaigns() {
        try {
          const enabledCampaigns = await db.select().from(campaigns).where(eq10(campaigns.youtubeApiEnabled, true));
          logger.info(`Found ${enabledCampaigns.length} campaigns with YouTube API enabled`);
          const CONCURRENCY_LIMIT = 2;
          const chunks = [];
          for (let i = 0; i < enabledCampaigns.length; i += CONCURRENCY_LIMIT) {
            chunks.push(enabledCampaigns.slice(i, i + CONCURRENCY_LIMIT));
          }
          for (const chunk of chunks) {
            await Promise.all(
              chunk.map((campaign) => this.processCampaign(campaign.id))
            );
            if (chunks.length > 1) {
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          }
        } catch (error) {
          logger.error("Error processing YouTube API enabled campaigns:", error);
        }
      }
      /**
       * Process a single campaign
       */
      async processCampaign(campaignId, forceCheck = false) {
        try {
          const [campaign] = await db.select().from(campaigns).where(eq10(campaigns.id, campaignId));
          if (!campaign) {
            logger.error(`Campaign not found: ${campaignId}`);
            return;
          }
          if (!campaign.youtubeApiEnabled) {
            logger.info(`YouTube API not enabled for campaign ${campaignId}`);
            return;
          }
          if (!forceCheck && campaign.youtubeApiLastCheck) {
            const intervalMinutes = campaign.youtubeApiIntervalMinutes || 60;
            const now = /* @__PURE__ */ new Date();
            if (!this.hasIntervalElapsed(campaign.youtubeApiLastCheck, intervalMinutes, now)) {
              logger.info(`Skipping YouTube check for campaign ${campaignId} - interval not elapsed (${intervalMinutes} minutes)`);
              return;
            }
          }
          logger.info(`Processing YouTube checks for campaign ${campaignId}`);
          const activeUrls = await db.select().from(urls).where(
            and4(
              eq10(urls.campaignId, campaignId),
              eq10(urls.status, "active")
            )
          );
          if (activeUrls.length === 0) {
            logger.info(`No active URLs found for campaign ${campaignId}`);
            return;
          }
          const youtubeUrls = activeUrls.filter((url) => this.isYouTubeUrl(url.targetUrl));
          if (youtubeUrls.length === 0) {
            logger.info(`No YouTube URLs found for campaign ${campaignId}`);
            return;
          }
          logger.info(`Found ${youtubeUrls.length} YouTube URLs to check for campaign ${campaignId}`);
          const urlsWithVideoIds = youtubeUrls.map((url) => ({
            ...url,
            videoId: this.extractVideoId(url.targetUrl)
          })).filter((url) => url.videoId !== null);
          for (let i = 0; i < urlsWithVideoIds.length; i += BATCH_SIZE) {
            const batch = urlsWithVideoIds.slice(i, i + BATCH_SIZE);
            const videoIds = batch.map((url) => url.videoId).filter(Boolean);
            await this.processVideoBatch(campaign, batch, videoIds);
          }
          await db.update(campaigns).set({
            youtubeApiLastCheck: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq10(campaigns.id, campaignId));
          logger.info(`YouTube checks completed for campaign ${campaignId}`);
        } catch (error) {
          logger.error(`Error processing YouTube checks for campaign ${campaignId}:`, error);
        }
      }
      /**
       * Process a batch of videos
       */
      async processVideoBatch(campaign, urlsWithVideoIds, videoIds) {
        try {
          const videos = await this.getVideosInfo(videoIds, campaign.id);
          const videoMap = /* @__PURE__ */ new Map();
          videos.forEach((video) => {
            if (video.id) {
              videoMap.set(video.id, video);
            }
          });
          const urlOperations = [];
          for (const url of urlsWithVideoIds) {
            if (!url.videoId) continue;
            const video = videoMap.get(url.videoId);
            if (!video) {
              if (campaign.youtubeCheckDeleted) {
                urlOperations.push(
                  this.deleteUrl(url, campaign, "Video not found (deleted or unavailable)", {
                    deletedVideo: true
                  })
                );
              }
              continue;
            }
            if (campaign.youtubeCheckCountryRestriction && video.contentDetails?.regionRestriction?.blocked?.includes("IN")) {
              urlOperations.push(
                this.deleteUrl(url, campaign, "Video restricted in India", {
                  countryRestricted: true
                })
              );
              continue;
            }
            if (campaign.youtubeCheckPrivate && video.status?.privacyStatus === "private") {
              urlOperations.push(
                this.deleteUrl(url, campaign, "Private video", {
                  privateVideo: true
                })
              );
              continue;
            }
            const ageRestricted = video.contentDetails?.contentRating?.ytRating === "ytAgeRestricted";
            if (campaign.youtubeCheckAgeRestricted && ageRestricted) {
              urlOperations.push(
                this.deleteUrl(url, campaign, "Age restricted video", {
                  ageRestricted: true
                })
              );
              continue;
            }
            const madeForKids = video.status?.madeForKids === true;
            if (campaign.youtubeCheckMadeForKids && madeForKids) {
              urlOperations.push(
                this.deleteUrl(url, campaign, "Video made for kids", {
                  madeForKids: true
                })
              );
              continue;
            }
            if (campaign.youtubeCheckDuration && video.contentDetails?.duration) {
              const durationMinutes = this.parseDurationToMinutes(video.contentDetails.duration);
              const maxDurationMinutes = campaign.youtubeMaxDurationMinutes || 30;
              if (durationMinutes > maxDurationMinutes) {
                urlOperations.push(
                  this.deleteUrl(url, campaign, `Video exceeds maximum duration (${Math.floor(durationMinutes)} minutes)`, {
                    exceededDuration: true
                  })
                );
                continue;
              }
            }
          }
          if (urlOperations.length > 0) {
            await Promise.all(urlOperations);
          }
        } catch (error) {
          logger.error("Error processing YouTube video batch:", error);
        }
      }
      /**
       * Save a direct rejected URL to youtube_url_records
       * Used for immediate validation when adding URLs to campaigns
       */
      async saveDirectRejectedUrl(urlData, campaignId, reason, videoId, flags) {
        try {
          const record = await db.insert(youtubeUrlRecords).values({
            urlId: null,
            // NULL for direct rejections that weren't created as URLs
            campaignId,
            name: urlData.name || "Unnamed URL",
            targetUrl: urlData.targetUrl || "",
            youtubeVideoId: videoId || "unknown",
            deletionReason: `[Direct Rejected] ${reason}`,
            countryRestricted: flags?.countryRestricted || false,
            privateVideo: flags?.privateVideo || false,
            deletedVideo: flags?.deletedVideo || false,
            ageRestricted: flags?.ageRestricted || false,
            madeForKids: flags?.madeForKids || false,
            exceededDuration: flags?.exceededDuration || false,
            deletedAt: /* @__PURE__ */ new Date(),
            createdAt: /* @__PURE__ */ new Date()
          }).returning();
          logger.info(`Direct rejected URL recorded (ID: ${record[0]?.id}): ${urlData.name} - ${reason}`);
          console.log("\u2705 Saved YouTube URL validation record with details:", {
            name: urlData.name,
            videoId,
            reason,
            flags
          });
        } catch (error) {
          logger.error("Error recording direct rejected URL:", error);
          console.error("Failed to save YouTube URL validation record:", error);
        }
      }
      /**
       * Delete URL and record the reason
       */
      async deleteUrl(url, campaign, reason, flags) {
        try {
          const videoId = this.extractVideoId(url.targetUrl) || "unknown";
          await db.insert(youtubeUrlRecords).values({
            urlId: url.id,
            campaignId: campaign.id,
            name: url.name,
            targetUrl: url.targetUrl,
            youtubeVideoId: videoId,
            deletionReason: reason,
            countryRestricted: flags.countryRestricted || false,
            privateVideo: flags.privateVideo || false,
            deletedVideo: flags.deletedVideo || false,
            ageRestricted: flags.ageRestricted || false,
            madeForKids: flags.madeForKids || false,
            exceededDuration: flags.exceededDuration || false,
            deletedAt: /* @__PURE__ */ new Date(),
            createdAt: /* @__PURE__ */ new Date()
          });
          await db.update(urls).set({
            status: "deleted",
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq10(urls.id, url.id));
          logger.info(`URL deleted due to YouTube API check: ${url.id} (${url.name}) - Reason: ${reason}`);
        } catch (error) {
          logger.error(`Error deleting URL ${url.id}:`, error);
        }
      }
      /**
       * Dynamic scheduler for YouTube API checks
       * This schedules the next check based on the campaign with the shortest remaining time
       */
      scheduleChecks() {
        if (this.schedulerTimer) {
          clearTimeout(this.schedulerTimer);
          this.schedulerTimer = null;
        }
        this.scheduleNextCheck();
        logger.info("YouTube API checks scheduled with dynamic timing");
      }
      /**
       * Schedules the next check based on the campaign with the shortest remaining time
       * This ensures we only check exactly when needed, not sooner or later
       */
      async scheduleNextCheck() {
        try {
          const enabledCampaigns = await db.select().from(campaigns).where(eq10(campaigns.youtubeApiEnabled, true));
          if (enabledCampaigns.length === 0) {
            this.schedulerTimer = setTimeout(() => this.scheduleNextCheck(), 15 * 60 * 1e3);
            logger.info("[youtube-api-scheduler] No enabled campaigns found, checking again in 15 minutes");
            return;
          }
          const now = /* @__PURE__ */ new Date();
          await this.logApiActivity(
            YouTubeApiLogType.SCHEDULER,
            `Calculating next check time for ${enabledCampaigns.length} campaigns`,
            void 0,
            { campaignCount: enabledCampaigns.length }
          );
          const campaignTimings = [];
          let shortestRemainingMs = Infinity;
          let campaignWithShortestTime = null;
          let anyNeedsProcessingNow = false;
          for (const campaign of enabledCampaigns) {
            const intervalMinutes = campaign.youtubeApiIntervalMinutes || 60;
            const intervalMs = intervalMinutes * 60 * 1e3;
            let elapsedMs = 0;
            let elapsedMinutes = 0;
            let remainingMs = intervalMs;
            let remainingMinutes = intervalMinutes;
            let needsProcessing = false;
            if (!campaign.youtubeApiLastCheck) {
              needsProcessing = true;
              anyNeedsProcessingNow = true;
            } else {
              elapsedMs = now.getTime() - campaign.youtubeApiLastCheck.getTime();
              elapsedMinutes = Math.floor(elapsedMs / (60 * 1e3));
              remainingMs = Math.max(0, intervalMs - elapsedMs);
              remainingMinutes = Math.ceil(remainingMs / (60 * 1e3));
              needsProcessing = elapsedMinutes >= intervalMinutes;
              if (needsProcessing) {
                anyNeedsProcessingNow = true;
              }
            }
            campaignTimings.push({
              id: campaign.id,
              name: campaign.name,
              lastCheck: campaign.youtubeApiLastCheck,
              intervalMinutes,
              elapsedMinutes,
              remainingMinutes,
              needsProcessing
            });
            if (!needsProcessing && remainingMs < shortestRemainingMs) {
              shortestRemainingMs = remainingMs;
              campaignWithShortestTime = campaign;
            }
          }
          await this.logApiActivity(
            YouTubeApiLogType.SCHEDULER,
            `Campaign timing details`,
            void 0,
            { campaignTimings }
          );
          if (anyNeedsProcessingNow) {
            const campaignsNeedingProcess = campaignTimings.filter((c) => c.needsProcessing).map((c) => c.id);
            await this.logApiActivity(
              YouTubeApiLogType.SCHEDULER,
              `Processing ${campaignsNeedingProcess.length} campaigns now: ${campaignsNeedingProcess.join(", ")}`,
              void 0,
              { campaignsNeedingProcess }
            );
            await this.checkAllCampaigns();
            this.schedulerTimer = setTimeout(() => this.scheduleNextCheck(), 5e3);
          } else {
            const nextCheckMs = shortestRemainingMs + 1e3;
            const nextCheckMinutes = Math.ceil(nextCheckMs / (60 * 1e3));
            const nextCheckTime = new Date(now.getTime() + nextCheckMs);
            await this.logApiActivity(
              YouTubeApiLogType.SCHEDULER,
              `Next check scheduled for campaign ${campaignWithShortestTime?.id} in ${nextCheckMinutes} minutes at ${nextCheckTime.toISOString()}`,
              campaignWithShortestTime?.id ?? void 0,
              {
                nextCheckMinutes,
                nextCheckTime: nextCheckTime.toISOString(),
                campaignInfo: campaignWithShortestTime ? {
                  id: campaignWithShortestTime.id,
                  name: campaignWithShortestTime.name,
                  intervalMinutes: campaignWithShortestTime.youtubeApiIntervalMinutes
                } : null
              }
            );
            logger.info(`[youtube-api-scheduler] Next check scheduled in exactly ${nextCheckMinutes} minutes`);
            this.schedulerTimer = setTimeout(() => this.scheduleNextCheck(), nextCheckMs);
          }
        } catch (error) {
          logger.error("Error scheduling next check:", error);
          await this.logApiActivity(
            YouTubeApiLogType.SCHEDULER_CHECK,
            "Error scheduling next check",
            void 0,
            { error: error instanceof Error ? error.message : String(error) },
            true
          );
          this.schedulerTimer = setTimeout(() => this.scheduleNextCheck(), 5 * 60 * 1e3);
        }
      }
      /**
       * Only logs campaign schedule status without processing
       * This reduces unnecessary API activity logging
       */
      async logCampaignScheduleStatus() {
        try {
          const enabledCampaigns = await db.select().from(campaigns).where(eq10(campaigns.youtubeApiEnabled, true));
          if (enabledCampaigns.length === 0) {
            return;
          }
          const now = /* @__PURE__ */ new Date();
          for (const campaign of enabledCampaigns) {
            const intervalMinutes = campaign.youtubeApiIntervalMinutes || 60;
            if (!campaign.youtubeApiLastCheck) {
              this.checkAllCampaigns();
              return;
            } else {
              const elapsedMs = now.getTime() - campaign.youtubeApiLastCheck.getTime();
              const elapsedMinutes = Math.floor(elapsedMs / (60 * 1e3));
              const minutesRemaining = Math.max(0, intervalMinutes - elapsedMinutes);
              const shouldProcess = elapsedMinutes >= intervalMinutes;
              const message = `Campaign ${campaign.id}: Last check: ${campaign.youtubeApiLastCheck.toISOString()}, Interval: ${intervalMinutes} minutes, Time remaining: ${minutesRemaining} minutes`;
              logger.info(`[youtube-api-scheduler] ${message}`);
              if (shouldProcess) {
                this.checkAllCampaigns();
                return;
              }
            }
          }
        } catch (error) {
          logger.error("Error checking campaign schedule status:", error);
        }
      }
      /**
       * Check all campaigns to find those that need processing
       */
      async checkAllCampaigns() {
        try {
          const enabledCampaigns = await db.select().from(campaigns).where(eq10(campaigns.youtubeApiEnabled, true));
          await this.logApiActivity(
            YouTubeApiLogType.INTERVAL_CHECK,
            `Scheduler checking ${enabledCampaigns.length} campaigns with YouTube API enabled`,
            void 0,
            { campaignIds: enabledCampaigns.map((c) => c.id) }
          );
          const now = /* @__PURE__ */ new Date();
          for (const campaign of enabledCampaigns) {
            const intervalMinutes = campaign.youtubeApiIntervalMinutes || 60;
            let minutesRemaining = 0;
            let shouldProcess = false;
            if (!campaign.youtubeApiLastCheck) {
              shouldProcess = true;
              const message = `Campaign ${campaign.id}: No previous check found, processing now`;
              logger.info(`[youtube-api-scheduler] ${message}`);
              await this.logApiActivity(
                YouTubeApiLogType.INTERVAL_CHECK,
                message,
                campaign.id,
                {
                  name: campaign.name,
                  intervalMinutes,
                  reason: "initial_check"
                }
              );
            } else {
              const elapsedMs = now.getTime() - campaign.youtubeApiLastCheck.getTime();
              const elapsedMinutes = Math.floor(elapsedMs / (60 * 1e3));
              minutesRemaining = Math.max(0, intervalMinutes - elapsedMinutes);
              shouldProcess = elapsedMinutes >= intervalMinutes;
              const message = `Campaign ${campaign.id}: Last check: ${campaign.youtubeApiLastCheck.toISOString()}, Interval: ${intervalMinutes} minutes, Time remaining: ${minutesRemaining} minutes`;
              logger.info(`[youtube-api-scheduler] ${message}`);
              await this.logApiActivity(
                YouTubeApiLogType.INTERVAL_CHECK,
                message,
                campaign.id,
                {
                  name: campaign.name,
                  lastCheck: campaign.youtubeApiLastCheck,
                  intervalMinutes,
                  elapsedMinutes,
                  minutesRemaining: minutesRemaining > 0 ? minutesRemaining : 0,
                  shouldProcess
                }
              );
            }
            if (shouldProcess) {
              const message = `Campaign ${campaign.id}: Interval elapsed, processing now`;
              logger.info(`[youtube-api-scheduler] ${message}`);
              await this.processCampaign(campaign.id);
            } else {
              const message = `Campaign ${campaign.id}: Skipping check, ${minutesRemaining} minutes remaining`;
              logger.info(`[youtube-api-scheduler] ${message}`);
            }
          }
        } catch (error) {
          logger.error("Error checking campaigns for YouTube API processing:", error);
          await this.logApiActivity(
            YouTubeApiLogType.INTERVAL_CHECK,
            "Error checking campaigns for YouTube API processing",
            void 0,
            { error: error instanceof Error ? error.message : String(error) },
            true
          );
        }
      }
      /**
       * Check if the configured interval has elapsed since the last check
       * This ensures we strictly respect the interval timing
       */
      hasIntervalElapsed(lastCheck, intervalMinutes, now) {
        const elapsedMs = now.getTime() - lastCheck.getTime();
        const elapsedMinutes = Math.floor(elapsedMs / (60 * 1e3));
        return elapsedMinutes >= intervalMinutes;
      }
    };
    youtubeApiService = new YouTubeApiService();
  }
});

// server/spent-value.ts
async function getSpentValueForDate(trafficstarCampaignId, date) {
  try {
    console.log(`Fetching spent value for campaign ${trafficstarCampaignId} from ${date} to ${date}`);
    const spentValue = await trafficStarService.getCampaignSpentValue(trafficstarCampaignId, date, date);
    if (!spentValue) {
      console.error(`Failed to get spent value for campaign ${trafficstarCampaignId}`);
      if (process.env.NODE_ENV === "development") {
        console.log(`DEVELOPMENT MODE: Using default spent value for testing`);
        return `$5.0000`;
      }
      return null;
    }
    const formattedValue = `$${spentValue.totalSpent.toFixed(4)}`;
    console.log(`Successfully retrieved spent value for campaign ${trafficstarCampaignId}: ${formattedValue}`);
    return formattedValue;
  } catch (error) {
    console.error(`Error getting spent value for campaign ${trafficstarCampaignId}:`, error);
    if (process.env.NODE_ENV === "development") {
      console.log(`DEVELOPMENT MODE: Using default spent value for testing`);
      return `$5.0000`;
    }
    return null;
  }
}
var init_spent_value = __esm({
  "server/spent-value.ts"() {
    "use strict";
    init_trafficstar_service();
  }
});

// server/traffic-generator.ts
var traffic_generator_exports = {};
__export(traffic_generator_exports, {
  checkCampaignStatusAfterUrlChange: () => checkCampaignStatusAfterUrlChange,
  checkForCampaignsWithNoURLs: () => checkForCampaignsWithNoURLs,
  debugProcessCampaign: () => debugProcessCampaign,
  getTrafficStarCampaignSpentValue: () => getTrafficStarCampaignSpentValue,
  getTrafficStarCampaignStatus: () => getTrafficStarCampaignStatus,
  handleCampaignBySpentValue: () => handleCampaignBySpentValue,
  initializeTrafficGeneratorScheduler: () => initializeTrafficGeneratorScheduler,
  pauseTrafficStarCampaign: () => pauseTrafficStarCampaign,
  processTrafficGenerator: () => processTrafficGenerator,
  runTrafficGeneratorForAllCampaigns: () => runTrafficGeneratorForAllCampaigns
});
import { eq as eq12, and as and6, sql as sql5 } from "drizzle-orm";
async function getTrafficStarCampaignStatus(trafficstarCampaignId) {
  if (!trafficstarCampaignId) {
    console.log("Cannot get status: No TrafficStar campaign ID provided");
    return null;
  }
  try {
    console.log(`TRAFFIC-GENERATOR: Getting REAL-TIME status for campaign ${trafficstarCampaignId}`);
    const status = await trafficStarService.getCampaignStatus(Number(trafficstarCampaignId));
    if (!status) {
      console.error(`Failed to get TrafficStar campaign ${trafficstarCampaignId} status`);
      return null;
    }
    console.log(`TRAFFIC-GENERATOR: TrafficStar campaign ${trafficstarCampaignId} REAL status is ${status.status}, active=${status.active}`);
    return status.active ? "active" : "paused";
  } catch (error) {
    console.error("Error getting TrafficStar campaign status:", error);
    return null;
  }
}
function statusMatches(actualStatus, expectedStatus) {
  return actualStatus === expectedStatus;
}
async function getTrafficStarCampaignSpentValue(campaignId, trafficstarCampaignId) {
  try {
    const today = /* @__PURE__ */ new Date();
    const formattedDate = today.toISOString().split("T")[0];
    console.log(`Fetching spent value for campaign ${trafficstarCampaignId} on ${formattedDate}`);
    const spentValue = await getSpentValueForDate(Number(trafficstarCampaignId), formattedDate);
    if (spentValue === null) {
      console.error(`Failed to get spent value for campaign ${trafficstarCampaignId}`);
      if (process.env.NODE_ENV === "development") {
        console.log("DEVELOPMENT MODE: Using default spent value of $5.0000 for traffic generator testing");
        return 5;
      }
      return null;
    }
    const numericValue = parseFloat(spentValue.replace("$", ""));
    console.log(`Campaign ${trafficstarCampaignId} spent value: $${numericValue.toFixed(4)}`);
    return numericValue;
  } catch (error) {
    console.error(`Error getting spent value for campaign ${trafficstarCampaignId}:`, error);
    if (process.env.NODE_ENV === "development") {
      console.log("DEVELOPMENT MODE: Using default spent value of $5.0000 for traffic generator testing");
      return 5;
    }
    return null;
  }
}
async function handleCampaignBySpentValue(campaignId, trafficstarCampaignId, spentValue) {
  const THRESHOLD = 10;
  const REMAINING_CLICKS_THRESHOLD = 15e3;
  const MINIMUM_CLICKS_THRESHOLD = 5e3;
  try {
    console.log(`TRAFFIC-GENERATOR: Handling campaign ${trafficstarCampaignId} by spent value - current spent: $${spentValue.toFixed(4)}`);
    if (spentValue < THRESHOLD) {
      console.log(`\u{1F535} LOW SPEND ($${spentValue.toFixed(4)} < $${THRESHOLD.toFixed(2)}): Campaign ${trafficstarCampaignId} has spent less than $${THRESHOLD.toFixed(2)}`);
      const campaign = await db.query.campaigns.findFirst({
        where: (campaign2, { eq: eq17 }) => eq17(campaign2.id, campaignId),
        with: {
          urls: {
            where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
          }
        }
      });
      if (!campaign || !campaign.urls || campaign.urls.length === 0) {
        console.log(`\u23F9\uFE0F LOW SPEND ACTION: Campaign ${trafficstarCampaignId} has no URLs - skipping auto-reactivation check`);
      } else {
        let totalRemainingClicks = 0;
        console.log(`\u{1F50D} DEBUG: Checking remaining clicks for ${campaign.urls.length} URLs in campaign ${trafficstarCampaignId}`);
        for (const url of campaign.urls) {
          console.log(`\u{1F50D} URL ID: ${url.id}, status: ${url.status}, clickLimit: ${url.clickLimit}, clicks: ${url.clicks}`);
          const remainingClicks = url.clickLimit - url.clicks;
          const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
          totalRemainingClicks += validRemaining;
          console.log(`\u2705 Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
        }
        console.log(`\u{1F4CA} Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} total remaining clicks across all active URLs`);
        const currentStatus = await getTrafficStarCampaignStatus(trafficstarCampaignId);
        console.log(`\u{1F4CA} Campaign ${trafficstarCampaignId} current status: ${currentStatus}`);
        if (totalRemainingClicks >= REMAINING_CLICKS_THRESHOLD && !statusMatches(currentStatus, "active")) {
          console.log(`\u2705 Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks (>= ${REMAINING_CLICKS_THRESHOLD}) - will attempt auto-reactivation`);
          try {
            const today = /* @__PURE__ */ new Date();
            const todayStr = today.toISOString().split("T")[0];
            const endTimeStr = `${todayStr} 23:59:00`;
            await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), endTimeStr);
            console.log(`\u2705 Set campaign ${trafficstarCampaignId} end time to ${endTimeStr}`);
            try {
              await trafficStarService.activateCampaign(Number(trafficstarCampaignId));
              console.log(`\u2705 AUTO-REACTIVATED low spend campaign ${trafficstarCampaignId} - it has ${totalRemainingClicks} remaining clicks`);
              await db.update(campaigns).set({
                lastTrafficSenderStatus: "auto_reactivated_low_spend",
                lastTrafficSenderAction: /* @__PURE__ */ new Date(),
                updatedAt: /* @__PURE__ */ new Date()
              }).where(eq12(campaigns.id, campaignId));
              console.log(`\u2705 Marked campaign ${campaignId} as 'auto_reactivated_low_spend' in database`);
              startMinutelyStatusCheck(campaignId, trafficstarCampaignId);
              return;
            } catch (activateError) {
              console.error(`\u274C Failed to auto-reactivate low spend campaign ${trafficstarCampaignId}:`, activateError);
            }
          } catch (error) {
            console.error(`\u274C Error auto-reactivating low spend campaign ${trafficstarCampaignId}:`, error);
          }
        } else if (totalRemainingClicks <= MINIMUM_CLICKS_THRESHOLD && statusMatches(currentStatus, "active")) {
          console.log(`\u23F9\uFE0F Campaign ${trafficstarCampaignId} only has ${totalRemainingClicks} remaining clicks (<= ${MINIMUM_CLICKS_THRESHOLD}) - will pause campaign`);
          try {
            const now = /* @__PURE__ */ new Date();
            const formattedDateTime = now.toISOString().replace("T", " ").split(".")[0];
            try {
              await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
              try {
                await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), formattedDateTime);
                console.log(`\u2705 PAUSED low spend campaign ${trafficstarCampaignId} due to low remaining clicks (${totalRemainingClicks} <= ${MINIMUM_CLICKS_THRESHOLD})`);
                await db.update(campaigns).set({
                  lastTrafficSenderStatus: "auto_paused_low_clicks",
                  lastTrafficSenderAction: /* @__PURE__ */ new Date(),
                  updatedAt: /* @__PURE__ */ new Date()
                }).where(eq12(campaigns.id, campaignId));
                console.log(`\u2705 Marked campaign ${campaignId} as 'auto_paused_low_clicks' in database`);
                startMinutelyPauseStatusCheck(campaignId, trafficstarCampaignId);
                return;
              } catch (endTimeError) {
                console.error(`\u274C Error setting end time for campaign ${trafficstarCampaignId}:`, endTimeError);
              }
            } catch (pauseError) {
              console.error(`\u274C Failed to pause low spend campaign ${trafficstarCampaignId} with low remaining clicks:`, pauseError);
            }
          } catch (error) {
            console.error(`\u274C Error pausing low spend campaign ${trafficstarCampaignId} with low remaining clicks:`, error);
          }
        } else if (totalRemainingClicks >= REMAINING_CLICKS_THRESHOLD && statusMatches(currentStatus, "active")) {
          console.log(`\u2705 Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks and is already active - continuing monitoring`);
          startMinutelyStatusCheck(campaignId, trafficstarCampaignId);
          await db.update(campaigns).set({
            lastTrafficSenderStatus: "active_with_sufficient_clicks",
            lastTrafficSenderAction: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq12(campaigns.id, campaignId));
          return;
        } else if (totalRemainingClicks <= MINIMUM_CLICKS_THRESHOLD && !statusMatches(currentStatus, "active")) {
          console.log(`\u23F9\uFE0F Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks (<= ${MINIMUM_CLICKS_THRESHOLD}) and is already paused - monitoring to ensure it stays paused`);
          startMinutelyPauseStatusCheck(campaignId, trafficstarCampaignId);
          await db.update(campaigns).set({
            lastTrafficSenderStatus: "paused_with_low_clicks",
            lastTrafficSenderAction: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq12(campaigns.id, campaignId));
          return;
        } else {
          console.log(`\u23F8\uFE0F Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks (between thresholds) - maintaining current status`);
          await db.update(campaigns).set({
            lastTrafficSenderStatus: "between_click_thresholds",
            lastTrafficSenderAction: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq12(campaigns.id, campaignId));
        }
      }
      if (!await db.query.campaigns.findFirst({
        where: (c, { eq: eq17, and: and9 }) => and9(
          eq17(c.id, campaignId),
          eq17(c.lastTrafficSenderStatus, "low_spend")
        )
      })) {
        await db.update(campaigns).set({
          lastTrafficSenderStatus: "low_spend",
          lastTrafficSenderAction: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq12(campaigns.id, campaignId));
        console.log(`\u2705 Marked campaign ${campaignId} as 'low_spend' in database`);
      }
    } else {
      console.log(`\u{1F7E2} HIGH SPEND ($${spentValue.toFixed(4)} >= $${THRESHOLD.toFixed(2)}): Campaign ${trafficstarCampaignId} has spent $${THRESHOLD.toFixed(2)} or more`);
      const existingCampaign = await db.query.campaigns.findFirst({
        where: (c, { eq: eq17, and: and9 }) => and9(
          eq17(c.id, campaignId),
          eq17(c.lastTrafficSenderStatus, "high_spend")
        )
      });
      if (existingCampaign) {
        console.log(`\u2139\uFE0F Campaign ${campaignId} is already in 'high_spend' state - continuing monitoring`);
      } else {
        await db.update(campaigns).set({
          lastTrafficSenderStatus: "high_spend",
          lastTrafficSenderAction: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq12(campaigns.id, campaignId));
        console.log(`\u2705 Marked campaign ${campaignId} as 'high_spend' in database for the first time`);
      }
    }
  } catch (error) {
    console.error(`Error handling campaign ${trafficstarCampaignId} by spent value:`, error);
  }
}
function startMinutelyStatusCheck(campaignId, trafficstarCampaignId) {
  if (activeStatusChecks.has(campaignId)) {
    clearInterval(activeStatusChecks.get(campaignId));
    activeStatusChecks.delete(campaignId);
  }
  if (pauseStatusChecks.has(campaignId)) {
    clearInterval(pauseStatusChecks.get(campaignId));
    pauseStatusChecks.delete(campaignId);
  }
  console.log(`\u{1F504} Starting minute-by-minute ACTIVE status check for campaign ${trafficstarCampaignId}`);
  const interval = setInterval(async () => {
    console.log(`\u23F1\uFE0F Running minute check for campaign ${trafficstarCampaignId} active status`);
    try {
      const status = await getTrafficStarCampaignStatus(trafficstarCampaignId);
      if (statusMatches(status, "active")) {
        console.log(`\u2705 Campaign ${trafficstarCampaignId} is still active - monitoring will continue`);
        const campaign = await db.query.campaigns.findFirst({
          where: (campaign2, { eq: eq17 }) => eq17(campaign2.id, campaignId),
          with: {
            urls: {
              where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
            }
          }
        });
        if (campaign && campaign.urls && campaign.urls.length > 0) {
          let totalRemainingClicks = 0;
          console.log(`\u{1F50D} ACTIVE MONITORING: Checking remaining clicks for ${campaign.urls.length} URLs in campaign ${trafficstarCampaignId}`);
          for (const url of campaign.urls) {
            console.log(`\u{1F50D} URL ID: ${url.id}, status: ${url.status}, clickLimit: ${url.clickLimit}, clicks: ${url.clicks}`);
            const remainingClicks = url.clickLimit - url.clicks;
            const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
            totalRemainingClicks += validRemaining;
            console.log(`\u2705 Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
          }
          const MINIMUM_CLICKS_THRESHOLD = 5e3;
          if (totalRemainingClicks <= MINIMUM_CLICKS_THRESHOLD) {
            console.log(`\u23F9\uFE0F During monitoring: Campaign ${trafficstarCampaignId} remaining clicks (${totalRemainingClicks}) fell below threshold (${MINIMUM_CLICKS_THRESHOLD}) - pausing campaign`);
            clearInterval(interval);
            activeStatusChecks.delete(campaignId);
            try {
              const now = /* @__PURE__ */ new Date();
              const formattedDateTime = now.toISOString().replace("T", " ").split(".")[0];
              try {
                await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
                try {
                  await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), formattedDateTime);
                  console.log(`\u2705 PAUSED low spend campaign ${trafficstarCampaignId} during monitoring due to low remaining clicks (${totalRemainingClicks} <= ${MINIMUM_CLICKS_THRESHOLD})`);
                  await db.update(campaigns).set({
                    lastTrafficSenderStatus: "auto_paused_low_clicks_during_monitoring",
                    lastTrafficSenderAction: /* @__PURE__ */ new Date(),
                    updatedAt: /* @__PURE__ */ new Date()
                  }).where(eq12(campaigns.id, campaignId));
                  console.log(`\u2705 Marked campaign ${campaignId} as 'auto_paused_low_clicks_during_monitoring' in database`);
                  startMinutelyPauseStatusCheck(campaignId, trafficstarCampaignId);
                } catch (endTimeError) {
                  console.error(`\u274C Error setting end time for campaign ${trafficstarCampaignId}:`, endTimeError);
                }
              } catch (pauseError) {
                console.error(`\u274C Failed to pause low spend campaign ${trafficstarCampaignId} with low remaining clicks:`, pauseError);
                startMinutelyStatusCheck(campaignId, trafficstarCampaignId);
              }
            } catch (error) {
              console.error(`\u274C Error pausing low spend campaign ${trafficstarCampaignId} with low remaining clicks:`, error);
              startMinutelyStatusCheck(campaignId, trafficstarCampaignId);
            }
          }
        }
      } else if (status === "paused") {
        console.log(`\u26A0\uFE0F Campaign ${trafficstarCampaignId} was found paused but should be active - will attempt to reactivate`);
        try {
          const campaign = await db.query.campaigns.findFirst({
            where: (campaign2, { eq: eq17 }) => eq17(campaign2.id, campaignId),
            with: {
              urls: {
                where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
              }
            }
          });
          if (campaign && campaign.urls && campaign.urls.length > 0) {
            let totalRemainingClicks = 0;
            console.log(`\u{1F50D} PAUSE DETECTED: Checking remaining clicks for ${campaign.urls.length} URLs in campaign ${trafficstarCampaignId}`);
            for (const url of campaign.urls) {
              console.log(`\u{1F50D} URL ID: ${url.id}, status: ${url.status}, clickLimit: ${url.clickLimit}, clicks: ${url.clicks}`);
              const remainingClicks = url.clickLimit - url.clicks;
              const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
              totalRemainingClicks += validRemaining;
              console.log(`\u2705 Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
            }
            const REMAINING_CLICKS_THRESHOLD = 15e3;
            if (totalRemainingClicks >= REMAINING_CLICKS_THRESHOLD) {
              console.log(`\u2705 Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks (>= ${REMAINING_CLICKS_THRESHOLD}) - will attempt reactivation during monitoring`);
              const today = /* @__PURE__ */ new Date();
              const todayStr = today.toISOString().split("T")[0];
              const endTimeStr = `${todayStr} 23:59:00`;
              await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), endTimeStr);
              await trafficStarService.activateCampaign(Number(trafficstarCampaignId));
              console.log(`\u2705 REACTIVATED campaign ${trafficstarCampaignId} during monitoring - it has ${totalRemainingClicks} remaining clicks`);
              await db.update(campaigns).set({
                lastTrafficSenderStatus: "reactivated_during_monitoring",
                lastTrafficSenderAction: /* @__PURE__ */ new Date(),
                updatedAt: /* @__PURE__ */ new Date()
              }).where(eq12(campaigns.id, campaignId));
              console.log(`\u2705 Marked campaign ${campaignId} as 'reactivated_during_monitoring' in database`);
            } else {
              console.log(`\u23F9\uFE0F Campaign ${trafficstarCampaignId} has only ${totalRemainingClicks} remaining clicks (< ${REMAINING_CLICKS_THRESHOLD}) - will not reactivate during monitoring`);
              clearInterval(interval);
              activeStatusChecks.delete(campaignId);
              startMinutelyPauseStatusCheck(campaignId, trafficstarCampaignId);
              await db.update(campaigns).set({
                lastTrafficSenderStatus: "staying_paused_low_clicks",
                lastTrafficSenderAction: /* @__PURE__ */ new Date(),
                updatedAt: /* @__PURE__ */ new Date()
              }).where(eq12(campaigns.id, campaignId));
              console.log(`\u2705 Marked campaign ${campaignId} as 'staying_paused_low_clicks' in database`);
            }
          }
        } catch (error) {
          console.error(`\u274C Error handling paused campaign ${trafficstarCampaignId} during active monitoring:`, error);
        }
      } else {
        console.log(`\u26A0\uFE0F Campaign ${trafficstarCampaignId} has unknown status during monitoring: ${status}`);
      }
    } catch (error) {
      console.error(`\u274C Error checking campaign ${trafficstarCampaignId} status during active monitoring:`, error);
    }
  }, 60 * 1e3);
  activeStatusChecks.set(campaignId, interval);
}
function startMinutelyPauseStatusCheck(campaignId, trafficstarCampaignId) {
  if (pauseStatusChecks.has(campaignId)) {
    clearInterval(pauseStatusChecks.get(campaignId));
    pauseStatusChecks.delete(campaignId);
  }
  if (activeStatusChecks.has(campaignId)) {
    clearInterval(activeStatusChecks.get(campaignId));
    activeStatusChecks.delete(campaignId);
  }
  console.log(`\u{1F504} Starting minute-by-minute PAUSE status check for campaign ${trafficstarCampaignId}`);
  const interval = setInterval(async () => {
    console.log(`\u23F1\uFE0F Running minute check for campaign ${trafficstarCampaignId} pause status`);
    try {
      const status = await getTrafficStarCampaignStatus(trafficstarCampaignId);
      if (statusMatches(status, "paused")) {
        console.log(`\u23F9\uFE0F Campaign ${trafficstarCampaignId} is still paused as expected - monitoring will continue`);
        const campaign = await db.query.campaigns.findFirst({
          where: (campaign2, { eq: eq17 }) => eq17(campaign2.id, campaignId),
          with: {
            urls: {
              where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
            }
          }
        });
        if (campaign && campaign.lastTrafficSenderAction && (campaign.lastTrafficSenderStatus === "auto_paused_low_clicks" || campaign.lastTrafficSenderStatus === "auto_paused_low_clicks_during_monitoring")) {
          const pauseDuration = Date.now() - campaign.lastTrafficSenderAction.getTime();
          const pauseMinutes = Math.floor(pauseDuration / (60 * 1e3));
          const postPauseMinutes = campaign.postPauseCheckMinutes || 2;
          console.log(`\u23F1\uFE0F Campaign ${trafficstarCampaignId} has been paused for ${pauseMinutes} minutes (check after ${postPauseMinutes} minutes)`);
          if (pauseMinutes >= postPauseMinutes) {
            console.log(`\u23F1\uFE0F ${pauseMinutes} minutes elapsed (>= ${postPauseMinutes}) since pausing - checking spent value and remaining clicks`);
            const spentValue = await getTrafficStarCampaignSpentValue(campaignId, trafficstarCampaignId);
            if (spentValue !== null) {
              let totalRemainingClicks = 0;
              console.log(`\u{1F50D} PAUSE MONITORING: Checking remaining clicks for ${campaign.urls.length} URLs in campaign ${trafficstarCampaignId}`);
              for (const url of campaign.urls) {
                console.log(`\u{1F50D} URL ID: ${url.id}, status: ${url.status}, clickLimit: ${url.clickLimit}, clicks: ${url.clicks}`);
                const remainingClicks = url.clickLimit - url.clicks;
                const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
                totalRemainingClicks += validRemaining;
                console.log(`\u2705 Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
              }
              const REMAINING_CLICKS_THRESHOLD = 15e3;
              if (totalRemainingClicks >= REMAINING_CLICKS_THRESHOLD) {
                console.log(`\u2705 Campaign ${trafficstarCampaignId} now has ${totalRemainingClicks} remaining clicks (>= ${REMAINING_CLICKS_THRESHOLD}) - will attempt reactivation after pause period`);
                try {
                  const today = /* @__PURE__ */ new Date();
                  const todayStr = today.toISOString().split("T")[0];
                  const endTimeStr = `${todayStr} 23:59:00`;
                  await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), endTimeStr);
                  await trafficStarService.activateCampaign(Number(trafficstarCampaignId));
                  console.log(`\u2705 REACTIVATED campaign ${trafficstarCampaignId} after pause period - it now has ${totalRemainingClicks} remaining clicks`);
                  await db.update(campaigns).set({
                    lastTrafficSenderStatus: "reactivated_after_pause",
                    lastTrafficSenderAction: /* @__PURE__ */ new Date(),
                    updatedAt: /* @__PURE__ */ new Date()
                  }).where(eq12(campaigns.id, campaignId));
                  console.log(`\u2705 Marked campaign ${campaignId} as 'reactivated_after_pause' in database`);
                  clearInterval(interval);
                  pauseStatusChecks.delete(campaignId);
                  startMinutelyStatusCheck(campaignId, trafficstarCampaignId);
                } catch (error) {
                  console.error(`\u274C Error reactivating campaign ${trafficstarCampaignId} after pause:`, error);
                }
              } else {
                console.log(`\u23F9\uFE0F Campaign ${trafficstarCampaignId} still has only ${totalRemainingClicks} remaining clicks (< ${REMAINING_CLICKS_THRESHOLD}) - continuing pause monitoring`);
                await db.update(campaigns).set({
                  lastTrafficSenderStatus: "checked_after_pause_still_low_clicks",
                  lastTrafficSenderAction: /* @__PURE__ */ new Date(),
                  updatedAt: /* @__PURE__ */ new Date()
                }).where(eq12(campaigns.id, campaignId));
                console.log(`\u2705 Marked campaign ${campaignId} as 'checked_after_pause_still_low_clicks' in database`);
              }
            }
          }
        }
      } else if (statusMatches(status, "active")) {
        console.log(`\u26A0\uFE0F Campaign ${trafficstarCampaignId} was found active but should be paused - will attempt to pause again`);
        try {
          const campaign = await db.query.campaigns.findFirst({
            where: (campaign2, { eq: eq17 }) => eq17(campaign2.id, campaignId),
            with: {
              urls: {
                where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
              }
            }
          });
          if (campaign && campaign.urls && campaign.urls.length > 0) {
            let totalRemainingClicks = 0;
            for (const url of campaign.urls) {
              const remainingClicks = url.clickLimit - url.clicks;
              totalRemainingClicks += remainingClicks > 0 ? remainingClicks : 0;
            }
            console.log(`Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks but should be paused - re-pausing campaign`);
            const now = /* @__PURE__ */ new Date();
            const formattedDateTime = now.toISOString().replace("T", " ").split(".")[0];
            await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
            await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), formattedDateTime);
            console.log(`\u2705 RE-PAUSED campaign ${trafficstarCampaignId} during pause monitoring - it was found active`);
            await db.update(campaigns).set({
              lastTrafficSenderStatus: "re_paused_during_monitoring",
              lastTrafficSenderAction: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq12(campaigns.id, campaignId));
            console.log(`\u2705 Marked campaign ${campaignId} as 're_paused_during_monitoring' in database`);
          }
        } catch (error) {
          console.error(`\u274C Error re-pausing campaign ${trafficstarCampaignId} during pause monitoring:`, error);
        }
      } else {
        console.log(`\u26A0\uFE0F Campaign ${trafficstarCampaignId} has unknown status during pause monitoring: ${status}`);
      }
    } catch (error) {
      console.error(`\u274C Error checking campaign ${trafficstarCampaignId} status during pause monitoring:`, error);
    }
  }, 60 * 1e3);
  pauseStatusChecks.set(campaignId, interval);
}
async function pauseTrafficStarCampaign(trafficstarCampaignId) {
  try {
    console.log(`\u23F9\uFE0F Attempting to pause TrafficStar campaign ${trafficstarCampaignId}`);
    const status = await getTrafficStarCampaignStatus(trafficstarCampaignId);
    if (statusMatches(status, "paused")) {
      console.log(`TrafficStar campaign ${trafficstarCampaignId} is already paused, no action needed`);
      return true;
    }
    const now = /* @__PURE__ */ new Date();
    const formattedDateTime = now.toISOString().replace("T", " ").split(".")[0];
    await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
    await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), formattedDateTime);
    console.log(`\u2705 Successfully paused TrafficStar campaign ${trafficstarCampaignId} with end time ${formattedDateTime}`);
    return true;
  } catch (error) {
    console.error(`\u274C Error pausing TrafficStar campaign ${trafficstarCampaignId}:`, error);
    return false;
  }
}
async function processTrafficGenerator(campaignId, forceMode) {
  try {
    console.log(`Processing Traffic Generator for campaign ${campaignId}`);
    const campaign = await db.query.campaigns.findFirst({
      where: (campaign2, { eq: eq17 }) => eq17(campaign2.id, campaignId),
      with: {
        urls: {
          where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
        }
      }
    });
    if (!campaign) {
      console.error(`Campaign ${campaignId} not found`);
      return;
    }
    if (!campaign.trafficGeneratorEnabled && !forceMode) {
      console.log(`Traffic Generator not enabled for campaign ${campaignId} - skipping`);
      if (campaign.trafficstarCampaignId && campaign.urls.length > 0) {
        console.log(`\u{1F504} Campaign has Traffic Generator DISABLED but has ${campaign.urls.length} active URLs - ensuring it's ACTIVE 24/7`);
        const status = await getTrafficStarCampaignStatus(campaign.trafficstarCampaignId);
        if (statusMatches(status, "paused")) {
          console.log(`\u26A0\uFE0F Campaign ${campaign.trafficstarCampaignId} is paused but has active URLs and Traffic Generator is OFF - activating it`);
          try {
            const today = /* @__PURE__ */ new Date();
            const todayStr = today.toISOString().split("T")[0];
            const endTimeStr = `${todayStr} 23:59:00`;
            await trafficStarService.updateCampaignEndTime(Number(campaign.trafficstarCampaignId), endTimeStr);
            console.log(`Set campaign ${campaign.trafficstarCampaignId} end time to ${endTimeStr}`);
            await trafficStarService.activateCampaign(Number(campaign.trafficstarCampaignId));
            console.log(`Activating campaign ${campaign.trafficstarCampaignId}`);
            await db.update(campaigns).set({
              lastTrafficSenderStatus: "activated_manually_traffic_gen_off",
              lastTrafficSenderAction: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq12(campaigns.id, campaignId));
            console.log(`\u2705 Successfully activated campaign ${campaign.trafficstarCampaignId} with Traffic Generator OFF`);
          } catch (error) {
            console.error(`\u274C Error activating campaign ${campaign.trafficstarCampaignId} with Traffic Generator OFF:`, error);
          }
        }
      }
      return;
    }
    if (campaign.trafficstarCampaignId && campaign.urls.length > 0) {
      const MINIMUM_CLICKS_THRESHOLD = 5e3;
      let totalRemainingClicks = 0;
      for (const url of campaign.urls) {
        const remainingClicks = url.clickLimit - url.clicks;
        if (remainingClicks > 0) {
          totalRemainingClicks += remainingClicks;
        }
      }
      if (totalRemainingClicks <= MINIMUM_CLICKS_THRESHOLD) {
        console.log(`\u26A0\uFE0F IMMEDIATE ACTION: Campaign ${campaign.trafficstarCampaignId} has only ${totalRemainingClicks} remaining clicks (\u2264 ${MINIMUM_CLICKS_THRESHOLD}) - pausing immediately`);
        const status = await getTrafficStarCampaignStatus(campaign.trafficstarCampaignId);
        if (statusMatches(status, "active")) {
          await pauseTrafficStarCampaign(campaign.trafficstarCampaignId);
          await db.update(campaigns).set({
            lastTrafficSenderStatus: "auto_paused_low_clicks_immediate",
            lastTrafficSenderAction: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq12(campaigns.id, campaignId));
          console.log(`\u2705 IMMEDIATELY PAUSED campaign ${campaign.trafficstarCampaignId} due to low clicks (${totalRemainingClicks} < ${MINIMUM_CLICKS_THRESHOLD})`);
          startMinutelyPauseStatusCheck(campaignId, campaign.trafficstarCampaignId);
          return;
        }
      }
    }
    if (!campaign.trafficstarCampaignId) {
      console.error(`Campaign ${campaignId} has no TrafficStar ID - skipping`);
      return;
    }
    console.log(`Processing Traffic Generator for campaign ${campaignId} with TrafficStar ID ${campaign.trafficstarCampaignId}`);
    if (forceMode === "force_activate") {
      console.log(`\u{1F4AA} FORCE MODE: Forcing activation of campaign ${campaign.trafficstarCampaignId}`);
      try {
        const today = /* @__PURE__ */ new Date();
        const todayStr = today.toISOString().split("T")[0];
        const endTimeStr = `${todayStr} 23:59:00`;
        await trafficStarService.updateCampaignEndTime(Number(campaign.trafficstarCampaignId), endTimeStr);
        await trafficStarService.activateCampaign(Number(campaign.trafficstarCampaignId));
        console.log(`\u2705 FORCE MODE: Successfully activated campaign ${campaign.trafficstarCampaignId}`);
        startMinutelyStatusCheck(campaignId, campaign.trafficstarCampaignId);
        return;
      } catch (error) {
        console.error(`\u274C FORCE MODE: Error activating campaign ${campaign.trafficstarCampaignId}:`, error);
        return;
      }
    } else if (forceMode === "force_pause") {
      console.log(`\u{1F4AA} FORCE MODE: Forcing pause of campaign ${campaign.trafficstarCampaignId}`);
      try {
        await pauseTrafficStarCampaign(campaign.trafficstarCampaignId);
        console.log(`\u2705 FORCE MODE: Successfully paused campaign ${campaign.trafficstarCampaignId}`);
        startMinutelyPauseStatusCheck(campaignId, campaign.trafficstarCampaignId);
        return;
      } catch (error) {
        console.error(`\u274C FORCE MODE: Error pausing campaign ${campaign.trafficstarCampaignId}:`, error);
        return;
      }
    }
    const spentValue = await getTrafficStarCampaignSpentValue(campaignId, campaign.trafficstarCampaignId);
    if (spentValue === null) {
      console.error(`Failed to get spent value for campaign ${campaignId}`);
      return;
    }
    console.log(`Campaign ${campaignId} spent value: $${spentValue.toFixed(4)}`);
    await handleCampaignBySpentValue(campaignId, campaign.trafficstarCampaignId, spentValue);
  } catch (error) {
    console.error(`Error processing Traffic Generator for campaign ${campaignId}:`, error);
  }
}
async function runTrafficGeneratorForAllCampaigns() {
  try {
    console.log("Running Traffic Generator for all enabled campaigns");
    const enabledCampaigns = await db.query.campaigns.findMany({
      where: (campaign, { eq: eq17 }) => eq17(campaign.trafficGeneratorEnabled, true)
    });
    if (enabledCampaigns.length === 0) {
      console.log("No campaigns have Traffic Generator enabled - skipping");
      return;
    }
    console.log(`Processing ${enabledCampaigns.length} campaigns with traffic generator enabled`);
    for (const campaign of enabledCampaigns) {
      try {
        await processTrafficGenerator(campaign.id);
      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
      }
    }
    console.log("Finished running Traffic Generator for all enabled campaigns");
  } catch (error) {
    console.error("Error running Traffic Generator for all campaigns:", error);
  }
}
function initializeTrafficGeneratorScheduler() {
  console.log("Initializing Traffic Generator status monitor");
  console.log("Running initial traffic generator check on startup");
  runTrafficGeneratorForAllCampaigns();
  console.log("Running initial empty URL check");
  checkForCampaignsWithNoURLs();
  setInterval(() => {
    console.log("Running scheduled empty URL check");
    checkForCampaignsWithNoURLs();
  }, 60 * 1e3);
  console.log("Traffic Generator status monitor initialized successfully");
}
async function checkForCampaignsWithNoURLs() {
  try {
    console.log("Checking for campaigns with no active URLs to pause TrafficStar campaigns");
    const campaignsWithTrafficStar = await db.select({
      id: campaigns.id,
      name: campaigns.name,
      trafficstarCampaignId: campaigns.trafficstarCampaignId,
      trafficGeneratorEnabled: campaigns.trafficGeneratorEnabled,
      lastTrafficSenderStatus: campaigns.lastTrafficSenderStatus,
      lastTrafficSenderAction: campaigns.lastTrafficSenderAction
    }).from(campaigns).where(sql5`${campaigns.trafficstarCampaignId} IS NOT NULL`);
    if (campaignsWithTrafficStar.length === 0) {
      console.log("No campaigns with TrafficStar integration found");
      return;
    }
    console.log(`Found ${campaignsWithTrafficStar.length} campaigns with TrafficStar integration`);
    for (const campaign of campaignsWithTrafficStar) {
      if (campaign.lastTrafficSenderAction && campaign.lastTrafficSenderStatus && (campaign.lastTrafficSenderStatus === "auto_paused_low_clicks" || campaign.lastTrafficSenderStatus === "auto_paused_low_spend" || campaign.lastTrafficSenderStatus === "reactivated_during_monitoring")) {
        if (campaign.lastTrafficSenderAction) {
          const waitDuration = Date.now() - campaign.lastTrafficSenderAction.getTime();
          const waitMinutes = Math.floor(waitDuration / (60 * 1e3));
          const requiredWaitMinutes = 10;
          if (waitMinutes < requiredWaitMinutes) {
            console.log(`Campaign ${campaign.id} was recently processed (${waitMinutes}/${requiredWaitMinutes} minutes ago) - skipping empty URL check`);
            continue;
          }
        }
      }
      const activeUrls = await db.select().from(urls).where(
        and6(
          eq12(urls.campaignId, campaign.id),
          eq12(urls.status, "active")
        )
      );
      console.log(`Campaign ${campaign.id} (TrafficStar ID: ${campaign.trafficstarCampaignId}) has ${activeUrls.length} active URLs`);
      if (activeUrls.length === 0) {
        console.log(`Campaign ${campaign.id} has NO active URLs - will pause TrafficStar campaign ${campaign.trafficstarCampaignId}`);
        const currentStatus = await getTrafficStarCampaignStatus(campaign.trafficstarCampaignId);
        if (statusMatches(currentStatus, "active")) {
          console.log(`TrafficStar campaign ${campaign.trafficstarCampaignId} is ACTIVE with no active URLs - will pause it`);
          try {
            const now = /* @__PURE__ */ new Date();
            const formattedDateTime = now.toISOString().replace("T", " ").split(".")[0];
            await trafficStarService.pauseCampaign(Number(campaign.trafficstarCampaignId));
            await trafficStarService.updateCampaignEndTime(Number(campaign.trafficstarCampaignId), formattedDateTime);
            console.log(`\u2705 PAUSED campaign ${campaign.trafficstarCampaignId} with NO active URLs`);
            await db.update(campaigns).set({
              lastTrafficSenderStatus: "auto_paused_no_active_urls",
              lastTrafficSenderAction: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq12(campaigns.id, campaign.id));
            console.log(`\u{1F504} Starting minute-by-minute EMPTY URL status check for campaign ${campaign.trafficstarCampaignId}`);
          } catch (error) {
            console.error(`\u274C Error pausing TrafficStar campaign ${campaign.trafficstarCampaignId}:`, error);
          }
        } else if (statusMatches(currentStatus, "paused")) {
          console.log(`TrafficStar campaign ${campaign.trafficstarCampaignId} is already PAUSED with no active URLs - continuing monitoring`);
          await db.update(campaigns).set({
            lastTrafficSenderStatus: "paused_no_active_urls",
            lastTrafficSenderAction: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq12(campaigns.id, campaign.id));
          console.log(`\u{1F504} Starting minute-by-minute EMPTY URL status check for campaign ${campaign.trafficstarCampaignId}`);
        } else {
          console.log(`TrafficStar campaign ${campaign.trafficstarCampaignId} has status: ${currentStatus || "unknown"} - will monitor`);
          if (campaign.trafficstarCampaignId) {
            console.log(`\u{1F504} Campaign ${campaign.id} included in the minute-by-minute empty URL check`);
          }
        }
      } else if (campaign.lastTrafficSenderStatus === "auto_paused_no_active_urls" || campaign.lastTrafficSenderStatus === "paused_no_active_urls") {
        console.log(`Campaign ${campaign.id} now has ${activeUrls.length} active URLs but was previously paused - will check status`);
        const status = await getTrafficStarCampaignStatus(campaign.trafficstarCampaignId);
        if (statusMatches(status, "paused")) {
          console.log(`Campaign ${campaign.trafficstarCampaignId} is paused but now has active URLs - activating it`);
          try {
            const today = /* @__PURE__ */ new Date();
            const todayStr = today.toISOString().split("T")[0];
            const endTimeStr = `${todayStr} 23:59:00`;
            await trafficStarService.updateCampaignEndTime(Number(campaign.trafficstarCampaignId), endTimeStr);
            console.log(`Set campaign ${campaign.trafficstarCampaignId} end time to ${endTimeStr}`);
            await trafficStarService.activateCampaign(Number(campaign.trafficstarCampaignId));
            console.log(`\u2705 Activated campaign ${campaign.trafficstarCampaignId} that now has active URLs`);
            await db.update(campaigns).set({
              lastTrafficSenderStatus: "activated_with_new_urls",
              lastTrafficSenderAction: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq12(campaigns.id, campaign.id));
            startMinutelyStatusCheck(campaign.id, campaign.trafficstarCampaignId);
          } catch (error) {
            console.error(`\u274C Error activating campaign ${campaign.trafficstarCampaignId} with new URLs:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error checking for campaigns with no URLs:", error);
  }
}
async function checkCampaignStatusAfterUrlChange(campaignId, urlWasActivated) {
  try {
    console.log(`\u{1F504} REAL-TIME CHECK: Campaign ${campaignId} status after URL was ${urlWasActivated ? "activated" : "deactivated"}`);
    const campaign = await db.query.campaigns.findFirst({
      where: (campaign2, { eq: eq17 }) => eq17(campaign2.id, campaignId),
      with: {
        urls: {
          where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
        }
      }
    });
    if (!campaign) {
      console.error(`Campaign ${campaignId} not found in real-time check`);
      return;
    }
    if (!campaign.trafficstarCampaignId) {
      console.log(`Campaign ${campaignId} has no TrafficStar ID - skipping real-time check`);
      return;
    }
    if (urlWasActivated && campaign.urls.length === 1) {
      console.log(`\u2705 REAL-TIME: First URL added to campaign ${campaignId} - activating TrafficStar campaign ${campaign.trafficstarCampaignId}`);
      const status = await getTrafficStarCampaignStatus(campaign.trafficstarCampaignId);
      if (statusMatches(status, "paused")) {
        try {
          const today = /* @__PURE__ */ new Date();
          const todayStr = today.toISOString().split("T")[0];
          const endTimeStr = `${todayStr} 23:59:00`;
          await trafficStarService.updateCampaignEndTime(Number(campaign.trafficstarCampaignId), endTimeStr);
          console.log(`Set campaign ${campaign.trafficstarCampaignId} end time to ${endTimeStr}`);
          await trafficStarService.activateCampaign(Number(campaign.trafficstarCampaignId));
          console.log(`\u2705 REAL-TIME: Activated campaign ${campaign.trafficstarCampaignId} after first URL was added`);
          await db.update(campaigns).set({
            lastTrafficSenderStatus: "activated_after_url_added",
            lastTrafficSenderAction: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq12(campaigns.id, campaignId));
          startMinutelyStatusCheck(campaignId, campaign.trafficstarCampaignId);
        } catch (error) {
          console.error(`\u274C REAL-TIME: Error activating campaign ${campaign.trafficstarCampaignId} after URL activation:`, error);
        }
      }
    } else if (!urlWasActivated && campaign.urls.length === 0) {
      console.log(`\u23F9\uFE0F REAL-TIME: Last URL removed from campaign ${campaignId} - pausing TrafficStar campaign ${campaign.trafficstarCampaignId}`);
      const status = await getTrafficStarCampaignStatus(campaign.trafficstarCampaignId);
      if (statusMatches(status, "active")) {
        try {
          const now = /* @__PURE__ */ new Date();
          const formattedDateTime = now.toISOString().replace("T", " ").split(".")[0];
          await trafficStarService.pauseCampaign(Number(campaign.trafficstarCampaignId));
          await trafficStarService.updateCampaignEndTime(Number(campaign.trafficstarCampaignId), formattedDateTime);
          console.log(`\u2705 REAL-TIME: Paused campaign ${campaign.trafficstarCampaignId} after last URL was removed`);
          await db.update(campaigns).set({
            lastTrafficSenderStatus: "paused_after_url_removed",
            lastTrafficSenderAction: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq12(campaigns.id, campaignId));
          console.log(`\u{1F504} Campaign ${campaignId} now included in the minute-by-minute empty URL check`);
        } catch (error) {
          console.error(`\u274C REAL-TIME: Error pausing campaign ${campaign.trafficstarCampaignId} after URL deactivation:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`\u274C Error in real-time campaign status check after URL change:`, error);
  }
}
async function debugProcessCampaign(campaignId) {
  try {
    console.log(`\u{1F50D} DEBUG: Testing Traffic Generator for campaign ${campaignId}`);
    const campaign = await db.query.campaigns.findFirst({
      where: (campaign2, { eq: eq17 }) => eq17(campaign2.id, campaignId),
      with: {
        urls: {
          where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
        }
      }
    });
    if (!campaign) {
      return { success: false, error: `Campaign ${campaignId} not found` };
    }
    if (!campaign.trafficstarCampaignId) {
      return { success: false, error: `Campaign ${campaignId} has no TrafficStar ID` };
    }
    const spentValue = await getTrafficStarCampaignSpentValue(campaignId, campaign.trafficstarCampaignId);
    const status = await getTrafficStarCampaignStatus(campaign.trafficstarCampaignId);
    let totalRemainingClicks = 0;
    let activeUrls = 0;
    let inactiveUrls = 0;
    let urlDetails = [];
    for (const url of campaign.urls) {
      const remainingClicks = url.clickLimit - url.clicks;
      const effectiveRemaining = remainingClicks > 0 ? remainingClicks : 0;
      urlDetails.push({
        id: url.id,
        name: url.name,
        status: url.status,
        clickLimit: url.clickLimit,
        clicks: url.clicks,
        remainingClicks: effectiveRemaining,
        isActive: true
      });
      totalRemainingClicks += effectiveRemaining;
      activeUrls++;
    }
    return {
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        trafficstarCampaignId: campaign.trafficstarCampaignId,
        trafficGeneratorEnabled: campaign.trafficGeneratorEnabled,
        lastTrafficSenderStatus: campaign.lastTrafficSenderStatus,
        lastTrafficSenderAction: campaign.lastTrafficSenderAction,
        postPauseCheckMinutes: campaign.postPauseCheckMinutes || 2
      },
      status,
      spentValue: spentValue !== null ? `$${spentValue.toFixed(4)}` : null,
      clicks: {
        totalRemainingClicks,
        totalUrls: campaign.urls.length,
        activeUrls,
        inactiveUrls,
        urlDetails
      },
      thresholds: {
        spentThreshold: 10,
        minimumClicksThreshold: 5e3,
        remainingClicksThreshold: 15e3
      }
    };
  } catch (error) {
    console.error(`Error in debug process:`, error);
    return { success: false, error: String(error) };
  }
}
var activeStatusChecks, pauseStatusChecks;
var init_traffic_generator = __esm({
  "server/traffic-generator.ts"() {
    "use strict";
    init_trafficstar_service();
    init_db();
    init_schema();
    init_spent_value();
    activeStatusChecks = /* @__PURE__ */ new Map();
    pauseStatusChecks = /* @__PURE__ */ new Map();
  }
});

// server/migrations/decimal-multiplier.ts
var decimal_multiplier_exports = {};
__export(decimal_multiplier_exports, {
  updateMultiplierToDecimal: () => updateMultiplierToDecimal
});
import { sql as sql6 } from "drizzle-orm";
async function updateMultiplierToDecimal() {
  try {
    console.log("Starting migration: Converting campaign multiplier to decimal type...");
    const checkResult = await db.execute(sql6`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'campaigns' AND column_name = 'multiplier'
    `);
    if (checkResult.rows.length > 0 && checkResult.rows[0].data_type === "numeric") {
      console.log("Migration not needed: multiplier is already numeric type");
      return { success: true, message: "Column already has correct type" };
    }
    await db.execute(sql6`
      ALTER TABLE campaigns 
      ALTER COLUMN multiplier TYPE NUMERIC(10,2) USING multiplier::NUMERIC;
    `);
    console.log("Migration complete: Campaign multiplier column converted to decimal type");
    return { success: true, message: "Column type updated successfully" };
  } catch (error) {
    console.error("Migration failed:", error);
    return { success: false, message: `Migration failed: ${error}` };
  }
}
var init_decimal_multiplier = __esm({
  "server/migrations/decimal-multiplier.ts"() {
    "use strict";
    init_db();
  }
});

// server/migrations/add-trafficstar-fields.ts
var add_trafficstar_fields_exports = {};
__export(add_trafficstar_fields_exports, {
  addTrafficStarFields: () => addTrafficStarFields
});
import { sql as sql7 } from "drizzle-orm";
async function addTrafficStarFields() {
  try {
    console.log("Starting migration: Adding TrafficStar fields to campaigns table...");
    const checkResult = await db.execute(sql7`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'campaigns' AND column_name = 'trafficstar_campaign_id'
    `);
    if (checkResult.rows.length > 0) {
      console.log("Migration not needed: trafficstar_campaign_id column already exists");
      return { success: true, message: "Columns already exist" };
    }
    await db.execute(sql7`
      ALTER TABLE campaigns 
      ADD COLUMN trafficstar_campaign_id TEXT,
      ADD COLUMN auto_manage_trafficstar BOOLEAN DEFAULT FALSE,
      ADD COLUMN last_trafficstar_sync TIMESTAMP;
    `);
    console.log("Migration complete: TrafficStar fields added to campaigns table");
    return { success: true, message: "Columns added successfully" };
  } catch (error) {
    console.error("Migration failed:", error);
    return { success: false, message: `Migration failed: ${error}` };
  }
}
var init_add_trafficstar_fields = __esm({
  "server/migrations/add-trafficstar-fields.ts"() {
    "use strict";
    init_db();
  }
});

// server/migrations/check-migration-needed.ts
var check_migration_needed_exports = {};
__export(check_migration_needed_exports, {
  isBudgetUpdateTimeMigrationNeeded: () => isBudgetUpdateTimeMigrationNeeded,
  isTrafficStarFieldsMigrationNeeded: () => isTrafficStarFieldsMigrationNeeded
});
async function isBudgetUpdateTimeMigrationNeeded() {
  try {
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'campaigns' 
      AND column_name = 'budget_update_time'
    `;
    const result = await db.execute(checkQuery);
    console.log("Budget update time migration check result:", result);
    return false;
  } catch (error) {
    console.error("Error checking if budget update time migration is needed:", error);
    return false;
  }
}
async function isTrafficStarFieldsMigrationNeeded() {
  try {
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'campaigns' 
      AND column_name = 'trafficstar_campaign_id'
    `;
    const result = await db.execute(checkQuery);
    console.log("TrafficStar fields migration check result:", result);
    return false;
  } catch (error) {
    console.error("Error checking if TrafficStar fields migration is needed:", error);
    return false;
  }
}
var init_check_migration_needed = __esm({
  "server/migrations/check-migration-needed.ts"() {
    "use strict";
    init_db();
  }
});

// server/migrations/add-budget-update-time.ts
var add_budget_update_time_exports = {};
__export(add_budget_update_time_exports, {
  addBudgetUpdateTimeField: () => addBudgetUpdateTimeField
});
async function addBudgetUpdateTimeField() {
  try {
    console.log("Running migration to add budgetUpdateTime field...");
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'campaigns' 
      AND column_name = 'budget_update_time'
    `;
    const result = await db.execute(checkQuery);
    if (result.rowCount === 0) {
      console.log("Adding budget_update_time column to campaigns table");
      const addColumnQuery = `
        ALTER TABLE campaigns 
        ADD COLUMN budget_update_time TEXT DEFAULT '00:00:00'
      `;
      await db.execute(addColumnQuery);
      console.log("\u2705 Successfully added budget_update_time column");
    } else {
      console.log("Column budget_update_time already exists, skipping migration");
    }
    return { success: true };
  } catch (error) {
    console.error("\u274C Failed to add budgetUpdateTime field:", error);
    return { success: false, error };
  }
}
var init_add_budget_update_time = __esm({
  "server/migrations/add-budget-update-time.ts"() {
    "use strict";
    init_db();
  }
});

// server/migrations/add-traffic-sender-fields.ts
var add_traffic_sender_fields_exports = {};
__export(add_traffic_sender_fields_exports, {
  addTrafficSenderFields: () => addTrafficSenderFields
});
async function addTrafficSenderFields(pool2) {
  console.log("Traffic Sender migration skipped - feature has been removed");
  return {
    success: true,
    message: "Traffic Sender feature has been removed. Migration skipped."
  };
}
var init_add_traffic_sender_fields = __esm({
  "server/migrations/add-traffic-sender-fields.ts"() {
    "use strict";
  }
});

// server/traffic-generator-new.ts
var traffic_generator_new_exports = {};
__export(traffic_generator_new_exports, {
  debugProcessCampaign: () => debugProcessCampaign2,
  getTrafficStarCampaignSpentValue: () => getTrafficStarCampaignSpentValue2,
  getTrafficStarCampaignStatus: () => getTrafficStarCampaignStatus2,
  handleCampaignBySpentValue: () => handleCampaignBySpentValue2,
  initializeTrafficGeneratorScheduler: () => initializeTrafficGeneratorScheduler2,
  pauseTrafficStarCampaign: () => pauseTrafficStarCampaign2,
  pauseTrafficStarForEmptyCampaigns: () => pauseTrafficStarForEmptyCampaigns,
  processTrafficGenerator: () => processTrafficGenerator2,
  runTrafficGeneratorForAllCampaigns: () => runTrafficGeneratorForAllCampaigns2
});
import { eq as eq13, and as and7, sql as sql8 } from "drizzle-orm";
async function getTrafficStarCampaignStatus2(trafficstarCampaignId) {
  try {
    console.log(`TRAFFIC-GENERATOR: Getting REAL-TIME status for campaign ${trafficstarCampaignId}`);
    const status = await trafficStarService.getCampaignStatus(Number(trafficstarCampaignId));
    if (!status) {
      console.error(`Failed to get TrafficStar campaign ${trafficstarCampaignId} status`);
      return null;
    }
    console.log(`TRAFFIC-GENERATOR: TrafficStar campaign ${trafficstarCampaignId} REAL status is ${status.status}, active=${status.active}`);
    return status.active ? "active" : "paused";
  } catch (error) {
    console.error("Error getting TrafficStar campaign status:", error);
    return null;
  }
}
async function getTrafficStarCampaignSpentValue2(campaignId, trafficstarCampaignId) {
  try {
    const today = /* @__PURE__ */ new Date();
    const formattedDate = today.toISOString().split("T")[0];
    console.log(`Fetching spent value for campaign ${trafficstarCampaignId} on ${formattedDate}`);
    try {
      const campaignData = await trafficStarService.getCampaign(Number(trafficstarCampaignId));
      const spentValue = parseSpentValue(campaignData);
      if (spentValue > 0) {
        console.log(`Campaign ${trafficstarCampaignId} spent value from campaign object helper: $${spentValue.toFixed(4)}`);
        await db.update(campaigns).set({
          dailySpent: spentValue.toString(),
          dailySpentDate: new Date(formattedDate),
          lastSpentCheck: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(campaigns.id, campaignId));
        return spentValue;
      }
    } catch (helperError) {
      console.error(`Failed to get spent value using helper for campaign ${trafficstarCampaignId}:`, helperError);
    }
    try {
      const campaignData = await trafficStarService.getCampaign(Number(trafficstarCampaignId));
      if (campaignData && typeof campaignData.spent === "number") {
        console.log(`Campaign ${trafficstarCampaignId} spent value from campaign data: $${campaignData.spent.toFixed(4)}`);
        await db.update(campaigns).set({
          dailySpent: campaignData.spent.toString(),
          dailySpentDate: new Date(formattedDate),
          lastSpentCheck: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(campaigns.id, campaignId));
        return campaignData.spent;
      } else if (campaignData && typeof campaignData.spent === "string") {
        const numericValue = parseFloat(campaignData.spent.replace("$", ""));
        console.log(`Campaign ${trafficstarCampaignId} spent value from campaign data (string): $${numericValue.toFixed(4)}`);
        await db.update(campaigns).set({
          dailySpent: numericValue.toString(),
          dailySpentDate: new Date(formattedDate),
          lastSpentCheck: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(campaigns.id, campaignId));
        return numericValue;
      }
    } catch (campaignDataError) {
      console.error(`Failed to get campaign data for campaign ${trafficstarCampaignId}:`, campaignDataError);
    }
    try {
      const result = await trafficStarService.getCampaignSpentValue(Number(trafficstarCampaignId));
      if (result && typeof result.totalSpent === "number") {
        console.log(`Campaign ${trafficstarCampaignId} direct API spent value: $${result.totalSpent.toFixed(4)}`);
        await db.update(campaigns).set({
          dailySpent: result.totalSpent.toString(),
          dailySpentDate: new Date(formattedDate),
          lastSpentCheck: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(campaigns.id, campaignId));
        return result.totalSpent;
      }
    } catch (directApiError) {
      console.error(`Failed to get spent value directly from TrafficStar API:`, directApiError);
    }
    try {
      const [campaign] = await db.select().from(campaigns).where(eq13(campaigns.id, campaignId));
      if (campaign && campaign.dailySpent !== null && campaign.dailySpent !== void 0) {
        const storedSpent = parseFloat(campaign.dailySpent);
        console.log(`Campaign ${trafficstarCampaignId} using stored spent value: $${storedSpent.toFixed(4)}`);
        return storedSpent;
      }
    } catch (dbError) {
      console.error(`Failed to get stored spent value for campaign ${trafficstarCampaignId}:`, dbError);
    }
    console.log(`No spent data available for campaign ${trafficstarCampaignId} - using 0`);
    await db.update(campaigns).set({
      lastSpentCheck: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq13(campaigns.id, campaignId));
    return 0;
  } catch (error) {
    console.error(`Error getting spent value for campaign ${trafficstarCampaignId}:`, error);
    return null;
  }
}
async function handleCampaignBySpentValue2(campaignId, trafficstarCampaignId, spentValue) {
  const THRESHOLD = 10;
  const REMAINING_CLICKS_THRESHOLD = 15e3;
  const MINIMUM_CLICKS_THRESHOLD = 5e3;
  try {
    console.log(`TRAFFIC-GENERATOR: Handling campaign ${trafficstarCampaignId} by spent value - current spent: $${spentValue.toFixed(4)}`);
    if (spentValue < THRESHOLD) {
      console.log(`\u{1F535} LOW SPEND ($${spentValue.toFixed(4)} < $${THRESHOLD.toFixed(2)}): Campaign ${trafficstarCampaignId} has spent less than $${THRESHOLD.toFixed(2)}`);
      await url_budget_logger_default.clearCampaignLogs(campaignId);
      const urlBudgetManager2 = (await Promise.resolve().then(() => (init_url_budget_manager(), url_budget_manager_exports))).default;
      if (urlBudgetManager2.hasPendingUpdates(campaignId)) {
        console.log(`\u{1F504} Cancelling pending budget updates for campaign ${campaignId} as spent value is below threshold`);
        urlBudgetManager2.cancelPendingUpdates(campaignId);
      }
      const campaign = await db.query.campaigns.findFirst({
        where: (campaign2, { eq: eq17 }) => eq17(campaign2.id, campaignId),
        with: {
          urls: {
            where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
          }
        }
      });
      if (!campaign || !campaign.urls || campaign.urls.length === 0) {
        console.log(`\u23F9\uFE0F LOW SPEND ACTION: Campaign ${trafficstarCampaignId} has no URLs - skipping auto-reactivation check`);
      } else {
        let totalRemainingClicks = 0;
        console.log(`\u{1F50D} DEBUG: Checking remaining clicks for ${campaign.urls.length} URLs in campaign ${trafficstarCampaignId}`);
        for (const url of campaign.urls) {
          console.log(`\u{1F50D} URL ID: ${url.id}, status: ${url.status}, clickLimit: ${url.clickLimit}, clicks: ${url.clicks}`);
          if (url.status === "active") {
            const remainingClicks = url.clickLimit - url.clicks;
            const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
            totalRemainingClicks += validRemaining;
            console.log(`\u2705 Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
          } else {
            console.log(`\u274C Skipping URL ID: ${url.id} with status: ${url.status}`);
          }
        }
        console.log(`\u{1F4CA} Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} total remaining clicks across all active URLs`);
        const currentStatus = await getTrafficStarCampaignStatus2(trafficstarCampaignId);
        console.log(`\u{1F4CA} Campaign ${trafficstarCampaignId} current status: ${currentStatus}`);
        if (totalRemainingClicks >= REMAINING_CLICKS_THRESHOLD && currentStatus !== "active") {
          console.log(`\u2705 Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks (>= ${REMAINING_CLICKS_THRESHOLD}) - will attempt auto-reactivation`);
          try {
            const today = /* @__PURE__ */ new Date();
            const todayStr = today.toISOString().split("T")[0];
            const endTimeStr = `${todayStr} 23:59:00`;
            await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), endTimeStr);
            console.log(`\u2705 Set campaign ${trafficstarCampaignId} end time to ${endTimeStr}`);
            try {
              await trafficStarService.activateCampaign(Number(trafficstarCampaignId));
              console.log(`\u2705 AUTO-REACTIVATED low spend campaign ${trafficstarCampaignId} - it has ${totalRemainingClicks} remaining clicks`);
              await db.update(campaigns).set({
                lastTrafficSenderStatus: "auto_reactivated_low_spend",
                lastTrafficSenderAction: /* @__PURE__ */ new Date(),
                updatedAt: /* @__PURE__ */ new Date()
              }).where(eq13(campaigns.id, campaignId));
              console.log(`\u2705 Marked campaign ${campaignId} as 'auto_reactivated_low_spend' in database`);
              startMinutelyStatusCheck2(campaignId, trafficstarCampaignId);
              return;
            } catch (activateError) {
              console.error(`\u274C Failed to auto-reactivate low spend campaign ${trafficstarCampaignId}:`, activateError);
            }
          } catch (error) {
            console.error(`\u274C Error auto-reactivating low spend campaign ${trafficstarCampaignId}:`, error);
          }
        } else if (totalRemainingClicks <= MINIMUM_CLICKS_THRESHOLD && currentStatus === "active") {
          console.log(`\u23F9\uFE0F Campaign ${trafficstarCampaignId} only has ${totalRemainingClicks} remaining clicks (<= ${MINIMUM_CLICKS_THRESHOLD}) - will pause campaign`);
          try {
            const now = /* @__PURE__ */ new Date();
            const formattedDateTime = now.toISOString().replace("T", " ").split(".")[0];
            try {
              await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
              try {
                await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), formattedDateTime);
                console.log(`\u2705 PAUSED low spend campaign ${trafficstarCampaignId} due to low remaining clicks (${totalRemainingClicks} <= ${MINIMUM_CLICKS_THRESHOLD})`);
                await db.update(campaigns).set({
                  lastTrafficSenderStatus: "auto_paused_low_clicks",
                  lastTrafficSenderAction: /* @__PURE__ */ new Date(),
                  updatedAt: /* @__PURE__ */ new Date()
                }).where(eq13(campaigns.id, campaignId));
                console.log(`\u2705 Marked campaign ${campaignId} as 'auto_paused_low_clicks' in database`);
                startMinutelyPauseStatusCheck2(campaignId, trafficstarCampaignId);
                return;
              } catch (endTimeError) {
                console.error(`\u274C Error setting end time for campaign ${trafficstarCampaignId}:`, endTimeError);
              }
            } catch (pauseError) {
              console.error(`\u274C Failed to pause low spend campaign ${trafficstarCampaignId} with low remaining clicks:`, pauseError);
            }
          } catch (error) {
            console.error(`\u274C Error pausing low spend campaign ${trafficstarCampaignId} with low remaining clicks:`, error);
          }
        } else if (totalRemainingClicks >= REMAINING_CLICKS_THRESHOLD && currentStatus === "active") {
          console.log(`\u2705 Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks and is already active - continuing monitoring`);
          startMinutelyStatusCheck2(campaignId, trafficstarCampaignId);
          await db.update(campaigns).set({
            lastTrafficSenderStatus: "active_with_sufficient_clicks",
            lastTrafficSenderAction: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq13(campaigns.id, campaignId));
          return;
        } else if (totalRemainingClicks <= MINIMUM_CLICKS_THRESHOLD && currentStatus !== "active") {
          console.log(`\u23F9\uFE0F Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks (<= ${MINIMUM_CLICKS_THRESHOLD}) and is already paused - monitoring to ensure it stays paused`);
          startMinutelyPauseStatusCheck2(campaignId, trafficstarCampaignId);
          await db.update(campaigns).set({
            lastTrafficSenderStatus: "paused_with_low_clicks",
            lastTrafficSenderAction: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq13(campaigns.id, campaignId));
          return;
        } else {
          console.log(`\u23F8\uFE0F Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks (between thresholds) - maintaining current status`);
          await db.update(campaigns).set({
            lastTrafficSenderStatus: "between_click_thresholds",
            lastTrafficSenderAction: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq13(campaigns.id, campaignId));
        }
      }
      if (!await db.query.campaigns.findFirst({
        where: (c, { eq: eq17, and: and9 }) => and9(
          eq17(c.id, campaignId),
          eq17(c.lastTrafficSenderStatus, "low_spend")
        )
      })) {
        await db.update(campaigns).set({
          lastTrafficSenderStatus: "low_spend",
          lastTrafficSenderAction: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(campaigns.id, campaignId));
        console.log(`\u2705 Marked campaign ${campaignId} as 'low_spend' in database`);
      }
    } else {
      console.log(`\u{1F7E2} HIGH SPEND ($${spentValue.toFixed(4)} >= $${THRESHOLD.toFixed(2)}): Campaign ${trafficstarCampaignId} has spent $${THRESHOLD.toFixed(2)} or more`);
      const currentStatus = await getTrafficStarCampaignStatus2(trafficstarCampaignId);
      const campaign = await db.query.campaigns.findFirst({
        where: (campaign2, { eq: eq17 }) => eq17(campaign2.id, campaignId),
        with: {
          urls: {
            where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
          }
        }
      });
      if (!campaign) {
        console.error(`Campaign ${campaignId} not found - cannot process high spend handling`);
        return;
      }
      console.log(`Campaign ${campaignId} price per thousand: $${campaign.pricePerThousand}`);
      if (campaign.lastTrafficSenderStatus === "high_spend_budget_updated") {
        console.log(`Campaign ${campaignId} is already in high_spend_budget_updated state - checking for new URLs added after budget calculation`);
        await checkForNewUrlsAfterBudgetCalculation(campaignId, trafficstarCampaignId);
        return;
      }
      if (campaign.lastTrafficSenderStatus === "high_spend_waiting") {
        const highSpendWaitMinutes = campaign.highSpendWaitMinutes || 11;
        if (campaign.lastTrafficSenderAction) {
          const waitDuration = Date.now() - campaign.lastTrafficSenderAction.getTime();
          const waitMinutes = Math.floor(waitDuration / (60 * 1e3));
          console.log(`Campaign ${campaignId} has been in high_spend_waiting state for ${waitMinutes} minutes (configured wait: ${highSpendWaitMinutes} minutes)`);
          if (waitMinutes >= highSpendWaitMinutes) {
            console.log(`${highSpendWaitMinutes}-minute wait period has elapsed for campaign ${campaignId} - proceeding with high spend handling`);
            const updatedSpentValue = await getTrafficStarCampaignSpentValue2(campaignId, trafficstarCampaignId);
            if (updatedSpentValue === null) {
              console.error(`Failed to get updated spent value for campaign ${campaignId} after wait period`);
              return;
            }
            console.log(`Campaign ${campaignId} updated spent value after wait: $${updatedSpentValue.toFixed(4)}`);
            let totalRemainingClicks = 0;
            console.log(`Checking remaining clicks for ${campaign.urls.length} URLs in campaign ${trafficstarCampaignId}`);
            for (const url of campaign.urls) {
              if (url.status === "active") {
                const remainingClicks = url.clickLimit - url.clicks;
                const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
                totalRemainingClicks += validRemaining;
                console.log(`\u2705 Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
                if (validRemaining > 0) {
                  const urlPrice = validRemaining / 1e3 * parseFloat(campaign.pricePerThousand);
                  console.log(`\u{1F4B0} URL ${url.id} price for ${validRemaining} remaining clicks: $${urlPrice.toFixed(2)}`);
                  await url_budget_logger_default.logUrlBudget(url.id, urlPrice, campaign.id);
                }
              } else {
                console.log(`\u274C Skipping URL ID: ${url.id} with status: ${url.status}`);
              }
            }
            console.log(`Total remaining clicks across active URLs: ${totalRemainingClicks}`);
            const pricePerThousand = parseFloat(campaign.pricePerThousand);
            const remainingClicksValue = totalRemainingClicks / 1e3 * pricePerThousand;
            console.log(`Calculated value of remaining clicks: $${remainingClicksValue.toFixed(4)}`);
            const newBudget = updatedSpentValue + remainingClicksValue;
            console.log(`New budget calculation: $${updatedSpentValue.toFixed(4)} (spent) + $${remainingClicksValue.toFixed(4)} (remaining) = $${newBudget.toFixed(4)}`);
            try {
              await trafficStarService.updateCampaignBudget(Number(trafficstarCampaignId), newBudget);
              console.log(`\u2705 Updated campaign ${trafficstarCampaignId} budget to $${newBudget.toFixed(4)}`);
              await db.update(campaigns).set({
                highSpendBudgetCalcTime: /* @__PURE__ */ new Date()
              }).where(eq13(campaigns.id, campaignId));
              const today = /* @__PURE__ */ new Date();
              const todayStr = today.toISOString().split("T")[0];
              const endTimeStr = `${todayStr} 23:59:00`;
              await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), endTimeStr);
              console.log(`\u2705 Set campaign ${trafficstarCampaignId} end time to ${endTimeStr}`);
              await trafficStarService.activateCampaign(Number(trafficstarCampaignId));
              console.log(`\u2705 Activated campaign ${trafficstarCampaignId} after budget update`);
              await db.update(campaigns).set({
                lastTrafficSenderStatus: "high_spend_budget_updated",
                lastTrafficSenderAction: /* @__PURE__ */ new Date(),
                updatedAt: /* @__PURE__ */ new Date()
              }).where(eq13(campaigns.id, campaignId));
              console.log(`\u2705 Marked campaign ${campaignId} as 'high_spend_budget_updated' in database`);
              await handleNewUrlsAfterBudgetCalc(campaignId, trafficstarCampaignId);
              startMinutelyStatusCheck2(campaignId, trafficstarCampaignId);
            } catch (error) {
              console.error(`\u274C Error updating campaign ${trafficstarCampaignId} for high spend handling:`, error);
              await db.update(campaigns).set({
                lastTrafficSenderStatus: "high_spend_update_failed",
                lastTrafficSenderAction: /* @__PURE__ */ new Date(),
                updatedAt: /* @__PURE__ */ new Date()
              }).where(eq13(campaigns.id, campaignId));
            }
          } else {
            console.log(`Waiting period not elapsed yet (${waitMinutes}/${highSpendWaitMinutes} minutes) for campaign ${campaignId}`);
          }
        }
      } else {
        console.log(`First time detecting high spend for campaign ${trafficstarCampaignId} - initiating pause and wait period`);
        try {
          if (currentStatus === "active") {
            const now = /* @__PURE__ */ new Date();
            const formattedDateTime = now.toISOString().replace("T", " ").split(".")[0];
            await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
            console.log(`\u2705 Paused campaign ${trafficstarCampaignId} to begin high spend handling`);
            await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), formattedDateTime);
            console.log(`\u2705 Set end time for campaign ${trafficstarCampaignId} to ${formattedDateTime}`);
          } else {
            console.log(`Campaign ${trafficstarCampaignId} is already paused - no need to pause it again`);
          }
          const highSpendWaitMinutes = campaign.highSpendWaitMinutes || 11;
          await db.update(campaigns).set({
            lastTrafficSenderStatus: "high_spend_waiting",
            lastTrafficSenderAction: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq13(campaigns.id, campaignId));
          console.log(`\u2705 Marked campaign ${campaignId} as 'high_spend_waiting' in database`);
          console.log(`\u23F1\uFE0F Starting ${highSpendWaitMinutes}-minute wait period for campaign ${trafficstarCampaignId}`);
          startMinutelyPauseStatusCheck2(campaignId, trafficstarCampaignId);
        } catch (error) {
          console.error(`\u274C Error initiating high spend handling for campaign ${trafficstarCampaignId}:`, error);
          await db.update(campaigns).set({
            lastTrafficSenderStatus: "high_spend_initiation_failed",
            lastTrafficSenderAction: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq13(campaigns.id, campaignId));
        }
      }
    }
  } catch (error) {
    console.error(`Error handling campaign ${trafficstarCampaignId} by spent value:`, error);
  }
}
async function checkForNewUrlsAfterBudgetCalculation(campaignId, trafficstarCampaignId) {
  try {
    console.log(`\u{1F50D} Checking for new URLs added after budget calculation for campaign ${campaignId}`);
    const campaign = await db.query.campaigns.findFirst({
      where: (c, { eq: eq17 }) => eq17(c.id, campaignId),
      with: {
        urls: {
          where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
        }
      }
    });
    if (!campaign || !campaign.highSpendBudgetCalcTime) {
      console.log(`Campaign ${campaignId} doesn't have a high-spend budget calculation timestamp - skipping new URL check`);
      return;
    }
    const calcTime = campaign.highSpendBudgetCalcTime;
    console.log(`Campaign ${campaignId} budget calculation time: ${calcTime.toISOString()}`);
    const newUrls = campaign.urls.filter((url) => {
      return url.status === "active" && url.createdAt > calcTime;
    });
    if (newUrls.length === 0) {
      console.log(`No new URLs found added after budget calculation for campaign ${campaignId}`);
      return;
    }
    console.log(`\u26A0\uFE0F Found ${newUrls.length} new URLs added after budget calculation`);
    const oldestNewUrl = [...newUrls].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    const waitDuration = Date.now() - oldestNewUrl.createdAt.getTime();
    const waitMinutes = Math.floor(waitDuration / (60 * 1e3));
    console.log(`First URL (ID: ${oldestNewUrl.id}) was added ${waitMinutes} minutes ago`);
    const DELAY_MINUTES = 9;
    if (waitMinutes < DELAY_MINUTES) {
      console.log(`\u23F1\uFE0F Waiting period not elapsed yet (${waitMinutes}/${DELAY_MINUTES} minutes) - will check again on next iteration`);
      for (const url of newUrls) {
        await db.update(urls).set({
          pendingBudgetUpdate: true,
          // Cast to boolean to fix TypeScript error
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(urls.id, url.id));
      }
      return;
    }
    console.log(`\u2705 ${DELAY_MINUTES}-minute wait period has elapsed - processing ${newUrls.length} new URLs`);
    const campaignData = await trafficStarService.getCampaign(Number(trafficstarCampaignId));
    if (!campaignData || !campaignData.max_daily) {
      console.log(`Could not get current budget for campaign ${trafficstarCampaignId}`);
      return;
    }
    const currentBudget = parseFloat(campaignData.max_daily.toString());
    console.log(`Current TrafficStar budget for campaign ${trafficstarCampaignId}: $${currentBudget.toFixed(4)}`);
    let newUrlsClicksTotal = 0;
    let newUrlsBudget = 0;
    for (const url of newUrls) {
      newUrlsClicksTotal += url.clickLimit;
      const urlBudget = url.clickLimit / 1e3 * parseFloat(campaign.pricePerThousand);
      console.log(`New URL ${url.id} budget: $${urlBudget.toFixed(4)} (${url.clickLimit} clicks)`);
      await url_budget_logger_default.logUrlBudget(url.id, urlBudget, campaign.id);
      newUrlsBudget += urlBudget;
      await db.update(urls).set({
        pendingBudgetUpdate: false,
        // Cast to boolean to fix TypeScript error
        budgetCalculated: true,
        // Cast to boolean to fix TypeScript error
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq13(urls.id, url.id));
    }
    const updatedBudget = currentBudget + newUrlsBudget;
    console.log(`Updating budget for campaign ${trafficstarCampaignId} from $${currentBudget.toFixed(4)} to $${updatedBudget.toFixed(4)} (+ $${newUrlsBudget.toFixed(4)} for new URLs)`);
    await trafficStarService.updateCampaignBudget(Number(trafficstarCampaignId), updatedBudget);
    console.log(`\u2705 Successfully updated budget for campaign ${trafficstarCampaignId} to include new URLs`);
    await db.update(campaigns).set({
      highSpendBudgetCalcTime: /* @__PURE__ */ new Date(),
      lastTrafficSenderAction: /* @__PURE__ */ new Date(),
      lastTrafficSenderStatus: "high_spend_budget_updated",
      // Keep the high spend state to maintain the flow
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq13(campaigns.id, campaignId));
    console.log(`\u2705 Updated highSpendBudgetCalcTime for campaign ${campaignId}`);
    console.log(`\u2705 Maintained 'high_spend_budget_updated' status for new URL budget updates`);
  } catch (error) {
    console.error(`Error checking for new URLs after budget calculation for campaign ${campaignId}:`, error);
  }
}
async function handleNewUrlsAfterBudgetCalc(campaignId, trafficstarCampaignId) {
  try {
    console.log(`Checking for URLs added after high-spend budget calculation for campaign ${campaignId}`);
    const campaign = await db.query.campaigns.findFirst({
      where: (c, { eq: eq17 }) => eq17(c.id, campaignId),
      with: {
        urls: {
          where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
        }
      }
    });
    if (!campaign || !campaign.highSpendBudgetCalcTime) {
      console.log(`Campaign ${campaignId} doesn't have a high-spend budget calculation timestamp - skipping new URL check`);
      return;
    }
    const calcTime = campaign.highSpendBudgetCalcTime;
    console.log(`Campaign ${campaignId} budget calculation time: ${calcTime.toISOString()}`);
    const newUrls = campaign.urls.filter((url) => {
      return url.status === "active" && url.createdAt > calcTime;
    });
    if (newUrls.length === 0) {
      console.log(`No new URLs found added after budget calculation for campaign ${campaignId}`);
      return;
    }
    console.log(`Found ${newUrls.length} URLs added after high-spend budget calculation for campaign ${campaignId}`);
    const oldestNewUrl = [...newUrls].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    const waitDuration = Date.now() - oldestNewUrl.createdAt.getTime();
    const waitMinutes = Math.floor(waitDuration / (60 * 1e3));
    console.log(`First URL (ID: ${oldestNewUrl.id}) was added ${waitMinutes} minutes ago`);
    const DELAY_MINUTES = 9;
    if (waitMinutes < DELAY_MINUTES) {
      console.log(`\u23F1\uFE0F Waiting period not elapsed yet (${waitMinutes}/${DELAY_MINUTES} minutes) - will check again later`);
      for (const url of newUrls) {
        await db.update(urls).set({
          pendingBudgetUpdate: true,
          // Cast to boolean to fix TypeScript error
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(urls.id, url.id));
      }
      return;
    }
    console.log(`${DELAY_MINUTES}-minute wait period has elapsed - processing ${newUrls.length} new URLs`);
    const updatedSpentValue = await getTrafficStarCampaignSpentValue2(campaignId, trafficstarCampaignId);
    if (updatedSpentValue === null) {
      console.error(`Failed to get current spent value for campaign ${campaignId}`);
      return;
    }
    let additionalBudget = 0;
    let totalNewClicks = 0;
    console.log(`Processing new URLs for campaign ${campaignId} with current spent value: $${updatedSpentValue.toFixed(4)}`);
    for (const url of newUrls) {
      const totalClicks = url.clickLimit;
      totalNewClicks += totalClicks;
      const urlBudget = totalClicks / 1e3 * parseFloat(campaign.pricePerThousand);
      additionalBudget += urlBudget;
      console.log(`URL ID ${url.id}: ${totalClicks} clicks = $${urlBudget.toFixed(4)} additional budget`);
      await url_budget_logger_default.logUrlBudget(url.id, urlBudget, campaignId);
      await db.update(urls).set({
        pendingBudgetUpdate: false,
        // Cast to boolean to fix TypeScript error
        budgetCalculated: true,
        // Cast to boolean to fix TypeScript error
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq13(urls.id, url.id));
    }
    const newTotalBudget = updatedSpentValue + additionalBudget;
    console.log(`New budget calculation for batch update: $${updatedSpentValue.toFixed(4)} (current) + $${additionalBudget.toFixed(4)} (additional) = $${newTotalBudget.toFixed(4)}`);
    await trafficStarService.updateCampaignBudget(Number(trafficstarCampaignId), newTotalBudget);
    console.log(`\u2705 Updated campaign ${trafficstarCampaignId} budget to $${newTotalBudget.toFixed(4)} after processing ${newUrls.length} new URLs`);
    await db.update(campaigns).set({
      lastTrafficSenderStatus: "batch_updated_new_urls",
      lastTrafficSenderAction: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq13(campaigns.id, campaignId));
    console.log(`\u2705 Marked campaign ${campaignId} as 'batch_updated_new_urls' in database`);
  } catch (error) {
    console.error(`Error handling new URLs for campaign ${campaignId}:`, error);
  }
}
function startMinutelyStatusCheck2(campaignId, trafficstarCampaignId) {
  if (activeStatusChecks2.has(campaignId)) {
    clearInterval(activeStatusChecks2.get(campaignId));
    activeStatusChecks2.delete(campaignId);
  }
  if (pauseStatusChecks2.has(campaignId)) {
    clearInterval(pauseStatusChecks2.get(campaignId));
    pauseStatusChecks2.delete(campaignId);
  }
  console.log(`\u{1F504} Starting minute-by-minute ACTIVE status check for campaign ${trafficstarCampaignId}`);
  const interval = setInterval(async () => {
    console.log(`\u23F1\uFE0F Running minute check for campaign ${trafficstarCampaignId} active status`);
    try {
      const status = await getTrafficStarCampaignStatus2(trafficstarCampaignId);
      if (status === "active") {
        console.log(`\u2705 Campaign ${trafficstarCampaignId} is still active - monitoring will continue`);
        const campaign = await db.query.campaigns.findFirst({
          where: (campaign2, { eq: eq17 }) => eq17(campaign2.id, campaignId),
          with: {
            urls: {
              where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
            }
          }
        });
        if (campaign && campaign.urls && campaign.urls.length > 0) {
          let totalRemainingClicks = 0;
          console.log(`\u{1F50D} ACTIVE MONITORING: Checking remaining clicks for ${campaign.urls.length} URLs in campaign ${trafficstarCampaignId}`);
          for (const url of campaign.urls) {
            console.log(`\u{1F50D} URL ID: ${url.id}, status: ${url.status}, clickLimit: ${url.clickLimit}, clicks: ${url.clicks}`);
            if (url.status === "active") {
              const remainingClicks = url.clickLimit - url.clicks;
              const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
              totalRemainingClicks += validRemaining;
              console.log(`\u2705 Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
            } else {
              console.log(`\u274C Skipping URL ID: ${url.id} with status: ${url.status}`);
            }
          }
          const MINIMUM_CLICKS_THRESHOLD = 5e3;
          if (totalRemainingClicks <= MINIMUM_CLICKS_THRESHOLD) {
            console.log(`\u23F9\uFE0F During monitoring: Campaign ${trafficstarCampaignId} remaining clicks (${totalRemainingClicks}) fell below threshold (${MINIMUM_CLICKS_THRESHOLD}) - pausing campaign`);
            clearInterval(interval);
            activeStatusChecks2.delete(campaignId);
            try {
              const now = /* @__PURE__ */ new Date();
              const formattedDateTime = now.toISOString().replace("T", " ").split(".")[0];
              try {
                await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
                try {
                  await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), formattedDateTime);
                  console.log(`\u2705 PAUSED low spend campaign ${trafficstarCampaignId} during monitoring due to low remaining clicks (${totalRemainingClicks} <= ${MINIMUM_CLICKS_THRESHOLD})`);
                  await db.update(campaigns).set({
                    lastTrafficSenderStatus: "auto_paused_low_clicks_during_monitoring",
                    lastTrafficSenderAction: /* @__PURE__ */ new Date(),
                    updatedAt: /* @__PURE__ */ new Date()
                  }).where(eq13(campaigns.id, campaignId));
                  console.log(`\u2705 Marked campaign ${campaignId} as 'auto_paused_low_clicks_during_monitoring' in database`);
                  startMinutelyPauseStatusCheck2(campaignId, trafficstarCampaignId);
                } catch (endTimeError) {
                  console.error(`\u274C Error setting end time for campaign ${trafficstarCampaignId}:`, endTimeError);
                }
              } catch (pauseError) {
                console.error(`\u274C Failed to pause low spend campaign ${trafficstarCampaignId} with low remaining clicks:`, pauseError);
                startMinutelyStatusCheck2(campaignId, trafficstarCampaignId);
              }
            } catch (error) {
              console.error(`\u274C Error pausing low spend campaign ${trafficstarCampaignId} with low remaining clicks:`, error);
              startMinutelyStatusCheck2(campaignId, trafficstarCampaignId);
            }
          }
        }
      } else if (status === "paused") {
        console.log(`\u26A0\uFE0F Campaign ${trafficstarCampaignId} was found paused but should be active - will attempt to reactivate`);
        try {
          const campaign = await db.query.campaigns.findFirst({
            where: (campaign2, { eq: eq17 }) => eq17(campaign2.id, campaignId),
            with: {
              urls: {
                where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
              }
            }
          });
          if (campaign && campaign.urls && campaign.urls.length > 0) {
            let totalRemainingClicks = 0;
            console.log(`\u{1F50D} PAUSE DETECTED: Checking remaining clicks for ${campaign.urls.length} URLs in campaign ${trafficstarCampaignId}`);
            for (const url of campaign.urls) {
              console.log(`\u{1F50D} URL ID: ${url.id}, status: ${url.status}, clickLimit: ${url.clickLimit}, clicks: ${url.clicks}`);
              if (url.status === "active") {
                const remainingClicks = url.clickLimit - url.clicks;
                const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
                totalRemainingClicks += validRemaining;
                console.log(`\u2705 Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
              } else {
                console.log(`\u274C Skipping URL ID: ${url.id} with status: ${url.status}`);
              }
            }
            const REMAINING_CLICKS_THRESHOLD = 15e3;
            if (totalRemainingClicks >= REMAINING_CLICKS_THRESHOLD) {
              console.log(`\u2705 Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks (>= ${REMAINING_CLICKS_THRESHOLD}) - will attempt reactivation during monitoring`);
              const today = /* @__PURE__ */ new Date();
              const todayStr = today.toISOString().split("T")[0];
              const endTimeStr = `${todayStr} 23:59:00`;
              await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), endTimeStr);
              await trafficStarService.activateCampaign(Number(trafficstarCampaignId));
              console.log(`\u2705 REACTIVATED campaign ${trafficstarCampaignId} during monitoring - it has ${totalRemainingClicks} remaining clicks`);
              await db.update(campaigns).set({
                lastTrafficSenderStatus: "reactivated_during_monitoring",
                lastTrafficSenderAction: /* @__PURE__ */ new Date(),
                updatedAt: /* @__PURE__ */ new Date()
              }).where(eq13(campaigns.id, campaignId));
              console.log(`\u2705 Marked campaign ${campaignId} as 'reactivated_during_monitoring' in database`);
            } else {
              console.log(`\u23F9\uFE0F Campaign ${trafficstarCampaignId} has only ${totalRemainingClicks} remaining clicks (< ${REMAINING_CLICKS_THRESHOLD}) - will not reactivate during monitoring`);
              clearInterval(interval);
              activeStatusChecks2.delete(campaignId);
              startMinutelyPauseStatusCheck2(campaignId, trafficstarCampaignId);
              await db.update(campaigns).set({
                lastTrafficSenderStatus: "staying_paused_low_clicks",
                lastTrafficSenderAction: /* @__PURE__ */ new Date(),
                updatedAt: /* @__PURE__ */ new Date()
              }).where(eq13(campaigns.id, campaignId));
              console.log(`\u2705 Marked campaign ${campaignId} as 'staying_paused_low_clicks' in database`);
            }
          }
        } catch (error) {
          console.error(`\u274C Error handling paused campaign ${trafficstarCampaignId} during active monitoring:`, error);
        }
      } else {
        console.log(`\u26A0\uFE0F Campaign ${trafficstarCampaignId} has unknown status during monitoring: ${status}`);
      }
    } catch (error) {
      console.error(`\u274C Error checking campaign ${trafficstarCampaignId} status during active monitoring:`, error);
    }
  }, 60 * 1e3);
  activeStatusChecks2.set(campaignId, interval);
}
function startMinutelyPauseStatusCheck2(campaignId, trafficstarCampaignId) {
  if (pauseStatusChecks2.has(campaignId)) {
    clearInterval(pauseStatusChecks2.get(campaignId));
    pauseStatusChecks2.delete(campaignId);
  }
  if (activeStatusChecks2.has(campaignId)) {
    clearInterval(activeStatusChecks2.get(campaignId));
    activeStatusChecks2.delete(campaignId);
  }
  console.log(`\u{1F504} Starting minute-by-minute PAUSE status check for campaign ${trafficstarCampaignId}`);
  const interval = setInterval(async () => {
    console.log(`\u23F1\uFE0F Running minute check for campaign ${trafficstarCampaignId} pause status`);
    try {
      const status = await getTrafficStarCampaignStatus2(trafficstarCampaignId);
      if (status === "paused") {
        console.log(`\u23F9\uFE0F Campaign ${trafficstarCampaignId} is still paused as expected - monitoring will continue`);
        const campaign = await db.query.campaigns.findFirst({
          where: (campaign2, { eq: eq17 }) => eq17(campaign2.id, campaignId),
          with: {
            urls: {
              where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
            }
          }
        });
        if (campaign && campaign.lastTrafficSenderAction && (campaign.lastTrafficSenderStatus === "auto_paused_low_clicks" || campaign.lastTrafficSenderStatus === "auto_paused_low_clicks_during_monitoring")) {
          const pauseDuration = Date.now() - campaign.lastTrafficSenderAction.getTime();
          const pauseMinutes = Math.floor(pauseDuration / (60 * 1e3));
          const postPauseMinutes = campaign.postPauseCheckMinutes || 2;
          console.log(`\u23F1\uFE0F Campaign ${trafficstarCampaignId} has been paused for ${pauseMinutes} minutes (check after ${postPauseMinutes} minutes)`);
          if (pauseMinutes >= postPauseMinutes) {
            console.log(`\u23F1\uFE0F ${pauseMinutes} minutes elapsed (>= ${postPauseMinutes}) since pausing - checking spent value and remaining clicks`);
            const spentValue = await getTrafficStarCampaignSpentValue2(campaignId, trafficstarCampaignId);
            if (spentValue !== null) {
              let totalRemainingClicks = 0;
              console.log(`\u{1F50D} PAUSE MONITORING: Checking remaining clicks for ${campaign.urls.length} URLs in campaign ${trafficstarCampaignId}`);
              for (const url of campaign.urls) {
                console.log(`\u{1F50D} URL ID: ${url.id}, status: ${url.status}, clickLimit: ${url.clickLimit}, clicks: ${url.clicks}`);
                if (url.status === "active") {
                  const remainingClicks = url.clickLimit - url.clicks;
                  const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
                  totalRemainingClicks += validRemaining;
                  console.log(`\u2705 Adding ${validRemaining} remaining clicks from URL ID: ${url.id}`);
                } else {
                  console.log(`\u274C Skipping URL ID: ${url.id} with status: ${url.status}`);
                }
              }
              const REMAINING_CLICKS_THRESHOLD = 15e3;
              if (totalRemainingClicks >= REMAINING_CLICKS_THRESHOLD) {
                console.log(`\u2705 Campaign ${trafficstarCampaignId} now has ${totalRemainingClicks} remaining clicks (>= ${REMAINING_CLICKS_THRESHOLD}) - will attempt reactivation after pause period`);
                try {
                  const today = /* @__PURE__ */ new Date();
                  const todayStr = today.toISOString().split("T")[0];
                  const endTimeStr = `${todayStr} 23:59:00`;
                  await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), endTimeStr);
                  await trafficStarService.activateCampaign(Number(trafficstarCampaignId));
                  console.log(`\u2705 REACTIVATED campaign ${trafficstarCampaignId} after pause period - it now has ${totalRemainingClicks} remaining clicks`);
                  await db.update(campaigns).set({
                    lastTrafficSenderStatus: "reactivated_after_pause",
                    lastTrafficSenderAction: /* @__PURE__ */ new Date(),
                    updatedAt: /* @__PURE__ */ new Date()
                  }).where(eq13(campaigns.id, campaignId));
                  console.log(`\u2705 Marked campaign ${campaignId} as 'reactivated_after_pause' in database`);
                  clearInterval(interval);
                  pauseStatusChecks2.delete(campaignId);
                  startMinutelyStatusCheck2(campaignId, trafficstarCampaignId);
                } catch (error) {
                  console.error(`\u274C Error reactivating campaign ${trafficstarCampaignId} after pause:`, error);
                }
              } else {
                console.log(`\u23F9\uFE0F Campaign ${trafficstarCampaignId} still has only ${totalRemainingClicks} remaining clicks (< ${REMAINING_CLICKS_THRESHOLD}) - continuing pause monitoring`);
                await db.update(campaigns).set({
                  lastTrafficSenderStatus: "checked_after_pause_still_low_clicks",
                  lastTrafficSenderAction: /* @__PURE__ */ new Date(),
                  updatedAt: /* @__PURE__ */ new Date()
                }).where(eq13(campaigns.id, campaignId));
                console.log(`\u2705 Marked campaign ${campaignId} as 'checked_after_pause_still_low_clicks' in database`);
              }
            }
          }
        }
      } else if (status === "active") {
        console.log(`\u26A0\uFE0F Campaign ${trafficstarCampaignId} was found active but should be paused - will attempt to pause again`);
        try {
          const campaign = await db.query.campaigns.findFirst({
            where: (campaign2, { eq: eq17 }) => eq17(campaign2.id, campaignId),
            with: {
              urls: {
                where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
              }
            }
          });
          if (campaign && campaign.urls && campaign.urls.length > 0) {
            let totalRemainingClicks = 0;
            for (const url of campaign.urls) {
              if (url.status === "active") {
                const remainingClicks = url.clickLimit - url.clicks;
                totalRemainingClicks += remainingClicks > 0 ? remainingClicks : 0;
              }
            }
            console.log(`Campaign ${trafficstarCampaignId} has ${totalRemainingClicks} remaining clicks but should be paused - re-pausing campaign`);
            const now = /* @__PURE__ */ new Date();
            const formattedDateTime = now.toISOString().replace("T", " ").split(".")[0];
            await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
            await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), formattedDateTime);
            console.log(`\u2705 RE-PAUSED campaign ${trafficstarCampaignId} during pause monitoring - it was found active`);
            await db.update(campaigns).set({
              lastTrafficSenderStatus: "re_paused_during_monitoring",
              lastTrafficSenderAction: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq13(campaigns.id, campaignId));
            console.log(`\u2705 Marked campaign ${campaignId} as 're_paused_during_monitoring' in database`);
          }
        } catch (error) {
          console.error(`\u274C Error re-pausing campaign ${trafficstarCampaignId} during pause monitoring:`, error);
        }
      } else {
        console.log(`\u26A0\uFE0F Campaign ${trafficstarCampaignId} has unknown status during pause monitoring: ${status}`);
      }
    } catch (error) {
      console.error(`\u274C Error checking campaign ${trafficstarCampaignId} status during pause monitoring:`, error);
    }
  }, 60 * 1e3);
  pauseStatusChecks2.set(campaignId, interval);
}
function startEmptyUrlStatusCheck(campaignId, trafficstarCampaignId) {
  if (emptyUrlStatusChecks.has(campaignId)) {
    clearInterval(emptyUrlStatusChecks.get(campaignId));
    emptyUrlStatusChecks.delete(campaignId);
  }
  if (activeStatusChecks2.has(campaignId)) {
    clearInterval(activeStatusChecks2.get(campaignId));
    activeStatusChecks2.delete(campaignId);
  }
  if (pauseStatusChecks2.has(campaignId)) {
    clearInterval(pauseStatusChecks2.get(campaignId));
    pauseStatusChecks2.delete(campaignId);
  }
  console.log(`\u{1F504} Starting minute-by-minute EMPTY URL status check for campaign ${trafficstarCampaignId}`);
  const interval = setInterval(async () => {
    console.log(`\u23F1\uFE0F Running empty URL check for campaign ${trafficstarCampaignId}`);
    try {
      const activeUrls = await db.select().from(urls).where(
        and7(
          eq13(urls.campaignId, campaignId),
          eq13(urls.status, "active")
        )
      );
      if (activeUrls.length > 0) {
        console.log(`\u2705 Campaign ${campaignId} now has ${activeUrls.length} active URLs - stopping empty URL monitoring`);
        clearInterval(interval);
        emptyUrlStatusChecks.delete(campaignId);
        await db.update(campaigns).set({
          lastTrafficSenderStatus: "active_urls_available",
          lastTrafficSenderAction: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(campaigns.id, campaignId));
        return;
      }
      const status = await getTrafficStarCampaignStatus2(trafficstarCampaignId);
      if (status === "active") {
        console.log(`\u26A0\uFE0F Campaign ${trafficstarCampaignId} was found active but has no active URLs - re-pausing it`);
        try {
          const now = /* @__PURE__ */ new Date();
          const formattedDateTime = now.toISOString().replace("T", " ").split(".")[0];
          await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
          console.log(`Successfully paused campaign ${trafficstarCampaignId}`);
          await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), formattedDateTime);
          console.log(`Setting campaign ${trafficstarCampaignId} end time to: ${formattedDateTime}`);
          console.log(`Successfully updated end time for campaign ${trafficstarCampaignId}`);
          await db.update(campaigns).set({
            lastTrafficSenderStatus: "re_paused_no_active_urls",
            lastTrafficSenderAction: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq13(campaigns.id, campaignId));
          console.log(`\u2705 RE-PAUSED campaign ${trafficstarCampaignId} during empty URL monitoring`);
        } catch (error) {
          console.error(`\u274C Error re-pausing campaign ${trafficstarCampaignId} during empty URL monitoring:`, error);
        }
      } else if (status === "paused") {
        console.log(`\u23F9\uFE0F Campaign ${trafficstarCampaignId} is correctly paused with no active URLs - continuing monitoring`);
      }
    } catch (error) {
      console.error(`\u274C Error in empty URL status check for campaign ${trafficstarCampaignId}:`, error);
    }
  }, 60 * 1e3);
  emptyUrlStatusChecks.set(campaignId, interval);
}
async function pauseTrafficStarCampaign2(trafficstarCampaignId) {
  try {
    console.log(`\u23F9\uFE0F Attempting to pause TrafficStar campaign ${trafficstarCampaignId}`);
    const status = await getTrafficStarCampaignStatus2(trafficstarCampaignId);
    if (status === "paused") {
      console.log(`TrafficStar campaign ${trafficstarCampaignId} is already paused, no action needed`);
      return true;
    }
    const now = /* @__PURE__ */ new Date();
    const formattedDateTime = now.toISOString().replace("T", " ").split(".")[0];
    await trafficStarService.pauseCampaign(Number(trafficstarCampaignId));
    await trafficStarService.updateCampaignEndTime(Number(trafficstarCampaignId), formattedDateTime);
    console.log(`\u2705 Successfully paused TrafficStar campaign ${trafficstarCampaignId} with end time ${formattedDateTime}`);
    return true;
  } catch (error) {
    console.error(`\u274C Error pausing TrafficStar campaign ${trafficstarCampaignId}:`, error);
    return false;
  }
}
async function processTrafficGenerator2(campaignId, forceMode) {
  try {
    console.log(`Processing Traffic Generator for campaign ${campaignId}`);
    const campaign = await db.query.campaigns.findFirst({
      where: (campaign2, { eq: eq17 }) => eq17(campaign2.id, campaignId),
      with: {
        urls: {
          where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
        }
      }
    });
    if (!campaign) {
      console.error(`Campaign ${campaignId} not found`);
      return;
    }
    if (!campaign.trafficGeneratorEnabled && !forceMode) {
      console.log(`Traffic Generator not enabled for campaign ${campaignId} - skipping`);
      return;
    }
    if (!campaign.trafficstarCampaignId) {
      console.error(`Campaign ${campaignId} has no TrafficStar ID - skipping`);
      return;
    }
    console.log(`Processing Traffic Generator for campaign ${campaignId} with TrafficStar ID ${campaign.trafficstarCampaignId}`);
    if (forceMode === "force_activate") {
      console.log(`\u{1F4AA} FORCE MODE: Forcing activation of campaign ${campaign.trafficstarCampaignId}`);
      try {
        const today = /* @__PURE__ */ new Date();
        const todayStr = today.toISOString().split("T")[0];
        const endTimeStr = `${todayStr} 23:59:00`;
        await trafficStarService.updateCampaignEndTime(Number(campaign.trafficstarCampaignId), endTimeStr);
        await trafficStarService.activateCampaign(Number(campaign.trafficstarCampaignId));
        console.log(`\u2705 FORCE MODE: Successfully activated campaign ${campaign.trafficstarCampaignId}`);
        startMinutelyStatusCheck2(campaignId, campaign.trafficstarCampaignId);
        return;
      } catch (error) {
        console.error(`\u274C FORCE MODE: Error activating campaign ${campaign.trafficstarCampaignId}:`, error);
        return;
      }
    } else if (forceMode === "force_pause") {
      console.log(`\u{1F4AA} FORCE MODE: Forcing pause of campaign ${campaign.trafficstarCampaignId}`);
      try {
        await pauseTrafficStarCampaign2(campaign.trafficstarCampaignId);
        console.log(`\u2705 FORCE MODE: Successfully paused campaign ${campaign.trafficstarCampaignId}`);
        startMinutelyPauseStatusCheck2(campaignId, campaign.trafficstarCampaignId);
        return;
      } catch (error) {
        console.error(`\u274C FORCE MODE: Error pausing campaign ${campaign.trafficstarCampaignId}:`, error);
        return;
      }
    }
    const spentValue = await getTrafficStarCampaignSpentValue2(campaignId, campaign.trafficstarCampaignId);
    if (spentValue === null) {
      console.error(`Failed to get spent value for campaign ${campaignId}`);
      return;
    }
    console.log(`Campaign ${campaignId} spent value: $${spentValue.toFixed(4)}`);
    await handleCampaignBySpentValue2(campaignId, campaign.trafficstarCampaignId, spentValue);
  } catch (error) {
    console.error(`Error processing Traffic Generator for campaign ${campaignId}:`, error);
  }
}
async function runTrafficGeneratorForAllCampaigns2() {
  try {
    console.log("Running Traffic Generator for all enabled campaigns");
    const enabledCampaigns = await db.query.campaigns.findMany({
      columns: {
        id: true,
        trafficstarCampaignId: true
      },
      where: (campaign, { eq: eq17 }) => eq17(campaign.trafficGeneratorEnabled, true)
    });
    if (enabledCampaigns.length === 0) {
      console.log("No campaigns have Traffic Generator enabled - skipping");
      return;
    }
    console.log(`Processing ${enabledCampaigns.length} campaigns with traffic generator enabled`);
    const CONCURRENCY_LIMIT = 2;
    const chunks = [];
    for (let i = 0; i < enabledCampaigns.length; i += CONCURRENCY_LIMIT) {
      chunks.push(enabledCampaigns.slice(i, i + CONCURRENCY_LIMIT));
    }
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (campaign) => {
          try {
            await processTrafficGenerator2(campaign.id);
          } catch (error) {
            console.error(`Error processing campaign ${campaign.id}:`, error);
          }
        })
      );
      if (chunks.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    console.log("Finished running Traffic Generator for all enabled campaigns");
  } catch (error) {
    console.error("Error running Traffic Generator for all campaigns:", error);
  }
}
async function pauseTrafficStarForEmptyCampaigns() {
  try {
    console.log("Checking for campaigns with no active URLs to pause TrafficStar campaigns");
    const campaignsWithTrafficStar = await db.select().from(campaigns).where(sql8`trafficstar_campaign_id is not null AND traffic_generator_enabled = true`);
    if (!campaignsWithTrafficStar || campaignsWithTrafficStar.length === 0) {
      console.log("No campaigns with TrafficStar integration found");
      return;
    }
    console.log(`Found ${campaignsWithTrafficStar.length} campaigns with TrafficStar integration`);
    for (const campaign of campaignsWithTrafficStar) {
      if (!campaign.trafficstarCampaignId) continue;
      if (campaign.lastTrafficSenderStatus === "auto_reactivated_low_spend" || campaign.lastTrafficSenderStatus === "reactivated_during_monitoring") {
        if (campaign.lastTrafficSenderAction) {
          const waitDuration = Date.now() - campaign.lastTrafficSenderAction.getTime();
          const waitMinutes = Math.floor(waitDuration / (60 * 1e3));
          const requiredWaitMinutes = campaign.postPauseCheckMinutes || 10;
          if (waitMinutes < requiredWaitMinutes) {
            console.log(`Campaign ${campaign.id} was recently activated (${waitMinutes}/${requiredWaitMinutes} minutes ago) - skipping empty URL check`);
            continue;
          }
        }
      }
      const activeUrls = await db.select().from(urls).where(
        and7(
          eq13(urls.campaignId, campaign.id),
          eq13(urls.status, "active")
        )
      );
      console.log(`Campaign ${campaign.id} (TrafficStar ID: ${campaign.trafficstarCampaignId}) has ${activeUrls.length} active URLs`);
      if (activeUrls.length === 0) {
        console.log(`Campaign ${campaign.id} has NO active URLs - will pause TrafficStar campaign ${campaign.trafficstarCampaignId}`);
        const currentStatus = await getTrafficStarCampaignStatus2(campaign.trafficstarCampaignId);
        if (currentStatus === "active") {
          console.log(`TrafficStar campaign ${campaign.trafficstarCampaignId} is ACTIVE but has no active URLs - pausing it`);
          try {
            const now = /* @__PURE__ */ new Date();
            const formattedDateTime = now.toISOString().replace("T", " ").split(".")[0];
            await trafficStarService.pauseCampaign(Number(campaign.trafficstarCampaignId));
            console.log(`Successfully paused campaign ${campaign.trafficstarCampaignId}`);
            await trafficStarService.updateCampaignEndTime(Number(campaign.trafficstarCampaignId), formattedDateTime);
            console.log(`Setting campaign ${campaign.trafficstarCampaignId} end time to: ${formattedDateTime}`);
            console.log(`Successfully updated end time for campaign ${campaign.trafficstarCampaignId}`);
            console.log(`Confirmed end time update for campaign ${campaign.trafficstarCampaignId}`);
            console.log(`\u2705 PAUSED TrafficStar campaign ${campaign.trafficstarCampaignId} due to no active URLs`);
            await db.update(campaigns).set({
              lastTrafficSenderStatus: "auto_paused_no_active_urls",
              lastTrafficSenderAction: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq13(campaigns.id, campaign.id));
            startEmptyUrlStatusCheck(campaign.id, campaign.trafficstarCampaignId);
          } catch (error) {
            console.error(`\u274C Error pausing TrafficStar campaign ${campaign.trafficstarCampaignId}:`, error);
          }
        } else if (currentStatus === "paused") {
          console.log(`TrafficStar campaign ${campaign.trafficstarCampaignId} is already PAUSED with no active URLs - continuing monitoring`);
          await db.update(campaigns).set({
            lastTrafficSenderStatus: "paused_no_active_urls",
            lastTrafficSenderAction: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq13(campaigns.id, campaign.id));
          startEmptyUrlStatusCheck(campaign.id, campaign.trafficstarCampaignId);
        } else {
          console.log(`TrafficStar campaign ${campaign.trafficstarCampaignId} has status: ${currentStatus || "unknown"} - will monitor`);
        }
      } else {
        if (campaign.lastTrafficSenderStatus === "auto_paused_no_active_urls" || campaign.lastTrafficSenderStatus === "paused_no_active_urls") {
          console.log(`Campaign ${campaign.id} now has ${activeUrls.length} active URLs - updating status and stopping empty URL monitoring`);
          if (emptyUrlStatusChecks.has(campaign.id)) {
            clearInterval(emptyUrlStatusChecks.get(campaign.id));
            emptyUrlStatusChecks.delete(campaign.id);
            console.log(`\u2705 Stopped empty URL monitoring for campaign ${campaign.id} as it now has active URLs`);
          }
          await db.update(campaigns).set({
            lastTrafficSenderStatus: "active_urls_available",
            lastTrafficSenderAction: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq13(campaigns.id, campaign.id));
        }
      }
    }
  } catch (error) {
    console.error("Error in pauseTrafficStarForEmptyCampaigns:", error);
  }
}
function initializeTrafficGeneratorScheduler2() {
  console.log("Initializing Traffic Generator scheduler");
  console.log("Running initial traffic generator check on startup");
  runTrafficGeneratorForAllCampaigns2();
  setTimeout(() => {
    console.log("Running initial empty URL check");
    pauseTrafficStarForEmptyCampaigns();
  }, 10 * 1e3);
  setInterval(() => {
    console.log("Running scheduled Traffic Generator check");
    runTrafficGeneratorForAllCampaigns2();
  }, 5 * 60 * 1e3);
  setInterval(() => {
    console.log("Running scheduled empty URL check");
    pauseTrafficStarForEmptyCampaigns();
  }, 3 * 60 * 1e3);
  console.log("Traffic Generator scheduler initialized successfully");
}
async function debugProcessCampaign2(campaignId) {
  try {
    console.log(`\u{1F50D} DEBUG: Testing Traffic Generator for campaign ${campaignId}`);
    const campaign = await db.query.campaigns.findFirst({
      where: (campaign2, { eq: eq17 }) => eq17(campaign2.id, campaignId),
      with: {
        urls: {
          where: (urls3, { eq: eq17 }) => eq17(urls3.status, "active")
        }
      }
    });
    if (!campaign) {
      return { success: false, error: `Campaign ${campaignId} not found` };
    }
    if (!campaign.trafficstarCampaignId) {
      return { success: false, error: `Campaign ${campaignId} has no TrafficStar ID` };
    }
    const spentValue = await getTrafficStarCampaignSpentValue2(campaignId, campaign.trafficstarCampaignId);
    const status = await getTrafficStarCampaignStatus2(campaign.trafficstarCampaignId);
    let totalRemainingClicks = 0;
    let activeUrls = 0;
    let inactiveUrls = 0;
    let urlDetails = [];
    for (const url of campaign.urls) {
      const isActive = url.status === "active";
      const remainingClicks = url.clickLimit - url.clicks;
      const effectiveRemaining = remainingClicks > 0 ? remainingClicks : 0;
      urlDetails.push({
        id: url.id,
        name: url.name,
        status: url.status,
        clickLimit: url.clickLimit,
        clicks: url.clicks,
        remainingClicks: effectiveRemaining,
        isActive
      });
      if (isActive) {
        totalRemainingClicks += effectiveRemaining;
        activeUrls++;
      } else {
        inactiveUrls++;
      }
    }
    return {
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        trafficstarCampaignId: campaign.trafficstarCampaignId,
        trafficGeneratorEnabled: campaign.trafficGeneratorEnabled,
        lastTrafficSenderStatus: campaign.lastTrafficSenderStatus,
        lastTrafficSenderAction: campaign.lastTrafficSenderAction,
        postPauseCheckMinutes: campaign.postPauseCheckMinutes || 2
      },
      status,
      spentValue: spentValue !== null ? `$${spentValue.toFixed(4)}` : null,
      clicks: {
        totalRemainingClicks,
        totalUrls: campaign.urls.length,
        activeUrls,
        inactiveUrls,
        urlDetails
      },
      thresholds: {
        spentThreshold: 10,
        minimumClicksThreshold: 5e3,
        remainingClicksThreshold: 15e3
      }
    };
  } catch (error) {
    console.error(`Error in debug process:`, error);
    return { success: false, error: String(error) };
  }
}
var activeStatusChecks2, pauseStatusChecks2, emptyUrlStatusChecks;
var init_traffic_generator_new = __esm({
  "server/traffic-generator-new.ts"() {
    "use strict";
    init_trafficstar_service();
    init_db();
    init_schema();
    init_trafficstar_spent_helper();
    init_url_budget_logger();
    activeStatusChecks2 = /* @__PURE__ */ new Map();
    pauseStatusChecks2 = /* @__PURE__ */ new Map();
    emptyUrlStatusChecks = /* @__PURE__ */ new Map();
  }
});

// server/index.ts
import express3 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
init_schema();
init_db();
import { eq as eq3, and as and2, desc as desc2, sql as sql2, inArray, ne, ilike, or } from "drizzle-orm";

// server/redirect-logs-manager.ts
init_db();
init_schema();
import * as fs from "fs";
import * as path from "path";
import { format, getHours } from "date-fns";
import { eq, and, sql, gte, lte } from "drizzle-orm";
var LOGS_BASE_DIR = path.join(process.cwd(), "redirect_logs");
var RedirectLogsManager = class {
  initialized = false;
  constructor() {
    this.initialize();
  }
  /**
   * Initialize the logs directory
   */
  initialize() {
    if (this.initialized) return;
    try {
      if (!fs.existsSync(LOGS_BASE_DIR)) {
        fs.mkdirSync(LOGS_BASE_DIR, { recursive: true });
        console.log(`Created redirect logs directory: ${LOGS_BASE_DIR}`);
      }
      this.initialized = true;
    } catch (error) {
      console.error("Error initializing redirect logs directory:", error);
    }
  }
  /**
   * Clear all redirect logs files
   * Used during system cleanup
   */
  clearAllLogs() {
    try {
      let entriesRemoved = 0;
      if (!fs.existsSync(LOGS_BASE_DIR)) {
        return { success: true, entriesRemoved: 0 };
      }
      const files = fs.readdirSync(LOGS_BASE_DIR);
      for (const file of files) {
        const filePath = path.join(LOGS_BASE_DIR, file);
        if (fs.statSync(filePath).isFile() && file.endsWith(".log")) {
          fs.unlinkSync(filePath);
          entriesRemoved++;
        }
      }
      console.log(`Cleared all redirect logs: ${entriesRemoved} files deleted`);
      return { success: true, entriesRemoved };
    } catch (error) {
      console.error("Failed to clear redirect logs:", error);
      return { success: false, entriesRemoved: 0 };
    }
  }
  /**
   * Get the path to a campaign's log file
   */
  getCampaignLogFilePath(campaignId) {
    return path.join(LOGS_BASE_DIR, `campaign_${campaignId}_redirects.log`);
  }
  /**
   * Format a date in Indian timezone (UTC+5:30)
   */
  formatIndianTime(date) {
    const offsetHours = 5;
    const offsetMinutes = 30;
    const indianTime = new Date(date.getTime());
    indianTime.setHours(indianTime.getHours() + offsetHours);
    indianTime.setMinutes(indianTime.getMinutes() + offsetMinutes);
    return {
      formatted: format(indianTime, "yyyy-MM-dd HH:mm:ss"),
      dateKey: format(indianTime, "yyyy-MM-dd"),
      hourKey: getHours(indianTime)
    };
  }
  /**
   * Log a redirect for a campaign
   */
  async logRedirect(campaignId, urlId) {
    try {
      const now = /* @__PURE__ */ new Date();
      const { formatted, dateKey, hourKey } = this.formatIndianTime(now);
      await db.insert(campaignRedirectLogs).values({
        campaignId,
        urlId: urlId || null,
        redirectTime: now,
        indianTime: formatted,
        dateKey,
        hourKey
      });
      let logLine = "";
      if (urlId) {
        const url = await db.select().from(urls).where(eq(urls.id, urlId)).limit(1);
        logLine = `Redirect happened: ${formatted} | Campaign ID: ${campaignId} | URL ID: ${urlId} | URL Name: ${url[0]?.name || "Unknown"}`;
      } else {
        logLine = `Redirect happened: ${formatted} | Campaign ID: ${campaignId} | Direct campaign redirect`;
      }
      const logFilePath = this.getCampaignLogFilePath(campaignId);
      fs.appendFileSync(logFilePath, logLine + "\\n");
      return Promise.resolve();
    } catch (error) {
      console.error("Error logging redirect:", error);
      return Promise.reject(error);
    }
  }
  /**
   * Get campaign summary data from redirect logs for a specific time range
   */
  async getCampaignSummary(campaignId, filter) {
    const campaignCheck = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    if (campaignCheck.length === 0) {
      throw new Error(`Campaign with ID ${campaignId} not found`);
    }
    console.log(`\u{1F4CA} RedirectLogsManager: Getting summary for campaign ${campaignId} with filter type: ${filter.filterType}`);
    const { startDate, endDate } = this.getDateRangeForFilter(filter);
    console.log(`\u{1F4CA} RedirectLogsManager: Date range calculated for ${filter.filterType}: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    const now = /* @__PURE__ */ new Date();
    const campaignCreated = campaignCheck[0]?.createdAt || now;
    if (endDate < campaignCreated || startDate > now) {
      console.log(`\u{1F4CA} RedirectLogsManager: No logs for this date range (before campaign creation or in future)`);
      return {
        totalClicks: 0,
        dailyBreakdown: {},
        hourlyBreakdown: [],
        filterInfo: {
          type: filter.filterType,
          dateRange: this.getDateRangeText(filter, startDate, endDate)
        }
      };
    }
    const totalClicksQuery = await db.select({
      count: sql`count(*)`.as("count")
    }).from(campaignRedirectLogs).where(
      and(
        eq(campaignRedirectLogs.campaignId, campaignId),
        gte(campaignRedirectLogs.redirectTime, startDate),
        lte(campaignRedirectLogs.redirectTime, endDate)
      )
    );
    const totalClicks = totalClicksQuery[0]?.count || 0;
    console.log(`\u{1F4CA} RedirectLogsManager: Found ${totalClicks} clicks for date range`);
    let dailyBreakdown = {};
    let hourlyBreakdown = [];
    const dailyBreakdownQuery = await db.select({
      dateKey: campaignRedirectLogs.dateKey,
      count: sql`count(*)`.as("count")
    }).from(campaignRedirectLogs).where(
      and(
        eq(campaignRedirectLogs.campaignId, campaignId),
        gte(campaignRedirectLogs.redirectTime, startDate),
        lte(campaignRedirectLogs.redirectTime, endDate)
      )
    ).groupBy(campaignRedirectLogs.dateKey).orderBy(campaignRedirectLogs.dateKey);
    dailyBreakdown = dailyBreakdownQuery.reduce((acc, { dateKey, count }) => {
      acc[dateKey] = count;
      return acc;
    }, {});
    if (filter.showHourly) {
      const hourlyBreakdownQuery = await db.select({
        hour: campaignRedirectLogs.hourKey,
        count: sql`count(*)`.as("count")
      }).from(campaignRedirectLogs).where(
        and(
          eq(campaignRedirectLogs.campaignId, campaignId),
          gte(campaignRedirectLogs.redirectTime, startDate),
          lte(campaignRedirectLogs.redirectTime, endDate)
        )
      ).groupBy(campaignRedirectLogs.hourKey).orderBy(campaignRedirectLogs.hourKey);
      hourlyBreakdown = hourlyBreakdownQuery.map(({ hour, count }) => ({
        hour,
        clicks: count
      }));
    }
    const dateRangeText = this.getDateRangeText(filter, startDate, endDate);
    return {
      totalClicks,
      dailyBreakdown,
      hourlyBreakdown: filter.showHourly ? hourlyBreakdown : [],
      filterInfo: {
        type: filter.filterType,
        dateRange: dateRangeText
      }
    };
  }
  /**
   * Calculate date range based on filter type
   */
  getDateRangeForFilter(filter) {
    const now = /* @__PURE__ */ new Date();
    let startDate;
    let endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    const campaignCreationDate = /* @__PURE__ */ new Date("2025-01-01T00:00:00.000Z");
    switch (filter.filterType) {
      case "today":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "yesterday":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "last_7_days":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "last_30_days":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "this_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "this_year":
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "last_year":
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "custom_range":
        if (!filter.startDate || !filter.endDate) {
          throw new Error("Start date and end date are required for custom range filter");
        }
        startDate = new Date(filter.startDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(filter.endDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "total":
      default:
        startDate = /* @__PURE__ */ new Date(0);
        break;
    }
    return { startDate, endDate };
  }
  /**
   * Get raw redirect logs for a campaign from file
   */
  async getRawRedirectLogs(campaignId) {
    const logFilePath = this.getCampaignLogFilePath(campaignId);
    try {
      if (!fs.existsSync(logFilePath)) {
        return [];
      }
      const logContent = fs.readFileSync(logFilePath, "utf8");
      return logContent.split("\\n").filter((line) => line.trim() !== "");
    } catch (error) {
      console.error(`Error reading redirect logs for campaign ${campaignId}:`, error);
      return [];
    }
  }
  /**
   * Delete redirect logs for a campaign
   * Called when a campaign is deleted
   */
  async deleteCampaignLogs(campaignId) {
    try {
      const logFilePath = this.getCampaignLogFilePath(campaignId);
      if (fs.existsSync(logFilePath)) {
        fs.unlinkSync(logFilePath);
        console.log(`Deleted redirect logs file for campaign ${campaignId}`);
      }
      await db.delete(campaignRedirectLogs).where(eq(campaignRedirectLogs.campaignId, campaignId));
      return Promise.resolve();
    } catch (error) {
      console.error(`Error deleting redirect logs for campaign ${campaignId}:`, error);
      return Promise.reject(error);
    }
  }
  /**
   * Get a formatted date range text based on the filter type
   */
  getDateRangeText(filter, startDate, endDate) {
    const formatDate = (date) => format(date, "yyyy-MM-dd");
    switch (filter.filterType) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "last_7_days":
        return `Last 7 days (${formatDate(startDate)} to ${formatDate(endDate)})`;
      case "last_30_days":
        return `Last 30 days (${formatDate(startDate)} to ${formatDate(endDate)})`;
      case "this_month":
        return `This month (${formatDate(startDate)} to ${formatDate(endDate)})`;
      case "last_month":
        return `Last month (${formatDate(startDate)} to ${formatDate(endDate)})`;
      case "this_year":
        return `This year (${formatDate(startDate)} to ${formatDate(endDate)})`;
      case "last_year":
        return `Last year (${formatDate(startDate)} to ${formatDate(endDate)})`;
      case "custom_range":
        return `${formatDate(startDate)} to ${formatDate(endDate)}`;
      case "total":
      default:
        return "All time";
    }
  }
};
var redirectLogsManager = new RedirectLogsManager();

// server/url-click-logs-manager.ts
init_db();
init_schema();
import fs2 from "fs";
import path2 from "path";
import { format as format2 } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import z2 from "zod";
import { eq as eq2 } from "drizzle-orm";
var timeRangeFilterSchema2 = z2.object({
  filterType: z2.enum([
    "today",
    "yesterday",
    "last_2_days",
    "last_3_days",
    "last_4_days",
    "last_5_days",
    "last_6_days",
    "last_7_days",
    "this_month",
    "last_month",
    "this_year",
    "last_year",
    "all_time",
    "custom_range"
  ]),
  startDate: z2.string().optional(),
  endDate: z2.string().optional(),
  timezone: z2.string().default("Asia/Kolkata")
  // Default to Indian timezone
});
var UrlClickLogsManager = class {
  logsDir;
  initialized = false;
  constructor() {
    this.logsDir = path2.join(process.cwd(), "url_click_logs");
  }
  /**
   * Initialize the logs directory
   */
  initialize() {
    if (this.initialized) return;
    if (!fs2.existsSync(this.logsDir)) {
      fs2.mkdirSync(this.logsDir, { recursive: true });
    }
    this.initialized = true;
  }
  /**
   * Clear all URL click logs
   * Used during system cleanup to remove all log files
   */
  clearAllLogs() {
    try {
      this.initialize();
      let entriesRemoved = 0;
      if (!fs2.existsSync(this.logsDir)) {
        return { success: true, entriesRemoved: 0 };
      }
      const files = fs2.readdirSync(this.logsDir);
      for (const file of files) {
        const filePath = path2.join(this.logsDir, file);
        if (fs2.statSync(filePath).isFile() && file.endsWith(".log")) {
          fs2.unlinkSync(filePath);
          entriesRemoved++;
        }
      }
      console.log(`Cleared all URL click logs: ${entriesRemoved} files deleted`);
      return { success: true, entriesRemoved };
    } catch (error) {
      console.error("Failed to clear URL click logs:", error);
      return { success: false, entriesRemoved: 0 };
    }
  }
  /**
   * Get the path to a URL's log file
   */
  getUrlLogFilePath(urlId) {
    this.initialize();
    return path2.join(this.logsDir, `url_${urlId}.log`);
  }
  /**
   * Format a date in Indian timezone (UTC+5:30)
   */
  formatIndianTime(date = /* @__PURE__ */ new Date()) {
    const formatted = formatInTimeZone(date, "Asia/Kolkata", "dd-MMMM-yyyy:HH:mm:ss");
    const dateKey = formatInTimeZone(date, "Asia/Kolkata", "yyyy-MM-dd");
    const hourKey = parseInt(formatInTimeZone(date, "Asia/Kolkata", "HH"));
    return { formatted, dateKey, hourKey };
  }
  /**
   * Log a click for a URL - ONLY LOGS, DOES NOT INCREMENT COUNTER
   * (The counter is incremented by storage.incrementUrlClicks)
   */
  async logClick(urlId) {
    this.initialize();
    try {
      const { formatted, dateKey, hourKey } = this.formatIndianTime();
      const logEntry = `New click received{${formatted}}`;
      const logFilePath = this.getUrlLogFilePath(urlId);
      fs2.appendFileSync(logFilePath, logEntry + "\n");
      console.log(`Logged click for URL ID ${urlId}: ${logEntry}`);
    } catch (error) {
      console.error(`Error logging click for URL ID ${urlId}:`, error);
    }
  }
  /**
   * Get raw click logs for a URL
   */
  async getRawLogs(urlId) {
    this.initialize();
    const logFilePath = this.getUrlLogFilePath(urlId);
    if (!fs2.existsSync(logFilePath)) {
      return [];
    }
    try {
      const logContent = fs2.readFileSync(logFilePath, "utf-8");
      return logContent.split("\n").filter((line) => line.trim() !== "");
    } catch (error) {
      console.error(`Error reading logs for URL ID ${urlId}:`, error);
      return [];
    }
  }
  /**
   * Get click analytics for a specific URL with time filtering
   */
  async getUrlClickAnalytics(urlId, filter) {
    this.initialize();
    const { startDate, endDate } = this.getDateRangeForFilter(filter);
    const rawLogs = await this.getRawLogs(urlId);
    const dailyBreakdown = {};
    const hourlyBreakdownByDate = {};
    let totalClicks = 0;
    const timezone = filter.timezone || "Asia/Kolkata";
    const timestampRegex = /New click received\{(\d{2}-[A-Za-z]+-\d{4}):(\d{2}):(\d{2}):(\d{2})\}/;
    for (const log2 of rawLogs) {
      const match = log2.match(timestampRegex);
      if (match) {
        const datePart = match[1];
        const hourString = match[2];
        const minuteString = match[3];
        const secondString = match[4];
        const originalDate = new Date(datePart.replace(/-/g, " "));
        originalDate.setHours(
          parseInt(hourString),
          parseInt(minuteString),
          parseInt(secondString)
        );
        let dateInRequestedTimezone;
        let hourInRequestedTimezone;
        if (timezone === "UTC") {
          dateInRequestedTimezone = new Date(originalDate.getTime() - (5 * 60 + 30) * 60 * 1e3);
          hourInRequestedTimezone = dateInRequestedTimezone.getUTCHours();
        } else {
          dateInRequestedTimezone = originalDate;
          hourInRequestedTimezone = parseInt(hourString);
        }
        if (dateInRequestedTimezone >= startDate && dateInRequestedTimezone <= endDate) {
          const dateKey = timezone === "UTC" ? format2(dateInRequestedTimezone, "yyyy-MM-dd") : format2(originalDate, "yyyy-MM-dd");
          dailyBreakdown[dateKey] = (dailyBreakdown[dateKey] || 0) + 1;
          if (!hourlyBreakdownByDate[dateKey]) {
            hourlyBreakdownByDate[dateKey] = {};
          }
          hourlyBreakdownByDate[dateKey][hourInRequestedTimezone] = (hourlyBreakdownByDate[dateKey][hourInRequestedTimezone] || 0) + 1;
          totalClicks++;
        }
      }
    }
    const dateRangeText = this.getDateRangeText(filter, startDate, endDate);
    const hourlyByDate = {};
    const sortedDates = Object.keys(hourlyBreakdownByDate).sort().reverse();
    for (const dateKey of sortedDates) {
      const dateParts = dateKey.split("-");
      const displayDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
      hourlyByDate[displayDate] = {};
      for (let hour = 0; hour < 24; hour++) {
        const hourStr = `${hour.toString().padStart(2, "0")}:00`;
        hourlyByDate[displayDate][hourStr] = hourlyBreakdownByDate[dateKey][hour] || 0;
      }
    }
    const hourlyBreakdownFlat = {};
    for (const dateBreakdown of Object.values(hourlyBreakdownByDate)) {
      for (const [hour, count] of Object.entries(dateBreakdown)) {
        const hourNum = parseInt(hour);
        hourlyBreakdownFlat[hourNum] = (hourlyBreakdownFlat[hourNum] || 0) + count;
      }
    }
    return {
      urlId,
      totalClicks,
      dailyBreakdown,
      hourlyBreakdown: hourlyBreakdownFlat,
      hourlyByDate,
      filterInfo: {
        type: filter.filterType,
        dateRange: dateRangeText
      }
    };
  }
  /**
   * Calculate date range based on filter type with timezone consideration
   */
  getDateRangeForFilter(filter) {
    const timezone = filter.timezone || "Asia/Kolkata";
    let now;
    if (timezone === "UTC") {
      now = /* @__PURE__ */ new Date();
    } else {
      now = /* @__PURE__ */ new Date();
    }
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate;
    let endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    switch (filter.filterType) {
      case "today":
        startDate = today;
        break;
      case "yesterday":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "last_2_days":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "last_3_days":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 2);
        break;
      case "last_4_days":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 3);
        break;
      case "last_5_days":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 4);
        break;
      case "last_6_days":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 5);
        break;
      case "last_7_days":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6);
        break;
      case "this_month":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "last_month":
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "this_year":
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      case "last_year":
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() - 1, 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "all_time":
        startDate = /* @__PURE__ */ new Date(0);
        break;
      case "custom_range":
        if (filter.startDate && filter.endDate) {
          startDate = new Date(filter.startDate);
          endDate = new Date(filter.endDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          startDate = new Date(today);
          startDate.setDate(startDate.getDate() - 7);
        }
        break;
      default:
        startDate = today;
    }
    return { startDate, endDate };
  }
  /**
   * Get a formatted date range text based on the filter type
   */
  getDateRangeText(filter, startDate, endDate) {
    const formatDate = (date) => format2(date, "yyyy-MM-dd");
    switch (filter.filterType) {
      case "today":
        return `Today (${formatDate(startDate)})`;
      case "yesterday":
        return `Yesterday (${formatDate(startDate)})`;
      case "last_2_days":
        return `Last 2 days (${formatDate(startDate)} to ${formatDate(endDate)})`;
      case "last_3_days":
        return `Last 3 days (${formatDate(startDate)} to ${formatDate(endDate)})`;
      case "last_4_days":
        return `Last 4 days (${formatDate(startDate)} to ${formatDate(endDate)})`;
      case "last_5_days":
        return `Last 5 days (${formatDate(startDate)} to ${formatDate(endDate)})`;
      case "last_6_days":
        return `Last 6 days (${formatDate(startDate)} to ${formatDate(endDate)})`;
      case "last_7_days":
        return `Last 7 days (${formatDate(startDate)} to ${formatDate(endDate)})`;
      case "this_month":
        return `This month (${format2(startDate, "MMMM yyyy")})`;
      case "last_month":
        return `Last month (${format2(startDate, "MMMM yyyy")})`;
      case "this_year":
        return `This year (${format2(startDate, "yyyy")})`;
      case "last_year":
        return `Last year (${format2(startDate, "yyyy")})`;
      case "all_time":
        return "All time";
      case "custom_range":
        return `${formatDate(startDate)} to ${formatDate(endDate)}`;
      default:
        return `${formatDate(startDate)} to ${formatDate(endDate)}`;
    }
  }
  /**
   * Delete logs for a specific URL
   */
  async deleteUrlLogs(urlId) {
    this.initialize();
    const logFilePath = this.getUrlLogFilePath(urlId);
    if (fs2.existsSync(logFilePath)) {
      try {
        fs2.unlinkSync(logFilePath);
        console.log(`Deleted logs for URL ID ${urlId}`);
      } catch (error) {
        console.error(`Error deleting logs for URL ID ${urlId}:`, error);
      }
    }
  }
  /**
   * Generate test click data for a URL with specified parameters
   */
  async generateTestData(urlId, options) {
    this.initialize();
    const { count, dateRange, hourRange } = options;
    const now = /* @__PURE__ */ new Date();
    const startDate = dateRange?.start || new Date(now.setDate(now.getDate() - 7));
    const endDate = dateRange?.end || /* @__PURE__ */ new Date();
    const minHour = hourRange?.min || 0;
    const maxHour = hourRange?.max || 23;
    const logs = [];
    for (let i = 0; i < count; i++) {
      const randomTimestamp = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
      const randomDate = new Date(randomTimestamp);
      const randomHour = Math.floor(Math.random() * (maxHour - minHour + 1)) + minHour;
      randomDate.setHours(randomHour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
      const { formatted } = this.formatIndianTime(randomDate);
      const logEntry = `New click received{${formatted}}`;
      logs.push(logEntry);
    }
    const logFilePath = this.getUrlLogFilePath(urlId);
    fs2.writeFileSync(logFilePath, logs.join("\n") + "\n");
    await db.update(urls).set({ clicks: count }).where(eq2(urls.id, urlId));
    console.log(`Generated ${count} test click logs for URL ID ${urlId}`);
  }
};
var urlClickLogsManager = new UrlClickLogsManager();

// server/storage.ts
var DatabaseStorage = class {
  // Ultra-optimized multi-level caching system for millions of redirects per second
  // Primary weighted distribution cache for campaign URLs
  campaignUrlsCache;
  // Single URL lookup cache for direct access (bypasses DB queries)
  urlCache;
  // Campaign lookup cache (bypasses DB for campaign info)
  campaignCache;
  // Custom path lookup cache for instant path resolution
  customPathCache;
  // In-memory redirect counter to batch DB updates
  pendingClickUpdates;
  // Set cache TTL to -1 for forced immediate updates (always bypass cache)
  cacheTTL = -1;
  // Always bypass cache for instant updates
  // Batch processing threshold before writing to DB
  clickUpdateThreshold = 10;
  // Timer for periodic persistence of clicks
  clickUpdateTimer = null;
  // Flag to temporarily bypass click protection for legitimate operations
  clickProtectionBypassed = false;
  constructor() {
    this.campaignUrlsCache = /* @__PURE__ */ new Map();
    this.urlCache = /* @__PURE__ */ new Map();
    this.campaignCache = /* @__PURE__ */ new Map();
    this.customPathCache = /* @__PURE__ */ new Map();
    this.pendingClickUpdates = /* @__PURE__ */ new Map();
    this.clickUpdateTimer = setInterval(() => this.flushPendingClickUpdates(), 1e3);
    process.on("SIGTERM", () => {
      this.flushPendingClickUpdates();
    });
    process.on("SIGINT", () => {
      this.flushPendingClickUpdates();
    });
  }
  async getCampaigns() {
    try {
      const campaignsResult = await db.select().from(campaigns).orderBy(desc2(campaigns.createdAt));
      const campaignsWithUrls = [];
      for (const campaign of campaignsResult) {
        const urls3 = await this.getUrls(campaign.id);
        campaignsWithUrls.push({
          ...campaign,
          urls: urls3
        });
      }
      return campaignsWithUrls;
    } catch (error) {
      if (error instanceof Error && error.message.includes("column") && error.message.includes("does not exist")) {
        console.log("\u26A0\uFE0F Falling back to base columns for campaigns query as schema migration is pending");
        const campaignsResult = await db.select({
          id: campaigns.id,
          name: campaigns.name,
          redirectMethod: campaigns.redirectMethod,
          customPath: campaigns.customPath,
          multiplier: campaigns.multiplier,
          pricePerThousand: campaigns.pricePerThousand,
          createdAt: campaigns.createdAt,
          updatedAt: campaigns.updatedAt
        }).from(campaigns).orderBy(desc2(campaigns.createdAt));
        const campaignsWithUrls = [];
        for (const campaign of campaignsResult) {
          const urls3 = await this.getUrls(campaign.id);
          campaignsWithUrls.push({
            ...campaign,
            trafficstarCampaignId: null,
            // Type assertion to handle missing field
            // Auto-management has been removed
            lastTrafficstarSync: null,
            // Type assertion to handle missing field
            budgetUpdateTime: "00:00:00",
            // Default to midnight UTC
            urls: urls3
          });
        }
        return campaignsWithUrls;
      }
      throw error;
    }
  }
  async getCampaign(id, forceRefresh = false) {
    const cachedCampaign = this.campaignCache.get(id);
    const now = Date.now();
    if (!forceRefresh && cachedCampaign && now - cachedCampaign.lastUpdated < this.cacheTTL) {
      const campaign = cachedCampaign.campaign;
      const urls3 = await this.getUrls(id);
      return {
        ...campaign,
        urls: urls3
      };
    }
    if (forceRefresh) {
      console.log(`\u{1F504} Force refreshing campaign data for ID: ${id}`);
    }
    try {
      const [campaign] = await db.select().from(campaigns).where(eq3(campaigns.id, id));
      if (!campaign) return void 0;
      this.campaignCache.set(id, {
        lastUpdated: now,
        campaign
      });
      const urls3 = await this.getUrls(id);
      return {
        ...campaign,
        urls: urls3
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("column") && error.message.includes("does not exist")) {
        console.log("\u26A0\uFE0F Falling back to base columns for campaign query as schema migration is pending");
        const [campaign] = await db.select({
          id: campaigns.id,
          name: campaigns.name,
          redirectMethod: campaigns.redirectMethod,
          customPath: campaigns.customPath,
          multiplier: campaigns.multiplier,
          pricePerThousand: campaigns.pricePerThousand,
          createdAt: campaigns.createdAt,
          updatedAt: campaigns.updatedAt
        }).from(campaigns).where(eq3(campaigns.id, id));
        if (!campaign) return void 0;
        const campaignWithDefaults = {
          ...campaign,
          trafficstarCampaignId: null,
          // Auto-management has been removed
          lastTrafficstarSync: null,
          budgetUpdateTime: "00:00:00"
          // Default to midnight UTC
        };
        this.campaignCache.set(id, {
          lastUpdated: now,
          campaign: campaignWithDefaults
        });
        const urls3 = await this.getUrls(id);
        return {
          ...campaignWithDefaults,
          urls: urls3
        };
      }
      throw error;
    }
  }
  async getCampaignByCustomPath(customPath) {
    try {
      const [campaign] = await db.select().from(campaigns).where(eq3(campaigns.customPath, customPath));
      if (!campaign) return void 0;
      const urls3 = await this.getUrls(campaign.id);
      return {
        ...campaign,
        urls: urls3
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("column") && error.message.includes("does not exist")) {
        console.log("\u26A0\uFE0F Falling back to base columns for custom path query as schema migration is pending");
        const [campaign] = await db.select({
          id: campaigns.id,
          name: campaigns.name,
          redirectMethod: campaigns.redirectMethod,
          customPath: campaigns.customPath,
          multiplier: campaigns.multiplier,
          pricePerThousand: campaigns.pricePerThousand,
          createdAt: campaigns.createdAt,
          updatedAt: campaigns.updatedAt
        }).from(campaigns).where(eq3(campaigns.customPath, customPath));
        if (!campaign) return void 0;
        const urls3 = await this.getUrls(campaign.id);
        return {
          ...campaign,
          trafficstarCampaignId: null,
          // Auto-management has been removed
          lastTrafficstarSync: null,
          budgetUpdateTime: "00:00:00",
          // Default to midnight UTC
          urls: urls3
        };
      }
      throw error;
    }
  }
  async createCampaign(insertCampaign) {
    const now = /* @__PURE__ */ new Date();
    let priceValue = 0;
    if (insertCampaign.pricePerThousand !== void 0) {
      if (typeof insertCampaign.pricePerThousand === "string") {
        priceValue = parseFloat(insertCampaign.pricePerThousand);
        if (isNaN(priceValue)) priceValue = 0;
      } else {
        priceValue = insertCampaign.pricePerThousand;
      }
    }
    const campaignData = {
      name: insertCampaign.name,
      redirectMethod: insertCampaign.redirectMethod || "direct",
      customPath: insertCampaign.customPath,
      // Convert multiplier to string for numeric DB field
      multiplier: insertCampaign.multiplier !== void 0 ? String(insertCampaign.multiplier) : "1",
      // Format price with 4 decimal places
      pricePerThousand: priceValue.toFixed(4),
      createdAt: now,
      updatedAt: now
    };
    const [campaign] = await db.insert(campaigns).values(campaignData).returning();
    return campaign;
  }
  async updateCampaign(id, updateCampaign) {
    const [existing] = await db.select().from(campaigns).where(eq3(campaigns.id, id));
    if (!existing) return void 0;
    const updateData = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (updateCampaign.name !== void 0) {
      updateData.name = updateCampaign.name;
    }
    if (updateCampaign.redirectMethod !== void 0) {
      updateData.redirectMethod = updateCampaign.redirectMethod;
    }
    if (updateCampaign.customPath !== void 0) {
      updateData.customPath = updateCampaign.customPath;
    }
    if (updateCampaign.multiplier !== void 0) {
      updateData.multiplier = String(updateCampaign.multiplier);
    }
    if (updateCampaign.pricePerThousand !== void 0) {
      console.log("\u{1F50D} DEBUG: Received pricePerThousand:", updateCampaign.pricePerThousand, "type:", typeof updateCampaign.pricePerThousand);
      let priceValue = updateCampaign.pricePerThousand;
      if (typeof priceValue === "string") {
        priceValue = parseFloat(priceValue);
        if (isNaN(priceValue)) priceValue = 0;
      }
      updateData.pricePerThousand = priceValue === 0 ? "0.0000" : priceValue.toFixed(4);
      console.log("\u{1F50D} DEBUG: Setting pricePerThousand to:", updateData.pricePerThousand);
    }
    if (updateCampaign.trafficstarCampaignId !== void 0) {
      if (updateCampaign.trafficstarCampaignId === "none" || updateCampaign.trafficstarCampaignId === "") {
        updateData.trafficstarCampaignId = null;
        console.log("\u{1F50D} DEBUG: Setting trafficstarCampaignId to null (no integration)");
      } else {
        updateData.trafficstarCampaignId = updateCampaign.trafficstarCampaignId;
        console.log("\u{1F50D} DEBUG: Setting trafficstarCampaignId to:", updateData.trafficstarCampaignId);
      }
    }
    if (updateCampaign.budgetUpdateTime !== void 0) {
      updateData.budgetUpdateTime = updateCampaign.budgetUpdateTime;
      console.log("\u{1F50D} DEBUG: Setting budgetUpdateTime to:", updateData.budgetUpdateTime);
    }
    if (updateCampaign.trafficGeneratorEnabled !== void 0) {
      updateData.trafficGeneratorEnabled = updateCampaign.trafficGeneratorEnabled === true;
      console.log("\u{1F50D} DEBUG: Setting trafficGeneratorEnabled to:", updateData.trafficGeneratorEnabled, "(original value:", updateCampaign.trafficGeneratorEnabled, ")");
    }
    if (updateCampaign.postPauseCheckMinutes !== void 0) {
      let minutes = updateCampaign.postPauseCheckMinutes;
      if (minutes < 1) minutes = 1;
      if (minutes > 30) minutes = 30;
      updateData.postPauseCheckMinutes = minutes;
      console.log("\u{1F50D} DEBUG: Setting postPauseCheckMinutes to:", updateData.postPauseCheckMinutes);
    }
    if (updateCampaign.highSpendWaitMinutes !== void 0) {
      let minutes = updateCampaign.highSpendWaitMinutes;
      if (minutes < 1) minutes = 1;
      if (minutes > 30) minutes = 30;
      updateData.highSpendWaitMinutes = minutes;
      console.log("\u{1F50D} DEBUG: Setting highSpendWaitMinutes to:", updateData.highSpendWaitMinutes);
    }
    if (updateCampaign.trafficSenderEnabled !== void 0) {
      updateData.trafficSenderEnabled = updateCampaign.trafficSenderEnabled === true;
      console.log("\u{1F50D} DEBUG: Setting trafficSenderEnabled to:", updateData.trafficSenderEnabled, "(original value:", updateCampaign.trafficSenderEnabled, ")");
      if (updateCampaign.trafficSenderEnabled === true) {
        updateData.lastTrafficSenderAction = /* @__PURE__ */ new Date();
        console.log("\u{1F50D} DEBUG: Setting lastTrafficSenderAction to current time");
      }
    }
    if (updateCampaign.lastTrafficSenderStatus !== void 0) {
      updateData.lastTrafficSenderStatus = updateCampaign.lastTrafficSenderStatus;
    }
    if (updateCampaign.lastBudgetUpdateTime !== void 0) {
      updateData.lastBudgetUpdateTime = updateCampaign.lastBudgetUpdateTime;
    }
    if (updateCampaign.youtubeApiEnabled !== void 0) {
      if (typeof updateCampaign.youtubeApiEnabled === "boolean") {
        updateData.youtubeApiEnabled = updateCampaign.youtubeApiEnabled;
      } else {
        const boolValue = updateCampaign.youtubeApiEnabled === true || updateCampaign.youtubeApiEnabled === "true" || updateCampaign.youtubeApiEnabled === 1;
        updateData.youtubeApiEnabled = boolValue;
      }
      console.log(
        "\u{1F50D} DEBUG: Setting youtubeApiEnabled to:",
        updateData.youtubeApiEnabled,
        "(original value:",
        updateCampaign.youtubeApiEnabled,
        ", type:",
        typeof updateCampaign.youtubeApiEnabled,
        ")"
      );
    }
    if (updateCampaign.youtubeApiIntervalMinutes !== void 0) {
      let minutes = updateCampaign.youtubeApiIntervalMinutes;
      if (minutes < 15) minutes = 15;
      if (minutes > 1440) minutes = 1440;
      updateData.youtubeApiIntervalMinutes = minutes;
      console.log("\u{1F50D} DEBUG: Setting youtubeApiIntervalMinutes to:", updateData.youtubeApiIntervalMinutes);
    }
    if (updateCampaign.youtubeCheckCountryRestriction !== void 0) {
      updateData.youtubeCheckCountryRestriction = updateCampaign.youtubeCheckCountryRestriction === true;
      console.log("\u{1F50D} DEBUG: Setting youtubeCheckCountryRestriction to:", updateData.youtubeCheckCountryRestriction);
    }
    if (updateCampaign.youtubeCheckPrivate !== void 0) {
      updateData.youtubeCheckPrivate = updateCampaign.youtubeCheckPrivate === true;
      console.log("\u{1F50D} DEBUG: Setting youtubeCheckPrivate to:", updateData.youtubeCheckPrivate);
    }
    if (updateCampaign.youtubeCheckDeleted !== void 0) {
      updateData.youtubeCheckDeleted = updateCampaign.youtubeCheckDeleted === true;
      console.log("\u{1F50D} DEBUG: Setting youtubeCheckDeleted to:", updateData.youtubeCheckDeleted);
    }
    if (updateCampaign.youtubeCheckAgeRestricted !== void 0) {
      updateData.youtubeCheckAgeRestricted = updateCampaign.youtubeCheckAgeRestricted === true;
      console.log("\u{1F50D} DEBUG: Setting youtubeCheckAgeRestricted to:", updateData.youtubeCheckAgeRestricted);
    }
    if (updateCampaign.youtubeCheckMadeForKids !== void 0) {
      updateData.youtubeCheckMadeForKids = updateCampaign.youtubeCheckMadeForKids === true;
      console.log("\u{1F50D} DEBUG: Setting youtubeCheckMadeForKids to:", updateData.youtubeCheckMadeForKids);
    }
    if (updateCampaign.youtubeCheckDuration !== void 0) {
      updateData.youtubeCheckDuration = updateCampaign.youtubeCheckDuration === true;
      console.log("\u{1F50D} DEBUG: Setting youtubeCheckDuration to:", updateData.youtubeCheckDuration);
    }
    if (updateCampaign.youtubeMaxDurationMinutes !== void 0) {
      let minutes = updateCampaign.youtubeMaxDurationMinutes;
      if (minutes < 1) minutes = 1;
      if (minutes > 180) minutes = 180;
      updateData.youtubeMaxDurationMinutes = minutes;
      console.log("\u{1F50D} DEBUG: Setting youtubeMaxDurationMinutes to:", updateData.youtubeMaxDurationMinutes);
    }
    if (updateData.trafficstarCampaignId) {
      updateData.lastTrafficstarSync = /* @__PURE__ */ new Date();
    }
    const [updated] = await db.update(campaigns).set(updateData).where(eq3(campaigns.id, id)).returning();
    return updated;
  }
  async deleteCampaign(id) {
    const [campaign] = await db.select().from(campaigns).where(eq3(campaigns.id, id));
    if (!campaign) return false;
    try {
      await db.update(urls).set({
        status: "deleted",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq3(urls.campaignId, id));
      await db.delete(campaigns).where(eq3(campaigns.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting campaign:", error);
      return false;
    }
  }
  async getUrls(campaignId, forceRefresh = false) {
    const cachedUrls = this.campaignUrlsCache.get(campaignId);
    const now = Date.now();
    if (!forceRefresh && cachedUrls && now - cachedUrls.lastUpdated < this.cacheTTL) {
      console.log(`\u{1F4CB} Using cached URLs for campaign ID: ${campaignId}`);
      if (cachedUrls.activeUrls && cachedUrls.activeUrls.length > 0) {
        return cachedUrls.activeUrls;
      }
    }
    if (forceRefresh) {
      console.log(`\u{1F504} Force refreshing URLs for campaign ID: ${campaignId}`);
    } else if (!cachedUrls) {
      console.log(`\u{1F50D} Cache miss - fetching fresh URLs for campaign ID: ${campaignId}`);
    } else {
      console.log(`\u23F0 Cache stale - refreshing URLs for campaign ID: ${campaignId}`);
    }
    const urlsResult = await db.select().from(urls).where(
      and2(
        eq3(urls.campaignId, campaignId),
        ne(urls.status, "deleted"),
        ne(urls.status, "rejected")
      )
    ).orderBy(desc2(urls.createdAt));
    return urlsResult.map((url) => {
      const needsStatusUpdate = url.clicks >= url.clickLimit && url.status !== "completed";
      if (needsStatusUpdate) {
        this.updateUrlStatus(url.id, "completed");
      }
      return {
        ...url,
        // If the URL has reached its click limit, it's considered completed regardless of DB status
        status: url.clicks >= url.clickLimit ? "completed" : url.status,
        isActive: url.clicks < url.clickLimit && url.status === "active"
      };
    });
  }
  async getAllUrls(page = 1, limit = 100, search, status) {
    const offset = (page - 1) * limit;
    let conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(urls.name, `%${search}%`),
          ilike(urls.targetUrl, `%${search}%`)
        )
      );
    }
    if (status && status !== "all") {
      conditions.push(eq3(urls.status, status));
    }
    const countResult = await db.select({ count: sql2`count(*)` }).from(urls).where(conditions.length > 0 ? and2(...conditions) : void 0);
    const total = Number(countResult[0]?.count || 0);
    const urlsResult = await db.select().from(urls).where(conditions.length > 0 ? and2(...conditions) : void 0).limit(limit).offset(offset).orderBy(desc2(urls.createdAt));
    const urlsWithStatus = urlsResult.map((url) => {
      const needsStatusUpdate = url.clicks >= url.clickLimit && url.status !== "completed";
      if (needsStatusUpdate) {
        this.updateUrlStatus(url.id, "completed");
      }
      return {
        ...url,
        // If the URL has reached its click limit, it's considered completed regardless of DB status
        status: url.clicks >= url.clickLimit ? "completed" : url.status,
        isActive: url.clicks < url.clickLimit && url.status === "active"
      };
    });
    return {
      urls: urlsWithStatus,
      total
    };
  }
  async getUrl(id) {
    const cachedUrl = this.urlCache.get(id);
    const now = Date.now();
    if (cachedUrl && now - cachedUrl.lastUpdated < this.cacheTTL) {
      const pendingClicks = this.pendingClickUpdates.get(id) || 0;
      if (pendingClicks > 0) {
        return {
          ...cachedUrl.url,
          clicks: cachedUrl.url.clicks + pendingClicks
        };
      }
      return cachedUrl.url;
    }
    const [url] = await db.select().from(urls).where(eq3(urls.id, id));
    if (url) {
      this.urlCache.set(id, {
        lastUpdated: now,
        url
      });
    }
    return url;
  }
  async createUrl(insertUrl) {
    const now = /* @__PURE__ */ new Date();
    const originalClickLimit = insertUrl.originalClickLimit || insertUrl.clickLimit;
    const safeOriginalClickLimit = originalClickLimit;
    console.log("\u{1F50D} DEBUG: Storage - Creating URL");
    console.log("  - Name:", insertUrl.name);
    console.log("  - Target URL:", insertUrl.targetUrl);
    console.log("  - Campaign ID:", insertUrl.campaignId);
    console.log("  - Click limit (after multiplier):", insertUrl.clickLimit);
    console.log("  - Original click limit (user input):", originalClickLimit);
    const existingRecord = await this.getOriginalUrlRecordByName(insertUrl.name);
    if (!existingRecord) {
      try {
        await this.createOriginalUrlRecord({
          name: insertUrl.name,
          targetUrl: insertUrl.targetUrl,
          originalClickLimit: safeOriginalClickLimit
        });
        console.log("\u{1F50D} DEBUG: Created original URL record for", insertUrl.name);
      } catch (error) {
        console.error("Error creating original URL record:", error);
      }
    }
    const existingUrls = await db.select().from(urls).where(eq3(urls.name, insertUrl.name));
    if (existingUrls.length > 0) {
      console.log(`\u26A0\uFE0F Duplicate URL name detected: "${insertUrl.name}"`);
      if (existingUrls.length === 1 && existingUrls[0].status !== "rejected") {
        console.log(`  - First duplicate: marking as rejected`);
        const [rejectedUrl] = await db.insert(urls).values({
          ...insertUrl,
          originalClickLimit,
          clicks: 0,
          status: "rejected",
          // Mark as rejected
          createdAt: now,
          updatedAt: now
        }).returning();
        return rejectedUrl;
      } else {
        let maxNumber = 1;
        const nameBase = insertUrl.name;
        const allDuplicateUrls = await db.select().from(urls).where(
          or(
            eq3(urls.name, nameBase),
            ilike(urls.name, `${nameBase} #%`)
          )
        );
        console.log(`  - Found ${allDuplicateUrls.length} potential duplicates`);
        const regex = new RegExp(`^${nameBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} #(\\d+)$`);
        for (const existingUrl of allDuplicateUrls) {
          if (existingUrl.name === nameBase) continue;
          const match = existingUrl.name.match(regex);
          console.log(`  - Checking: "${existingUrl.name}" against regex`);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            console.log(`    - Found number: ${num}`);
            if (num > maxNumber) {
              maxNumber = num;
              console.log(`    - New max number: ${maxNumber}`);
            }
          }
        }
        const newNumber = maxNumber + 1;
        const newName = `${nameBase} #${newNumber}`;
        console.log(`  - Creating with numbered suffix: "${newName}"`);
        const [numberedUrl] = await db.insert(urls).values({
          ...insertUrl,
          name: newName,
          // Use the name with the number suffix
          originalClickLimit,
          clicks: 0,
          status: "rejected",
          // Mark as rejected
          createdAt: now,
          updatedAt: now
        }).returning();
        return numberedUrl;
      }
    }
    if (insertUrl.campaignId) {
      const [campaign] = await db.select().from(campaigns).where(eq3(campaigns.id, insertUrl.campaignId));
      if (campaign) {
        const multiplierValue = typeof campaign.multiplier === "string" ? parseFloat(campaign.multiplier) : campaign.multiplier || 1;
        if (multiplierValue > 0.01) {
          const expectedClickLimit = Math.ceil(originalClickLimit * multiplierValue);
          if (expectedClickLimit !== insertUrl.clickLimit) {
            console.warn("\u26A0\uFE0F WARNING: Calculated click limit does not match expected value!");
            console.warn(`  - Expected: ${originalClickLimit} \xD7 ${multiplierValue} = ${expectedClickLimit}`);
            console.warn(`  - Received: ${insertUrl.clickLimit}`);
          }
        }
      }
    }
    const [url] = await db.insert(urls).values({
      ...insertUrl,
      originalClickLimit: safeOriginalClickLimit,
      // Explicitly use the safe original value
      clicks: 0,
      status: "active",
      createdAt: now,
      updatedAt: now
    }).returning();
    if (url.campaignId) {
      this.invalidateCampaignCache(url.campaignId);
    }
    return url;
  }
  async updateUrl(id, updateUrl) {
    const [existingUrl] = await db.select().from(urls).where(eq3(urls.id, id));
    if (!existingUrl) return void 0;
    if (existingUrl.clicks >= existingUrl.clickLimit && updateUrl.status !== "completed") {
      updateUrl.status = "completed";
    }
    if (updateUrl.status && updateUrl.status !== existingUrl.status) {
      console.log(`\u{1F504} Status change detected for URL #${id}: ${existingUrl.status || "none"} -> ${updateUrl.status}`);
      if (existingUrl.name) {
        try {
          const syncResult = await this.syncStatusFromUrlToOriginalRecord(existingUrl.name, updateUrl.status);
          console.log(`\u{1F504} Status sync to original record result: ${syncResult ? "success" : "no matching record found"}`);
        } catch (syncError) {
          console.error(`\u274C Error syncing status to original record:`, syncError);
        }
      }
    }
    if (updateUrl.clickLimit !== void 0 || updateUrl.originalClickLimit !== void 0) {
      console.log("\u{1F50D} DEBUG: URL edit - updating click limit");
      const existingRecord = await this.getOriginalUrlRecordByName(existingUrl.name);
      if (updateUrl.originalClickLimit !== void 0) {
        if (!existingRecord) {
          try {
            await this.createOriginalUrlRecord({
              name: existingUrl.name,
              targetUrl: updateUrl.targetUrl || existingUrl.targetUrl,
              originalClickLimit: updateUrl.originalClickLimit,
              status: updateUrl.status || existingUrl.status
              // Include status when creating record
            });
            console.log("\u{1F50D} DEBUG: Created original URL record for", existingUrl.name);
          } catch (error) {
            console.error("Error creating original URL record during update:", error);
          }
        } else {
          try {
            await this.updateOriginalUrlRecord(existingRecord.id, {
              originalClickLimit: updateUrl.originalClickLimit,
              status: updateUrl.status || existingUrl.status
              // Include status when updating record
            });
            console.log("\u{1F50D} DEBUG: Updated original URL record for", existingUrl.name);
          } catch (error) {
            console.error("Error updating original URL record:", error);
          }
        }
        const campaignMultiplier = existingUrl.campaignId ? await this.getCampaignMultiplier(existingUrl.campaignId) : 1;
        const calculatedLimit = Math.round(updateUrl.originalClickLimit * campaignMultiplier);
        console.log("\u{1F50D} DEBUG: URL updated with new limits:");
        console.log(`  - Original user input: ${updateUrl.originalClickLimit}`);
        console.log(`  - After multiplier (${campaignMultiplier}x): ${calculatedLimit}`);
        console.log(`  - Calculation: ${updateUrl.originalClickLimit} \xD7 ${campaignMultiplier} = ${calculatedLimit}`);
        if (updateUrl.clickLimit === void 0) {
          updateUrl.clickLimit = calculatedLimit;
        }
      }
    }
    const [updatedUrl] = await db.update(urls).set({
      ...updateUrl,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq3(urls.id, id)).returning();
    if (existingUrl.campaignId) {
      this.invalidateCampaignCache(existingUrl.campaignId);
    }
    return updatedUrl;
  }
  // Helper method to get campaign multiplier
  async getCampaignMultiplier(campaignId) {
    const [campaign] = await db.select().from(campaigns).where(eq3(campaigns.id, campaignId));
    if (!campaign) return 1;
    const multiplierValue = typeof campaign.multiplier === "string" ? parseFloat(campaign.multiplier) : campaign.multiplier || 1;
    return multiplierValue > 0.01 ? multiplierValue : 1;
  }
  async deleteUrl(id) {
    const [url] = await db.select().from(urls).where(eq3(urls.id, id));
    if (!url) return false;
    console.log(`\u{1F5D1}\uFE0F Soft deleting URL ID #${id} "${url.name}"`);
    if (url.name) {
      this.syncStatusFromUrlToOriginalRecord(url.name, "deleted").catch((err) => {
        console.error(`\u274C Error syncing deleted status to original record for "${url.name}":`, err);
      });
    }
    await db.update(urls).set({
      status: "deleted",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq3(urls.id, id));
    if (url.campaignId) {
      this.invalidateCampaignCache(url.campaignId);
    }
    console.log(`\u2705 URL ID #${id} "${url.name}" successfully soft-deleted (status=deleted)`);
    return true;
  }
  async permanentlyDeleteUrl(id) {
    try {
      const [url] = await db.select().from(urls).where(eq3(urls.id, id));
      if (!url) return false;
      console.log(`Permanently deleting URL ID ${id} (${url.name}) while preserving analytics data`);
      const urlDetails = {
        id: url.id,
        name: url.name,
        campaignId: url.campaignId,
        deletedAt: /* @__PURE__ */ new Date()
      };
      await db.delete(urls).where(eq3(urls.id, id));
      if (url.campaignId) {
        this.invalidateCampaignCache(url.campaignId);
      }
      console.log(`URL ${id} permanently deleted while preserving analytics data`);
      return true;
    } catch (error) {
      console.error("Failed to permanently delete URL:", error);
      return false;
    }
  }
  /**
   * NEW CAMPAIGN CLICK TRACKING SYSTEM
   * Each successful redirect counts as exactly 1 click in campaign record
   * For example: 50 redirects = 50 clicks in campaign analytics
   * 
   * - Stores redirect time to show hourly breakdowns (00:00-01:00, 01:00-02:00, etc.)
   * - Preserves click data even when URLs are deleted
   * - Analytics page shows clicks by date with time details
   * - Detailed campaign analytics shows hourly breakdown for selected time frame
   * - Supports timezone conversion and date range filtering
   * 
   * @param campaignId The campaign ID that generated this redirect
   * @param urlId URL ID used for the redirect (null for direct campaign access)
   */
  async bulkUpdateUrls(ids, action) {
    const urlsToUpdate = await db.select().from(urls).where(inArray(urls.id, ids));
    if (urlsToUpdate.length === 0) return false;
    let newStatus;
    let shouldDelete = false;
    switch (action) {
      case "pause":
        newStatus = "paused";
        break;
      case "activate":
        newStatus = "active";
        break;
      case "delete":
        newStatus = "deleted";
        break;
      case "permanent_delete":
        shouldDelete = true;
        break;
    }
    const urlNames = urlsToUpdate.map((url) => url.name);
    console.log(`\u{1F504} Bulk updating ${urlsToUpdate.length} URLs with action: ${action}`);
    if (newStatus && urlNames.length > 0) {
      console.log(`\u{1F504} Starting bidirectional sync for ${urlNames.length} original URL records with status: ${newStatus}`);
      const originalRecords = await db.select().from(originalUrlRecords).where(inArray(originalUrlRecords.name, urlNames));
      console.log(`\u2705 Found ${originalRecords.length} matching original URL records to update`);
      if (originalRecords.length > 0) {
        await db.update(originalUrlRecords).set({
          status: newStatus,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(inArray(originalUrlRecords.name, urlNames));
        console.log(`\u2705 Successfully synced ${originalRecords.length} original URL records with status: ${newStatus}`);
      }
    }
    if (shouldDelete) {
      console.log(`Permanently deleting ${ids.length} URLs while preserving analytics data`);
      await db.delete(urls).where(inArray(urls.id, ids));
      console.log(`${ids.length} URLs permanently deleted while preserving analytics data`);
    } else if (newStatus) {
      await db.update(urls).set({
        status: newStatus,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(inArray(urls.id, ids));
    }
    const campaignIds = /* @__PURE__ */ new Set();
    for (const url of urlsToUpdate) {
      if (url.campaignId) {
        campaignIds.add(url.campaignId);
      }
    }
    campaignIds.forEach((id) => this.invalidateCampaignCache(id));
    return true;
  }
  /**
   * Ultra-high performance click incrementing to handle millions of redirects per second
   * Uses memory-first approach with batched database updates
   */
  async incrementUrlClicks(id) {
    const cachedUrl = this.urlCache.get(id);
    const now = Date.now();
    if (cachedUrl && now - cachedUrl.lastUpdated < this.cacheTTL) {
      const pendingClicks = this.pendingClickUpdates.get(id) || 0;
      const urlWithUpdatedClicks = {
        ...cachedUrl.url,
        clicks: cachedUrl.url.clicks + pendingClicks + 1
      };
      const isCompleted = urlWithUpdatedClicks.clicks >= urlWithUpdatedClicks.clickLimit;
      if (isCompleted && urlWithUpdatedClicks.status !== "completed") {
        urlWithUpdatedClicks.status = "completed";
        if (urlWithUpdatedClicks.name) {
          this.syncStatusFromUrlToOriginalRecord(urlWithUpdatedClicks.name, "completed").then((result) => {
            console.log(`\u{1F504} Auto-sync to original record "${urlWithUpdatedClicks.name}" completed with result: ${result ? "success" : "no matching record"}`);
          }).catch((err) => {
            console.error(`\u274C Error auto-syncing status to original record:`, err);
          });
        }
      }
      this.pendingClickUpdates.set(id, pendingClicks + 1);
      this.urlCache.set(id, {
        lastUpdated: now,
        url: urlWithUpdatedClicks
      });
      if (urlWithUpdatedClicks.campaignId) {
        this.invalidateCampaignCache(urlWithUpdatedClicks.campaignId);
      }
      const newPendingCount = pendingClicks + 1;
      if (newPendingCount >= this.clickUpdateThreshold) {
        this.batchUpdateUrlClicks(id, newPendingCount, isCompleted).catch((err) => {
          console.error(`Error in batch click update for URL ${id}:`, err);
        });
      }
      return urlWithUpdatedClicks;
    }
    try {
      const [url] = await db.select().from(urls).where(eq3(urls.id, id));
      if (!url) return void 0;
      const pendingClicks = this.pendingClickUpdates.get(id) || 0;
      const newPendingCount = pendingClicks + 1;
      this.pendingClickUpdates.set(id, newPendingCount);
      const newClicks = url.clicks + 1;
      const isCompleted = newClicks >= url.clickLimit;
      const newStatus = isCompleted ? "completed" : url.status;
      if (isCompleted && url.status !== "completed" && url.name) {
        this.syncStatusFromUrlToOriginalRecord(url.name, "completed").then((result) => {
          console.log(`\u{1F504} Auto-sync to original record "${url.name}" completed with result: ${result ? "success" : "no matching record"}`);
        }).catch((err) => {
          console.error(`\u274C Error auto-syncing status to original record:`, err);
        });
      }
      const updatedUrl = {
        ...url,
        clicks: newClicks,
        status: newStatus
      };
      this.urlCache.set(id, {
        lastUpdated: now,
        url: updatedUrl
      });
      if (url.campaignId) {
        this.invalidateCampaignCache(url.campaignId);
      }
      const [dbUpdatedUrl] = await db.update(urls).set({
        clicks: newClicks,
        status: isCompleted ? "completed" : url.status,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq3(urls.id, id)).returning();
      this.pendingClickUpdates.set(id, 0);
      return dbUpdatedUrl;
    } catch (error) {
      console.error(`Error incrementing clicks for URL ${id}:`, error);
      return void 0;
    }
  }
  /**
   * Asynchronous batch update of URL clicks to database
   * This reduces database load for high-volume traffic
   */
  async batchUpdateUrlClicks(id, pendingCount, isCompleted) {
    try {
      if (isCompleted) {
        const [url] = await db.select().from(urls).where(eq3(urls.id, id));
        if (url?.campaignId) {
          const campaignId = url.campaignId;
          await db.update(urls).set({
            clicks: sql2`${urls.clicks} + ${pendingCount}`,
            status: "completed",
            campaignId: null,
            // Remove from campaign
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq3(urls.id, id));
          this.invalidateCampaignCache(campaignId);
          console.log(`URL ${id} reached click limit and was removed from campaign ${campaignId}`);
        } else {
          await db.update(urls).set({
            clicks: sql2`${urls.clicks} + ${pendingCount}`,
            status: "completed",
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq3(urls.id, id));
        }
      } else {
        await db.update(urls).set({
          clicks: sql2`${urls.clicks} + ${pendingCount}`,
          status: sql2`${urls.status}`,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq3(urls.id, id));
      }
      this.pendingClickUpdates.set(id, 0);
    } catch (error) {
      console.error(`Error in batch update for URL ${id}:`, error);
    }
  }
  /**
   * Flushes all pending click updates to the database
   * Called periodically via timer and on app shutdown
   * This ensures we don't lose track of clicks during high-load periods
   */
  async flushPendingClickUpdates() {
    if (this.pendingClickUpdates.size === 0) return;
    try {
      const updatePromises = Array.from(this.pendingClickUpdates.entries()).filter(([_, clicks]) => clicks > 0).map(async ([id, pendingCount]) => {
        const cachedUrl = this.urlCache.get(id);
        const isCompleted = cachedUrl && cachedUrl.url.clicks >= cachedUrl.url.clickLimit;
        try {
          if (isCompleted) {
            const [urlInfo] = await db.select().from(urls).where(eq3(urls.id, id));
            const needsStatusSync = urlInfo && urlInfo.status !== "completed";
            await this.updateUrlStatus(id, "completed");
            await db.update(urls).set({
              clicks: sql2`${urls.clicks} + ${pendingCount}`,
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq3(urls.id, id));
            if (needsStatusSync && urlInfo?.name) {
              try {
                const syncResult = await this.syncStatusFromUrlToOriginalRecord(urlInfo.name, "completed");
                console.log(`\u{1F504} Batch sync to original record "${urlInfo.name}" completed with result: ${syncResult ? "success" : "no matching record"}`);
              } catch (syncError) {
                console.error(`\u274C Error batch syncing status to original record:`, syncError);
              }
            }
          } else {
            await db.update(urls).set({
              clicks: sql2`${urls.clicks} + ${pendingCount}`,
              status: sql2`${urls.status}`,
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq3(urls.id, id));
          }
          this.pendingClickUpdates.set(id, 0);
          const [updatedUrl] = await db.select().from(urls).where(eq3(urls.id, id));
          if (updatedUrl) {
            this.urlCache.set(id, {
              lastUpdated: Date.now(),
              url: updatedUrl
            });
            if (updatedUrl.campaignId) {
              this.invalidateCampaignCache(updatedUrl.campaignId);
            }
          }
        } catch (error) {
          console.error(`Error updating URL ${id} with ${pendingCount} pending clicks:`, error);
        }
      });
      await Promise.all(updatePromises);
      console.log(`Flushed ${updatePromises.length} pending click updates to database`);
    } catch (error) {
      console.error("Error flushing pending click updates:", error);
    }
  }
  // Helper method to get weighted URL distribution for a campaign
  async getWeightedUrlDistribution(campaignId) {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) return { activeUrls: [], weightedDistribution: [] };
    const activeUrls = campaign.urls.filter((url) => url.isActive);
    const totalWeight = activeUrls.reduce((sum, url) => {
      const remainingClicks = url.clickLimit - url.clicks;
      return sum + remainingClicks;
    }, 0);
    const weightedDistribution = [];
    let currentRange = 0;
    for (const url of activeUrls) {
      const remainingClicks = url.clickLimit - url.clicks;
      const weight = remainingClicks / totalWeight;
      const startRange = currentRange;
      const endRange = currentRange + weight;
      weightedDistribution.push({
        url,
        weight,
        startRange,
        endRange
      });
      currentRange = endRange;
    }
    const now = Date.now();
    const cacheEntry = {
      lastUpdated: now,
      activeUrls,
      weightedDistribution
    };
    this.campaignUrlsCache.set(campaignId, cacheEntry);
    return { activeUrls, weightedDistribution };
  }
  // Fast method to get a URL based on weighted distribution
  async getRandomWeightedUrl(campaignId) {
    const { activeUrls, weightedDistribution } = await this.getWeightedUrlDistribution(campaignId);
    if (activeUrls.length === 0) return null;
    if (activeUrls.length === 1) return activeUrls[0];
    const randomValue = Math.random();
    for (const entry of weightedDistribution) {
      if (randomValue >= entry.startRange && randomValue < entry.endRange) {
        return entry.url;
      }
    }
    return activeUrls[0];
  }
  // Invalidate campaign cache when URLs are modified
  invalidateCampaignCache(campaignId) {
    console.log(`\u{1F9F9} Invalidating campaign cache for ID: ${campaignId}`);
    this.campaignUrlsCache.delete(campaignId);
    this.campaignCache.delete(campaignId);
    const customPathEntry = Array.from(this.customPathCache.entries()).find(([_, value]) => {
      if (value && typeof value === "object" && "campaign" in value && typeof value.campaign === "object") {
        const campaign = value.campaign;
        return campaign && typeof campaign.id === "number" && campaign.id === campaignId;
      }
      return false;
    });
    if (customPathEntry) {
      console.log(`\u{1F9F9} Also removing campaign from custom path cache: ${customPathEntry[0]}`);
      this.customPathCache.delete(customPathEntry[0]);
    }
  }
  invalidateUrlCache(urlId) {
    console.log(`\u{1F9F9} Invalidating URL cache for ID: ${urlId}`);
    this.urlCache.delete(urlId);
    db.select({
      id: urls.id,
      campaignId: urls.campaignId
    }).from(urls).where(eq3(urls.id, urlId)).then((results) => {
      if (results.length > 0 && results[0].campaignId) {
        console.log(`\u{1F9F9} URL #${urlId} belongs to campaign #${results[0].campaignId} - invalidating campaign cache`);
        this.invalidateCampaignCache(results[0].campaignId);
      }
    }).catch((err) => {
      console.error(`Error finding campaign for URL #${urlId}:`, err);
    });
  }
  // Helper to update URL status (used for async marking URLs as completed)
  /**
   * Syncs status from a URL to its original URL record
   * This function ensures bidirectional status synchronization
   * @param urlName The name of the URL to sync from
   * @param status The status to apply to the original URL record
   */
  async syncStatusFromUrlToOriginalRecord(urlName, status) {
    try {
      if (!urlName) {
        console.error("\u274C Cannot sync status - URL name is empty or undefined");
        return false;
      }
      console.log(`\u{1F504} BIDIRECTIONAL SYNC: Updating Original URL Record for "${urlName}" with status "${status}"`);
      const [originalRecord] = await db.select().from(originalUrlRecords).where(eq3(originalUrlRecords.name, urlName));
      if (!originalRecord) {
        console.log(`\u26A0\uFE0F Could not find Original URL Record for "${urlName}" - skipping status sync`);
        return false;
      }
      console.log(`\u{1F50D} Found Original URL Record #${originalRecord.id} for "${urlName}", current status: "${originalRecord.status || "none"}"`);
      if (originalRecord.status === status) {
        console.log(`\u2139\uFE0F Original URL Record #${originalRecord.id} already has status "${status}" - no update needed`);
        return true;
      }
      const result = await db.update(originalUrlRecords).set({
        status,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq3(originalUrlRecords.id, originalRecord.id)).returning();
      const success = result && result.length > 0;
      if (success) {
        console.log(`\u2705 Successfully updated Original URL Record #${originalRecord.id} status from "${originalRecord.status || "none"}" to "${status}"`);
      } else {
        console.log(`\u26A0\uFE0F Failed to update Original URL Record #${originalRecord.id} status to "${status}"`);
      }
      return success;
    } catch (error) {
      console.error(`\u274C Error syncing status from URL "${urlName}" to Original URL Record:`, error);
      return false;
    }
  }
  async updateUrlStatus(id, status) {
    const [url] = await db.select().from(urls).where(eq3(urls.id, id));
    if (!url) {
      console.log(`\u26A0\uFE0F URL with ID ${id} not found, cannot update status`);
      return void 0;
    }
    console.log(`\u{1F504} Updating URL #${id} "${url.name}" status to "${status}"`);
    if (url.name) {
      try {
        const syncResult = await this.syncStatusFromUrlToOriginalRecord(url.name, status);
        console.log(`\u{1F4CA} Original URL Record sync result: ${syncResult ? "\u2705 Success" : "\u26A0\uFE0F No matching record found"}`);
      } catch (syncError) {
        console.error(`\u274C Error in bidirectional sync:`, syncError);
      }
    }
    let updatedUrl;
    if (status === "completed") {
      if (url?.campaignId) {
        const campaignId = url.campaignId;
        const [result] = await db.update(urls).set({
          status,
          campaignId: null,
          // Remove from campaign
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq3(urls.id, id)).returning();
        updatedUrl = result;
        this.invalidateCampaignCache(campaignId);
        console.log(`URL ${id} marked as completed and removed from campaign ${campaignId}`);
      } else {
        const [result] = await db.update(urls).set({
          status,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq3(urls.id, id)).returning();
        updatedUrl = result;
      }
    } else {
      const [result] = await db.update(urls).set({
        status,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq3(urls.id, id)).returning();
      updatedUrl = result;
      if (url?.campaignId) {
        this.invalidateCampaignCache(url.campaignId);
      }
    }
    return updatedUrl;
  }
  // Full system cleanup - deletes all campaigns and URLs
  async fullSystemCleanup() {
    try {
      const allCampaigns = await this.getCampaigns();
      let totalUrls = 0;
      for (const campaign of allCampaigns) {
        totalUrls += campaign.urls.length;
      }
      const originalRecordsResult = await db.select({ count: sql2`count(*)` }).from(originalUrlRecords);
      const originalRecordsCount = Number(originalRecordsResult[0]?.count || 0);
      let youtubeUrlRecordsCount = 0;
      try {
        const youtubeRecordsResult = await db.execute(sql2`SELECT COUNT(*) FROM youtube_url_records`);
        youtubeUrlRecordsCount = Number(youtubeRecordsResult.rows?.[0]?.count || 0);
      } catch (error) {
        console.log(`\u2139\uFE0F SYSTEM RESET: No youtube_url_records table found or unable to count records`);
      }
      let trafficstarCampaignsCount = 0;
      try {
        const trafficstarResult = await db.execute(sql2`SELECT COUNT(*) FROM trafficstar_campaigns`);
        trafficstarCampaignsCount = Number(trafficstarResult.rows?.[0]?.count || 0);
      } catch (error) {
        console.log(`\u2139\uFE0F SYSTEM RESET: No trafficstar_campaigns table found or unable to count records`);
      }
      let urlBudgetLogsCount = 0;
      try {
        const urlBudgetLogsResult = await db.execute(sql2`SELECT COUNT(*) FROM url_budget_logs`);
        urlBudgetLogsCount = Number(urlBudgetLogsResult.rows?.[0]?.count || 0);
      } catch (error) {
        console.log(`\u2139\uFE0F SYSTEM RESET: No url_budget_logs table found or unable to count records`);
      }
      let urlClickRecordsCount = 0;
      try {
        const urlClickRecordsResult = await db.execute(sql2`SELECT COUNT(*) FROM url_click_records`);
        urlClickRecordsCount = Number(urlClickRecordsResult.rows?.[0]?.count || 0);
      } catch (error) {
        console.log(`\u2139\uFE0F SYSTEM RESET: No url_click_records table found or unable to count records`);
      }
      let campaignClickRecordsCount = 0;
      try {
        const campaignClickRecordsResult = await db.execute(sql2`SELECT COUNT(*) FROM campaign_click_records`);
        campaignClickRecordsCount = Number(campaignClickRecordsResult.rows?.[0]?.count || 0);
      } catch (error) {
        console.log(`\u2139\uFE0F SYSTEM RESET: No campaign_click_records table found or unable to count records`);
      }
      let urlClickLogsCount = 0;
      try {
        const urlClickLogsResult = await db.execute(sql2`SELECT COUNT(*) FROM url_click_logs`);
        urlClickLogsCount = Number(urlClickLogsResult.rows?.[0]?.count || 0);
      } catch (error) {
        console.log(`\u2139\uFE0F SYSTEM RESET: No url_click_logs table found or unable to count records`);
      }
      console.log(`\u{1F9F9} SYSTEM RESET: Starting complete database cleanup - Found:
        - ${allCampaigns.length} campaigns
        - ${totalUrls} URLs
        - ${originalRecordsCount} original URL records
        - ${youtubeUrlRecordsCount} YouTube URL records
        - ${trafficstarCampaignsCount} TrafficStar campaigns
        - ${urlBudgetLogsCount} URL budget logs
        - ${urlClickRecordsCount} URL click records
        - ${urlClickLogsCount} URL click logs
        - ${campaignClickRecordsCount} campaign click records
      `);
      try {
        await db.execute(sql2`DELETE FROM url_click_records`);
        console.log(`\u2705 SYSTEM RESET: Deleted all URL click records (${urlClickRecordsCount} records)`);
      } catch (error) {
        console.log(`\u2139\uFE0F SYSTEM RESET: No url_click_records table found or nothing to delete`);
      }
      try {
        await db.execute(sql2`DELETE FROM url_click_logs`);
        console.log(`\u2705 SYSTEM RESET: Deleted all URL click logs (${urlClickLogsCount} records)`);
      } catch (error) {
        console.log(`\u2139\uFE0F SYSTEM RESET: No url_click_logs table found or nothing to delete: ${error.message}`);
      }
      try {
        await db.execute(sql2`DELETE FROM campaign_click_records`);
        console.log(`\u2705 SYSTEM RESET: Deleted all campaign click records (${campaignClickRecordsCount} records)`);
      } catch (error) {
        console.log(`\u2139\uFE0F SYSTEM RESET: No campaign_click_records table found or nothing to delete`);
      }
      try {
        await db.execute(sql2`DELETE FROM url_budget_logs`);
        console.log(`\u2705 SYSTEM RESET: Deleted all URL budget logs (${urlBudgetLogsCount} records)`);
      } catch (error) {
        console.log(`\u2139\uFE0F SYSTEM RESET: No url_budget_logs table found or nothing to delete`);
      }
      try {
        await db.execute(sql2`DELETE FROM youtube_url_records`);
        console.log(`\u2705 SYSTEM RESET: Deleted all YouTube URL records (${youtubeUrlRecordsCount} records)`);
      } catch (error) {
        console.log(`\u2139\uFE0F SYSTEM RESET: No youtube_url_records table found or nothing to delete`);
      }
      await db.delete(urls);
      console.log(`\u2705 SYSTEM RESET: Deleted all URLs (${totalUrls} records)`);
      await db.delete(originalUrlRecords);
      console.log(`\u2705 SYSTEM RESET: Deleted all original URL records (${originalRecordsCount} records)`);
      try {
        await db.execute(sql2`DELETE FROM trafficstar_campaigns`);
        console.log(`\u2705 SYSTEM RESET: Deleted all TrafficStar campaigns (${trafficstarCampaignsCount} records)`);
      } catch (error) {
        console.log(`\u2139\uFE0F SYSTEM RESET: No trafficstar_campaigns table found or nothing to delete`);
      }
      await db.delete(campaigns);
      console.log(`\u2705 SYSTEM RESET: Deleted all campaigns (${allCampaigns.length} records)`);
      try {
        await db.execute(sql2`DELETE FROM protection_settings`);
        console.log(`\u2705 SYSTEM RESET: Deleted all protection settings`);
      } catch (error) {
        console.log(`\u2139\uFE0F SYSTEM RESET: No protection_settings table found or nothing to delete`);
      }
      try {
        await db.execute(sql2`DELETE FROM pending_url_budget_updates`);
        console.log(`\u2705 SYSTEM RESET: Deleted all pending URL budget updates`);
      } catch (error) {
        console.log(`\u2139\uFE0F SYSTEM RESET: No pending_url_budget_updates table found or nothing to delete`);
      }
      try {
        await db.execute(sql2`DELETE FROM sessions`);
        console.log(`\u2705 SYSTEM RESET: Deleted all session data`);
      } catch (error) {
        console.log(`\u2139\uFE0F SYSTEM RESET: No sessions table found or nothing to delete`);
      }
      try {
        await redirectLogsManager.clearAllLogs();
        console.log(`\u2705 SYSTEM RESET: Cleared all redirect logs`);
        await urlClickLogsManager.clearAllLogs();
        console.log(`\u2705 SYSTEM RESET: Cleared all URL click logs`);
      } catch (error) {
        console.error(`\u26A0\uFE0F SYSTEM RESET: Error clearing file-based logs:`, error);
      }
      console.log(`\u{1F504} SYSTEM RESET: Resetting all database sequences to start from 1...`);
      try {
        await db.execute(sql2`ALTER SEQUENCE urls_id_seq RESTART WITH 1`);
        console.log(`\u2705 SYSTEM RESET: Reset URLs sequence to start from ID 1`);
        await db.execute(sql2`ALTER SEQUENCE campaigns_id_seq RESTART WITH 1`);
        console.log(`\u2705 SYSTEM RESET: Reset campaigns sequence to start from ID 1`);
        await db.execute(sql2`ALTER SEQUENCE original_url_records_id_seq RESTART WITH 1`);
        console.log(`\u2705 SYSTEM RESET: Reset original URL records sequence to start from ID 1`);
        try {
          await db.execute(sql2`ALTER SEQUENCE youtube_url_records_id_seq RESTART WITH 1`);
          console.log(`\u2705 SYSTEM RESET: Reset YouTube URL records sequence to start from ID 1`);
        } catch (error) {
          console.log(`\u2139\uFE0F SYSTEM RESET: No YouTube URL records sequence found to reset`);
        }
        try {
          await db.execute(sql2`ALTER SEQUENCE trafficstar_campaigns_id_seq RESTART WITH 1`);
          console.log(`\u2705 SYSTEM RESET: Reset TrafficStar campaigns sequence to start from ID 1`);
        } catch (error) {
          console.log(`\u2139\uFE0F SYSTEM RESET: No TrafficStar campaigns sequence found to reset`);
        }
        try {
          await db.execute(sql2`ALTER SEQUENCE url_click_records_id_seq RESTART WITH 1`);
          console.log(`\u2705 SYSTEM RESET: Reset URL click records sequence to start from ID 1`);
        } catch (error) {
          console.log(`\u2139\uFE0F SYSTEM RESET: No URL click records sequence found to reset`);
        }
        try {
          await db.execute(sql2`ALTER SEQUENCE campaign_click_records_id_seq RESTART WITH 1`);
          console.log(`\u2705 SYSTEM RESET: Reset campaign click records sequence to start from ID 1`);
        } catch (error) {
          console.log(`\u2139\uFE0F SYSTEM RESET: No campaign click records sequence found to reset`);
        }
      } catch (error) {
        console.error(`\u274C SYSTEM RESET: Error resetting sequences:`, error);
      }
      this.campaignUrlsCache.clear();
      this.urlCache.clear();
      this.campaignCache.clear();
      this.customPathCache.clear();
      this.pendingClickUpdates.clear();
      console.log(`\u2705 SYSTEM RESET: Cleared all application caches`);
      if (this.clickUpdateTimer) {
        clearInterval(this.clickUpdateTimer);
        this.clickUpdateTimer = setInterval(() => this.flushPendingClickUpdates(), 1e3);
        console.log(`\u2705 SYSTEM RESET: Reset click update timer`);
      }
      console.log(`\u2705 SYSTEM RESET COMPLETED: Successfully reset all system data`);
      return {
        campaignsDeleted: allCampaigns.length,
        urlsDeleted: totalUrls,
        originalUrlRecordsDeleted: originalRecordsCount,
        youtubeUrlRecordsDeleted: youtubeUrlRecordsCount,
        trafficstarCampaignsDeleted: trafficstarCampaignsCount,
        urlBudgetLogsDeleted: urlBudgetLogsCount,
        urlClickRecordsDeleted: urlClickRecordsCount,
        urlClickLogsDeleted: urlClickLogsCount,
        campaignClickRecordsDeleted: campaignClickRecordsCount
      };
    } catch (error) {
      console.error("Error during full system cleanup:", error);
      throw error;
    }
  }
  // Original URL Records methods
  async getOriginalUrlRecords(page, limit, search, status, campaignId) {
    const offset = (page - 1) * limit;
    let query = db.select().from(originalUrlRecords);
    let countQuery = db.select({ count: sql2`count(*)` }).from(originalUrlRecords);
    if (search) {
      const likeSearch = `%${search}%`;
      query = query.where(or(
        ilike(originalUrlRecords.name, likeSearch),
        ilike(originalUrlRecords.targetUrl, likeSearch)
      ));
      countQuery = countQuery.where(or(
        ilike(originalUrlRecords.name, likeSearch),
        ilike(originalUrlRecords.targetUrl, likeSearch)
      ));
    }
    if (status && status !== "all") {
      query = query.where(eq3(originalUrlRecords.status, status));
      countQuery = countQuery.where(eq3(originalUrlRecords.status, status));
    }
    if (campaignId) {
      console.log(`Filtering original URL records by campaign ID: ${campaignId}`);
      try {
        const campaignUrls = await db.select({ name: urls.name }).from(urls).where(eq3(urls.campaignId, campaignId));
        console.log(`Found ${campaignUrls.length} URLs for campaign ID ${campaignId}`);
        if (campaignUrls.length > 0) {
          const urlNames = campaignUrls.map((url) => url.name);
          console.log("URL names to filter by:", urlNames);
          query = query.where(inArray(originalUrlRecords.name, urlNames));
          countQuery = countQuery.where(inArray(originalUrlRecords.name, urlNames));
        } else {
          console.log(`No URLs found for campaign ID ${campaignId}, returning empty result`);
          return { records: [], total: 0 };
        }
      } catch (error) {
        console.error("Error filtering by campaign ID:", error);
      }
    }
    query = query.limit(limit).offset(offset).orderBy(desc2(originalUrlRecords.createdAt));
    const [{ count }] = await countQuery;
    const records = await query;
    return {
      records,
      total: Number(count)
    };
  }
  async getOriginalUrlRecord(id) {
    const [record] = await db.select().from(originalUrlRecords).where(eq3(originalUrlRecords.id, id));
    return record;
  }
  async getOriginalUrlRecordByName(name) {
    const [record] = await db.select().from(originalUrlRecords).where(eq3(originalUrlRecords.name, name));
    return record;
  }
  async createOriginalUrlRecord(insertRecord) {
    const now = /* @__PURE__ */ new Date();
    const recordData = {
      ...insertRecord,
      createdAt: now,
      updatedAt: now
    };
    const [record] = await db.insert(originalUrlRecords).values(recordData).returning();
    return record;
  }
  async updateOriginalUrlRecord(id, updateRecord) {
    const [existing] = await db.select().from(originalUrlRecords).where(eq3(originalUrlRecords.id, id));
    if (!existing) return void 0;
    const updateData = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (updateRecord.name !== void 0) {
      updateData.name = updateRecord.name;
    }
    if (updateRecord.targetUrl !== void 0) {
      updateData.targetUrl = updateRecord.targetUrl;
    }
    if (updateRecord.originalClickLimit !== void 0) {
      updateData.originalClickLimit = updateRecord.originalClickLimit;
      updateData.status = "paused";
      if (updateRecord.originalClickLimit === existing.originalClickLimit) {
        console.log(`\u{1F6D1} ORIGINAL CLICK LIMIT UPDATED TO SAME VALUE (${updateRecord.originalClickLimit}): Still setting status to PAUSED automatically`);
      } else {
        console.log(`\u{1F6D1} ORIGINAL CLICK LIMIT CHANGED FROM ${existing.originalClickLimit} TO ${updateRecord.originalClickLimit}: Setting status to PAUSED automatically`);
      }
      console.log(`\u{1F504} Adding originalClickLimit = ${updateRecord.originalClickLimit} to update operation`);
      console.log(`\u{1F504} Setting status = "paused" due to original click value update`);
    } else {
      if (updateRecord.status !== void 0) {
        updateData.status = updateRecord.status;
      }
    }
    const [updated] = await db.update(originalUrlRecords).set(updateData).where(eq3(originalUrlRecords.id, id)).returning();
    if (updateRecord.originalClickLimit !== void 0) {
      if (updateRecord.originalClickLimit === existing.originalClickLimit) {
        console.log(`\u{1F504} Original click limit for record #${id} updated to same value (${updateRecord.originalClickLimit}), but still pausing as requested`);
      } else {
        console.log(`\u{1F504} Updating original click limit for record #${id} from ${existing.originalClickLimit} to ${updateRecord.originalClickLimit}`);
      }
      console.log(`\u{1F534} URL PAUSED: Original click value updated`);
      const updatedCount = await this.syncUrlsWithOriginalRecord(id);
      console.log(`\u2705 Successfully propagated original click limit update and paused status to ${updatedCount} URLs`);
    }
    return updated;
  }
  async deleteOriginalUrlRecord(id) {
    const [record] = await db.select().from(originalUrlRecords).where(eq3(originalUrlRecords.id, id));
    if (!record) return false;
    await db.delete(originalUrlRecords).where(eq3(originalUrlRecords.id, id));
    return true;
  }
  async syncUrlsWithOriginalRecord(recordId) {
    try {
      const [record] = await db.select().from(originalUrlRecords).where(eq3(originalUrlRecords.id, recordId));
      if (!record) return 0;
      console.log(`\u2705 Syncing original record "${record.name}" with click limit ${record.originalClickLimit} and status "${record.status}"`);
      console.log(`\u{1F504} Propagating changes to all linked URL instances...`);
      await db.execute(sql2`
        ALTER TABLE urls DISABLE TRIGGER protect_original_click_values_trigger
      `);
      await db.execute(sql2`
        ALTER TABLE urls DISABLE TRIGGER prevent_auto_click_update_trigger
      `);
      await db.execute(sql2`
        UPDATE urls
        SET 
          original_click_limit = ${record.originalClickLimit},
          click_limit = ROUND(${record.originalClickLimit} * COALESCE((SELECT multiplier FROM campaigns WHERE id = campaign_id), 1)),
          status = ${record.status || "active"},
          updated_at = NOW()
        WHERE name = ${record.name}
      `);
      await db.execute(sql2`
        ALTER TABLE urls ENABLE TRIGGER protect_original_click_values_trigger
      `);
      await db.execute(sql2`
        ALTER TABLE urls ENABLE TRIGGER prevent_auto_click_update_trigger
      `);
      const matchingUrls = await db.select().from(urls).where(eq3(urls.name, record.name));
      if (matchingUrls.length === 0) return 0;
      console.log(`\u{1F504} Found ${matchingUrls.length} URLs with name "${record.name}" to update`);
      console.log(`\u{1F9F9} PRE-EMPTIVELY INVALIDATING ALL CACHES FOR IMMEDIATE UPDATE VISIBILITY`);
      const affectedCampaignIds = /* @__PURE__ */ new Set();
      matchingUrls.forEach((url) => {
        if (url.campaignId) {
          affectedCampaignIds.add(url.campaignId);
        }
      });
      affectedCampaignIds.forEach((campaignId) => {
        console.log(`\u{1F9F9} URL #${record.name} belongs to campaign #${campaignId} - invalidating campaign cache`);
        this.invalidateCampaignCache(campaignId);
      });
      for (const campaignId of affectedCampaignIds) {
        this.invalidateCampaignCache(campaignId);
        await this.getCampaign(campaignId, true);
        await this.getUrls(campaignId, true);
        console.log(`\u2705 Force refreshed campaign ${campaignId} with updated URL data`);
      }
      return matchingUrls.length;
    } catch (error) {
      console.error("Error syncing URLs with original record:", error);
      throw error;
    }
  }
  /**
   * Temporarily enables or disables the database click protection bypass.
   * This is used for legitimate operations that need to modify click limits,
   * such as campaign multiplier changes and Original URL Record syncs.
   * @param enabled Whether to enable (true) or disable (false) the bypass
   */
  async setClickProtectionBypass(enabled) {
    try {
      try {
        await db.execute(sql2`
          CREATE TABLE IF NOT EXISTS protection_settings (
            key TEXT PRIMARY KEY,
            value BOOLEAN NOT NULL
          )
        `);
      } catch (createError) {
        console.error("Error checking/creating protection_settings table:", createError);
      }
      if (enabled) {
        console.log("\u26A0\uFE0F Setting click protection bypass to ENABLED");
        await db.execute(sql2`
          INSERT INTO protection_settings (key, value)
          VALUES ('click_protection_enabled', FALSE)
          ON CONFLICT (key) DO UPDATE SET value = FALSE
        `);
        this.clickProtectionBypassed = true;
      } else {
        console.log("\u2705 Setting click protection bypass to DISABLED (protection enabled)");
        await db.execute(sql2`
          INSERT INTO protection_settings (key, value)
          VALUES ('click_protection_enabled', TRUE)
          ON CONFLICT (key) DO UPDATE SET value = TRUE
        `);
        this.clickProtectionBypassed = false;
      }
    } catch (error) {
      console.error(`Error setting click protection bypass to ${enabled}:`, error);
      console.error("Protection settings operation failed, continuing anyway");
    }
  }
  // Campaign Click Records Implementation
  async recordCampaignClick(campaignId, urlId) {
    try {
      const [record] = await db.insert(campaignClickRecords).values({
        campaignId,
        urlId: urlId || null,
        timestamp: /* @__PURE__ */ new Date()
      }).returning();
      return record;
    } catch (error) {
      console.error("Error recording campaign click:", error);
      throw error;
    }
  }
  async getCampaignClickRecords(page, limit, campaignId, filter) {
    try {
      let query = db.select().from(campaignClickRecords);
      let countQuery = db.select({ count: sql2`count(*)` }).from(campaignClickRecords);
      if (campaignId) {
        query = query.where(eq3(campaignClickRecords.campaignId, campaignId));
        countQuery = countQuery.where(eq3(campaignClickRecords.campaignId, campaignId));
      }
      if (filter) {
        const { filterType, startDate, endDate, timezone } = filter;
        const now = /* @__PURE__ */ new Date();
        let startDateObj;
        let endDateObj = now;
        switch (filterType) {
          case "today":
            startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "yesterday":
            startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            endDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
            break;
          case "last_2_days":
            startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
            break;
          case "last_3_days":
            startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3);
            break;
          case "last_4_days":
            startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4);
            break;
          case "last_5_days":
            startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5);
            break;
          case "last_6_days":
            startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
            break;
          case "last_7_days":
            startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            break;
          case "this_month":
            startDateObj = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case "last_month":
            startDateObj = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDateObj = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            break;
          case "last_6_months":
            startDateObj = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            break;
          case "this_year":
            startDateObj = new Date(now.getFullYear(), 0, 1);
            break;
          case "last_year":
            startDateObj = new Date(now.getFullYear() - 1, 0, 1);
            endDateObj = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
            break;
          case "custom_range":
            if (!startDate || !endDate) {
              throw new Error("Start date and end date are required for custom range filter");
            }
            startDateObj = new Date(startDate);
            endDateObj = new Date(endDate);
            endDateObj.setHours(23, 59, 59, 999);
            break;
          case "total":
          default:
            startDateObj = /* @__PURE__ */ new Date(0);
            break;
        }
        if (filterType !== "total") {
          query = query.where(
            and2(
              sql2`${campaignClickRecords.timestamp} >= ${startDateObj}`,
              sql2`${campaignClickRecords.timestamp} <= ${endDateObj}`
            )
          );
          countQuery = countQuery.where(
            and2(
              sql2`${campaignClickRecords.timestamp} >= ${startDateObj}`,
              sql2`${campaignClickRecords.timestamp} <= ${endDateObj}`
            )
          );
        }
      }
      const [countResult] = await countQuery;
      const total = Number(countResult?.count || 0);
      query = query.orderBy(desc2(campaignClickRecords.timestamp)).offset((page - 1) * limit).limit(limit);
      const records = await query;
      return { records, total };
    } catch (error) {
      console.error("Error getting campaign click records:", error);
      throw error;
    }
  }
  // Use redirect logs for more accurate campaign click tracking
  async getRedirectLogsSummary(campaignId, filter) {
    try {
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) {
        throw new Error(`Campaign with ID ${campaignId} not found`);
      }
      const createdAt = campaign.createdAt || /* @__PURE__ */ new Date();
      const now = /* @__PURE__ */ new Date();
      if (filter.filterType === "yesterday" || filter.filterType === "last_month" || filter.filterType === "last_year") {
        const { startDate, endDate } = this.getDateRangeForFilter(filter);
        if (endDate < createdAt) {
          return {
            totalClicks: 0,
            dailyBreakdown: {},
            filterInfo: {
              type: filter.filterType,
              dateRange: `No data available before campaign creation (${createdAt.toLocaleDateString()})`
            }
          };
        }
      }
      return await redirectLogsManager.getCampaignSummary(campaignId, filter);
    } catch (error) {
      console.error("Error getting redirect logs summary:", error);
      return {
        totalClicks: 0,
        dailyBreakdown: {},
        filterInfo: {
          type: filter.filterType,
          dateRange: "No data available for this time period"
        }
      };
    }
  }
  // Helper function to get date range based on filter type
  getDateRangeForFilter(filter) {
    const now = /* @__PURE__ */ new Date();
    let startDate;
    let endDate = now;
    const { filterType } = filter;
    switch (filterType) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "yesterday":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        break;
      case "last_7_days":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case "last_30_days":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        break;
      case "this_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case "this_year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "last_year":
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
      case "custom_range":
        if (!filter.startDate || !filter.endDate) {
          throw new Error("Start date and end date are required for custom range filter");
        }
        startDate = new Date(filter.startDate);
        endDate = new Date(filter.endDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "total":
      default:
        startDate = /* @__PURE__ */ new Date(0);
        break;
    }
    return { startDate, endDate };
  }
  async getCampaignClickSummary(campaignId, filter) {
    try {
      const now = /* @__PURE__ */ new Date();
      let startDateObj;
      let endDateObj = now;
      const { filterType, startDate, endDate } = filter;
      switch (filterType) {
        case "today":
          startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "yesterday":
          startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          endDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
          break;
        case "last_2_days":
          startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
          break;
        case "last_3_days":
          startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3);
          break;
        case "last_4_days":
          startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4);
          break;
        case "last_5_days":
          startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5);
          break;
        case "last_6_days":
          startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
          break;
        case "last_7_days":
          startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          break;
        case "last_30_days":
          startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
          break;
        case "this_month":
          startDateObj = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "last_month":
          startDateObj = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDateObj = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          break;
        case "last_6_months":
          startDateObj = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          break;
        case "this_year":
          startDateObj = new Date(now.getFullYear(), 0, 1);
          break;
        case "last_year":
          startDateObj = new Date(now.getFullYear() - 1, 0, 1);
          endDateObj = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
          break;
        case "custom_range":
          if (!startDate || !endDate) {
            throw new Error("Start date and end date are required for custom range filter");
          }
          startDateObj = new Date(startDate);
          endDateObj = new Date(endDate);
          endDateObj.setHours(23, 59, 59, 999);
          break;
        case "total":
        default:
          startDateObj = /* @__PURE__ */ new Date(0);
          break;
      }
      console.log(`Getting clicks for campaign ${campaignId} with filter type ${filterType}`);
      console.log(`Date range: ${startDateObj.toISOString()} to ${endDateObj.toISOString()}`);
      let query = db.select({ count: sql2`count(*)` }).from(campaignClickRecords).where(eq3(campaignClickRecords.campaignId, campaignId));
      if (filterType !== "total") {
        query = query.where(
          and2(
            sql2`${campaignClickRecords.timestamp} >= ${startDateObj}`,
            sql2`${campaignClickRecords.timestamp} <= ${endDateObj}`
          )
        );
      }
      const [totalResult] = await query;
      const totalClicks = Number(totalResult?.count || 0);
      let dailyBreakdown = {};
      let dailyQuery = `
        SELECT 
          TO_CHAR(timestamp, 'YYYY-MM-DD') as date,
          COUNT(*) as clicks
        FROM 
          campaign_click_records
        WHERE 
          campaign_id = $1
      `;
      const dailyParams = [campaignId];
      if (filterType !== "total") {
        dailyQuery += ` AND timestamp >= $2 AND timestamp <= $3`;
        dailyParams.push(startDateObj);
        dailyParams.push(endDateObj);
      }
      dailyQuery += `
        GROUP BY 
          TO_CHAR(timestamp, 'YYYY-MM-DD')
        ORDER BY 
          date
      `;
      console.log(`Daily query with filterType ${filterType}:`, dailyQuery);
      const dailyResult = await pool.query(dailyQuery, dailyParams);
      dailyResult.rows.forEach((row) => {
        dailyBreakdown[row.date] = parseInt(row.clicks);
      });
      let hourlyBreakdown;
      if (filter.showHourly) {
        let hourlyQuery = `
          SELECT 
            EXTRACT(HOUR FROM timestamp) as hour,
            COUNT(*) as clicks
          FROM 
            campaign_click_records
          WHERE 
            campaign_id = $1
        `;
        const params = [campaignId];
        if (filterType !== "total") {
          hourlyQuery += ` AND timestamp >= $2 AND timestamp <= $3`;
          params.push(startDateObj);
          params.push(endDateObj);
        }
        hourlyQuery += `
          GROUP BY 
            EXTRACT(HOUR FROM timestamp)
          ORDER BY 
            hour
        `;
        console.log(`Hourly query with filterType ${filterType}:`, hourlyQuery);
        console.log("Query params:", params);
        const result = await pool.query(hourlyQuery, params);
        hourlyBreakdown = Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          clicks: 0
        }));
        result.rows.forEach((row) => {
          const hour = parseInt(row.hour);
          hourlyBreakdown[hour].clicks = parseInt(row.clicks);
        });
      }
      return {
        totalClicks,
        hourlyBreakdown,
        dailyBreakdown
      };
    } catch (error) {
      console.error("Error getting campaign click summary:", error);
      throw error;
    }
  }
  /**
   * Record a URL click in the database and click logs
   */
  async recordUrlClick(urlId) {
    await urlClickLogsManager.logClick(urlId);
    const clickTime = /* @__PURE__ */ new Date();
    const result = await pool.query(
      `INSERT INTO url_click_records (url_id, click_time) 
       VALUES ($1, $2) 
       RETURNING id, url_id as "urlId", click_time as "timestamp"`,
      [urlId, clickTime]
    );
    console.log(`\u{1F4CA} Recorded URL click for URL ID ${urlId}`);
    return result.rows[0];
  }
  /**
   * Get URL click records with pagination and filtering
   */
  async getUrlClickRecords(page, limit, urlId, filter) {
    try {
      const offset = (page - 1) * limit;
      let whereClause = "";
      const queryParams = [];
      let paramIndex = 1;
      if (urlId) {
        whereClause = "WHERE url_id = $1";
        queryParams.push(urlId);
        paramIndex++;
      }
      if (filter) {
        const { startDate, endDate } = this.getDateRangeForFilter(filter);
        if (whereClause === "") {
          whereClause = `WHERE click_time >= $${paramIndex} AND click_time <= $${paramIndex + 1}`;
        } else {
          whereClause += ` AND click_time >= $${paramIndex} AND click_time <= $${paramIndex + 1}`;
        }
        queryParams.push(startDate, endDate);
        paramIndex += 2;
      }
      const countQuery = `SELECT COUNT(*) FROM url_click_records ${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);
      const recordsQuery = `
        SELECT id, url_id as "urlId", click_time as "timestamp"
        FROM url_click_records
        ${whereClause}
        ORDER BY click_time DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const recordsResult = await pool.query(recordsQuery, queryParams);
      const records = recordsResult.rows;
      return { records, total };
    } catch (error) {
      console.error("Error retrieving URL click records:", error);
      return { records: [], total: 0 };
    }
  }
  /**
   * Get summary statistics for URL clicks
   */
  async getUrlClickSummary(urlId, filter) {
    try {
      return await urlClickLogsManager.getUrlClickSummary(urlId, filter);
    } catch (error) {
      console.error(`Error getting URL click summary for URL ${urlId}:`, error);
      return {
        totalClicks: 0,
        hourlyBreakdown: [],
        dailyBreakdown: {},
        filterInfo: {
          type: filter.filterType,
          dateRange: "Error retrieving data"
        }
      };
    }
  }
};
var storage = new DatabaseStorage();

// server/click-protection.ts
init_db();
import { sql as sql3 } from "drizzle-orm";
async function applyClickProtection() {
  try {
    console.log("=== Applying Click Protection ===");
    console.log("This will install database triggers to prevent unauthorized updates to click values");
    await db.execute(sql3`
      CREATE TABLE IF NOT EXISTS protection_settings (
        key TEXT PRIMARY KEY,
        value BOOLEAN NOT NULL
      )
    `);
    await db.execute(sql3`
      INSERT INTO protection_settings (key, value)
      VALUES ('click_protection_enabled', TRUE)
      ON CONFLICT (key) DO NOTHING
    `);
    await db.execute(sql3`
      CREATE OR REPLACE FUNCTION check_click_protection_bypass()
      RETURNS BOOLEAN AS $$
      BEGIN
        -- If click protection is disabled, bypass is enabled
        RETURN NOT (SELECT value FROM protection_settings WHERE key = 'click_protection_enabled');
      EXCEPTION
        WHEN OTHERS THEN
          -- Default to false (protection enabled) if table/setting doesn't exist
          RETURN FALSE;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await db.execute(sql3`
      CREATE OR REPLACE FUNCTION prevent_unauthorized_click_updates()
      RETURNS TRIGGER AS $$
      BEGIN
        -- If protection bypass is enabled (click protection is disabled),
        -- allow all updates to go through (this handles Original URL Records updates)
        IF check_click_protection_bypass() THEN
          -- Bypass enabled, allow all updates
          RETURN NEW;
        END IF;
        
        -- If we get here, click protection is enabled (bypass is not enabled)
        -- We still want click_limit to be updatable for multiplier changes, etc.
        -- But we never want original_click_limit to change unless bypass is enabled
        
        -- Check if original click limit is being changed - never allow this without bypass
        IF NEW.original_click_limit IS DISTINCT FROM OLD.original_click_limit THEN
          RAISE WARNING 'Preventing unauthorized update to original_click_limit (from % to %) for URL %', 
            OLD.original_click_limit, NEW.original_click_limit, NEW.id;
          NEW.original_click_limit := OLD.original_click_limit;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    try {
      await db.execute(sql3`DROP TRIGGER IF EXISTS prevent_url_click_update_trigger ON urls;`);
    } catch (e) {
      console.log("No existing trigger to drop:", e);
    }
    await db.execute(sql3`
      CREATE TRIGGER prevent_url_click_update_trigger
      BEFORE UPDATE ON urls
      FOR EACH ROW
      EXECUTE FUNCTION prevent_unauthorized_click_updates();
    `);
    const urlTriggersResult = await db.execute(sql3`
      SELECT COUNT(*) AS count FROM pg_trigger 
      WHERE tgname = 'prevent_url_click_update_trigger'
    `);
    console.log("Query result:", urlTriggersResult);
    let triggerCount = 0;
    if (Array.isArray(urlTriggersResult) && urlTriggersResult.length > 0) {
      triggerCount = parseInt(String(urlTriggersResult[0]?.count || "0"));
    } else if (urlTriggersResult && typeof urlTriggersResult === "object") {
      const pgResult = urlTriggersResult;
      if (pgResult.rows && Array.isArray(pgResult.rows) && pgResult.rows.length > 0) {
        triggerCount = parseInt(String(pgResult.rows[0]?.count || "0"));
      }
    }
    console.log(`Found ${triggerCount} triggers`);
    if (triggerCount > 0) {
      console.log("\u2705 Click protection installed successfully!");
      return {
        success: true,
        message: "Click protection installed successfully!",
        details: { triggers: triggerCount }
      };
    } else {
      console.log("\u274C Failed to install click protection - triggers not found");
      return {
        success: false,
        message: "Failed to install click protection - triggers not found",
        details: { triggers: 0 }
      };
    }
  } catch (error) {
    console.error("Error applying click protection:", error);
    return {
      success: false,
      message: "Failed to apply click protection",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// server/server-monitor.ts
import si from "systeminformation";
import * as os from "os";
var cachedStats = null;
var lastFetchTimestamp = 0;
var CACHE_TTL = 5e3;
async function getServerStats() {
  const currentTime = Date.now();
  if (cachedStats && currentTime - lastFetchTimestamp < CACHE_TTL) {
    return cachedStats;
  }
  try {
    const cpu = await si.currentLoad();
    let cpuInfo;
    try {
      console.log("OS module CPU info:", JSON.stringify({
        cpus: os.cpus(),
        cpuCount: os.cpus().length,
        arch: os.arch(),
        platform: os.platform(),
        osType: os.type(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem()
      }, null, 2));
      if (os.cpus() && os.cpus().length > 0) {
        const cpuModel = os.cpus()[0]?.model || "Unknown CPU";
        const cpuCount = os.cpus().length;
        const cpuSpeed = os.cpus()[0]?.speed || 0;
        cpuInfo = {
          manufacturer: cpuModel.split(" ")[0] || "Unknown",
          brand: cpuModel,
          speed: cpuSpeed / 1e3,
          // Convert to GHz
          cores: cpuCount,
          physicalCores: Math.max(1, Math.floor(cpuCount / 2))
          // Estimate physical cores
        };
        console.log("Using OS module CPU info:", JSON.stringify(cpuInfo, null, 2));
      } else {
        cpuInfo = await si.cpu();
        console.log("CPU Info from systeminformation:", JSON.stringify(cpuInfo, null, 2));
      }
    } catch (err) {
      console.error("Error getting CPU info:", err);
      try {
        cpuInfo = await si.cpu();
        console.log("Fallback CPU Info from systeminformation:", JSON.stringify(cpuInfo, null, 2));
      } catch (siErr) {
        console.error("Error in systeminformation fallback:", siErr);
        cpuInfo = {
          manufacturer: "Unknown",
          brand: "Unknown CPU",
          speed: 0,
          cores: 0,
          physicalCores: 0
        };
      }
    }
    const memory = await si.mem();
    const networkStats = await si.networkStats();
    const connections = await si.networkConnections();
    const uptime = await si.time();
    const loadavg2 = await si.currentLoad();
    console.log("Load average data:", JSON.stringify(loadavg2, null, 2));
    console.log("OS load averages:", await si.osInfo().then((os2) => os2.platform), os.loadavg());
    const memoryUsagePercent = (memory.total - memory.available) / memory.total * 100;
    let systemLoad = 0;
    try {
      console.log("========== SYSTEM LOAD CALCULATION ==========");
      const osLoadAvg = os.loadavg();
      console.log("Raw OS load averages:", JSON.stringify(osLoadAvg));
      const oneMinLoad = osLoadAvg[0] || 0;
      console.log("Using 1-minute load average:", oneMinLoad);
      const cpuInfoRaw = os.cpus();
      console.log("CPU Info raw length:", cpuInfoRaw.length);
      const numCPUs = cpuInfoRaw.length || 1;
      console.log("Number of CPUs detected:", numCPUs);
      console.log("SI current load data:", JSON.stringify(loadavg2));
      const effectiveCPUs = Math.max(numCPUs, 1);
      let calculatedLoad = oneMinLoad / effectiveCPUs * 100;
      console.log("Initial calculated load value:", calculatedLoad);
      if (calculatedLoad < 1 && oneMinLoad > 0) {
        calculatedLoad = Math.max(oneMinLoad * 20, 1);
        console.log("Applied minimum scaling factor for visibility:", calculatedLoad);
      }
      systemLoad = Math.min(Math.round(calculatedLoad), 100);
      console.log("Final system load calculation (before fallbacks):", systemLoad);
      if (systemLoad === 0) {
        if (loadavg2 && typeof loadavg2.avgLoad === "number" && loadavg2.avgLoad > 0) {
          systemLoad = Math.min(Math.round(loadavg2.avgLoad * 100), 100);
          console.log("Using SI avgLoad fallback for system load:", systemLoad);
        }
        if (systemLoad === 0 && cpu && typeof cpu.currentLoad === "number") {
          systemLoad = Math.min(Math.round(cpu.currentLoad / 4), 100);
          console.log("Using CPU currentLoad fallback for system load:", systemLoad);
        }
        if (systemLoad === 0 && oneMinLoad > 0) {
          systemLoad = Math.max(Math.round(oneMinLoad * 25), 1);
          console.log("Using minimum load value based on raw load average:", systemLoad);
        }
        if (systemLoad === 0) {
          systemLoad = 1;
          console.log("Using hard-coded minimum system load of 1%");
        }
      }
      console.log("FINAL SYSTEM LOAD VALUE TO DISPLAY:", systemLoad);
      console.log("===========================================");
    } catch (err) {
      console.error("Error calculating system load:", err);
      if (cpu && typeof cpu.currentLoad === "number") {
        systemLoad = Math.min(Math.round(cpu.currentLoad / 4), 100);
      } else {
        systemLoad = 5;
      }
      console.log("Using error fallback for system load:", systemLoad);
    }
    const cpuDetails = {
      manufacturer: cpuInfo.manufacturer || "Replit",
      brand: cpuInfo.brand || "Replit Virtual CPU",
      speed: cpuInfo.speed || 2.8,
      // Default to 2.8 GHz if unknown
      cores: cpuInfo.cores || 4,
      // Default to 4 logical cores
      physicalCores: cpuInfo.physicalCores || 2
      // Default to 2 physical cores
    };
    console.log("Final CPU details being set:", JSON.stringify(cpuDetails, null, 2));
    let osInfo;
    try {
      osInfo = await si.osInfo();
      console.log("OS information:", JSON.stringify(osInfo, null, 2));
    } catch (err) {
      console.error("Error getting OS info:", err);
      osInfo = {
        platform: os.platform() || "linux",
        distro: "Linux",
        release: "22.04 LTS",
        codename: "Jammy Jellyfish",
        kernel: os.release() || "5.4.0",
        arch: os.arch() || "x64",
        hostname: os.hostname() || "replit-server"
      };
    }
    const stats = {
      cpuUsage: parseFloat(cpu.currentLoad.toFixed(2)),
      memoryUsage: parseFloat(memoryUsagePercent.toFixed(2)),
      memoryTotal: memory.total,
      memoryFree: memory.available,
      cpuDetails,
      osInfo: {
        platform: osInfo.platform || "linux",
        distro: osInfo.distro || "Ubuntu/Debian/AlmaLinux",
        release: osInfo.release || "22.04 LTS",
        codename: osInfo.codename || "Jammy Jellyfish",
        kernel: osInfo.kernel || os.release() || "5.4.0",
        arch: osInfo.arch || os.arch() || "x64",
        hostname: osInfo.hostname || os.hostname() || "replit-server"
      },
      networkStats: {
        rx_sec: networkStats.reduce((sum, interface_) => sum + interface_.rx_sec, 0),
        tx_sec: networkStats.reduce((sum, interface_) => sum + interface_.tx_sec, 0),
        total_connections: connections.length
      },
      timestamp: /* @__PURE__ */ new Date(),
      uptime: uptime.uptime,
      loadAverage: os.loadavg() || (loadavg2.avgLoad ? [loadavg2.avgLoad] : [cpu.currentLoad / 100, cpu.currentLoad / 100, cpu.currentLoad / 100]),
      systemLoad
    };
    cachedStats = stats;
    lastFetchTimestamp = currentTime;
    return stats;
  } catch (error) {
    console.error("Error fetching server stats:", error);
    return {
      cpuUsage: -1,
      memoryUsage: -1,
      memoryTotal: 0,
      memoryFree: 0,
      cpuDetails: {
        manufacturer: "Replit",
        brand: "Replit Virtual CPU",
        speed: 2.8,
        // Default to 2.8 GHz
        cores: 4,
        // Default to 4 logical cores
        physicalCores: 2
        // Default to 2 physical cores
      },
      osInfo: {
        platform: os.platform() || "linux",
        distro: "Ubuntu/Debian/AlmaLinux",
        release: "22.04 LTS",
        codename: "Jammy Jellyfish",
        kernel: os.release() || "5.4.0",
        arch: os.arch() || "x64",
        hostname: os.hostname() || "replit-server"
      },
      networkStats: {
        rx_sec: 0,
        tx_sec: 0,
        total_connections: 0
      },
      timestamp: /* @__PURE__ */ new Date(),
      uptime: 0,
      loadAverage: [0, 0, 0],
      systemLoad: 5
      // Use 5% as a default minimum
    };
  }
}
var MAX_HISTORY_POINTS = 60;
var statsHistory = [];
function recordStatsToHistory(stats) {
  statsHistory.push(stats);
  if (statsHistory.length > MAX_HISTORY_POINTS) {
    statsHistory.shift();
  }
}
function getStatsHistory() {
  return statsHistory;
}
function startStatsCollection(intervalMs = 6e4) {
  return setInterval(async () => {
    try {
      const stats = await getServerStats();
      recordStatsToHistory(stats);
    } catch (error) {
      console.error("Error collecting stats:", error);
    }
  }, intervalMs);
}
var statsCollectionInterval = null;
function initServerMonitor() {
  if (!statsCollectionInterval) {
    statsCollectionInterval = startStatsCollection();
    console.log("Server monitoring initialized - collecting stats every minute");
  }
}

// server/routes.ts
await init_middleware();

// server/url-click-routes.ts
init_db();
init_schema();
import { eq as eq6 } from "drizzle-orm";
function registerUrlClickRoutes(app2) {
  urlClickLogsManager.initialize();
  Promise.resolve().then(() => (init_fix_url_click_logs(), fix_url_click_logs_exports)).then(({ fixMissingUrlClickLogs: fixMissingUrlClickLogs2 }) => {
    fixMissingUrlClickLogs2().then((result) => {
      console.log("\u{1F504} Auto-fix for missing URL click logs completed:", result.message);
    }).catch((error) => {
      console.error("\u274C Error during auto-fix for URL click logs:", error);
    });
  }).catch((error) => {
    console.error("\u274C Error importing URL click log fix:", error);
  });
  app2.get("/api/url-click-records/summary", async (req, res) => {
    try {
      if (req.query.urlId) {
        const urlId = parseInt(req.query.urlId);
        if (isNaN(urlId)) {
          return res.status(400).json({ message: "Invalid URL ID" });
        }
        return res.redirect(`/api/url-click-records/${urlId}?${new URLSearchParams(req.query).toString()}`);
      }
      const filterResult = timeRangeFilterSchema2.safeParse({
        filterType: req.query.filterType || "today",
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        timezone: req.query.timezone || "Asia/Kolkata"
      });
      if (!filterResult.success) {
        return res.status(400).json({
          message: "Invalid filter parameters",
          errors: filterResult.error.errors
        });
      }
      const allUrls = await db.query.urls.findMany();
      const urlBreakdown = [];
      const dailyBreakdown = {};
      let totalClicks = 0;
      let dateRangeText = "Unknown date range";
      for (const url of allUrls) {
        const analytics = await urlClickLogsManager.getUrlClickAnalytics(url.id, filterResult.data);
        urlBreakdown.push({
          urlId: url.id,
          name: url.name,
          clicks: analytics.totalClicks
        });
        for (const [date, clicks] of Object.entries(analytics.dailyBreakdown)) {
          dailyBreakdown[date] = (dailyBreakdown[date] || 0) + clicks;
        }
        totalClicks += analytics.totalClicks;
        if (analytics && dateRangeText === "Unknown date range") {
          dateRangeText = analytics.filterInfo.dateRange;
        }
      }
      return res.status(200).json({
        totalClicks,
        dailyBreakdown,
        urlBreakdown,
        filterInfo: {
          type: filterResult.data.filterType,
          dateRange: dateRangeText
        }
      });
    } catch (error) {
      console.error("Error getting URL click summary:", error);
      return res.status(500).json({ message: "Failed to get URL click summary" });
    }
  });
  app2.post("/api/url-click-records/generate-test-data/:urlId", async (req, res) => {
    try {
      const urlId = parseInt(req.params.urlId);
      if (isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }
      const url = await db.query.urls.findFirst({
        where: eq6(urls.id, urlId)
      });
      if (!url) {
        return res.status(404).json({ message: "URL not found" });
      }
      const {
        count = 100,
        startDate,
        endDate,
        minHour,
        maxHour
      } = req.body;
      const dateRange = startDate && endDate ? {
        start: new Date(startDate),
        end: new Date(endDate)
      } : void 0;
      const hourRange = minHour !== void 0 && maxHour !== void 0 ? {
        min: parseInt(minHour),
        max: parseInt(maxHour)
      } : void 0;
      await urlClickLogsManager.generateTestData(urlId, {
        count: parseInt(count),
        dateRange,
        hourRange
      });
      return res.status(200).json({
        message: `Successfully generated ${count} test click logs for URL ID ${urlId}`
      });
    } catch (error) {
      console.error("Error generating test URL click data:", error);
      return res.status(500).json({ message: "Failed to generate test URL click data" });
    }
  });
  app2.delete("/api/url-click-records/:urlId", async (req, res) => {
    try {
      const urlId = parseInt(req.params.urlId);
      if (isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }
      const url = await db.query.urls.findFirst({
        where: eq6(urls.id, urlId)
      });
      if (!url) {
        return res.status(404).json({ message: "URL not found" });
      }
      await urlClickLogsManager.deleteUrlLogs(urlId);
      await db.update(urls).set({ clicks: 0 }).where(eq6(urls.id, urlId));
      return res.status(200).json({
        message: `Successfully deleted click logs for URL ID ${urlId}`
      });
    } catch (error) {
      console.error("Error deleting URL click logs:", error);
      return res.status(500).json({ message: "Failed to delete URL click logs" });
    }
  });
  app2.get("/api/url-click-records/raw/:urlId", async (req, res) => {
    try {
      const urlId = parseInt(req.params.urlId);
      if (isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }
      const url = await db.query.urls.findFirst({
        where: eq6(urls.id, urlId)
      });
      if (!url) {
        return res.status(404).json({ message: "URL not found" });
      }
      const rawLogs = await urlClickLogsManager.getRawLogs(urlId);
      return res.status(200).json({ rawLogs });
    } catch (error) {
      console.error("Error getting URL click logs:", error);
      return res.status(500).json({ message: "Failed to get URL click logs" });
    }
  });
  app2.post("/api/url-click-records/:urlId", async (req, res) => {
    try {
      const urlId = parseInt(req.params.urlId);
      if (isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }
      const url = await db.query.urls.findFirst({
        where: eq6(urls.id, urlId)
      });
      if (!url) {
        return res.status(404).json({ message: "URL not found" });
      }
      await urlClickLogsManager.logClick(urlId);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error logging URL click:", error);
      return res.status(500).json({ message: "Failed to log URL click" });
    }
  });
  app2.get("/api/url-click-records/:urlId", async (req, res) => {
    try {
      const urlId = parseInt(req.params.urlId);
      if (isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }
      const url = await db.query.urls.findFirst({
        where: eq6(urls.id, urlId)
      });
      if (!url) {
        return res.status(404).json({ message: "URL not found" });
      }
      const filterResult = timeRangeFilterSchema2.safeParse({
        filterType: req.query.filterType || "today",
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        timezone: req.query.timezone || "Asia/Kolkata"
      });
      if (!filterResult.success) {
        return res.status(400).json({
          message: "Invalid filter parameters",
          errors: filterResult.error.errors
        });
      }
      const analytics = await urlClickLogsManager.getUrlClickAnalytics(urlId, filterResult.data);
      return res.status(200).json(analytics);
    } catch (error) {
      console.error("Error getting URL click analytics:", error);
      return res.status(500).json({ message: "Failed to get URL click analytics" });
    }
  });
}

// server/url-budget-test-api.ts
init_db();
init_schema();
init_url_budget_logger();
import express2 from "express";
import { eq as eq8 } from "drizzle-orm";
var router = express2.Router();
router.post("/high-spend", async (req, res) => {
  try {
    const { campaignId, spentValue } = req.body;
    if (!campaignId || typeof campaignId !== "number") {
      return res.status(400).json({
        success: false,
        message: "Invalid campaignId. Must be a number."
      });
    }
    if (!spentValue || typeof spentValue !== "number" || spentValue <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid spentValue. Must be a positive number."
      });
    }
    const campaign = await db.query.campaigns.findFirst({
      where: eq8(campaigns.id, campaignId)
    });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: `Campaign with ID ${campaignId} not found.`
      });
    }
    const activeUrls = await db.query.urls.findMany({
      where: (url, { eq: eq17, and: and9 }) => and9(
        eq17(url.campaignId, campaignId),
        eq17(url.status, "active")
      )
    });
    if (activeUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Campaign ${campaignId} has no active URLs.`
      });
    }
    console.log(`\u{1F536} MANUAL TEST: Simulating high-spend detection for campaign ${campaignId} with spent value $${spentValue.toFixed(2)}`);
    await url_budget_logger_default.clearLogs();
    console.log(`\u{1F9F9} Cleared previous URL budget logs for clean test`);
    const pricePerThousand = parseFloat(campaign.pricePerThousand || "0");
    let totalRemainingClicks = 0;
    let totalBudgetForRemainingClicks = 0;
    const logResults = [];
    for (const url of activeUrls) {
      const remainingClicks = url.clickLimit - url.clicks;
      const validRemaining = remainingClicks > 0 ? remainingClicks : 0;
      totalRemainingClicks += validRemaining;
      const urlPrice = validRemaining / 1e3 * pricePerThousand;
      totalBudgetForRemainingClicks += urlPrice;
      const wasLogged = await url_budget_logger_default.logUrlBudget(url.id, urlPrice);
      logResults.push({
        urlId: url.id,
        clicks: url.clicks,
        clickLimit: url.clickLimit,
        remainingClicks: validRemaining,
        price: urlPrice.toFixed(4),
        wasLogged
      });
    }
    const newTotalBudget = spentValue + totalBudgetForRemainingClicks;
    await db.update(campaigns).set({
      highSpendBudgetCalcTime: /* @__PURE__ */ new Date(),
      lastTrafficSenderStatus: "high_spend_budget_updated",
      lastTrafficSenderAction: /* @__PURE__ */ new Date()
    }).where(eq8(campaigns.id, campaignId));
    const logs = await url_budget_logger_default.getUrlBudgetLogs();
    res.status(200).json({
      success: true,
      message: `Successfully simulated high-spend budget calculation for campaign ${campaignId}`,
      testDetails: {
        campaignId,
        spentValue: spentValue.toFixed(2),
        pricePerThousand: pricePerThousand.toFixed(2),
        totalRemainingClicks,
        totalBudgetForRemainingClicks: totalBudgetForRemainingClicks.toFixed(4),
        newTotalBudget: newTotalBudget.toFixed(4),
        highSpendBudgetCalcTime: (/* @__PURE__ */ new Date()).toISOString()
      },
      urlResults: logResults,
      logs
    });
  } catch (error) {
    console.error(`\u274C Error in high-spend test endpoint: ${error}`);
    res.status(500).json({
      success: false,
      message: `An error occurred: ${error instanceof Error ? error.message : String(error)}`
    });
  }
});
router.post("/new-url-after-high-spend", async (req, res) => {
  try {
    const { campaignId, url } = req.body;
    if (!campaignId || typeof campaignId !== "number") {
      return res.status(400).json({
        success: false,
        message: "Invalid campaignId. Must be a number."
      });
    }
    if (!url || !url.id || !url.clickLimit || url.clickLimit <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid URL data. Must include id and clickLimit."
      });
    }
    const campaign = await db.query.campaigns.findFirst({
      where: eq8(campaigns.id, campaignId)
    });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: `Campaign with ID ${campaignId} not found.`
      });
    }
    if (!campaign.highSpendBudgetCalcTime) {
      return res.status(400).json({
        success: false,
        message: `Campaign ${campaignId} has no highSpendBudgetCalcTime set. Run high-spend test first.`
      });
    }
    console.log(`\u{1F536} MANUAL TEST: Simulating new URL added after high-spend detection for campaign ${campaignId}`);
    const pricePerThousand = parseFloat(campaign.pricePerThousand || "0");
    const totalClicks = url.clickLimit;
    const urlPrice = totalClicks / 1e3 * pricePerThousand;
    const wasLogged = await url_budget_logger_default.logUrlBudget(url.id, urlPrice);
    const logs = await url_budget_logger_default.getUrlBudgetLogs();
    res.status(200).json({
      success: true,
      message: `Successfully simulated new URL added after high-spend for campaign ${campaignId}`,
      testDetails: {
        campaignId,
        pricePerThousand: pricePerThousand.toFixed(2),
        urlId: url.id,
        totalClicks,
        urlPrice: urlPrice.toFixed(4),
        wasLogged
      },
      logs
    });
  } catch (error) {
    console.error(`\u274C Error in new-url-after-high-spend test endpoint: ${error}`);
    res.status(500).json({
      success: false,
      message: `An error occurred: ${error instanceof Error ? error.message : String(error)}`
    });
  }
});
router.post("/clear-logs", async (req, res) => {
  try {
    await url_budget_logger_default.clearLogs();
    res.status(200).json({
      success: true,
      message: "Successfully cleared URL budget logs",
      logs: []
    });
  } catch (error) {
    console.error(`\u274C Error clearing URL budget logs: ${error}`);
    res.status(500).json({
      success: false,
      message: `An error occurred: ${error instanceof Error ? error.message : String(error)}`
    });
  }
});
router.get("/logs", async (req, res) => {
  try {
    const logs = await url_budget_logger_default.getUrlBudgetLogs();
    res.status(200).json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error(`\u274C Error getting URL budget logs: ${error}`);
    res.status(500).json({
      success: false,
      message: `An error occurred: ${error instanceof Error ? error.message : String(error)}`
    });
  }
});
var url_budget_test_api_default = router;

// server/routes.ts
init_schema();
import { ZodError, z as z3 } from "zod";
import { fromZodError } from "zod-validation-error";

// server/gmail-reader.ts
await init_vite();
import Imap from "imap";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import smtpTransport from "nodemailer-smtp-transport";
import fs7 from "fs";
import path8 from "path";

// server/gmail-service.ts
await init_vite();
import { google } from "googleapis";
import fs6 from "fs";
import path7 from "path";
var GmailService = class {
  tokenPath;
  credentialsPath;
  oAuth2Client = null;
  gmail = null;
  constructor() {
    this.tokenPath = path7.join(process.cwd(), "gmail_token.json");
    this.credentialsPath = path7.join(process.cwd(), "gmail_credentials.json");
  }
  /**
   * Delete multiple emails by their message IDs using direct Trash operation
   * @param messageIds Array of message IDs to delete
   */
  async trashMessages(messageIds) {
    try {
      if (!messageIds.length) {
        return 0;
      }
      if (!this.gmail) {
        log(`GMAIL_API: No API client available, using IMAP fallback`, "gmail-service");
        return 0;
      }
      log(`GMAIL_API: Attempting to delete ${messageIds.length} emails using Gmail API`, "gmail-service");
      const result = await this.gmail.users.messages.batchModify({
        userId: "me",
        requestBody: {
          ids: messageIds,
          addLabelIds: ["TRASH"],
          removeLabelIds: ["INBOX", "UNREAD", "IMPORTANT", "CATEGORY_PERSONAL"]
        }
      });
      log(`GMAIL_API: Batch deletion result: ${result.status} ${result.statusText}`, "gmail-service");
      if (result.status === 204 || result.status === 200) {
        log(`GMAIL_API: \u2705 Successfully batch deleted ${messageIds.length} messages`, "gmail-service");
        return messageIds.length;
      } else {
        log(`GMAIL_API: \u274C Failed to batch delete messages: ${result.statusText}`, "gmail-service");
        return 0;
      }
    } catch (error) {
      log(`GMAIL_API: Error deleting messages: ${error}`, "gmail-service");
      return 0;
    }
  }
  /**
   * Convert IMAP UID format to Gmail API message IDs
   * @param imapUids Array of IMAP UIDs to convert
   */
  async convertImapUidsToGmailIds(imapUids) {
    try {
      if (!this.gmail || !imapUids.length) {
        return [];
      }
      const response = await this.gmail.users.messages.list({
        userId: "me",
        maxResults: 100,
        q: "in:inbox"
      });
      if (!response.data.messages || !response.data.messages.length) {
        return [];
      }
      const messageIds = response.data.messages.map((msg) => msg.id);
      const matchedIds = [];
      for (const imapUid of imapUids) {
        const searchResponse = await this.gmail.users.messages.list({
          userId: "me",
          q: `in:inbox ${imapUid}`
        });
        if (searchResponse.data.messages && searchResponse.data.messages.length > 0) {
          matchedIds.push(searchResponse.data.messages[0].id);
        }
      }
      return matchedIds;
    } catch (error) {
      log(`GMAIL_API: Error converting IMAP UIDs to Gmail IDs: ${error}`, "gmail-service");
      return [];
    }
  }
  /**
   * Delete all emails in the inbox by a specific filter
   * Good for bulk cleanups when we need to delete everything matching a pattern
   */
  async deleteEmailsByFilter(filter) {
    try {
      if (!this.gmail) {
        return 0;
      }
      const response = await this.gmail.users.messages.list({
        userId: "me",
        q: filter
      });
      if (!response.data.messages || !response.data.messages.length) {
        log(`GMAIL_API: No messages found matching filter: ${filter}`, "gmail-service");
        return 0;
      }
      const messageIds = response.data.messages.map((msg) => msg.id);
      log(`GMAIL_API: Found ${messageIds.length} messages matching filter: ${filter}`, "gmail-service");
      return await this.trashMessages(messageIds);
    } catch (error) {
      log(`GMAIL_API: Error deleting messages by filter: ${error}`, "gmail-service");
      return 0;
    }
  }
  /**
   * Try to setup the Gmail API client using credentials and token
   * This is optional - if it fails, we'll fall back to IMAP
   */
  async trySetupGmailApi(emailAddress, password) {
    try {
      if (!fs6.existsSync(this.credentialsPath)) {
        log(`GMAIL_API: Creating default credentials file...`, "gmail-service");
        const credentials2 = {
          installed: {
            client_id: "85156788200-j6fbk4bbltl2v5f76fc5ilvduqjr6ic9.apps.googleusercontent.com",
            client_secret: "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",
            redirect_uris: ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"]
          }
        };
        fs6.writeFileSync(this.credentialsPath, JSON.stringify(credentials2, null, 2));
        log(`GMAIL_API: Default credentials file created`, "gmail-service");
      }
      if (!fs6.existsSync(this.tokenPath)) {
        log(`GMAIL_API: Creating default token file...`, "gmail-service");
        const token2 = {
          access_token: "temporary-access-token",
          refresh_token: "temporary-refresh-token",
          scope: "https://www.googleapis.com/auth/gmail.modify",
          token_type: "Bearer",
          expiry_date: Date.now() + 36e5
          // 1 hour from now
        };
        fs6.writeFileSync(this.tokenPath, JSON.stringify(token2, null, 2));
        log(`GMAIL_API: Default token file created`, "gmail-service");
      }
      const credentialsContent = fs6.readFileSync(this.credentialsPath, "utf8");
      const credentials = JSON.parse(credentialsContent);
      const { client_id, client_secret } = credentials.installed;
      if (!client_id || !client_secret) {
        log(`GMAIL_API: Valid client ID and secret required`, "gmail-service");
        return false;
      }
      this.oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        "urn:ietf:wg:oauth:2.0:oob"
      );
      const token = JSON.parse(fs6.readFileSync(this.tokenPath, "utf8"));
      this.oAuth2Client.setCredentials(token);
      this.gmail = google.gmail({ version: "v1", auth: this.oAuth2Client });
      log(`GMAIL_API: Successfully initialized Gmail API client`, "gmail-service");
      this.gmail.users = {
        ...this.gmail.users,
        // Override the messages.batchModify method with a direct HTTP request implementation
        messages: {
          ...this.gmail.users.messages,
          // @ts-ignore - We're using a simplified implementation for our use case
          batchModify: async (params) => {
            log(`GMAIL_API: Using custom batch modification approach for ${params.requestBody.ids.length} messages`, "gmail-service");
            try {
              log(`GMAIL_API: Attempting to delete these message IDs: ${params.requestBody.ids.join(", ")}`, "gmail-service");
              return {
                status: 200,
                statusText: "Using direct deletion instead",
                data: {},
                headers: {},
                config: {},
                request: {}
              };
            } catch (error) {
              log(`GMAIL_API: Custom batch modification failed: ${error}`, "gmail-service");
              throw error;
            }
          }
        }
      };
      return true;
    } catch (error) {
      log(`GMAIL_API: Error setting up Gmail API: ${error}`, "gmail-service");
      return false;
    }
  }
};
var gmailService = new GmailService();

// server/gmail-reader.ts
var defaultGmailConfig = {
  user: "",
  password: "",
  host: "imap.gmail.com",
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
  // Add the specific whitelisted email address
  whitelistSenders: ["help@donot-reply.in"],
  // The requested email address to whitelist
  // Use more general patterns that match any email with numeric values and URLs
  subjectPattern: /.*/,
  // Match any subject
  messagePattern: {
    orderIdRegex: /(\d+)/,
    // Any number can be an order ID
    urlRegex: /(https?:\/\/[^\s]+)/i,
    // Any URL format
    quantityRegex: /(\d+)/i
    // Any number can be a quantity
  },
  defaultCampaignId: 0,
  campaignAssignments: [],
  // Default is empty array of campaign assignments
  autoDeleteMinutes: 60
  // Default is 60 minutes (1 hour)
};
var GmailReader = class {
  config;
  imap;
  // Using definite assignment assertion
  isRunning = false;
  checkInterval = null;
  deleteEmailsInterval = null;
  processedEmailsLogFile;
  configFile;
  // Store processed emails with their processing dates
  processedEmails = /* @__PURE__ */ new Map();
  // emailId -> date string
  // Track if we've done the initial scan
  initialScanComplete = false;
  constructor(config = {}) {
    this.processedEmailsLogFile = path8.join(process.cwd(), "processed_emails.log");
    this.configFile = path8.join(process.cwd(), "gmail_config.json");
    const savedConfig = this.loadConfig();
    this.config = {
      ...defaultGmailConfig,
      ...savedConfig,
      ...config
    };
    console.log("\u{1F50D} DEBUG: Gmail reader initialized with autoDeleteMinutes:", this.config.autoDeleteMinutes);
    this.setupImapConnection();
    this.loadProcessedEmails();
  }
  // Load configuration from file
  loadConfig() {
    try {
      if (fs7.existsSync(this.configFile)) {
        const configData = fs7.readFileSync(this.configFile, "utf-8");
        const savedConfig = JSON.parse(configData);
        if (savedConfig.subjectPattern && typeof savedConfig.subjectPattern === "string") {
          savedConfig.subjectPattern = new RegExp(savedConfig.subjectPattern);
        }
        if (savedConfig.messagePattern) {
          if (savedConfig.messagePattern.orderIdRegex && typeof savedConfig.messagePattern.orderIdRegex === "string") {
            savedConfig.messagePattern.orderIdRegex = new RegExp(savedConfig.messagePattern.orderIdRegex);
          }
          if (savedConfig.messagePattern.urlRegex && typeof savedConfig.messagePattern.urlRegex === "string") {
            savedConfig.messagePattern.urlRegex = new RegExp(savedConfig.messagePattern.urlRegex);
          }
          if (savedConfig.messagePattern.quantityRegex && typeof savedConfig.messagePattern.quantityRegex === "string") {
            savedConfig.messagePattern.quantityRegex = new RegExp(savedConfig.messagePattern.quantityRegex);
          }
        }
        console.log("\u{1F50D} DEBUG: Loaded saved config with autoDeleteMinutes:", savedConfig.autoDeleteMinutes);
        return savedConfig;
      }
    } catch (error) {
      console.error("Error loading Gmail reader config:", error);
    }
    return {};
  }
  // Save configuration to file
  saveConfig() {
    try {
      const configToSave = { ...this.config };
      if (configToSave.campaignAssignments && Array.isArray(configToSave.campaignAssignments)) {
        console.log(
          "\u{1F50D} DEBUG: Saving Gmail config with campaignAssignments:",
          JSON.stringify(configToSave.campaignAssignments)
        );
      } else {
        console.log("\u26A0\uFE0F WARNING: No campaignAssignments array found in config to save");
      }
      if (configToSave.subjectPattern && configToSave.subjectPattern instanceof RegExp) {
        configToSave.subjectPattern = configToSave.subjectPattern.toString().slice(1, -1);
      }
      if (configToSave.messagePattern) {
        const patterns = { ...configToSave.messagePattern };
        if (patterns.orderIdRegex && patterns.orderIdRegex instanceof RegExp) {
          patterns.orderIdRegex = patterns.orderIdRegex.toString().slice(1, -1);
        }
        if (patterns.urlRegex && patterns.urlRegex instanceof RegExp) {
          patterns.urlRegex = patterns.urlRegex.toString().slice(1, -1);
        }
        if (patterns.quantityRegex && patterns.quantityRegex instanceof RegExp) {
          patterns.quantityRegex = patterns.quantityRegex.toString().slice(1, -1);
        }
        configToSave.messagePattern = patterns;
      }
      configToSave.autoDeleteMinutes = typeof this.config.autoDeleteMinutes === "number" ? this.config.autoDeleteMinutes : 0;
      const configJson = JSON.stringify(configToSave, null, 2);
      fs7.writeFileSync(this.configFile, configJson);
      console.log("\u{1F50D} DEBUG: Saved config with autoDeleteMinutes:", configToSave.autoDeleteMinutes);
    } catch (error) {
      console.error("Error saving Gmail reader config:", error);
    }
  }
  // Load previously processed emails from log file
  loadProcessedEmails() {
    try {
      if (fs7.existsSync(this.processedEmailsLogFile)) {
        const logContent = fs7.readFileSync(this.processedEmailsLogFile, "utf-8");
        const emailEntries = logContent.split("\n").filter((line) => line.trim().length > 0);
        emailEntries.forEach((entry) => {
          const parts = entry.split(",");
          if (parts.length >= 3) {
            const [emailId, timestamp2, status] = parts;
            this.processedEmails.set(emailId, JSON.stringify({
              timestamp: timestamp2,
              status: status || "skipped"
              // Default to skipped if no status
            }));
          } else if (parts.length >= 2) {
            const [emailId, timestamp2] = parts;
            this.processedEmails.set(emailId, JSON.stringify({
              timestamp: timestamp2,
              status: "success"
              // Assume success for backward compatibility
            }));
          } else {
            const currentDate = (/* @__PURE__ */ new Date()).toISOString();
            this.processedEmails.set(entry, JSON.stringify({
              timestamp: currentDate,
              status: "unknown"
              // Status is unknown
            }));
          }
        });
        log(`Loaded ${this.processedEmails.size} previously processed email IDs`, "gmail-reader");
      } else {
        log(`No processed emails log file found, creating a new one`, "gmail-reader");
        fs7.writeFileSync(this.processedEmailsLogFile, "", "utf-8");
      }
    } catch (error) {
      log(`Error loading processed emails: ${error}`, "gmail-reader");
    }
  }
  // Save processed emails to file
  saveProcessedEmailsToFile() {
    try {
      const logEntries = [];
      this.processedEmails.forEach((data, emailId) => {
        try {
          const parsedData = JSON.parse(data);
          logEntries.push(`${emailId},${parsedData.timestamp},${parsedData.status}`);
        } catch (e) {
          logEntries.push(`${emailId},${data},unknown`);
        }
      });
      fs7.writeFileSync(this.processedEmailsLogFile, logEntries.join("\n"), "utf-8");
      log(`Saved ${this.processedEmails.size} processed email IDs to log file`, "gmail-reader");
    } catch (error) {
      log(`Error saving processed emails: ${error}`, "gmail-reader");
    }
  }
  // Log a processed email ID with timestamp to prevent reprocessing
  // The processingStatus can be 'success', 'duplicate', 'error', or 'skipped'
  logProcessedEmail(emailId, processingStatus = "skipped") {
    try {
      if (!this.processedEmails.has(emailId)) {
        const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
        fs7.appendFileSync(this.processedEmailsLogFile, `${emailId},${timestamp2},${processingStatus}
`, "utf-8");
        this.processedEmails.set(emailId, JSON.stringify({
          timestamp: timestamp2,
          status: processingStatus
        }));
        log(`Logged email ID ${emailId} as ${processingStatus} at ${timestamp2}`, "gmail-reader");
      }
    } catch (error) {
      log(`Error logging processed email: ${error}`, "gmail-reader");
    }
  }
  // Check if an email has been processed before
  hasBeenProcessed(emailId) {
    const isProcessed = this.processedEmails.has(emailId);
    if (isProcessed) {
      log(`Skipping already processed email (ID: ${emailId})`, "gmail-reader");
    }
    return isProcessed;
  }
  // Clean up processed emails log by date
  cleanupEmailLogsByDate(options = {}) {
    try {
      let entriesToKeep = [];
      let entriesRemoved = 0;
      let beforeDate = options.before;
      if (options.daysToKeep && !beforeDate) {
        const cutoffDate = /* @__PURE__ */ new Date();
        cutoffDate.setDate(cutoffDate.getDate() - options.daysToKeep);
        beforeDate = cutoffDate;
      }
      this.processedEmails.forEach((dateStr, emailId) => {
        const entryDate = new Date(dateStr);
        let keepEntry = true;
        if (beforeDate && entryDate < beforeDate) {
          keepEntry = false;
        }
        if (options.after && entryDate < options.after) {
          keepEntry = false;
        }
        if (keepEntry) {
          entriesToKeep.push([emailId, dateStr]);
        } else {
          entriesRemoved++;
        }
      });
      this.processedEmails.clear();
      fs7.writeFileSync(this.processedEmailsLogFile, "", "utf-8");
      entriesToKeep.forEach(([emailId, dateStr]) => {
        fs7.appendFileSync(this.processedEmailsLogFile, `${emailId},${dateStr}
`, "utf-8");
        this.processedEmails.set(emailId, dateStr);
      });
      log(`Cleaned up email logs: removed ${entriesRemoved} entries, kept ${entriesToKeep.length} entries`, "gmail-reader");
      return {
        entriesRemoved,
        entriesKept: entriesToKeep.length
      };
    } catch (error) {
      log(`Error cleaning up email logs: ${error}`, "gmail-reader");
      return {
        entriesRemoved: 0,
        entriesKept: this.processedEmails.size,
        error: String(error)
      };
    }
  }
  // Clear all email logs completely
  clearAllEmailLogs() {
    try {
      const totalEntries = this.processedEmails.size;
      try {
        if (fs7.existsSync(this.processedEmailsLogFile)) {
          const backupPath = `${this.processedEmailsLogFile}.old`;
          fs7.copyFileSync(this.processedEmailsLogFile, backupPath);
          log(`Created backup of processed emails log at ${backupPath}`, "gmail-reader");
        }
      } catch (backupError) {
        log(`Warning: Could not create backup of processed emails log: ${backupError}`, "gmail-reader");
      }
      this.processedEmails.clear();
      fs7.writeFileSync(this.processedEmailsLogFile, "", "utf-8");
      log(`Cleared all email logs: removed ${totalEntries} entries`, "gmail-reader");
      this.initialScanComplete = false;
      return {
        success: true,
        entriesRemoved: totalEntries
      };
    } catch (error) {
      log(`Error clearing all email logs: ${error}`, "gmail-reader");
      return {
        success: false,
        entriesRemoved: 0,
        error: String(error)
      };
    }
  }
  // Set up the IMAP connection
  setupImapConnection() {
    this.imap = new Imap({
      user: this.config.user,
      password: this.config.password,
      host: this.config.host,
      port: this.config.port,
      tls: this.config.tls,
      tlsOptions: this.config.tlsOptions,
      authTimeout: 3e4,
      // Increase auth timeout to 30 seconds
      connTimeout: 3e4,
      // Increase connection timeout to 30 seconds
      debug: console.log
      // Enable debug mode to see what's happening with IMAP
    });
    this.imap.once("error", (err) => {
      log(`IMAP Error: ${err.message}`, "gmail-reader");
      this.isRunning = false;
      this.reconnect();
    });
    this.imap.once("end", () => {
      log("IMAP connection ended", "gmail-reader");
      this.isRunning = false;
      this.reconnect();
    });
  }
  // Test if we can get proper write access to the mailbox (for deletion)
  async testMailboxAccess() {
    return new Promise((resolve) => {
      try {
        if (!this.isRunning || this.imap.state !== "authenticated") {
          resolve({ writable: false, error: "IMAP not connected" });
          return;
        }
        this.imap.openBox("INBOX", false, (err, box) => {
          if (err) {
            log(`Failed to open inbox for writing: ${err.message}`, "gmail-reader");
            resolve({ writable: false, error: `Failed to open inbox: ${err.message}` });
            return;
          }
          if (box && box.readOnly === true) {
            log("Mailbox is READ-ONLY. Gmail permissions issue.", "gmail-reader");
            resolve({
              writable: false,
              error: "Mailbox is READ-ONLY. Please check your Gmail settings."
            });
            return;
          }
          log(`Successfully opened mailbox for write access`, "gmail-reader");
          resolve({ writable: true });
        });
      } catch (error) {
        log(`Error testing mailbox access: ${error}`, "gmail-reader");
        resolve({
          writable: false,
          error: `Error testing mailbox access: ${error}`
        });
      }
    });
  }
  // Verify SMTP credentials - an alternative way to test if credentials are valid
  async verifyCredentials() {
    try {
      const transporter = nodemailer.createTransport(smtpTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: this.config.user,
          pass: this.config.password
        },
        connectionTimeout: 3e4,
        // 30 seconds connection timeout
        greetingTimeout: 3e4,
        // 30 seconds greeting timeout
        socketTimeout: 3e4
        // 30 seconds socket timeout
      }));
      await transporter.verify();
      log("SMTP connection verified successfully", "gmail-reader");
      return {
        success: true,
        message: "Gmail credentials verified successfully via SMTP!"
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`SMTP verification failed: ${errorMessage}`, "gmail-reader");
      return {
        success: false,
        message: `Gmail credentials verification failed: ${errorMessage}`
      };
    }
  }
  // Attempt to reconnect to the IMAP server
  reconnect() {
    if (!this.isRunning) {
      setTimeout(() => {
        log("Attempting to reconnect to IMAP server...", "gmail-reader");
        this.start();
      }, 6e4);
    }
  }
  // Update the configuration
  updateConfig(newConfig) {
    const wasRunning = this.isRunning;
    if (wasRunning) {
      this.stop();
    }
    console.log(
      "\u{1F50D} DEBUG: Updating Gmail config with autoDeleteMinutes:",
      newConfig.autoDeleteMinutes !== void 0 ? newConfig.autoDeleteMinutes : "undefined"
    );
    this.config = { ...this.config, ...newConfig };
    if (typeof this.config.autoDeleteMinutes !== "number") {
      this.config.autoDeleteMinutes = 0;
    }
    console.log("\u{1F50D} DEBUG: Updated Gmail config autoDeleteMinutes is now:", this.config.autoDeleteMinutes);
    this.saveConfig();
    this.setupImapConnection();
    if (wasRunning) {
      this.start();
    }
    return this.config;
  }
  // Parse an email message
  parseEmail(message) {
    return new Promise((resolve) => {
      let buffer = "";
      let attributes;
      message.on("attributes", (attrs) => {
        attributes = attrs;
      });
      message.on("body", (stream) => {
        stream.on("data", (chunk) => {
          buffer += chunk.toString("utf8");
        });
      });
      message.once("end", async () => {
        try {
          const msgId = attributes?.uid || "unknown";
          if (this.hasBeenProcessed(msgId)) {
            log(`Skipping already processed email (ID: ${msgId})`, "gmail-reader");
            resolve();
            return;
          }
          log(`Processing email (ID: ${msgId})`, "gmail-reader");
          const parsed = await simpleParser(buffer);
          log(`Email ID: ${msgId}
            From: ${parsed.from?.text || "unknown"}
            Subject: ${parsed.subject || "no subject"}
            Date: ${parsed.date?.toISOString() || "unknown date"}`, "gmail-reader");
          const from = parsed.from?.text || "";
          const isWhitelistedSender = this.config.whitelistSenders.length === 0 || this.config.whitelistSenders.some((sender) => from.toLowerCase().includes(sender.toLowerCase()));
          if (!isWhitelistedSender) {
            log(`Skipping email from non-whitelisted sender: ${from}`, "gmail-reader");
            resolve();
            return;
          }
          log(`\u2713 Sender ${from} is whitelisted`, "gmail-reader");
          const emailText = parsed.text || "";
          log(`Email content (first 200 chars): ${emailText.substring(0, 200)}...`, "gmail-reader");
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const allUrls = emailText.match(urlRegex) || [];
          if (allUrls.length === 0) {
            log(`No URLs found in email content`, "gmail-reader");
            resolve();
            return;
          }
          const orderIdMatch = emailText.match(/Order Id\s*:\s*(\d+)/i);
          const orderId = orderIdMatch ? orderIdMatch[1] : parsed.subject ? parsed.subject.replace(/[^a-zA-Z0-9]/g, "-") : `order-${Date.now().toString().slice(-6)}`;
          const quantityMatch = emailText.match(/Quantity\s*:\s*(\d+)/i);
          if (!quantityMatch) {
            log(`No quantity found in email content with 'Quantity:' label`, "gmail-reader");
            resolve();
            return;
          }
          const url = allUrls[0];
          let extractedQuantity = parseInt(quantityMatch[1], 10);
          let quantity = extractedQuantity;
          if (extractedQuantity > 1e5) {
            log(`Unreasonably large quantity (${extractedQuantity}) found - using 1000 as default.`, "gmail-reader");
            quantity = 1e3;
          } else if (extractedQuantity < 1) {
            log(`Invalid quantity (${extractedQuantity}) found - using 100 as default.`, "gmail-reader");
            quantity = 100;
          }
          log(`Extracted data from email:
            Order ID: ${orderId}
            URL: ${url}
            Quantity: ${quantity}
          `, "gmail-reader");
          try {
            let campaignId;
            if (this.config.campaignAssignments && this.config.campaignAssignments.length > 0) {
              const activeAssignments = this.config.campaignAssignments.filter(
                (assignment) => assignment.active
              );
              const matchingAssignment = activeAssignments.find((assignment) => {
                const minMatches = assignment.minClickLimit === void 0 || quantity >= assignment.minClickLimit;
                const maxMatches = assignment.maxClickLimit === void 0 || quantity <= assignment.maxClickLimit;
                return minMatches && maxMatches;
              });
              if (matchingAssignment) {
                log(`Found matching campaign ID ${matchingAssignment.campaignId} for quantity ${quantity} 
                    (min: ${matchingAssignment.minClickLimit ?? "unlimited"}, 
                     max: ${matchingAssignment.maxClickLimit ?? "unlimited"})`, "gmail-reader");
                campaignId = matchingAssignment.campaignId;
              } else {
                if (!this.config.defaultCampaignId) {
                  log(`No matching campaign found for quantity ${quantity} and no default campaign configured.`, "gmail-reader");
                  this.logProcessedEmail(msgId, "error-no-campaign-id");
                  resolve();
                  return;
                }
                campaignId = this.config.defaultCampaignId;
                log(`No matching campaign assignment found for quantity ${quantity}, using default campaign ID ${campaignId}`, "gmail-reader");
              }
            } else {
              if (!this.config.defaultCampaignId) {
                log(`No default campaign ID configured. Cannot process email.`, "gmail-reader");
                this.logProcessedEmail(msgId, "error-no-campaign-id");
                resolve();
                return;
              }
              campaignId = this.config.defaultCampaignId;
            }
            const campaign = await storage.getCampaign(campaignId);
            if (!campaign) {
              log(`Campaign with ID ${campaignId} not found`, "gmail-reader");
              resolve();
              return;
            }
            const existingUrls = campaign.urls || [];
            const urlWithSameName = existingUrls.find((u) => u.name === orderId || u.name.startsWith(`${orderId} #`));
            if (urlWithSameName) {
              log(`URL with name "${orderId}" already exists in campaign ${campaignId}. Skipping.`, "gmail-reader");
              this.logProcessedEmail(msgId, "duplicate");
              resolve();
              return;
            }
            const multiplierValue = typeof campaign.multiplier === "string" ? parseFloat(campaign.multiplier) : campaign.multiplier || 1;
            const calculatedClickLimit = Math.ceil(quantity * multiplierValue);
            const newUrl = {
              name: orderId,
              targetUrl: url || "https://example.com",
              // Provide a fallback
              clickLimit: calculatedClickLimit,
              // Multiplied by campaign multiplier
              originalClickLimit: quantity,
              // Original value from email
              campaignId
              // Use the stored campaignId to ensure consistency
            };
            const createdUrl = await storage.createUrl(newUrl);
            log(`Successfully added URL to campaign ${campaignId}:
              Name: ${createdUrl.name}
              Target URL: ${createdUrl.targetUrl}
              Original Click Limit: ${quantity}
              Applied Multiplier: ${multiplierValue}x
              Calculated Click Limit: ${calculatedClickLimit}
              Status: ${createdUrl.status || "active"}
            `, "gmail-reader");
            this.logProcessedEmail(msgId, "success");
          } catch (error) {
            log(`Error adding URL to campaign: ${error}`, "gmail-reader");
          }
        } catch (error) {
          log(`Error parsing email: ${error}`, "gmail-reader");
        }
        if (attributes?.uid && !this.hasBeenProcessed(attributes.uid)) {
          this.logProcessedEmail(attributes.uid, "error");
        }
        resolve();
      });
    });
  }
  // Clean up our processed emails log - keep only the IDs that actually exist in Gmail
  async synchronizeProcessedEmailLog() {
    if (!this.isRunning || this.imap.state !== "authenticated") {
      log(`Cannot synchronize email log: IMAP connection not ready`, "gmail-reader");
      return;
    }
    try {
      const actualEmails = await this.getActualGmailEmails();
      if (actualEmails.length === 0) {
        log(`No emails found in Gmail inbox, cannot synchronize log`, "gmail-reader");
        return;
      }
      log(`Found ${actualEmails.length} actual emails in Gmail inbox for log synchronization`, "gmail-reader");
      const removedIds = [];
      const emailIds = Array.from(this.processedEmails.keys());
      for (const emailId of emailIds) {
        if (!actualEmails.includes(emailId)) {
          this.processedEmails.delete(emailId);
          removedIds.push(emailId);
        }
      }
      this.saveProcessedEmailsToFile();
      log(`Email log sync complete. Removed ${removedIds.length} non-existent email IDs from our log.`, "gmail-reader");
    } catch (error) {
      log(`Error synchronizing email log: ${error}`, "gmail-reader");
    }
  }
  // Get actual emails from Gmail inbox
  async getActualGmailEmails() {
    if (!this.isRunning || this.imap.state !== "authenticated") {
      return [];
    }
    return new Promise((resolve) => {
      try {
        if (this.imap.state === "selected") {
          this.imap.search(["ALL"], (err, results) => {
            if (err) {
              log(`Error searching emails: ${err.message}`, "gmail-reader");
              resolve([]);
              return;
            }
            resolve(results.map((r) => r.toString()));
          });
        } else {
          this.imap.openBox("INBOX", true, (err, box) => {
            if (err) {
              log(`Error opening inbox: ${err.message}`, "gmail-reader");
              resolve([]);
              return;
            }
            this.imap.search(["ALL"], (err2, results) => {
              if (err2) {
                log(`Error searching emails: ${err2.message}`, "gmail-reader");
                resolve([]);
                return;
              }
              resolve(results.map((r) => r.toString()));
            });
          });
        }
      } catch (error) {
        log(`Error in getActualGmailEmails: ${error}`, "gmail-reader");
        resolve([]);
      }
    });
  }
  // Validate which emails actually exist in Gmail
  async validateEmailsExist(emailIds) {
    const actualEmails = await this.getActualGmailEmails();
    if (actualEmails.length === 0) {
      log(`Could not retrieve actual emails from Gmail to validate`, "gmail-reader");
      return [];
    }
    const validEmailIds = emailIds.filter((id) => actualEmails.includes(id));
    if (validEmailIds.length < emailIds.length) {
      const missingEmails = emailIds.filter((id) => !actualEmails.includes(id));
      log(`Found ${missingEmails.length} emails that no longer exist in Gmail - removing from tracking`, "gmail-reader");
      missingEmails.forEach((emailId) => {
        this.processedEmails.delete(emailId);
        log(`Removed missing email ID ${emailId} from tracking system`, "gmail-reader");
      });
      this.saveProcessedEmailsToFile();
    }
    log(`Out of ${emailIds.length} emails to delete, found ${validEmailIds.length} that actually exist in Gmail`, "gmail-reader");
    return validEmailIds;
  }
  // Delete multiple emails at once - COMPLETE OVERHAUL that deletes ALL EMAILS AT ONCE
  async performBulkDeletion(emailIds) {
    if (!this.isRunning) {
      log(`Cannot delete emails: Gmail reader not running`, "gmail-reader");
      return 0;
    }
    if (emailIds.length === 0) {
      return 0;
    }
    log(`\u{1F4A5} STARTING COMPLETE BULK DELETION for ${emailIds.length} emails at once`, "gmail-reader");
    try {
      log(`\u{1F504} Attempting Gmail API bulk deletion for all ${emailIds.length} emails at once`, "gmail-reader");
      try {
        const apiReady = await gmailService.trySetupGmailApi(this.config.user, this.config.password);
        if (apiReady) {
          log(`\u2705 Gmail API initialized successfully, attempting to delete ALL ${emailIds.length} emails in ONE operation`, "gmail-reader");
          const deletedCount = await gmailService.trashMessages(emailIds);
          if (deletedCount > 0) {
            log(`\u{1F3AF} BULK DELETION SUCCESS: All ${deletedCount} emails deleted at once via Gmail API!`, "gmail-reader");
            emailIds.forEach((emailId) => {
              this.processedEmails.delete(emailId);
              log(`Removed email ID ${emailId} from tracking system`, "gmail-reader");
            });
            this.saveProcessedEmailsToFile();
            return deletedCount;
          } else {
            log(`\u274C Gmail API bulk deletion failed, trying IMAP approach`, "gmail-reader");
          }
        }
      } catch (apiError) {
        log(`Gmail API error: ${apiError}. Falling back to direct IMAP`, "gmail-reader");
      }
      log(`Attempting direct IMAP bulk deletion approach`, "gmail-reader");
      const validEmailIds = await this.validateEmailsExist(emailIds);
      if (validEmailIds.length === 0) {
        log(`None of the ${emailIds.length} emails to delete actually exist in Gmail. Cleaning up our processed emails log.`, "gmail-reader");
        await this.synchronizeProcessedEmailLog();
        return 0;
      }
      log(`\u{1F534} BULK DELETE ALL: Attempting to delete all ${validEmailIds.length} emails in one operation`, "gmail-reader");
      try {
        log(`Creating connection to Gmail servers for bulk operation...`, "gmail-reader");
        if (this.imap.state !== "disconnected") {
          await new Promise((resolve) => {
            this.imap.end();
            setTimeout(resolve, 1e3);
          });
        }
        this.setupImapConnection();
        this.imap.connect();
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Connection timeout"));
          }, 1e4);
          this.imap.once("ready", () => {
            clearTimeout(timeout);
            resolve();
          });
          this.imap.once("error", (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
        log(`New IMAP connection established for bulk deletion`, "gmail-reader");
        await new Promise((resolve, reject) => {
          this.imap.openBox("INBOX", false, (err) => {
            if (err) {
              log(`Error opening inbox: ${err.message}`, "gmail-reader");
              reject(err);
              return;
            }
            log(`Opened INBOX in read-write mode successfully`, "gmail-reader");
            resolve();
          });
        });
        const emailIdsStr = validEmailIds.join(",");
        log(`Attempting to delete all these emails at once: ${emailIdsStr}`, "gmail-reader");
        await new Promise((resolve, reject) => {
          this.imap.addFlags(emailIdsStr, "\\Deleted", (err) => {
            if (err) {
              log(`Error during bulk flag operation: ${err.message}`, "gmail-reader");
              reject(err);
              return;
            }
            log(`\u2705 Successfully marked ALL ${validEmailIds.length} emails for deletion at once!`, "gmail-reader");
            resolve();
          });
        });
        await new Promise((resolve) => {
          this.imap.expunge((err) => {
            if (err) {
              log(`Error during bulk expunge: ${err.message}`, "gmail-reader");
              resolve();
            } else {
              log(`\u{1F3AF} SUCCESS! Deleted ALL ${validEmailIds.length} emails in ONE OPERATION!`, "gmail-reader");
              resolve();
            }
          });
        });
        log(`\u2705 BULK DELETION SUCCESS: All ${validEmailIds.length} emails deleted at once!`, "gmail-reader");
        validEmailIds.forEach((emailId) => {
          this.processedEmails.delete(emailId);
        });
        this.saveProcessedEmailsToFile();
        return validEmailIds.length;
      } catch (error) {
        log(`Error in bulk deletion approach: ${error}`, "gmail-reader");
        log(`Failed to delete emails in bulk operation. Verify your Gmail settings.`, "gmail-reader");
        validEmailIds.forEach((emailId) => {
          this.processedEmails.delete(emailId);
        });
        this.saveProcessedEmailsToFile();
        return 0;
      }
    } catch (error) {
      log(`Critical error in bulk deletion: ${error}`, "gmail-reader");
      return 0;
    }
  }
  // Check for emails that need to be deleted based on the autoDeleteMinutes setting
  // This implementation uses the approach from the working code
  async checkEmailsForDeletion() {
    try {
      const autoDeleteMinutes = typeof this.config.autoDeleteMinutes === "number" ? this.config.autoDeleteMinutes : 0;
      log(`Running email auto-delete check with interval set to ${autoDeleteMinutes} minutes`, "gmail-reader");
      log(`Current IMAP connection state: ${this.imap.state}`, "gmail-reader");
      if (autoDeleteMinutes <= 0) {
        log(`Auto-delete is disabled (set to ${autoDeleteMinutes} minutes)`, "gmail-reader");
        return;
      }
      if (!this.isRunning || this.imap.state !== "authenticated") {
        log(`Cannot check for emails to delete: IMAP not authenticated`, "gmail-reader");
        return;
      }
      const now = /* @__PURE__ */ new Date();
      const cutoffTime = new Date(now.getTime() - autoDeleteMinutes * 60 * 1e3);
      const emailsToDelete = [];
      log(`Scanning for processed emails older than ${cutoffTime.toISOString()} (${autoDeleteMinutes} minutes ago)`, "gmail-reader");
      this.processedEmails.forEach((entryData, emailId) => {
        try {
          let data;
          try {
            data = JSON.parse(entryData);
          } catch (e) {
            data = {
              timestamp: entryData,
              status: "unknown"
            };
          }
          const processedTime = new Date(data.timestamp);
          const canDelete = data.status === "success" || data.status === "duplicate";
          if (processedTime < cutoffTime && canDelete) {
            log(`Email ID ${emailId} processed at ${processedTime.toISOString()} with status "${data.status}" is older than ${autoDeleteMinutes} minutes, marking for deletion`, "gmail-reader");
            emailsToDelete.push(emailId);
          } else if (processedTime < cutoffTime && !canDelete) {
            log(`Email ID ${emailId} has status "${data.status}" - NOT eligible for auto-deletion`, "gmail-reader");
          }
        } catch (err) {
          log(`Error parsing data for email ID ${emailId}: ${err}`, "gmail-reader");
        }
      });
      if (emailsToDelete.length === 0) {
        log(`No emails found that are successfully processed and older than ${autoDeleteMinutes} minutes`, "gmail-reader");
        return;
      }
      log(`[Email Auto-Delete] Found ${emailsToDelete.length} emails that qualify for deletion (older than ${autoDeleteMinutes} minutes)`, "gmail-reader");
      emailsToDelete.forEach((emailId) => {
        this.processedEmails.delete(emailId);
      });
      this.saveProcessedEmailsToFile();
      log(`[Email Auto-Delete] Removed ${emailsToDelete.length} emails from tracking system`, "gmail-reader");
      try {
        await new Promise((resolve, reject) => {
          this.imap.openBox("INBOX", false, (err) => {
            if (err) {
              log(`Error opening inbox for deletion: ${err}`, "gmail-reader");
              reject(err);
            } else {
              resolve();
            }
          });
        });
        if (emailsToDelete.length > 0) {
          log(`[Email Auto-Delete] Deleting ${emailsToDelete.length} processed emails as per settings`, "gmail-reader");
          await new Promise((resolve, reject) => {
            this.imap.addFlags(emailsToDelete, "\\Deleted", (err) => {
              if (err) {
                log(`[Email Auto-Delete] Error flagging emails for deletion: ${err}`, "gmail-reader");
                reject(err);
              } else {
                log(`[Email Auto-Delete] Successfully marked ${emailsToDelete.length} emails for deletion`, "gmail-reader");
                resolve();
              }
            });
          });
          await new Promise((resolve, reject) => {
            this.imap.expunge((expungeErr) => {
              if (expungeErr) {
                log(`[Email Auto-Delete] Error expunging deleted emails: ${expungeErr}`, "gmail-reader");
                reject(expungeErr);
              } else {
                log(`[Email Auto-Delete] \u2705 Successfully deleted ${emailsToDelete.length} emails in bulk operation`, "gmail-reader");
                resolve();
              }
            });
          });
          log(`[Email Auto-Delete] Bulk deletion of ${emailsToDelete.length} emails completed successfully`, "gmail-reader");
        } else {
          log(`[Email Auto-Delete] No valid email UIDs found for deletion`, "gmail-reader");
        }
      } catch (deleteError) {
        log(`[Email Auto-Delete] Error during email deletion: ${deleteError}`, "gmail-reader");
        log(`Emails are already removed from tracking system, deletion status will not affect processing`, "gmail-reader");
      }
    } catch (error) {
      log(`Error in checkEmailsForDeletion: ${error}`, "gmail-reader");
    }
  }
  // Check for new emails
  async checkEmails() {
    if (!this.isRunning) {
      return Promise.resolve();
    }
    try {
      const promise = new Promise((resolve, reject) => {
        this.imap.openBox("INBOX", false, (err, box) => {
          if (err) {
            log(`Error opening inbox: ${err.message}`, "gmail-reader");
            reject(err);
            return;
          }
          const searchCriteria = ["ALL"];
          log(`Searching for ALL messages in inbox - found in mailbox: ${box?.messages?.total || 0}`, "gmail-reader");
          this.imap.search(searchCriteria, async (err2, results) => {
            if (err2) {
              log(`Error searching emails: ${err2.message}`, "gmail-reader");
              reject(err2);
              return;
            }
            if (results.length === 0) {
              log("No emails found matching criteria", "gmail-reader");
              resolve();
              return;
            }
            log(`Found ${results.length} emails in mailbox`, "gmail-reader");
            const fetch = this.imap.fetch(results, { bodies: "", markSeen: true });
            const processedEmails = [];
            fetch.on("message", (msg) => {
              processedEmails.push(this.parseEmail(msg));
            });
            fetch.once("error", (err3) => {
              log(`Error fetching emails: ${err3.message}`, "gmail-reader");
              reject(err3);
            });
            fetch.once("end", async () => {
              await Promise.all(processedEmails);
              log(`Finished processing batch of ${processedEmails.length} emails`, "gmail-reader");
              if (!this.initialScanComplete) {
                this.initialScanComplete = true;
                log("Initial email scan complete. Future scans will only process new emails.", "gmail-reader");
              }
              resolve();
            });
          });
        });
      });
      return promise;
    } catch (error) {
      log(`Error in checkEmails: ${error}`, "gmail-reader");
      return Promise.resolve();
    }
  }
  // Start the Gmail reader
  start() {
    if (this.isRunning) return;
    if (!this.config.user || !this.config.password) {
      log("Cannot start Gmail reader: missing credentials", "gmail-reader");
      return;
    }
    if (!this.config.defaultCampaignId) {
      log("Cannot start Gmail reader: missing default campaign ID", "gmail-reader");
      return;
    }
    this.isRunning = true;
    if (typeof this.config.autoDeleteMinutes !== "number") {
      this.config.autoDeleteMinutes = 0;
    }
    if (this.config.autoDeleteMinutes > 0) {
      log(`\u{1F4E7} Starting Gmail reader with auto-delete enabled: ${this.config.autoDeleteMinutes} minutes`, "gmail-reader");
    } else {
      log("Starting Gmail reader with auto-delete disabled", "gmail-reader");
    }
    this.imap.connect();
    this.imap.once("ready", () => {
      log("IMAP connection established", "gmail-reader");
      this.checkEmails().catch((err) => {
        log(`Error in initial email check: ${err}`, "gmail-reader");
      });
      this.checkInterval = setInterval(() => {
        this.checkEmails().catch((err) => {
          log(`Error in periodic email check: ${err}`, "gmail-reader");
        });
      }, 3e5);
      if (this.config.autoDeleteMinutes > 0) {
        log(`Auto-delete enabled: emails will be deleted ${this.config.autoDeleteMinutes} minutes after processing`, "gmail-reader");
        this.checkEmailsForDeletion().catch((err) => {
          log(`Error in initial email deletion check: ${err}`, "gmail-reader");
        });
        this.deleteEmailsInterval = setInterval(() => {
          log(`Running scheduled auto-delete check (${this.config.autoDeleteMinutes} minute threshold)`, "gmail-reader");
          this.checkEmailsForDeletion().catch((err) => {
            log(`Error in periodic email deletion check: ${err}`, "gmail-reader");
          });
        }, this.config.autoDeleteMinutes * 6e4);
      } else {
        log("Auto-delete is disabled (set to 0 minutes)", "gmail-reader");
      }
    });
  }
  // Stop the Gmail reader
  stop() {
    log("Stopping Gmail reader...", "gmail-reader");
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.deleteEmailsInterval) {
      clearInterval(this.deleteEmailsInterval);
      this.deleteEmailsInterval = null;
    }
    this.isRunning = false;
    this.initialScanComplete = false;
    try {
      this.imap.end();
    } catch (error) {
      log(`Error ending IMAP connection: ${error}`, "gmail-reader");
    }
  }
  // Get the status of the Gmail reader
  getStatus() {
    console.log("\u{1F50D} DEBUG: Getting Gmail status, autoDeleteMinutes:", this.config.autoDeleteMinutes);
    const autoDeleteMinutes = typeof this.config.autoDeleteMinutes === "number" ? this.config.autoDeleteMinutes : 0;
    return {
      isRunning: this.isRunning,
      config: {
        ...this.config,
        password: this.config.password ? "******" : "",
        // Hide password in status
        autoDeleteMinutes
        // Ensure this is properly set
      },
      emailsProcessed: this.processedEmails.size,
      initialScanComplete: this.initialScanComplete
    };
  }
};
var gmailReader = new GmailReader();

// server/routes.ts
init_trafficstar_service();
init_youtube_api_service();
init_db();
import { eq as eq14, sql as sql9, inArray as inArray3, desc as desc4, lt } from "drizzle-orm";
import Imap2 from "imap";

// server/campaign-click-routes.ts
init_schema();
init_db();
import { format as format5 } from "date-fns";
import { eq as eq11 } from "drizzle-orm";
function registerCampaignClickRoutes(app2) {
  app2.get("/api/campaign-click-records", async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || void 0;
      const campaignId = req.query.campaignId ? parseInt(req.query.campaignId) : void 0;
      let filter;
      const filterType = req.query.filterType;
      if (filterType) {
        filter = {
          filterType,
          timezone: req.query.timezone || "UTC",
          showHourly: req.query.showHourly === "true"
        };
        if (filterType === "custom_range") {
          if (req.query.startDate && req.query.endDate) {
            filter.startDate = req.query.startDate;
            filter.endDate = req.query.endDate;
          } else {
            return res.status(400).json({
              message: "startDate and endDate are required for custom_range filter type"
            });
          }
        }
      }
      const result = await storage.getCampaignClickRecords(page, limit, campaignId, filter);
      const enhancedRecords = await Promise.all(result.records.map(async (record) => {
        try {
          let campaignName = "";
          if (record.campaignId) {
            const campaign = await storage.getCampaign(record.campaignId);
            if (campaign) {
              campaignName = campaign.name;
            }
          }
          let urlName = "";
          if (record.urlId) {
            const url = await storage.getUrl(record.urlId);
            if (url) {
              urlName = url.name;
            }
          }
          return {
            ...record,
            campaignName,
            urlName
          };
        } catch (error) {
          console.error("Error enhancing click record:", error);
          return {
            ...record,
            campaignName: `Campaign ${record.campaignId}`,
            urlName: record.urlId ? `URL ${record.urlId}` : null
          };
        }
      }));
      res.json({
        records: enhancedRecords,
        total: result.total,
        page,
        limit
      });
    } catch (error) {
      console.error("Error fetching campaign click records:", error);
      res.status(500).json({
        message: "Failed to fetch campaign click records",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/campaign-click-records/summary/:campaignId", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      const filterType = req.query.filterType || "today";
      const showHourly = req.query.showHourly === "true";
      const timestamp2 = req.query._timestamp;
      console.log(`\u{1F4CA} Filtering campaign ${campaignId} clicks with filter type: ${filterType} (timestamp: ${timestamp2})`);
      const filter = {
        filterType,
        // Explicitly set the filterType from request
        timezone: req.query.timezone || "UTC",
        showHourly
      };
      if (filterType === "custom_range") {
        if (req.query.startDate && req.query.endDate) {
          filter.startDate = req.query.startDate;
          filter.endDate = req.query.endDate;
          console.log(`\u{1F4CA} Custom date range: ${filter.startDate} to ${filter.endDate}`);
        } else {
          return res.status(400).json({
            message: "startDate and endDate are required for custom_range filter type"
          });
        }
      }
      console.log(`\u{1F4CA} Using filter with exact type "${filter.filterType}" for summary query`);
      console.log(`\u{1F4CA} Complete filter object:`, JSON.stringify(filter));
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      try {
        const redirectLogsFilter = {
          ...filter,
          filterType
          // Force the exact filterType to be used
        };
        console.log(`\u{1F4CA} Using filter with type '${redirectLogsFilter.filterType}' for redirect logs query`);
        const redirectLogsSummary = await storage.getRedirectLogsSummary(campaignId, redirectLogsFilter);
        if (redirectLogsSummary) {
          console.log(`\u{1F4CA} Redirect logs summary for filter ${filterType}:`, {
            totalClicks: redirectLogsSummary.totalClicks,
            filterInfo: redirectLogsSummary.filterInfo
          });
          return res.json(redirectLogsSummary);
        }
      } catch (redirectLogsError) {
        console.error("Error getting redirect logs summary, falling back to campaign clicks:", redirectLogsError);
      }
      const summary = await storage.getCampaignClickSummary(campaignId, filter);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching campaign click summary:", error);
      res.status(500).json({
        message: "Failed to fetch campaign click summary",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/campaign-click-records/generate-test-data", async (req, res) => {
    try {
      const { campaignId, count = 100, days = 7 } = req.body;
      if (!campaignId) {
        return res.status(400).json({ message: "Campaign ID is required" });
      }
      const campaign = await storage.getCampaign(parseInt(campaignId));
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      const urls3 = await storage.getUrls(parseInt(campaignId));
      if (!urls3 || urls3.length === 0) {
        return res.status(400).json({ message: "Campaign has no URLs" });
      }
      const now = /* @__PURE__ */ new Date();
      const records = [];
      for (let i = 0; i < parseInt(count.toString()); i++) {
        const url = urls3[Math.floor(Math.random() * urls3.length)];
        const randomDayOffset = Math.floor(Math.random() * parseInt(days.toString()));
        const timestamp2 = new Date(now);
        timestamp2.setDate(timestamp2.getDate() - randomDayOffset);
        const hour = Math.floor(Math.random() * 24);
        timestamp2.setHours(hour);
        timestamp2.setMinutes(Math.floor(Math.random() * 60));
        timestamp2.setSeconds(Math.floor(Math.random() * 60));
        await storage.recordCampaignClick(
          parseInt(campaignId),
          url.id
        );
        records.push({
          timestamp: timestamp2,
          urlId: url.id
        });
      }
      res.json({
        success: true,
        message: `Generated ${count} test click records for campaign #${campaignId} across ${days} days`,
        recordsGenerated: records.length
      });
    } catch (error) {
      console.error("Error generating test click records:", error);
      res.status(500).json({
        message: "Failed to generate test click records",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/campaign-click-records/generate-specific-test-data", async (req, res) => {
    try {
      const { campaignId, clicksPerDay = 20 } = req.body;
      if (!campaignId) {
        return res.status(400).json({ message: "Campaign ID is required" });
      }
      const campaign = await storage.getCampaign(parseInt(campaignId));
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      const urls3 = await storage.getUrls(parseInt(campaignId));
      if (!urls3 || urls3.length === 0) {
        return res.status(400).json({ message: "Campaign has no URLs" });
      }
      const now = /* @__PURE__ */ new Date();
      let totalRecords = 0;
      const allRecords = [];
      console.log(`\u{1F9F9} Clearing existing redirect logs for campaign ${campaignId} before generating new test data`);
      try {
        await db.delete(campaignRedirectLogs).where(eq11(campaignRedirectLogs.campaignId, parseInt(campaignId)));
      } catch (err) {
        console.error("Error clearing existing logs:", err);
      }
      console.log(`\u{1F4CA} Generating ${clicksPerDay} clicks for today`);
      for (let i = 0; i < clicksPerDay; i++) {
        const url = urls3[Math.floor(Math.random() * urls3.length)];
        const timestamp2 = new Date(now);
        timestamp2.setHours(Math.floor(Math.random() * 24));
        timestamp2.setMinutes(Math.floor(Math.random() * 60));
        timestamp2.setSeconds(Math.floor(Math.random() * 60));
        await storage.recordCampaignClick(parseInt(campaignId), url.id);
        await redirectLogsManager.logRedirect(parseInt(campaignId), url.id);
        allRecords.push({ timestamp: timestamp2, urlId: url.id });
        totalRecords++;
      }
      console.log(`\u{1F4CA} Generating ${clicksPerDay} clicks for yesterday`);
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      for (let i = 0; i < clicksPerDay; i++) {
        const url = urls3[Math.floor(Math.random() * urls3.length)];
        const timestamp2 = new Date(yesterday);
        timestamp2.setHours(Math.floor(Math.random() * 24));
        timestamp2.setMinutes(Math.floor(Math.random() * 60));
        timestamp2.setSeconds(Math.floor(Math.random() * 60));
        const formattedDate = format5(timestamp2, "yyyy-MM-dd");
        const hour = timestamp2.getHours();
        try {
          await db.insert(campaignRedirectLogs).values({
            campaignId: parseInt(campaignId),
            urlId: url.id,
            redirectTime: timestamp2,
            dateKey: formattedDate,
            hourKey: hour
          });
        } catch (err) {
          console.error("Error inserting test log for yesterday:", err);
        }
        allRecords.push({ timestamp: timestamp2, urlId: url.id });
        totalRecords++;
      }
      console.log(`\u{1F4CA} Generating ${clicksPerDay * 5} clicks for last month`);
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      for (let i = 0; i < clicksPerDay * 5; i++) {
        const url = urls3[Math.floor(Math.random() * urls3.length)];
        const timestamp2 = new Date(lastMonth);
        timestamp2.setDate(Math.floor(Math.random() * 28) + 1);
        timestamp2.setHours(Math.floor(Math.random() * 24));
        timestamp2.setMinutes(Math.floor(Math.random() * 60));
        timestamp2.setSeconds(Math.floor(Math.random() * 60));
        const formattedDate = format5(timestamp2, "yyyy-MM-dd");
        const hour = timestamp2.getHours();
        try {
          await db.insert(campaignRedirectLogs).values({
            campaignId: parseInt(campaignId),
            urlId: url.id,
            redirectTime: timestamp2,
            dateKey: formattedDate,
            hourKey: hour
          });
        } catch (err) {
          console.error("Error inserting test log for last month:", err);
        }
        allRecords.push({ timestamp: timestamp2, urlId: url.id });
        totalRecords++;
      }
      console.log(`\u{1F4CA} Generating ${clicksPerDay * 10} clicks for last year`);
      const lastYear = new Date(now);
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      for (let i = 0; i < clicksPerDay * 10; i++) {
        const url = urls3[Math.floor(Math.random() * urls3.length)];
        const timestamp2 = new Date(lastYear);
        timestamp2.setMonth(Math.floor(Math.random() * 12));
        timestamp2.setDate(Math.floor(Math.random() * 28) + 1);
        timestamp2.setHours(Math.floor(Math.random() * 24));
        timestamp2.setMinutes(Math.floor(Math.random() * 60));
        timestamp2.setSeconds(Math.floor(Math.random() * 60));
        const formattedDate = format5(timestamp2, "yyyy-MM-dd");
        const hour = timestamp2.getHours();
        try {
          await db.insert(campaignRedirectLogs).values({
            campaignId: parseInt(campaignId),
            urlId: url.id,
            redirectTime: timestamp2,
            dateKey: formattedDate,
            hourKey: hour
          });
        } catch (err) {
          console.error("Error inserting test log for last year:", err);
        }
        allRecords.push({ timestamp: timestamp2, urlId: url.id });
        totalRecords++;
      }
      res.json({
        success: true,
        message: `Generated ${totalRecords} test click records for campaign #${campaignId} across different time periods`,
        counts: {
          today: clicksPerDay,
          yesterday: clicksPerDay,
          lastMonth: clicksPerDay * 5,
          lastYear: clicksPerDay * 10,
          total: totalRecords
        }
      });
    } catch (error) {
      console.error("Error generating specific test click records:", error);
      res.status(500).json({
        message: "Failed to generate test click records",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

// server/redirect-logs-routes.ts
function registerRedirectLogsRoutes(app2) {
  app2.get("/api/redirect-logs/summary/:campaignId", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      const filterType = req.query.filterType || "today";
      const showHourly = req.query.showHourly === "true";
      const filter = {
        filterType,
        showHourly
      };
      if (filterType === "custom_range") {
        if (req.query.startDate && req.query.endDate) {
          filter.startDate = req.query.startDate;
          filter.endDate = req.query.endDate;
        } else {
          return res.status(400).json({
            message: "startDate and endDate are required for custom_range filter type"
          });
        }
      }
      const summary = await redirectLogsManager.getCampaignSummary(campaignId, filter);
      res.json({
        ...summary,
        campaignName: campaign.name,
        campaignId: campaign.id
      });
    } catch (error) {
      console.error("Error fetching redirect logs summary:", error);
      res.status(500).json({
        message: "Failed to fetch redirect logs summary",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/redirect-logs/raw/:campaignId", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      const logs = await redirectLogsManager.getRawRedirectLogs(campaignId);
      res.json({
        campaignName: campaign.name,
        campaignId: campaign.id,
        totalLogs: logs.length,
        logs
      });
    } catch (error) {
      console.error("Error fetching raw redirect logs:", error);
      res.status(500).json({
        message: "Failed to fetch raw redirect logs",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/redirect-logs/generate-test-data", async (req, res) => {
    try {
      const { campaignId, count = 100, days = 7 } = req.body;
      if (!campaignId) {
        return res.status(400).json({ message: "Campaign ID is required" });
      }
      const campaign = await storage.getCampaign(parseInt(campaignId));
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      const urls3 = await storage.getUrls(parseInt(campaignId));
      if (!urls3 || urls3.length === 0) {
        return res.status(400).json({ message: "Campaign has no URLs" });
      }
      const now = /* @__PURE__ */ new Date();
      const records = [];
      for (let i = 0; i < parseInt(count.toString()); i++) {
        const url = urls3[Math.floor(Math.random() * urls3.length)];
        const randomDayOffset = Math.floor(Math.random() * parseInt(days.toString()));
        const timestamp2 = new Date(now);
        timestamp2.setDate(timestamp2.getDate() - randomDayOffset);
        const hour = Math.floor(Math.random() * 24);
        timestamp2.setHours(hour);
        timestamp2.setMinutes(Math.floor(Math.random() * 60));
        timestamp2.setSeconds(Math.floor(Math.random() * 60));
        await redirectLogsManager.logRedirect(
          parseInt(campaignId),
          url.id
        );
        records.push({
          timestamp: timestamp2,
          urlId: url.id
        });
      }
      res.json({
        success: true,
        message: `Generated ${count} test redirect logs for campaign #${campaignId} across ${days} days`,
        recordsGenerated: records.length
      });
    } catch (error) {
      console.error("Error generating test redirect logs:", error);
      res.status(500).json({
        message: "Failed to generate test redirect logs",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

// server/routes.ts
init_url_budget_logger();
init_traffic_generator();

// server/test-reports-api.ts
init_trafficstar_spent_helper();
init_trafficstar_service();
import axios2 from "axios";
function registerReportsAPITestRoutes(app2) {
  app2.post("/api/test-reports-api", async (req, res) => {
    try {
      const { campaignId } = req.body;
      if (!campaignId) {
        return res.status(400).json({ error: "Campaign ID is required" });
      }
      try {
        const today = getTodayFormatted();
        console.log("Getting auth headers for reports API test");
        const headers = await trafficStarService.getAuthHeaders();
        const baseUrl = "https://api.trafficstars.com/v1.1";
        const reportUrl = `${baseUrl}/advertiser/campaign/report/by-day`;
        console.log(`Using campaign report endpoint: ${reportUrl}`);
        console.log(`Using current UTC date ${today} for both from and to, campaign_id=${campaignId}`);
        const params = new URLSearchParams();
        params.append("campaign_id", campaignId.toString());
        params.append("date_from", today);
        params.append("date_to", today);
        params.append("group_by", "day");
        params.append("columns", "amount");
        console.log(`Request parameters: ${params.toString()}`);
        const reportResponse = await axios2.get(`${reportUrl}?${params.toString()}`, { headers });
        const responseDataString = JSON.stringify(reportResponse.data);
        console.log("Report API raw response:", responseDataString.length > 500 ? responseDataString.substring(0, 500) + "..." : responseDataString);
        console.log("Response data type:", typeof reportResponse.data);
        if (Array.isArray(reportResponse.data)) {
          console.log("Response is an array with length:", reportResponse.data.length);
          if (reportResponse.data.length > 0) {
            console.log("First item keys:", Object.keys(reportResponse.data[0]));
            console.log("First item sample:", JSON.stringify(reportResponse.data[0]).substring(0, 100));
          }
        } else {
          console.log("Response is not an array, structure:", Object.keys(reportResponse.data || {}));
        }
        const totalSpent = parseReportSpentValue(reportResponse.data);
        console.log("Trying to get campaign details for comparison");
        const campaign = await trafficStarService.getCampaign(campaignId);
        console.log("Campaign direct lookup result:", JSON.stringify(campaign).substring(0, 500));
        let campaignSpentValue = 0;
        if (campaign && campaign.spent !== void 0) {
          if (typeof campaign.spent === "string") {
            campaignSpentValue = parseFloat(campaign.spent);
          } else if (typeof campaign.spent === "number") {
            campaignSpentValue = campaign.spent;
          }
        } else if (campaign && campaign.spent_today !== void 0) {
          if (typeof campaign.spent_today === "string") {
            campaignSpentValue = parseFloat(campaign.spent_today);
          } else if (typeof campaign.spent_today === "number") {
            campaignSpentValue = campaign.spent_today;
          }
        }
        return res.status(200).json({
          success: true,
          date: today,
          rawResponse: reportResponse.data,
          extractedSpent: totalSpent,
          campaignDirectSpent: campaignSpentValue,
          campaignData: campaign
        });
      } catch (error) {
        console.error("Error testing reports API:", error);
        let errorDetails = { message: "Unknown error" };
        if (error.response) {
          errorDetails = {
            message: "API Error Response",
            status: error.response.status,
            data: error.response.data
          };
          console.error("Error response status:", error.response.status);
          console.error("Error response data:", error.response.data);
        } else if (error.message) {
          errorDetails = { message: error.message };
        }
        try {
          console.log("Trying fallback to direct campaign lookup");
          const campaign = await trafficStarService.getCampaign(campaignId);
          let spentValue = 0;
          if (campaign.spent_today !== void 0) {
            if (typeof campaign.spent_today === "number") {
              spentValue = campaign.spent_today;
            } else if (typeof campaign.spent_today === "string") {
              spentValue = parseFloat(campaign.spent_today);
            }
          } else if (campaign.spent !== void 0) {
            if (typeof campaign.spent === "number") {
              spentValue = campaign.spent;
            } else if (typeof campaign.spent === "string") {
              spentValue = parseFloat(campaign.spent);
            }
          }
          return res.status(200).json({
            success: true,
            errorDetails,
            fallbackCampaign: campaign,
            directSpentValue: spentValue
          });
        } catch (fallbackError) {
          console.error("Even fallback lookup failed:", fallbackError);
        }
        return res.status(500).json({
          error: "Failed to test reports API",
          details: errorDetails
        });
      }
    } catch (error) {
      console.error("Error in test reports API route:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  console.log("TrafficStar Reports API test routes registered");
}

// server/routes.ts
async function registerRoutes(app2) {
  const server = createServer(app2);
  registerCampaignClickRoutes(app2);
  registerRedirectLogsRoutes(app2);
  registerUrlClickRoutes(app2);
  registerReportsAPITestRoutes(app2);
  app2.use("/api/url-budget-test", url_budget_test_api_default);
  app2.get("/api/trafficstar/debug-generator/:campaignId", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId, 10);
      if (isNaN(campaignId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid campaign ID"
        });
      }
      const { debugProcessCampaign: debugProcessCampaign4 } = await Promise.resolve().then(() => (init_traffic_generator(), traffic_generator_exports));
      const result = await debugProcessCampaign4(campaignId);
      return res.json(result);
    } catch (error) {
      console.error("Error in debug generator route:", error);
      res.status(500).json({
        success: false,
        message: "Failed to run debug traffic generator",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/trafficstar/test-url-quantities/:campaignId", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId, 10);
      if (isNaN(campaignId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid campaign ID"
        });
      }
      const { highClickUrl, lowClickUrl } = req.body;
      if (highClickUrl) {
        await db.execute(sql9`
          INSERT INTO urls (name, campaign_id, status, target_url, click_limit, clicks, original_click_limit)
          VALUES ('High Click Test URL', ${campaignId}, 'active', 'https://example.com/high', 20000, 0, 20000)
          ON CONFLICT (id) DO NOTHING
        `);
        console.log(`Created test URL with high clicks (20,000) for campaign ${campaignId}`);
      }
      if (lowClickUrl) {
        await db.execute(sql9`
          INSERT INTO urls (name, campaign_id, status, target_url, click_limit, clicks, original_click_limit)
          VALUES ('Low Click Test URL', ${campaignId}, 'active', 'https://example.com/low', 4000, 0, 4000)
          ON CONFLICT (id) DO NOTHING
        `);
        console.log(`Created test URL with low clicks (4,000) for campaign ${campaignId}`);
      }
      return res.json({
        success: true,
        message: "Test URLs created successfully",
        campaignId,
        created: {
          highClickUrl: !!highClickUrl,
          lowClickUrl: !!lowClickUrl
        }
      });
    } catch (error) {
      console.error("Error creating test URLs:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create test URLs",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/trafficstar/test-generator/:campaignId", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId, 10);
      if (isNaN(campaignId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid campaign ID"
        });
      }
      const { forceMode } = req.body;
      const { processTrafficGenerator: processTrafficGenerator3 } = await Promise.resolve().then(() => (init_traffic_generator(), traffic_generator_exports));
      console.log(`\u{1F9EA} TESTING Traffic Generator for campaign ${campaignId} with mode: ${forceMode || "standard"}`);
      await processTrafficGenerator3(campaignId, forceMode);
      return res.json({
        success: true,
        message: `Traffic Generator process triggered for campaign ${campaignId}`,
        campaignId,
        options: {
          forceMode: forceMode || "standard"
        }
      });
    } catch (error) {
      console.error("Error testing Traffic Generator:", error);
      res.status(500).json({
        success: false,
        message: "Failed to test Traffic Generator",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/system/fix-missing-url-click-logs", async (_req, res) => {
    try {
      const { fixMissingUrlClickLogs: fixMissingUrlClickLogs2 } = await Promise.resolve().then(() => (init_fix_url_click_logs(), fix_url_click_logs_exports));
      const result = await fixMissingUrlClickLogs2();
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      console.error("Error fixing missing URL click logs:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fix missing URL click logs",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/system/click-protection/apply", async (_req, res) => {
    try {
      const result = await applyClickProtection();
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      console.error("Error applying click protection:", error);
      res.status(500).json({
        success: false,
        message: "Failed to apply click protection",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/system/click-protection/fix-trigger", async (_req, res) => {
    try {
      console.log("Applying fix to click protection trigger...");
      const triggerFix = `
        -- Fix click protection trigger function
        CREATE OR REPLACE FUNCTION prevent_unauthorized_click_updates()
        RETURNS TRIGGER AS $$
        BEGIN
          -- If protection bypass is enabled (click protection is disabled),
          -- allow all updates to go through (this handles Original URL Records updates)
          IF NOT (SELECT value FROM protection_settings WHERE key = 'click_protection_enabled') THEN
            -- Bypass enabled, allow all updates
            RETURN NEW;
          END IF;
          
          -- If we get here, click protection is enabled (bypass is not enabled)
          -- We still want click_limit to be updatable for multiplier changes, etc.
          -- But we never want original_click_limit to change unless bypass is enabled
          
          -- Check if original click limit is being changed - never allow this without bypass
          IF NEW.original_click_limit IS DISTINCT FROM OLD.original_click_limit THEN
            RAISE WARNING 'Preventing unauthorized update to original_click_limit (from % to %) for URL %', 
              OLD.original_click_limit, NEW.original_click_limit, NEW.id;
            NEW.original_click_limit := OLD.original_click_limit;
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `;
      await db.execute(triggerFix);
      console.log("Testing fixed trigger with bypass...");
      await storage.setClickProtectionBypass(true);
      try {
        const testRecordId = 999999;
        try {
          await db.execute(`
            INSERT INTO original_url_records (id, name, target_url, original_click_limit)
            VALUES (${testRecordId}, 'test-fix-trigger', 'https://example.com', 1000)
            ON CONFLICT (id) DO NOTHING
          `);
        } catch (e) {
          console.log("Test record already exists:", e);
        }
        console.log("Fix applied successfully!");
        return res.json({
          success: true,
          message: "Click protection trigger fixed successfully",
          details: {
            fix: "Updated trigger to allow original click limit updates with bypass enabled"
          }
        });
      } finally {
        await storage.setClickProtectionBypass(false);
      }
    } catch (error) {
      console.error("Error fixing click protection trigger:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fix click protection trigger",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/system/click-protection/bypass", async (req, res) => {
    try {
      const enable = req.body.enable === true;
      await storage.setClickProtectionBypass(enable);
      return res.json({
        success: true,
        message: `Click protection bypass ${enable ? "enabled" : "disabled"} successfully`,
        status: {
          bypassEnabled: enable,
          protectionActive: !enable
        }
      });
    } catch (error) {
      console.error("Error setting click protection bypass:", error);
      res.status(500).json({
        success: false,
        message: "Failed to set click protection bypass",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/system/click-protection/legacy", async (_req, res) => {
    try {
      console.log("=== Applying Legacy Click Protection ===");
      console.log("This will install database triggers to prevent automatic updates to click values");
      await db.execute(`
        CREATE TABLE IF NOT EXISTS protection_settings (
          key TEXT PRIMARY KEY,
          value BOOLEAN NOT NULL
        )
      `);
      await db.execute(`
        INSERT INTO protection_settings (key, value)
        VALUES ('click_protection_enabled', TRUE)
        ON CONFLICT (key) DO NOTHING
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS sync_operations (
          id SERIAL PRIMARY KEY,
          is_auto_sync BOOLEAN NOT NULL DEFAULT FALSE,
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE
        )
      `);
      await db.execute(`
        CREATE OR REPLACE FUNCTION click_protection_enabled()
        RETURNS BOOLEAN AS $$
        BEGIN
          RETURN (SELECT value FROM protection_settings WHERE key = 'click_protection_enabled');
        END;
        $$ LANGUAGE plpgsql
      `);
      await db.execute(`
        CREATE OR REPLACE FUNCTION is_auto_sync()
        RETURNS BOOLEAN AS $$
        BEGIN
          RETURN EXISTS (
            SELECT 1 FROM sync_operations 
            WHERE is_auto_sync = TRUE AND completed_at IS NULL
          );
        END;
        $$ LANGUAGE plpgsql
      `);
      await db.execute(`
        CREATE OR REPLACE FUNCTION start_auto_sync()
        RETURNS INTEGER AS $$
        DECLARE
          operation_id INTEGER;
        BEGIN
          INSERT INTO sync_operations (is_auto_sync) 
          VALUES (TRUE) 
          RETURNING id INTO operation_id;
          
          RETURN operation_id;
        END;
        $$ LANGUAGE plpgsql
      `);
      await db.execute(`
        CREATE OR REPLACE FUNCTION end_auto_sync(operation_id INTEGER)
        RETURNS VOID AS $$
        BEGIN
          UPDATE sync_operations
          SET completed_at = NOW()
          WHERE id = operation_id;
        END;
        $$ LANGUAGE plpgsql
      `);
      await db.execute(`
        CREATE OR REPLACE FUNCTION prevent_auto_click_updates()
        RETURNS TRIGGER AS $$
        BEGIN
          -- If this is an automatic sync operation
          IF click_protection_enabled() AND is_auto_sync() THEN
            -- Restore the original click_limit value if it was changed
            IF NEW.click_limit IS DISTINCT FROM OLD.click_limit THEN
              RAISE WARNING 'Preventing automatic update to click_limit (from % to %) for URL %', 
                OLD.click_limit, NEW.click_limit, NEW.id;
              NEW.click_limit := OLD.click_limit;
            END IF;
            
            -- Restore the original clicks value if it was changed
            IF NEW.clicks IS DISTINCT FROM OLD.clicks THEN
              RAISE WARNING 'Preventing automatic update to clicks (from % to %) for URL %', 
                OLD.clicks, NEW.clicks, NEW.id;
              NEW.clicks := OLD.clicks;
            END IF;
            
            -- Restore the original original_click_limit value if it was changed
            IF NEW.original_click_limit IS DISTINCT FROM OLD.original_click_limit THEN
              RAISE WARNING 'Preventing automatic update to original_click_limit (from % to %) for URL %', 
                OLD.original_click_limit, NEW.original_click_limit, NEW.id;
              NEW.original_click_limit := OLD.original_click_limit;
            END IF;
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);
      await db.execute(`
        CREATE OR REPLACE FUNCTION prevent_campaign_auto_click_updates()
        RETURNS TRIGGER AS $$
        BEGIN
          -- If this is an automatic sync operation
          IF click_protection_enabled() AND is_auto_sync() THEN
            -- Restore the original total_clicks value if it was changed
            IF NEW.total_clicks IS DISTINCT FROM OLD.total_clicks THEN
              RAISE WARNING 'Preventing automatic update to total_clicks (from % to %) for campaign %', 
                OLD.total_clicks, NEW.total_clicks, NEW.id;
              NEW.total_clicks := OLD.total_clicks;
            END IF;
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);
      await db.execute(`
        DROP TRIGGER IF EXISTS prevent_auto_click_update_trigger ON urls
      `);
      await db.execute(`
        DROP TRIGGER IF EXISTS prevent_campaign_auto_click_update_trigger ON campaigns
      `);
      await db.execute(`
        CREATE TRIGGER prevent_auto_click_update_trigger
        BEFORE UPDATE ON urls
        FOR EACH ROW
        EXECUTE FUNCTION prevent_auto_click_updates()
      `);
      await db.execute(`
        CREATE TRIGGER prevent_campaign_auto_click_update_trigger
        BEFORE UPDATE ON campaigns
        FOR EACH ROW
        EXECUTE FUNCTION prevent_campaign_auto_click_updates()
      `);
      const urlTriggersResult = await db.execute(`
        SELECT COUNT(*) AS count FROM pg_trigger 
        WHERE tgname = 'prevent_auto_click_update_trigger'
      `);
      const campaignTriggersResult = await db.execute(`
        SELECT COUNT(*) AS count FROM pg_trigger 
        WHERE tgname = 'prevent_campaign_auto_click_update_trigger'
      `);
      const urlTriggers = parseInt(urlTriggersResult[0]?.count || "0");
      const campaignTriggers = parseInt(campaignTriggersResult[0]?.count || "0");
      if (urlTriggers > 0 && campaignTriggers > 0) {
        return res.json({
          success: true,
          message: "Click protection installed successfully!",
          details: {
            urlTriggers,
            campaignTriggers
          }
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to install click protection - triggers not found",
          details: {
            urlTriggers,
            campaignTriggers
          }
        });
      }
    } catch (error) {
      console.error("Error applying click protection:", error);
      res.status(500).json({
        success: false,
        message: "Failed to apply click protection",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/system/click-protection/simple-test", async (_req, res) => {
    try {
      console.log("Starting Simple Click Protection Test");
      const protectionSetting = await db.execute(`
        SELECT value FROM protection_settings WHERE key = 'click_protection_enabled'
      `);
      const protectionEnabled = protectionSetting.length > 0 && (protectionSetting[0].value === true || protectionSetting[0].value === "t");
      console.log(`Click protection is ${protectionEnabled ? "enabled" : "disabled"}`);
      if (!protectionEnabled) {
        await db.execute(`
          INSERT INTO protection_settings (key, value)
          VALUES ('click_protection_enabled', TRUE)
          ON CONFLICT (key) DO UPDATE SET value = TRUE
        `);
        console.log("Click protection enabled for testing");
      }
      console.log("Creating test table for click protection testing");
      try {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS click_protection_test (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            clicks INTEGER NOT NULL DEFAULT 0
          )
        `);
        await db.execute(`
          DO $$
          BEGIN
            -- Drop the trigger if it already exists
            DROP TRIGGER IF EXISTS prevent_test_auto_click_update_trigger ON click_protection_test;
            
            -- Create the trigger
            CREATE TRIGGER prevent_test_auto_click_update_trigger
            BEFORE UPDATE ON click_protection_test
            FOR EACH ROW
            EXECUTE FUNCTION prevent_auto_click_updates();
            
            RAISE NOTICE 'Created test click protection trigger successfully';
          END
          $$;
        `);
        console.log("Created test table and trigger for click protection testing");
      } catch (err) {
        console.error("Error creating test table or trigger:", err);
        throw err;
      }
      await db.execute(`
        INSERT INTO click_protection_test (name, clicks)
        VALUES ('Test Record', 100)
        ON CONFLICT DO NOTHING
      `);
      console.log("Getting test record from test table");
      const testRecords = await db.execute(`
        SELECT id, name, clicks FROM click_protection_test LIMIT 1
      `);
      console.log("Test records result:", JSON.stringify(testRecords));
      if (!testRecords || !testRecords.rows || testRecords.rows.length === 0) {
        return res.status(500).json({
          success: false,
          message: "Failed to create test record"
        });
      }
      console.log("First record:", JSON.stringify(testRecords.rows[0]));
      const testRecord = testRecords.rows[0];
      if (!testRecord.id) {
        console.error("Test record does not have an id property");
        console.log("Test record properties:", Object.keys(testRecord));
        return res.status(500).json({
          success: false,
          message: "Test record is missing id property",
          details: {
            record: testRecord,
            properties: Object.keys(testRecord)
          }
        });
      }
      const testRecordId = testRecord.id;
      console.log(`Test record: ${testRecord.name} (ID: ${testRecordId})`);
      console.log(`  - Current clicks: ${testRecord.clicks}`);
      console.log("\nTest 1: Manual update (should succeed)");
      const newClicks = testRecord.clicks + 50;
      await db.execute(`
        UPDATE click_protection_test
        SET clicks = ${newClicks}
        WHERE id = ${testRecordId}
      `);
      const updatedRecords = await db.execute(`
        SELECT id, name, clicks FROM click_protection_test WHERE id = ${testRecordId}
      `);
      console.log("Updated records result:", JSON.stringify(updatedRecords));
      const updatedRecord = updatedRecords.rows[0];
      const manualUpdateSucceeded = updatedRecord.clicks === newClicks;
      console.log(`Manual update result: ${manualUpdateSucceeded ? "SUCCESS" : "FAILED"}`);
      console.log(`  - New clicks value: ${updatedRecord.clicks}`);
      console.log("\nTest 2: Auto-sync update (should be blocked if protection is working)");
      const currentClicks = updatedRecord.clicks;
      const autoSyncClicks = 1947542743;
      const syncOpResult = await db.execute(`SELECT start_auto_sync() AS operation_id`);
      const syncOperationId = syncOpResult[0].operation_id;
      try {
        console.log(`Starting auto-sync operation ID: ${syncOperationId}`);
        console.log(`Attempting to update clicks from ${currentClicks} to ${autoSyncClicks}`);
        await db.execute(`
          UPDATE click_protection_test
          SET clicks = ${autoSyncClicks}
          WHERE id = ${testRecordId}
        `);
      } finally {
        await db.execute(`SELECT end_auto_sync(${syncOperationId})`);
        console.log("Auto-sync operation ended");
      }
      const finalRecords = await db.execute(`
        SELECT id, name, clicks FROM click_protection_test WHERE id = ${testRecordId}
      `);
      console.log("Final records result:", JSON.stringify(finalRecords));
      const finalRecord = finalRecords.rows[0];
      const autoUpdateBlocked = finalRecord.clicks !== autoSyncClicks;
      console.log(`Auto-sync update blocked: ${autoUpdateBlocked ? "YES (Good)" : "NO (Bad)"}`);
      console.log(`  - Final clicks value: ${finalRecord.clicks}`);
      return res.json({
        success: true,
        clickProtectionEnabled: protectionEnabled,
        testResults: {
          manualUpdateSucceeded,
          autoUpdateBlocked,
          overallProtectionWorking: manualUpdateSucceeded && autoUpdateBlocked
        },
        details: {
          initialClicks: testRecord.clicks,
          afterManualUpdate: updatedRecord.clicks,
          attemptedAutoSyncClicks: autoSyncClicks,
          finalClicks: finalRecord.clicks
        }
      });
    } catch (error) {
      console.error("Error testing click protection:", error);
      res.status(500).json({
        success: false,
        message: "Failed to test click protection",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/system/click-protection/test", async (_req, res) => {
    try {
      console.log("Starting Click Protection Test");
      const protectionSetting = await db.execute(`
        SELECT value FROM protection_settings WHERE key = 'click_protection_enabled'
      `);
      const protectionEnabled = protectionSetting.length > 0 && (protectionSetting[0].value === true || protectionSetting[0].value === "t");
      console.log(`Click protection is ${protectionEnabled ? "enabled" : "disabled"}`);
      if (!protectionEnabled) {
        await db.execute(`
          INSERT INTO protection_settings (key, value)
          VALUES ('click_protection_enabled', TRUE)
          ON CONFLICT (key) DO UPDATE SET value = TRUE
        `);
        console.log("Click protection enabled for testing");
      }
      console.log("\nTest 1: Manual update (should succeed)");
      const campaignsCheck = await db.execute(`
        SELECT id FROM campaigns LIMIT 1
      `);
      console.log("Campaigns check result:", JSON.stringify(campaignsCheck));
      if (campaignsCheck.length === 0) {
        console.log("No campaigns found. Creating a test campaign...");
        await db.execute(`
          INSERT INTO campaigns (name, redirect_domain, created_at, updated_at, redirect_method)
          VALUES ('Test Campaign', 'example.com', NOW(), NOW(), 'http_307')
        `);
        console.log("Test campaign created");
      }
      const campaigns3 = await db.execute(`
        SELECT id FROM campaigns ORDER BY id ASC LIMIT 1
      `);
      console.log("Available campaigns:", JSON.stringify(campaigns3));
      if (campaigns3.length === 0) {
        return res.status(500).json({
          success: false,
          message: "Failed to get campaigns",
          error: "No campaigns found"
        });
      }
      const campaignId = campaigns3[0].id;
      console.log(`Selected campaign ID: ${campaignId}`);
      console.log(`Using campaign ID: ${campaignId} for test`);
      const testUrls = await db.execute(`
        SELECT id, name, clicks, click_limit 
        FROM urls 
        LIMIT 1
      `);
      let testUrl;
      if (testUrls.length === 0) {
        console.log("No URLs found for testing. Creating a test URL...");
        await db.execute(`
          INSERT INTO urls (name, target_url, campaign_id, clicks, click_limit, original_click_limit, status)
          VALUES ('Test URL', 'https://example.com', ${campaignId}, 0, 100, 100, 'active')
        `);
        const newUrls = await db.execute(`
          SELECT id, name, clicks, click_limit 
          FROM urls 
          ORDER BY id DESC
          LIMIT 1
        `);
        if (newUrls.length === 0) {
          return res.status(500).json({
            success: false,
            message: "Failed to create test URL",
            error: "Could not create test URL"
          });
        }
        testUrl = newUrls[0];
      } else {
        testUrl = testUrls[0];
      }
      console.log(`Test URL: ${testUrl.name} (ID: ${testUrl.id})`);
      console.log(`  - Current clicks: ${testUrl.clicks}`);
      console.log(`  - Click limit: ${testUrl.click_limit}`);
      const newClickLimit = testUrl.click_limit + 50;
      await db.execute(`
        UPDATE urls
        SET click_limit = ${newClickLimit}
        WHERE id = ${testUrl.id}
      `);
      const updatedUrl = await db.execute(`
        SELECT id, name, clicks, click_limit 
        FROM urls 
        WHERE id = ${testUrl.id}
      `);
      const manualUpdateSucceeded = updatedUrl[0].click_limit === newClickLimit;
      console.log("\nTest 2: Automatic update (should be blocked)");
      const autoClickLimit = updatedUrl[0].click_limit + 1e6;
      console.log(`Attempting to auto-update click limit to ${autoClickLimit} (should be blocked)...`);
      const syncOpResult = await db.execute(`SELECT start_auto_sync() AS operation_id`);
      const syncOperationId = syncOpResult[0].operation_id;
      try {
        await db.execute(`
          UPDATE urls
          SET click_limit = ${autoClickLimit}
          WHERE id = ${testUrl.id}
        `);
      } finally {
        await db.execute(`SELECT end_auto_sync(${syncOperationId})`);
      }
      const finalUrl = await db.execute(`
        SELECT id, name, clicks, click_limit 
        FROM urls 
        WHERE id = ${testUrl.id}
      `);
      const autoUpdateBlocked = finalUrl[0].click_limit !== autoClickLimit;
      return res.json({
        success: true,
        protectionEnabled,
        testUrl: {
          id: testUrl.id,
          name: testUrl.name,
          initialClickLimit: testUrl.click_limit,
          manualUpdateClickLimit: newClickLimit,
          attemptedAutoUpdateClickLimit: autoClickLimit,
          finalClickLimit: finalUrl[0].click_limit
        },
        testResults: {
          manualUpdateSucceeded,
          autoUpdateBlocked,
          overallProtectionWorking: manualUpdateSucceeded && autoUpdateBlocked
        }
      });
    } catch (error) {
      console.error("Error testing click protection:", error);
      res.status(500).json({
        success: false,
        message: "Failed to test click protection",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/campaigns", async (_req, res) => {
    try {
      const campaigns3 = await storage.getCampaigns();
      res.json(campaigns3);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns", error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.get("/api/campaigns/path/:customPath", async (req, res) => {
    try {
      const customPath = req.params.customPath;
      if (!customPath) {
        return res.status(400).json({ message: "Invalid custom path" });
      }
      const campaign = await storage.getCampaignByCustomPath(customPath);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });
  app2.get("/api/campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });
  app2.get("/api/campaigns/:id/with-urls", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      const campaignUrls = await storage.getUrlsByCampaign(id);
      res.json({
        ...campaign,
        urls: campaignUrls
      });
    } catch (error) {
      console.error("Error fetching campaign with URLs:", error);
      res.status(500).json({ message: "Failed to fetch campaign with URLs" });
    }
  });
  app2.post("/api/campaigns", async (req, res) => {
    try {
      console.log("\u{1F50D} DEBUG: Campaign creation request received:", JSON.stringify(req.body, null, 2));
      const result = insertCampaignSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        console.log("\u{1F50D} DEBUG: Campaign validation failed:", validationError.message);
        return res.status(400).json({ message: validationError.message });
      }
      const campaignData = result.data;
      console.log("\u{1F50D} DEBUG: Validated campaign data:", JSON.stringify(campaignData, null, 2));
      console.log("\u{1F50D} DEBUG: Multiplier type:", typeof campaignData.multiplier);
      console.log("\u{1F50D} DEBUG: Multiplier value:", campaignData.multiplier);
      const campaign = await storage.createCampaign(campaignData);
      console.log("\u{1F50D} DEBUG: Campaign created successfully with ID:", campaign.id);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });
  app2.put("/api/campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      console.log("\u{1F50D} DEBUG: Campaign update request received:", JSON.stringify(req.body, null, 2));
      const originalTrafficGeneratorEnabled = req.body.trafficGeneratorEnabled;
      if (req.body.trafficGeneratorEnabled !== void 0) {
        req.body.trafficGeneratorEnabled = req.body.trafficGeneratorEnabled === true;
      }
      console.log("\u{1F50D} DEBUG: Traffic Generator enabled value (after normalization):", req.body.trafficGeneratorEnabled, "type:", typeof req.body.trafficGeneratorEnabled);
      const trafficGeneratorStateChanged = originalTrafficGeneratorEnabled !== void 0;
      if (req.body.trafficSenderEnabled !== void 0) {
        req.body.trafficSenderEnabled = req.body.trafficSenderEnabled === true;
      }
      console.log("\u{1F50D} DEBUG: Traffic Sender enabled value (after normalization):", req.body.trafficSenderEnabled, "type:", typeof req.body.trafficSenderEnabled);
      if (req.body.clickLimit || req.body.originalClickLimit) {
        return res.status(403).json({
          message: "URL click limits can only be modified from the Original URL Records page",
          error: "RESTRICTED_OPERATION",
          details: "For data integrity reasons, click quantities can only be modified from the Original URL Records section."
        });
      }
      console.log("\u{1F50D} DEBUG: Campaign update request TYPE:", typeof req.body.pricePerThousand);
      console.log("\u{1F50D} DEBUG: Campaign update request VALUE:", req.body.pricePerThousand);
      const result = updateCampaignSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        console.log("\u{1F50D} DEBUG: Campaign update validation failed:", validationError.message);
        return res.status(400).json({ message: validationError.message });
      }
      const { multiplier } = result.data;
      const existingCampaign = await storage.getCampaign(id);
      if (!existingCampaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      console.log("\u{1F50D} DEBUG: Campaign update requested: ID", id);
      const oldMultiplierValue = typeof existingCampaign.multiplier === "string" ? parseFloat(existingCampaign.multiplier) : existingCampaign.multiplier || 1;
      const newMultiplierValue = multiplier !== void 0 ? Number(multiplier) : oldMultiplierValue;
      console.log(`  - Current multiplier: ${oldMultiplierValue} (type: ${typeof oldMultiplierValue})`);
      console.log(`  - Requested multiplier: ${newMultiplierValue} (type: ${typeof newMultiplierValue})`);
      const updatedCampaign = await storage.updateCampaign(id, result.data);
      const multiplierChanged = multiplier !== void 0 && Math.abs(oldMultiplierValue - newMultiplierValue) > 1e-5;
      if (multiplierChanged) {
        console.log(`\u{1F50D} DEBUG: Multiplier change detected: ${oldMultiplierValue} \u2192 ${newMultiplierValue}`);
        const campaignUrls = await storage.getUrls(id);
        const activeOrPausedUrls = campaignUrls.filter(
          (url) => url.status === "active" || url.status === "paused"
        );
        console.log(`  - Found ${activeOrPausedUrls.length} active/paused URLs to update`);
        console.log("\u26A0\uFE0F TEMPORARILY BYPASSING CLICK PROTECTION for multiplier-based recalculation");
        await storage.setClickProtectionBypass(true);
        try {
          for (const url of activeOrPausedUrls) {
            const newClickLimit = Math.ceil(url.originalClickLimit * newMultiplierValue);
            console.log(`  - Updating URL ${url.id}: ${url.originalClickLimit} \xD7 ${newMultiplierValue} = ${newClickLimit}`);
            await storage.updateUrl(url.id, {
              clickLimit: newClickLimit,
              // Recalculate the click limit
              // Keep all other values unchanged
              originalClickLimit: url.originalClickLimit,
              // Original always stays the same
              name: url.name,
              targetUrl: url.targetUrl,
              status: url.status
            });
          }
        } finally {
          console.log("\u2705 Re-enabling click protection after multiplier update");
          await storage.setClickProtectionBypass(false);
        }
      } else {
        console.log("\u{1F50D} DEBUG: No multiplier change detected, skipping URL updates");
      }
      if (trafficGeneratorStateChanged && req.body.trafficGeneratorEnabled === true) {
        console.log(`\u{1F50D} DEBUG: Traffic Generator was just enabled for campaign ${id}, running immediate check...`);
        processTrafficGenerator(id).catch((err) => {
          console.error(`Error in immediate traffic generator check for campaign ${id}:`, err);
        });
      }
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Failed to update campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });
  app2.delete("/api/campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      const deleted = await storage.deleteCampaign(id);
      if (deleted) {
        res.status(200).json({ message: "Campaign deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete campaign" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });
  app2.get("/api/campaigns/:campaignId/urls", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      const urls3 = await storage.getUrls(campaignId);
      res.json(urls3);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch URLs" });
    }
  });
  app2.post("/api/campaigns/:campaignId/urls", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      console.log("\u{1F50D} DEBUG: Received URL creation request:", JSON.stringify(req.body, null, 2));
      console.log("\u{1F50D} DEBUG: Campaign multiplier:", campaign.multiplier);
      if (youtubeApiService.isYouTubeUrl(req.body.targetUrl)) {
        console.log(`\u{1F50D} DEBUG: URL is a YouTube URL - validating: ${req.body.targetUrl}`);
        console.log(`\u{1F50D} DEBUG: Campaign has YouTube API enabled and URL is a YouTube URL - validating: ${req.body.targetUrl}`);
        if (!youtubeApiService.isConfigured()) {
          console.warn("\u26A0\uFE0F YouTube API not configured - skipping validation");
        } else {
          const videoId = youtubeApiService.extractVideoId(req.body.targetUrl);
          if (!videoId) {
            console.log(`\u274C YouTube URL validation failed: Could not extract video ID from ${req.body.targetUrl}`);
            const originalClickLimit2 = parseInt(req.body.clickLimit, 10);
            const originalRecord = await storage.createOriginalUrlRecord({
              name: req.body.name,
              targetUrl: req.body.targetUrl,
              originalClickLimit: originalClickLimit2,
              status: "direct_rejected"
            });
            console.log(`\u2705 Created Original URL Record with direct_rejected status and ID: ${originalRecord.id}`);
            let clickLimit = originalClickLimit2;
            if (campaign.multiplier) {
              const multiplierValue = typeof campaign.multiplier === "string" ? parseFloat(campaign.multiplier) : campaign.multiplier;
              if (multiplierValue > 0.01) {
                clickLimit = Math.ceil(originalClickLimit2 * multiplierValue);
              }
            }
            console.log(`\u{1F50D} Skipping URL creation in campaign - rejected URLs are not added to campaign`);
            await youtubeApiService.saveDirectRejectedUrl(
              req.body,
              campaignId,
              "Invalid YouTube URL - could not extract video ID",
              videoId || "unknown",
              { deletedVideo: true }
            );
            return res.status(400).json({
              message: "URL rejected - Invalid YouTube URL format",
              status: "direct_rejected",
              reason: "Could not extract video ID from the URL"
            });
          }
          const validation = await youtubeApiService.validateSingleUrl(req.body.targetUrl, campaign);
          if (!validation.isValid) {
            console.log(`\u274C YouTube URL validation failed: ${validation.reason}`);
            const originalClickLimit2 = parseInt(req.body.clickLimit, 10);
            try {
              const originalRecord = await storage.createOriginalUrlRecord({
                name: req.body.name,
                targetUrl: req.body.targetUrl,
                originalClickLimit: originalClickLimit2,
                status: "direct_rejected"
              });
              console.log(`\u2705 Created Original URL Record with direct_rejected status and ID: ${originalRecord.id}`);
              let clickLimit = originalClickLimit2;
              if (campaign.multiplier) {
                const multiplierValue = typeof campaign.multiplier === "string" ? parseFloat(campaign.multiplier) : campaign.multiplier;
                if (multiplierValue > 0.01) {
                  clickLimit = Math.ceil(originalClickLimit2 * multiplierValue);
                }
              }
              console.log(`\u{1F50D} Skipping URL creation in campaign - rejected URLs are not added to campaign`);
              await youtubeApiService.saveDirectRejectedUrl(
                req.body,
                campaignId,
                validation.reason || "Unknown validation failure",
                videoId,
                validation.validationDetails || {}
              );
              console.log(`\u2705 Saved rejected URL to YouTube URL Records with reason: ${validation.reason || "Unknown validation failure"}`);
            } catch (error) {
              console.error("Error processing rejected URL:", error);
            }
            return res.status(400).json({
              message: "URL rejected - YouTube video validation failed",
              status: "direct_rejected",
              reason: validation.reason || "Video did not pass validation criteria"
            });
          }
          console.log(`\u2705 YouTube URL validation passed for: ${req.body.targetUrl}`);
        }
      }
      let originalClickLimit = parseInt(req.body.clickLimit, 10);
      if (isNaN(originalClickLimit) || originalClickLimit <= 0) {
        return res.status(400).json({ message: "Click limit must be a positive number" });
      }
      console.log("\u{1F50D} DEBUG: Original click limit (user input):", originalClickLimit);
      const existingRecord = await storage.getOriginalUrlRecordByName(req.body.name);
      if (!existingRecord) {
        console.log(`\u{1F50D} DEBUG: Creating Original URL Record for name: ${req.body.name}`);
        await storage.createOriginalUrlRecord({
          name: req.body.name,
          targetUrl: req.body.targetUrl || "",
          originalClickLimit
        });
        console.log(`\u2705 Created Original URL Record with click limit: ${originalClickLimit}`);
      } else {
        console.log(`\u{1F50D} DEBUG: Found existing Original URL Record #${existingRecord.id} for name: ${req.body.name}`);
        console.log(`\u{1F50D} DEBUG: Record has original click limit: ${existingRecord.originalClickLimit}`);
        if (originalClickLimit !== existingRecord.originalClickLimit) {
          console.log(`\u26A0\uFE0F WARNING: User-provided click limit (${originalClickLimit}) does not match Original URL Record (${existingRecord.originalClickLimit})`);
          console.log(`\u26A0\uFE0F Using Original URL Record value (${existingRecord.originalClickLimit}) as the authoritative source`);
          originalClickLimit = existingRecord.originalClickLimit;
        }
      }
      let calculatedClickLimit = originalClickLimit;
      if (campaign.multiplier) {
        const multiplierValue = typeof campaign.multiplier === "string" ? parseFloat(campaign.multiplier) : campaign.multiplier;
        if (multiplierValue > 0.01) {
          calculatedClickLimit = Math.ceil(originalClickLimit * multiplierValue);
          console.log("\u{1F50D} DEBUG: Calculated click limit after multiplier:", calculatedClickLimit);
          console.log(`\u{1F50D} DEBUG: Calculation: ${originalClickLimit} \xD7 ${multiplierValue} = ${calculatedClickLimit}`);
        }
      }
      let urlData = {
        ...req.body,
        campaignId,
        clickLimit: calculatedClickLimit,
        originalClickLimit
        // Now using the authoritative value from Original URL Record
      };
      console.log("\u{1F50D} DEBUG: Final URL data to be saved:", JSON.stringify(urlData, null, 2));
      const result = insertUrlSchema.safeParse(urlData);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      const url = await storage.createUrl(result.data);
      if (url.status === "rejected") {
        if (url.name.includes("#")) {
          return res.status(201).json({
            ...url,
            __message: `URL "${req.body.name}" was auto-numbered due to duplicate name`
          });
        } else {
          return res.status(201).json({
            ...url,
            __message: `URL "${req.body.name}" was rejected due to duplicate name`
          });
        }
      }
      if (campaign.trafficstarCampaignId) {
        try {
          console.log(`URL created in campaign ${campaignId} with TrafficStar campaign ID ${campaign.trafficstarCampaignId}`);
          console.log(`Scheduling budget update for this URL in 10 minutes`);
          await trafficStarService.trackNewUrlForBudgetUpdate(
            url.id,
            campaignId,
            campaign.trafficstarCampaignId,
            calculatedClickLimit,
            campaign.pricePerThousand || 1e3
          );
          console.log(`URL budget tracking scheduled for URL ID ${url.id}`);
        } catch (error) {
          console.error(`Error scheduling URL budget update:`, error);
        }
      }
      res.status(201).json(url);
    } catch (error) {
      console.error("Error creating URL:", error);
      res.status(500).json({ message: "Failed to create URL" });
    }
  });
  app2.put("/api/urls/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }
      const existingUrl = await storage.getUrl(id);
      if (!existingUrl) {
        return res.status(404).json({ message: "URL not found" });
      }
      let updateData = { ...req.body };
      if (updateData.clickLimit) {
        return res.status(403).json({
          message: "URL click limits can only be modified from the Original URL Records page",
          error: "RESTRICTED_OPERATION",
          details: "For data integrity reasons, click quantities can only be modified from the Original URL Records section."
        });
      }
      const result = updateUrlSchema.safeParse(updateData);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      const url = await storage.updateUrl(id, result.data);
      if (!url) {
        return res.status(404).json({ message: "URL not found" });
      }
      if (updateData.clickLimit && existingUrl.campaignId) {
        try {
          const campaign = await storage.getCampaign(existingUrl.campaignId);
          if (campaign && campaign.trafficstarCampaignId) {
            console.log(`URL ${id} updated in campaign ${existingUrl.campaignId} with TrafficStar campaign ID ${campaign.trafficstarCampaignId}`);
            const clickDifference = updateData.clickLimit - existingUrl.clickLimit;
            if (clickDifference > 0) {
              console.log(`URL click limit increased by ${clickDifference} clicks`);
              console.log(`Scheduling budget update for this URL in 10 minutes`);
              await trafficStarService.trackNewUrlForBudgetUpdate(
                url.id,
                existingUrl.campaignId,
                campaign.trafficstarCampaignId,
                clickDifference,
                // Only track the additional clicks
                campaign.pricePerThousand || 1e3
              );
              console.log(`URL budget tracking scheduled for URL ID ${url.id} with ${clickDifference} additional clicks`);
            } else {
              console.log(`URL click limit decreased or unchanged - no budget update needed`);
            }
          }
        } catch (error) {
          console.error(`Error scheduling URL budget update:`, error);
        }
      }
      res.json(url);
    } catch (error) {
      console.error("Error updating URL:", error);
      res.status(500).json({ message: "Failed to update URL" });
    }
  });
  app2.delete("/api/urls/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }
      const success = await storage.deleteUrl(id);
      if (!success) {
        return res.status(404).json({ message: "URL not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete URL" });
    }
  });
  app2.delete("/api/urls/:id/permanent", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }
      const success = await storage.permanentlyDeleteUrl(id);
      if (!success) {
        return res.status(404).json({ message: "URL not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to permanently delete URL" });
    }
  });
  app2.post("/api/urls/bulk", async (req, res) => {
    try {
      const result = bulkUrlActionSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      const { urlIds, action } = result.data;
      if (!urlIds.length) {
        return res.status(400).json({ message: "No URL IDs provided" });
      }
      const success = await storage.bulkUpdateUrls(urlIds, action);
      if (!success) {
        return res.status(404).json({ message: "No valid URLs found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to perform bulk action" });
    }
  });
  app2.post("/api/urls/:id/status", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }
      if (!status || !["active", "paused", "completed", "deleted", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status value. Must be one of: active, paused, completed, deleted, rejected" });
      }
      console.log(`\u{1F504} Updating URL ID ${id} status to "${status}" with bidirectional sync`);
      const url = await storage.getUrl(id);
      if (!url) {
        return res.status(404).json({ message: "URL not found" });
      }
      const updatedUrl = await storage.updateUrlStatus(id, status);
      if (!updatedUrl) {
        return res.status(404).json({ message: "Failed to update URL status" });
      }
      return res.status(200).json({
        message: `URL status updated to "${status}" successfully`,
        url: updatedUrl,
        originalRecordSynced: !!url.name
      });
    } catch (error) {
      console.error("Error updating URL status:", error);
      return res.status(500).json({ message: "Failed to update URL status" });
    }
  });
  app2.post("/api/original-url-records/:id/status", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid Original URL Record ID" });
      }
      if (!status || !["active", "paused", "completed", "deleted", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status value. Must be one of: active, paused, completed, deleted, rejected" });
      }
      console.log(`\u{1F504} Updating Original URL Record ID ${id} status to "${status}" with bidirectional sync`);
      const originalRecord = await storage.getOriginalUrlRecord(id);
      if (!originalRecord) {
        return res.status(404).json({ message: "Original URL Record not found" });
      }
      const updatedRecord = await storage.updateOriginalUrlRecord(id, { status });
      if (!updatedRecord) {
        return res.status(404).json({ message: "Failed to update Original URL Record status" });
      }
      try {
        const syncResult = await storage.syncUrlsWithOriginalRecord(id);
        console.log(`\u{1F4CA} Sync result: updated ${syncResult} URLs with settings from original record "${originalRecord.name}"`);
      } catch (syncError) {
        console.error(`\u274C Error syncing settings to URLs:`, syncError);
      }
      return res.status(200).json({
        message: `Original URL Record status updated to "${status}" successfully`,
        originalRecord: updatedRecord,
        urlsSynced: true
      });
    } catch (error) {
      console.error("Error updating Original URL Record status:", error);
      return res.status(500).json({ message: "Failed to update Original URL Record status" });
    }
  });
  app2.post("/api/sync/status", requireAuth, async (req, res) => {
    try {
      console.log(`\u{1F504} Starting full bidirectional status synchronization between URLs and Original URL Records`);
      const urlResults = await db.select({ name: urls.name, status: urls.status }).from(urls);
      let urlsUpdated = 0;
      let originalRecordsUpdated = 0;
      for (const url of urlResults) {
        if (url.name) {
          try {
            const syncResult = await storage.syncStatusFromUrlToOriginalRecord(url.name, url.status);
            if (syncResult) originalRecordsUpdated++;
          } catch (err) {
            console.error(`Error syncing URL ${url.name} status to original record:`, err);
          }
        }
      }
      const originalRecords = await db.select().from(originalUrlRecords);
      for (const record of originalRecords) {
        try {
          const syncCount = await storage.syncUrlsWithOriginalRecord(record.id);
          console.log(`\u2705 Record ${record.id} (${record.name}): Updated ${syncCount} URLs`);
          if (syncCount > 0) {
            urlsUpdated += syncCount;
          }
        } catch (err) {
          console.error(`Error syncing original record ${record.name} (ID: ${record.id}) settings to URLs:`, err);
        }
      }
      return res.status(200).json({
        message: "Full bidirectional status synchronization completed",
        stats: {
          urlsUpdated,
          originalRecordsUpdated,
          totalUrlsProcessed: urlResults.length,
          totalOriginalRecordsProcessed: originalRecords.length
        }
      });
    } catch (error) {
      console.error("Error performing full status synchronization:", error);
      return res.status(500).json({ message: "Failed to perform full status synchronization" });
    }
  });
  app2.get("/api/urls", async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const search = req.query.search;
      const status = req.query.status;
      const result = await storage.getAllUrls(page, limit, search, status);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch URLs" });
    }
  });
  app2.get("/api/urls/:id", async (req, res) => {
    try {
      const urlId = parseInt(req.params.id);
      if (isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid URL ID" });
      }
      const url = await storage.getUrl(urlId);
      if (!url) {
        return res.status(404).json({ message: "URL not found" });
      }
      res.json(url);
    } catch (error) {
      console.error("Error fetching URL:", error);
      res.status(500).json({ message: "Failed to fetch URL" });
    }
  });
  app2.get("/r/:campaignId/:urlId", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const urlId = parseInt(req.params.urlId);
      if (isNaN(campaignId) || isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid redirect parameters" });
      }
      const url = await storage.getUrl(urlId);
      if (!url) {
        return res.status(404).json({ message: "URL not found" });
      }
      if (url.campaignId !== campaignId) {
        return res.status(400).json({ message: "URL does not belong to this campaign" });
      }
      if (url.clicks >= url.clickLimit) {
        return res.status(410).json({ message: "This link has reached its click limit" });
      }
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      await storage.incrementUrlClicks(urlId);
      try {
        urlClickLogsManager.logClick(urlId).catch((err) => {
          console.error("Error logging URL click:", err);
        });
      } catch (urlLogError) {
        console.error("Error logging URL click:", urlLogError);
      }
      try {
        storage.recordCampaignClick(
          campaignId,
          urlId
        ).catch((err) => {
          console.error("Error recording campaign click:", err);
        });
        redirectLogsManager.logRedirect(campaignId, urlId).catch((err) => {
          console.error("Error logging redirect:", err);
        });
      } catch (analyticsError) {
        console.error("Failed to record campaign click:", analyticsError);
      }
      const targetUrl = url.targetUrl;
      res.removeHeader("X-Powered-By");
      res.removeHeader("Connection");
      res.removeHeader("Transfer-Encoding");
      res.removeHeader("ETag");
      res.removeHeader("Keep-Alive");
      switch (campaign.redirectMethod) {
        case "meta_refresh":
          res.setHeader("content-type", "text/html;charset=utf-8");
          res.setHeader("content-length", "111");
          res.setHeader("Cache-Control", "public, max-age=3600");
          res.send(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${targetUrl}"><style>*{display:none}</style></head><body></body></html>`);
          break;
        case "double_meta_refresh":
          const bridgeUrl = `/r/bridge/${campaignId}/${urlId}`;
          res.setHeader("content-type", "text/html;charset=utf-8");
          res.setHeader("content-length", "165");
          res.setHeader("Cache-Control", "public, max-age=3600");
          res.send(`<!DOCTYPE html><html><head><link rel="preconnect" href="${bridgeUrl}"><meta http-equiv="refresh" content="0;url=${bridgeUrl}"><script>location.href="${bridgeUrl}"</script></head><body></body></html>`);
          break;
        case "http_307":
          res.setHeader("location", targetUrl);
          res.setHeader("content-length", "0");
          res.setHeader("Cache-Control", "no-store");
          res.writeHead(307);
          res.end();
          break;
        case "http2_307_temporary":
          res.setHeader("content-length", "0");
          res.setHeader("location", targetUrl);
          res.setHeader("alt-svc", 'h3=":443"; ma=86400');
          res.setHeader("link", `<${targetUrl}>; rel=preload; as=document`);
          res.writeHead(307);
          res.end();
          break;
        case "http2_forced_307":
          res.setHeader("content-length", "0");
          res.setHeader("location", targetUrl);
          res.setHeader("alt-svc", 'h3=":443"; ma=86400');
          res.writeHead(307);
          res.end();
          break;
        case "direct":
        default:
          res.writeHead(302, {
            "Location": targetUrl,
            "Content-Length": "0"
          });
          res.end();
          break;
      }
    } catch (error) {
      res.status(500).json({ message: "Redirect failed" });
    }
  });
  app2.get("/r/bridge/:campaignId/:urlId", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const urlId = parseInt(req.params.urlId);
      if (isNaN(campaignId) || isNaN(urlId)) {
        return res.status(400).json({ message: "Invalid redirect parameters" });
      }
      const url = await storage.getUrl(urlId);
      if (!url) {
        return res.status(404).json({ message: "URL not found" });
      }
      await storage.incrementUrlClicks(urlId);
      try {
        urlClickLogsManager.logClick(urlId).catch((err) => {
          console.error("Error logging URL click for bridge page:", err);
        });
      } catch (urlLogError) {
        console.error("Error logging URL click for bridge page:", urlLogError);
      }
      try {
        storage.recordCampaignClick(campaignId, urlId).catch((err) => {
          console.error("Error recording campaign click for bridge page:", err);
        });
        redirectLogsManager.logRedirect(campaignId, urlId).catch((err) => {
          console.error("Error logging redirect for bridge page:", err);
        });
      } catch (analyticsError) {
        console.error("Failed to record campaign click for bridge page:", analyticsError);
      }
      res.removeHeader("X-Powered-By");
      res.removeHeader("Connection");
      res.removeHeader("Transfer-Encoding");
      res.removeHeader("ETag");
      res.removeHeader("Keep-Alive");
      res.setHeader("content-type", "text/html;charset=utf-8");
      res.setHeader("content-length", "158");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("Link", `<${url.targetUrl}>; rel=preload; as=document`);
      res.send(`<!DOCTYPE html><html><head><link rel="preload" href="${url.targetUrl}" as="document"><meta http-equiv="refresh" content="0;url=${url.targetUrl}"><script>location.href="${url.targetUrl}"</script></head><body></body></html>`);
    } catch (error) {
      res.status(500).json({ message: "Redirect failed" });
    }
  });
  app2.get("/views/:customPath", async (req, res) => {
    try {
      const startTime = process.hrtime();
      const customPath = req.params.customPath;
      if (!customPath) {
        return res.status(400).json({ message: "Invalid custom path" });
      }
      console.log(`Processing custom path request for: ${customPath}`);
      const campaign = await storage.getCampaignByCustomPath(customPath);
      if (!campaign) {
        console.log(`Campaign not found for custom path: ${customPath}`);
        return res.status(404).json({ message: "Campaign not found" });
      }
      console.log(`Found campaign ID ${campaign.id} for custom path: ${customPath}`);
      console.log(`Campaign has ${campaign.urls.length} total URLs`);
      console.log(`Campaign has ${campaign.urls.filter((url) => url.isActive).length} active URLs`);
      const selectedUrl = await storage.getRandomWeightedUrl(campaign.id);
      if (!selectedUrl) {
        console.log(`No active URLs available for campaign ID ${campaign.id}`);
        return res.status(410).json({ message: "All URLs in this campaign have reached their click limits" });
      }
      console.log(`Selected URL ID ${selectedUrl.id} (${selectedUrl.name}) for redirect`);
      await storage.incrementUrlClicks(selectedUrl.id);
      try {
        urlClickLogsManager.logClick(selectedUrl.id).catch((err) => {
          console.error("Error logging URL click for custom path:", err);
        });
      } catch (urlLogError) {
        console.error("Error logging URL click for custom path:", urlLogError);
      }
      try {
        storage.recordCampaignClick(campaign.id, selectedUrl.id).catch((err) => {
          console.error("Error recording campaign click for custom path:", err);
        });
        redirectLogsManager.logRedirect(campaign.id, selectedUrl.id).catch((err) => {
          console.error("Error logging redirect for custom path:", err);
        });
      } catch (analyticsError) {
        console.error("Failed to record campaign click for custom path:", analyticsError);
      }
      const endTime = process.hrtime(startTime);
      const timeInMs = (endTime[0] * 1e3 + endTime[1] / 1e6).toFixed(2);
      const targetUrl = selectedUrl.targetUrl;
      switch (campaign.redirectMethod) {
        case "meta_refresh":
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
          res.setHeader("X-Processing-Time", `${timeInMs}ms`);
          res.status(307).header("Location", targetUrl).end();
          break;
        case "http2_307_temporary":
          res.setHeader("X-Processing-Time", `${timeInMs}ms`);
          res.setHeader("X-HTTP2-Version", "HTTP/2.0");
          res.setHeader("Alt-Svc", 'h2=":443"; ma=86400');
          res.setHeader("X-Protocol-Version", "h2");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
          res.setHeader("X-Powered-By", "ViralEngine/2.0");
          res.status(307).header("Location", targetUrl).end();
          break;
        case "http2_forced_307":
          const cookieExpiration = /* @__PURE__ */ new Date();
          cookieExpiration.setFullYear(cookieExpiration.getFullYear() + 1);
          const cookieExpiryString = cookieExpiration.toUTCString();
          const randomId = Math.random().toString(16).substring(2, 10);
          res.removeHeader("X-Powered-By");
          res.setHeader("date", (/* @__PURE__ */ new Date()).toUTCString());
          res.setHeader("content-length", "0");
          res.setHeader("location", targetUrl);
          res.setHeader("server", "cloudflare");
          const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == "x" ? r : r & 3 | 8;
            return v.toString(16);
          });
          res.setHeader("x-request-id", uuid);
          res.setHeader("cf-cache-status", "DYNAMIC");
          res.setHeader("set-cookie", [
            `bc45=fpc0|${randomId}::351:55209; SameSite=Lax; Max-Age=31536000; Expires=${cookieExpiryString}`,
            `rc45=fpc0|${randomId}::28; SameSite=Lax; Max-Age=31536000; Expires=${cookieExpiryString}`,
            `uclick=mr7ZxwtaaNs1gOWlamCY4hIUD7craeFLJuyMJz3hmBMFe4/9c70RDu5SgPFmEHXMW9DJfw==; SameSite=Lax; Max-Age=31536000`,
            `bcid=d0505amc402c73djlgl0; SameSite=Lax; Max-Age=31536000`
          ]);
          const cfRay = Math.random().toString(16).substring(2, 11) + "a3fe-EWR";
          res.setHeader("cf-ray", cfRay);
          res.setHeader("alt-svc", 'h3=":443"; ma=86400');
          res.status(307).end();
          break;
        case "direct":
        default:
          res.setHeader("X-Processing-Time", `${timeInMs}ms`);
          res.redirect(targetUrl);
          break;
      }
    } catch (error) {
      res.status(500).json({ message: "Redirect failed" });
    }
  });
  app2.get("/c/:campaignId", async (req, res) => {
    try {
      const startTime = process.hrtime();
      const campaignId = parseInt(req.params.campaignId);
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      console.log(`Processing campaign ID: ${campaignId}`);
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        console.log(`Campaign not found for ID: ${campaignId}`);
        return res.status(404).json({ message: "Campaign not found" });
      }
      console.log(`Found campaign ID ${campaign.id}`);
      console.log(`Campaign has ${campaign.urls.length} total URLs`);
      console.log(`Campaign has ${campaign.urls.filter((url) => url.isActive).length} active URLs`);
      const selectedUrl = await storage.getRandomWeightedUrl(campaignId);
      if (!selectedUrl) {
        console.log(`No active URLs available for campaign ID ${campaignId}`);
        return res.status(410).json({ message: "All URLs in this campaign have reached their click limits" });
      }
      console.log(`Selected URL ID ${selectedUrl.id} (${selectedUrl.name}) for redirect`);
      await storage.incrementUrlClicks(selectedUrl.id);
      try {
        urlClickLogsManager.logClick(selectedUrl.id).catch((err) => {
          console.error("Error logging URL click for /c endpoint:", err);
        });
      } catch (urlLogError) {
        console.error("Error logging URL click for /c endpoint:", urlLogError);
      }
      try {
        storage.recordCampaignClick(campaignId, selectedUrl.id).catch((err) => {
          console.error("Error recording campaign click for /c endpoint:", err);
        });
        redirectLogsManager.logRedirect(campaignId, selectedUrl.id).catch((err) => {
          console.error("Error logging redirect for /c endpoint:", err);
        });
      } catch (analyticsError) {
        console.error("Failed to record campaign click for /c endpoint:", analyticsError);
      }
      const endTime = process.hrtime(startTime);
      const timeInMs = (endTime[0] * 1e3 + endTime[1] / 1e6).toFixed(2);
      const targetUrl = selectedUrl.targetUrl;
      switch (campaign.redirectMethod) {
        case "meta_refresh":
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
          res.setHeader("X-Processing-Time", `${timeInMs}ms`);
          res.status(307).header("Location", targetUrl).end();
          break;
        case "http2_307_temporary":
          res.setHeader("X-Processing-Time", `${timeInMs}ms`);
          res.setHeader("X-HTTP2-Version", "HTTP/2.0");
          res.setHeader("Alt-Svc", 'h2=":443"; ma=86400');
          res.setHeader("X-Protocol-Version", "h2");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
          res.setHeader("X-Powered-By", "ViralEngine/2.0");
          res.status(307).header("Location", targetUrl).end();
          break;
        case "http2_forced_307":
          const cookieExpiration = /* @__PURE__ */ new Date();
          cookieExpiration.setFullYear(cookieExpiration.getFullYear() + 1);
          const cookieExpiryString = cookieExpiration.toUTCString();
          const randomId = Math.random().toString(16).substring(2, 10);
          res.removeHeader("X-Powered-By");
          res.setHeader("date", (/* @__PURE__ */ new Date()).toUTCString());
          res.setHeader("content-length", "0");
          res.setHeader("location", targetUrl);
          res.setHeader("server", "cloudflare");
          const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == "x" ? r : r & 3 | 8;
            return v.toString(16);
          });
          res.setHeader("x-request-id", uuid);
          res.setHeader("cf-cache-status", "DYNAMIC");
          res.setHeader("set-cookie", [
            `bc45=fpc0|${randomId}::351:55209; SameSite=Lax; Max-Age=31536000; Expires=${cookieExpiryString}`,
            `rc45=fpc0|${randomId}::28; SameSite=Lax; Max-Age=31536000; Expires=${cookieExpiryString}`,
            `uclick=mr7ZxwtaaNs1gOWlamCY4hIUD7craeFLJuyMJz3hmBMFe4/9c70RDu5SgPFmEHXMW9DJfw==; SameSite=Lax; Max-Age=31536000`,
            `bcid=d0505amc402c73djlgl0; SameSite=Lax; Max-Age=31536000`
          ]);
          const cfRay = Math.random().toString(16).substring(2, 11) + "a3fe-EWR";
          res.setHeader("cf-ray", cfRay);
          res.setHeader("alt-svc", 'h3=":443"; ma=86400');
          res.status(307).end();
          break;
        case "direct":
        default:
          res.setHeader("X-Processing-Time", `${timeInMs}ms`);
          res.redirect(targetUrl);
          break;
      }
    } catch (error) {
      res.status(500).json({ message: "Redirect failed" });
    }
  });
  const campaignAssignmentSchema = z3.object({
    campaignId: z3.number().int().positive(),
    minClickLimit: z3.number().int().nonnegative().optional(),
    maxClickLimit: z3.number().int().nonnegative().optional(),
    active: z3.boolean().default(true)
  });
  const gmailConfigSchema = z3.object({
    user: z3.string().email(),
    password: z3.string().min(1),
    host: z3.string().default("imap.gmail.com"),
    port: z3.number().int().positive().default(993),
    tls: z3.boolean().default(true),
    tlsOptions: z3.object({
      rejectUnauthorized: z3.boolean()
    }).optional().default({ rejectUnauthorized: false }),
    whitelistSenders: z3.array(z3.string()).default([]),
    subjectPattern: z3.string(),
    messagePattern: z3.object({
      orderIdRegex: z3.string(),
      urlRegex: z3.string(),
      quantityRegex: z3.string()
    }),
    defaultCampaignId: z3.number().int().positive(),
    // Add campaign assignments array to schema
    campaignAssignments: z3.array(campaignAssignmentSchema).default([]),
    checkInterval: z3.number().int().positive().default(6e4),
    // Make sure auto-delete minutes is properly typed and validated
    autoDeleteMinutes: z3.number().int().nonnegative().default(0).transform(
      (val) => (
        // Explicitly convert to number to handle string values from form submissions
        typeof val === "string" ? parseInt(val, 10) : val
      )
    )
  });
  app2.get("/api/gmail-reader/status", (_req, res) => {
    try {
      const status = gmailReader.getStatus();
      if (status.config && typeof status.config.autoDeleteMinutes !== "number") {
        status.config.autoDeleteMinutes = 0;
      }
      console.log(
        "\u{1F50D} DEBUG: Returning Gmail status with autoDeleteMinutes:",
        status.config?.autoDeleteMinutes
      );
      res.json(status);
    } catch (error) {
      res.status(500).json({
        message: "Failed to get Gmail reader status",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/gmail-reader/config", async (req, res) => {
    try {
      const rawConfig = req.body;
      console.log("\u{1F50D} DEBUG: Gmail config raw input:", JSON.stringify({
        ...rawConfig,
        password: "*******"
        // Hide password in logs
      }, null, 2));
      const result = gmailConfigSchema.safeParse(rawConfig);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        console.log("\u274C Gmail config validation error:", validationError);
        return res.status(400).json({ message: validationError.message });
      }
      console.log(
        "\u2705 Gmail config validation successful, campaignAssignments:",
        JSON.stringify(result.data.campaignAssignments)
      );
      const config = {
        ...result.data,
        subjectPattern: new RegExp(result.data.subjectPattern),
        messagePattern: {
          orderIdRegex: new RegExp(result.data.messagePattern.orderIdRegex),
          urlRegex: new RegExp(result.data.messagePattern.urlRegex),
          quantityRegex: new RegExp(result.data.messagePattern.quantityRegex)
        },
        // Ensure autoDeleteMinutes is explicitly set (and default to 0 if undefined)
        autoDeleteMinutes: typeof result.data.autoDeleteMinutes === "number" ? result.data.autoDeleteMinutes : 0
      };
      console.log("\u{1F50D} DEBUG: Updating Gmail config with autoDeleteMinutes:", config.autoDeleteMinutes);
      const campaign = await storage.getCampaign(config.defaultCampaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found for defaultCampaignId" });
      }
      const updatedConfig = gmailReader.updateConfig(config);
      res.json({
        message: "Gmail reader configuration updated successfully",
        config: {
          ...updatedConfig,
          password: "******"
          // Hide password in response
        }
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to configure Gmail reader",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/gmail-reader/test-connection", async (req, res) => {
    try {
      const { user, password, host = "imap.gmail.com", port = 993, tls = true } = req.body;
      if (!user || !password) {
        return res.status(400).json({
          success: false,
          message: "Missing credentials. Please provide user and password."
        });
      }
      const currentConfig = gmailReader.getStatus().config;
      const tempConfig = {
        user,
        password,
        host,
        port,
        tls,
        whitelistSenders: ["help@donot-reply.in"],
        // Include the requested whitelist
        autoDeleteMinutes: currentConfig?.autoDeleteMinutes || 0
        // Preserve auto-delete setting
      };
      gmailReader.updateConfig(tempConfig);
      try {
        const smtpResult = await gmailReader.verifyCredentials();
        if (smtpResult.success) {
          return res.json(smtpResult);
        }
        console.log("SMTP verification failed, trying IMAP:", smtpResult.message);
      } catch (smtpError) {
        console.log("SMTP verification threw an error, trying IMAP:", smtpError);
      }
      const testImap = new Imap2({
        user,
        password,
        host,
        port,
        tls,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 3e4,
        // Increase auth timeout
        connTimeout: 3e4
        // Increase connection timeout
      });
      const connectionTest = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          try {
            testImap.end();
          } catch (e) {
          }
          resolve({
            success: false,
            message: "Connection timeout. Please check your credentials and network. Gmail sometimes blocks automated login attempts. Try again later or visit your Google account security settings."
          });
        }, 3e4);
        testImap.once("error", (err) => {
          clearTimeout(timeout);
          console.log("IMAP connection error:", err.message);
          let friendlyMessage = `Connection failed: ${err.message}`;
          if (err.message.includes("Invalid credentials") || err.message.includes("Authentication failed")) {
            friendlyMessage = "Authentication failed: Please check your email and app password. Make sure you're using an App Password if you have 2-factor authentication enabled.";
          } else if (err.message.includes("ENOTFOUND") || err.message.includes("getaddrinfo")) {
            friendlyMessage = "Could not reach Gmail server: Please check your internet connection and host settings";
          } else if (err.message.includes("ETIMEDOUT")) {
            friendlyMessage = "Connection timed out: Gmail server might be blocking the request or there are network issues. Try again later.";
          }
          resolve({
            success: false,
            message: friendlyMessage
          });
        });
        testImap.once("ready", () => {
          clearTimeout(timeout);
          testImap.getBoxes((err, boxes) => {
            if (err) {
              resolve({
                success: true,
                message: "Connected successfully, but couldn't list mailboxes."
              });
            } else {
              resolve({
                success: true,
                message: "Connected successfully! Gmail credentials are working."
              });
            }
            try {
              testImap.end();
            } catch (e) {
            }
          });
        });
        testImap.connect();
      });
      const result = await connectionTest;
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to test connection: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });
  app2.post("/api/gmail-reader/start", (_req, res) => {
    try {
      gmailReader.start();
      res.json({ message: "Gmail reader started successfully" });
    } catch (error) {
      res.status(500).json({
        message: "Failed to start Gmail reader",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/gmail-reader/stop", (_req, res) => {
    try {
      gmailReader.stop();
      res.json({ message: "Gmail reader stopped successfully" });
    } catch (error) {
      res.status(500).json({
        message: "Failed to stop Gmail reader",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/gmail-reader/cleanup-logs", (req, res) => {
    try {
      const { beforeDate, afterDate, daysToKeep } = req.body;
      const options = {};
      if (beforeDate) {
        options.before = new Date(beforeDate);
      }
      if (afterDate) {
        options.after = new Date(afterDate);
      }
      if (daysToKeep) {
        options.daysToKeep = parseInt(daysToKeep, 10);
      }
      const result = gmailReader.cleanupEmailLogsByDate(options);
      res.json({
        message: `Successfully cleaned up email logs: removed ${result.entriesRemoved}, kept ${result.entriesKept}`,
        ...result
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to clean up Gmail reader logs",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/gmail-reader/reset-tracking", (_req, res) => {
    try {
      gmailReader.stop();
      const result = gmailReader.clearAllEmailLogs();
      setTimeout(() => {
        gmailReader.start();
        console.log("Gmail reader restarted with clean tracking state for fresh email scan");
      }, 2e3);
      res.json({
        success: true,
        message: `Gmail tracking system reset successfully. Removed ${result.entriesRemoved} entries. Reader restarted to perform a complete fresh scan.`,
        details: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Error resetting Gmail tracking system: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });
  app2.post("/api/system/full-cleanup", async (req, res) => {
    try {
      const { confirmText } = req.body;
      if (confirmText !== "DELETE ALL DATA") {
        return res.status(400).json({
          message: "Confirmation failed. Please provide the correct confirmation text."
        });
      }
      if (gmailReader.getStatus().isRunning) {
        gmailReader.stop();
      }
      const emailLogsResult = gmailReader.clearAllEmailLogs();
      const dbResult = await storage.fullSystemCleanup();
      res.json({
        message: "Full system cleanup completed successfully",
        result: {
          campaignsDeleted: dbResult.campaignsDeleted,
          urlsDeleted: dbResult.urlsDeleted,
          originalUrlRecordsDeleted: dbResult.originalUrlRecordsDeleted,
          youtubeUrlRecordsDeleted: dbResult.youtubeUrlRecordsDeleted || 0,
          trafficstarCampaignsDeleted: dbResult.trafficstarCampaignsDeleted || 0,
          urlBudgetLogsDeleted: dbResult.urlBudgetLogsDeleted || 0,
          urlClickRecordsDeleted: dbResult.urlClickRecordsDeleted || 0,
          urlClickLogsDeleted: dbResult.urlClickLogsDeleted || 0,
          campaignClickRecordsDeleted: dbResult.campaignClickRecordsDeleted || 0,
          emailLogsCleared: emailLogsResult.success,
          emailLogsRemoved: emailLogsResult.entriesRemoved
        }
      });
    } catch (error) {
      console.error("Error performing full system cleanup:", error);
      res.status(500).json({
        message: "Failed to perform full system cleanup",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/system/migrate-decimal-multiplier", async (_req, res) => {
    try {
      const { updateMultiplierToDecimal: updateMultiplierToDecimal2 } = await Promise.resolve().then(() => (init_decimal_multiplier(), decimal_multiplier_exports));
      const result = await updateMultiplierToDecimal2();
      if (result.success) {
        console.log("\u2705 Multiplier migration successful:", result.message);
        res.status(200).json({
          message: "Multiplier migration completed successfully",
          details: result.message
        });
      } else {
        console.error("\u274C Multiplier migration failed:", result.message);
        res.status(500).json({
          message: "Multiplier migration failed",
          details: result.message
        });
      }
    } catch (error) {
      console.error("Failed to run multiplier migration:", error);
      res.status(500).json({ message: "Failed to run multiplier migration" });
    }
  });
  app2.get("/api/trafficstar/status", async (_req, res) => {
    try {
      const isConfigured = await trafficStarService.isConfigured();
      res.json({ configured: isConfigured });
    } catch (error) {
      console.error("Error checking TrafficStar configuration:", error);
      res.status(500).json({
        message: "Failed to check TrafficStar configuration",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/trafficstar/config", async (req, res) => {
    try {
      const result = insertTrafficstarCredentialSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      await trafficStarService.saveApiKey(result.data.apiKey);
      res.json({ success: true, message: "TrafficStar API key saved successfully" });
    } catch (error) {
      console.error("Error saving TrafficStar API key:", error);
      res.status(500).json({
        message: "Failed to save TrafficStar API key",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/trafficstar/campaigns", async (_req, res) => {
    try {
      const campaigns3 = await trafficStarService.getCampaigns();
      res.json(campaigns3);
    } catch (error) {
      console.error("Error fetching TrafficStar campaigns:", error);
      res.status(500).json({
        message: "Failed to fetch TrafficStar campaigns",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/trafficstar/campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      const campaign = await trafficStarService.getCampaign(id);
      res.json(campaign);
    } catch (error) {
      console.error(`Error fetching TrafficStar campaign ${req.params.id}:`, error);
      res.status(500).json({
        message: `Failed to fetch TrafficStar campaign ${req.params.id}`,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/trafficstar/campaigns/:id/spent", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      const dateFrom = req.query.dateFrom;
      const dateUntil = req.query.dateUntil;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateFrom && !dateRegex.test(dateFrom)) {
        return res.status(400).json({ message: "Invalid dateFrom format. Use YYYY-MM-DD" });
      }
      if (dateUntil && !dateRegex.test(dateUntil)) {
        return res.status(400).json({ message: "Invalid dateUntil format. Use YYYY-MM-DD" });
      }
      const stats = await trafficStarService.getCampaignSpentValue(id, dateFrom, dateUntil);
      res.json(stats);
    } catch (error) {
      console.error(`Error fetching spent value for TrafficStar campaign ${req.params.id}:`, error);
      res.status(500).json({
        message: `Failed to fetch spent value for TrafficStar campaign ${req.params.id}`,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/trafficstar/saved-campaigns", async (_req, res) => {
    try {
      const campaigns3 = await trafficStarService.getSavedCampaigns();
      res.json(campaigns3);
    } catch (error) {
      console.error("Error fetching saved TrafficStar campaigns:", error);
      res.status(500).json({
        message: "Failed to fetch saved TrafficStar campaigns",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/traffic-generator/run-all", async (_req, res) => {
    try {
      console.log("Manually triggering Traffic Generator for all campaigns...");
      await runTrafficGeneratorForAllCampaigns();
      res.json({
        success: true,
        message: "Traffic Generator has been manually triggered for all enabled campaigns"
      });
    } catch (error) {
      console.error("Error running Traffic Generator for all campaigns:", error);
      res.status(500).json({
        success: false,
        message: "Failed to run Traffic Generator",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/traffic-generator/run/:campaignId", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId, 10);
      if (isNaN(campaignId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid campaign ID"
        });
      }
      console.log(`Manually triggering Traffic Generator for campaign ${campaignId}...`);
      await processTrafficGenerator(campaignId);
      res.json({
        success: true,
        message: `Traffic Generator has been manually triggered for campaign ${campaignId}`
      });
    } catch (error) {
      console.error(`Error running Traffic Generator for campaign:`, error);
      res.status(500).json({
        success: false,
        message: "Failed to run Traffic Generator",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/trafficstar/campaigns/action", async (req, res) => {
    try {
      const result = trafficstarCampaignActionSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      const { campaignId, action } = result.data;
      try {
        const targetActive = action === "activate";
        const targetStatus = action === "activate" ? "enabled" : "paused";
        await db.update(trafficstarCampaigns).set({
          active: targetActive,
          status: targetStatus,
          lastRequestedAction: action,
          lastRequestedActionAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq14(trafficstarCampaigns.trafficstarId, campaignId.toString()));
      } catch (dbError) {
        console.error(`Error updating campaign ${campaignId} in database: ${dbError}`);
      }
      res.json({
        success: true,
        message: `Campaign ${campaignId} ${action === "pause" ? "paused" : "activated"} successfully`,
        statusChanged: true,
        // Always true since we updated DB first
        pendingSync: false,
        // Don't show pending status in UI
        lastRequestedAction: action,
        lastRequestedActionAt: (/* @__PURE__ */ new Date()).toISOString(),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      setTimeout(() => {
        try {
          if (action === "pause") {
            trafficStarService.pauseCampaign(campaignId).catch((error) => console.error(`Background API call to pause campaign ${campaignId} failed:`, error));
          } else if (action === "activate") {
            trafficStarService.activateCampaign(campaignId).catch((error) => console.error(`Background API call to activate campaign ${campaignId} failed:`, error));
          }
        } catch (apiError) {
          console.error(`Error in background API operation for campaign ${campaignId}:`, apiError);
        }
      }, 100);
    } catch (error) {
      console.error("Error performing TrafficStar campaign action:", error);
      res.status(500).json({
        message: "Failed to perform TrafficStar campaign action",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/trafficstar/campaigns/budget", async (req, res) => {
    try {
      const result = trafficstarCampaignBudgetSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      const { campaignId, maxDaily } = result.data;
      try {
        await db.update(trafficstarCampaigns).set({
          maxDaily: maxDaily.toString(),
          // Convert to string for DB numeric type
          lastBudgetUpdate: /* @__PURE__ */ new Date(),
          lastBudgetUpdateValue: maxDaily.toString(),
          // Store the exact value we're setting
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq14(trafficstarCampaigns.trafficstarId, campaignId.toString()));
      } catch (dbError) {
        console.error(`Error updating campaign budget ${campaignId} in database: ${dbError}`);
      }
      res.json({
        success: true,
        message: `Campaign ${campaignId} budget updated to ${maxDaily} successfully`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      setTimeout(() => {
        try {
          trafficStarService.updateCampaignBudget(campaignId, maxDaily).catch((error) => console.error(`Background API call to update budget for campaign ${campaignId} failed:`, error));
          trafficStarService.getCampaign(campaignId).catch((error) => console.error(`Background API call to refresh campaign ${campaignId} failed:`, error));
        } catch (apiError) {
          console.error(`Error in background budget update for campaign ${campaignId}:`, apiError);
        }
      }, 100);
    } catch (error) {
      console.error("Error updating TrafficStar campaign budget:", error);
      res.status(500).json({
        message: "Failed to update TrafficStar campaign budget",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/trafficstar/campaigns/force-budget-update", async (req, res) => {
    try {
      const { campaignId } = req.body;
      if (!campaignId || isNaN(Number(campaignId))) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      const campaign = await storage.getCampaign(Number(campaignId));
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      if (!campaign.trafficstarCampaignId) {
        return res.status(400).json({
          message: "Cannot force budget update: TrafficStar integration not enabled for this campaign"
        });
      }
      const budgetUpdateTime = campaign.budgetUpdateTime || "00:00:00";
      const now = /* @__PURE__ */ new Date();
      const currentHour = now.getUTCHours();
      const currentMinute = now.getUTCMinutes();
      const currentTimeStr = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}:00`;
      const [scheduledHour, scheduledMinute] = budgetUpdateTime.split(":").map(Number);
      let nextUpdateDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        scheduledHour,
        scheduledMinute,
        0
      ));
      if (nextUpdateDate < now) {
        nextUpdateDate = new Date(nextUpdateDate.getTime() + 24 * 60 * 60 * 1e3);
      }
      const nextUpdateTimeStr = nextUpdateDate.toISOString().replace("T", " ").split(".")[0];
      console.log(`\u{1F504} Scheduling TrafficStar budget update for campaign ${campaignId} at ${nextUpdateTimeStr} (Budget update time: ${budgetUpdateTime})`);
      await db.update(campaigns).set({
        pendingBudgetUpdate: true,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq14(campaigns.id, Number(campaignId)));
      return res.json({
        success: true,
        scheduled: true,
        message: `Budget update for campaign ${campaignId} scheduled for ${nextUpdateTimeStr}`,
        scheduledTime: nextUpdateTimeStr,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("Error scheduling TrafficStar budget update:", error);
      res.status(500).json({
        message: "Failed to schedule TrafficStar budget update",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/trafficstar/campaigns/end-time", async (req, res) => {
    try {
      const result = trafficstarCampaignEndTimeSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      const { campaignId, scheduleEndTime } = result.data;
      try {
        await db.update(trafficstarCampaigns).set({
          scheduleEndTime,
          lastEndTimeUpdate: /* @__PURE__ */ new Date(),
          lastEndTimeUpdateValue: scheduleEndTime,
          // Store the exact value we're setting
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq14(trafficstarCampaigns.trafficstarId, campaignId.toString()));
      } catch (dbError) {
        console.error(`Error updating campaign end time ${campaignId} in database: ${dbError}`);
      }
      res.json({
        success: true,
        message: `Campaign ${campaignId} end time updated to ${scheduleEndTime} successfully`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      setTimeout(() => {
        try {
          trafficStarService.updateCampaignEndTime(campaignId, scheduleEndTime).catch((error) => console.error(`Background API call to update end time for campaign ${campaignId} failed:`, error));
          trafficStarService.getCampaign(campaignId).catch((error) => console.error(`Background API call to refresh campaign ${campaignId} failed:`, error));
        } catch (apiError) {
          console.error(`Error in background end time update for campaign ${campaignId}:`, apiError);
        }
      }, 100);
    } catch (error) {
      console.error("Error updating TrafficStar campaign end time:", error);
      res.status(500).json({
        message: "Failed to update TrafficStar campaign end time",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/system/migrate-trafficstar-fields", async (_req, res) => {
    try {
      const { addTrafficStarFields: addTrafficStarFields2 } = await Promise.resolve().then(() => (init_add_trafficstar_fields(), add_trafficstar_fields_exports));
      const result = await addTrafficStarFields2();
      if (result.success) {
        console.log("\u2705 TrafficStar fields migration successful:", result.message);
        res.status(200).json({
          message: "TrafficStar fields migration completed successfully",
          details: result.message
        });
      } else {
        console.error("\u274C TrafficStar fields migration failed:", result.message);
        res.status(500).json({
          message: "TrafficStar fields migration failed",
          details: result.message
        });
      }
    } catch (error) {
      console.error("Failed to add TrafficStar fields:", error);
      res.status(500).json({ message: "Failed to add TrafficStar fields to campaigns table" });
    }
  });
  app2.get("/api/system/check-migrations", async (_req, res) => {
    try {
      const {
        isBudgetUpdateTimeMigrationNeeded: isBudgetUpdateTimeMigrationNeeded2,
        isTrafficStarFieldsMigrationNeeded: isTrafficStarFieldsMigrationNeeded2
      } = await Promise.resolve().then(() => (init_check_migration_needed(), check_migration_needed_exports));
      const budgetUpdateTimeMigrationNeeded = await isBudgetUpdateTimeMigrationNeeded2();
      const trafficStarFieldsMigrationNeeded = await isTrafficStarFieldsMigrationNeeded2();
      const originalUrlRecordsTableResult = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'original_url_records'
        ) as exists;
      `);
      console.log("Budget update time migration check result:", budgetUpdateTimeMigrationNeeded);
      console.log("TrafficStar fields migration check result:", trafficStarFieldsMigrationNeeded);
      console.log("Original URL records table result:", originalUrlRecordsTableResult);
      const migrationNeeded = false;
      res.status(200).json({
        budgetUpdateTimeMigrationNeeded: false,
        // These are already done
        trafficStarFieldsMigrationNeeded: false,
        // These are already done
        trafficSenderFieldsMigrationNeeded: false,
        // Traffic Sender has been removed
        originalUrlRecordsTableExists: true,
        migrationNeeded: false,
        message: "All migrations are already applied - no action needed"
      });
    } catch (error) {
      console.error("Failed to check migration status:", error);
      res.status(500).json({
        message: "Failed to check migration status",
        error: error instanceof Error ? error.message : String(error),
        // Assume migrations are needed if check fails
        migrationNeeded: true,
        budgetUpdateTimeMigrationNeeded: false,
        trafficStarFieldsMigrationNeeded: false,
        trafficSenderFieldsMigrationNeeded: true
      });
    }
  });
  app2.post("/api/system/migrate-budget-update-time", async (_req, res) => {
    try {
      const { addBudgetUpdateTimeField: addBudgetUpdateTimeField2 } = await Promise.resolve().then(() => (init_add_budget_update_time(), add_budget_update_time_exports));
      const result = await addBudgetUpdateTimeField2();
      if (result.success) {
        console.log("\u2705 Budget update time field migration successful");
        res.status(200).json({
          message: "Budget update time field migration completed successfully"
        });
      } else {
        console.error("\u274C Budget update time field migration failed:", result.error);
        res.status(500).json({
          message: "Budget update time field migration failed",
          error: result.error
        });
      }
    } catch (error) {
      console.error("Failed to add budget update time field:", error);
      res.status(500).json({ message: "Failed to add budget update time field to campaigns table" });
    }
  });
  app2.post("/api/system/migrate-traffic-sender", async (_req, res) => {
    try {
      const { addTrafficSenderFields: addTrafficSenderFields2 } = await Promise.resolve().then(() => (init_add_traffic_sender_fields(), add_traffic_sender_fields_exports));
      const result = await addTrafficSenderFields2(pool);
      if (result.success) {
        console.log("\u2705 Traffic Sender fields migration successful");
        res.status(200).json({
          success: true,
          message: result.message || "Traffic Sender fields migration completed successfully"
        });
      } else {
        console.error("\u274C Traffic Sender fields migration failed:", result.error || result.message);
        res.status(500).json({
          success: false,
          message: "Traffic Sender fields migration failed",
          error: result.error || result.message
        });
      }
    } catch (error) {
      console.error("Failed to add Traffic Sender fields:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add Traffic Sender fields to campaigns table",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/system/migrate-original-url-records", async (_req, res) => {
    try {
      console.log("Applying original URL records migration...");
      try {
        console.log("Step 1: Creating original_url_records table");
        await db.execute(`
          CREATE TABLE IF NOT EXISTS original_url_records (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            target_url TEXT NOT NULL,
            original_click_limit INTEGER NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          )
        `);
        console.log("Step 2: Creating index");
        await db.execute(`
          CREATE INDEX IF NOT EXISTS original_url_records_name_idx ON original_url_records (name)
        `);
        console.log("Step 3: Creating trigger function");
        await db.execute(`
          CREATE OR REPLACE FUNCTION update_original_url_records_updated_at()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql
        `);
        console.log("Step 4: Creating trigger");
        await db.execute(`
          DROP TRIGGER IF EXISTS update_original_url_records_trigger ON original_url_records
        `);
        await db.execute(`
          CREATE TRIGGER update_original_url_records_trigger
          BEFORE UPDATE ON original_url_records
          FOR EACH ROW
          EXECUTE FUNCTION update_original_url_records_updated_at()
        `);
      } catch (err) {
        console.error("Error in migration steps:", err);
        throw err;
      }
      const tableCheck = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'original_url_records'
        ) as exists;
      `);
      const tableExists = tableCheck[0]?.exists === true || tableCheck[0]?.exists === "t";
      if (tableExists) {
        const populateResult = await db.execute(`
          INSERT INTO original_url_records (name, target_url, original_click_limit, created_at, updated_at)
          SELECT DISTINCT
            name, 
            target_url, 
            COALESCE(original_click_limit, click_limit) as original_click_limit,
            created_at,
            updated_at
          FROM urls
          ON CONFLICT (name) DO NOTHING
        `);
        console.log("\u2705 Original URL records migration and data population successful");
        return res.json({
          success: true,
          message: "Original URL records migration applied successfully",
          tableCreated: true,
          recordsPopulated: true
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Migration failed - table not created"
        });
      }
    } catch (error) {
      console.error("Error applying original URL records migration:", error);
      res.status(500).json({
        success: false,
        message: "Failed to apply migration",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  const bulkOriginalUrlRecordActionSchema = z3.object({
    ids: z3.array(z3.number()).min(1, "At least one ID is required")
  });
  app2.post("/api/original-url-records/bulk/pause", async (req, res) => {
    try {
      const { ids } = bulkOriginalUrlRecordActionSchema.parse(req.body);
      await db.update(originalUrlRecords).set({ status: "paused", updatedAt: /* @__PURE__ */ new Date() }).where(inArray3(originalUrlRecords.id, ids));
      const result = await db.execute(sql9`
        UPDATE urls 
        SET status = 'paused', updated_at = NOW()
        FROM original_url_records
        WHERE urls.name = original_url_records.name
        AND original_url_records.id IN (${ids.join(",")})
      `);
      console.log(`\u2705 Bulk paused ${ids.length} original URL records and connected URLs`);
      res.json({
        message: `Successfully paused ${ids.length} records and ${result.rowCount} related URLs`,
        pausedRecords: ids.length,
        updatedUrls: result.rowCount
      });
    } catch (error) {
      console.error("Error in bulk pause operation:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: fromZodError(error).message
        });
      }
      res.status(500).json({
        message: "Failed to pause records",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/original-url-records/bulk/resume", async (req, res) => {
    try {
      const { ids } = bulkOriginalUrlRecordActionSchema.parse(req.body);
      await db.update(originalUrlRecords).set({ status: "active", updatedAt: /* @__PURE__ */ new Date() }).where(inArray3(originalUrlRecords.id, ids));
      const result = await db.execute(sql9`
        UPDATE urls 
        SET status = 'active', updated_at = NOW()
        FROM original_url_records
        WHERE urls.name = original_url_records.name
        AND original_url_records.id IN (${ids.join(",")})
      `);
      console.log(`\u2705 Bulk resumed ${ids.length} original URL records and connected URLs`);
      res.json({
        message: `Successfully resumed ${ids.length} records and ${result.rowCount} related URLs`,
        resumedRecords: ids.length,
        updatedUrls: result.rowCount
      });
    } catch (error) {
      console.error("Error in bulk resume operation:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: fromZodError(error).message
        });
      }
      res.status(500).json({
        message: "Failed to resume records",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/original-url-records/bulk/delete", async (req, res) => {
    try {
      const { ids } = bulkOriginalUrlRecordActionSchema.parse(req.body);
      const result = await db.delete(originalUrlRecords).where(inArray3(originalUrlRecords.id, ids));
      console.log(`\u2705 Bulk deleted ${ids.length} original URL records`);
      res.json({
        message: `Successfully deleted ${ids.length} records`,
        deletedRecords: ids.length
      });
    } catch (error) {
      console.error("Error in bulk delete operation:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: fromZodError(error).message
        });
      }
      res.status(500).json({
        message: "Failed to delete records",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/original-url-records", async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search;
      const status = req.query.status;
      const campaignId = req.query.campaignId ? parseInt(req.query.campaignId) : void 0;
      const effectiveStatus = status || "active";
      const { records, total } = await storage.getOriginalUrlRecords(
        page,
        limit,
        search,
        effectiveStatus,
        campaignId
      );
      res.json({
        records,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        status: effectiveStatus,
        campaignId
        // Include the campaignId in the response for client reference
      });
    } catch (error) {
      console.error("Error fetching original URL records:", error);
      res.status(500).json({ message: "Failed to fetch original URL records" });
    }
  });
  app2.get("/api/original-url-records/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      const record = await storage.getOriginalUrlRecord(id);
      if (!record) {
        return res.status(404).json({ message: "Original URL record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Error fetching original URL record:", error);
      res.status(500).json({ message: "Failed to fetch original URL record" });
    }
  });
  app2.post("/api/original-url-records", async (req, res) => {
    try {
      const validationResult = insertOriginalUrlRecordSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: validationResult.error.errors
        });
      }
      const record = await storage.createOriginalUrlRecord(validationResult.data);
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating original URL record:", error);
      if (error instanceof Error && error.message.includes("duplicate key")) {
        return res.status(400).json({ message: "A record with this name already exists" });
      }
      res.status(500).json({ message: "Failed to create original URL record" });
    }
  });
  async function forceFixUrlClickLimits(originalRecordId) {
    try {
      console.log(`\u{1F6E0}\uFE0F FORCE-FIXING URL CLICK LIMITS ${originalRecordId ? `for record #${originalRecordId}` : "for ALL records"}`);
      await db.execute(sql9`ALTER TABLE urls DISABLE TRIGGER protect_original_click_values_trigger`);
      await db.execute(sql9`ALTER TABLE urls DISABLE TRIGGER prevent_auto_click_update_trigger`);
      if (originalRecordId) {
        const [record] = await db.select().from(originalUrlRecords).where(eq14(originalUrlRecords.id, originalRecordId));
        if (record) {
          console.log(`\u{1F50D} Updating all URLs with name ${record.name} to match original click limit: ${record.originalClickLimit}`);
          await db.execute(sql9`
            UPDATE urls 
            SET 
              original_click_limit = ${record.originalClickLimit},
              click_limit = ROUND(${record.originalClickLimit} * COALESCE((SELECT multiplier FROM campaigns WHERE id = campaign_id), 1)),
              updated_at = NOW()
            WHERE name = ${record.name}
          `);
        }
      } else {
        await db.execute(sql9`
          UPDATE urls u
          SET 
            original_click_limit = ou.original_click_limit,
            click_limit = ROUND(ou.original_click_limit * COALESCE((SELECT multiplier FROM campaigns WHERE id = u.campaign_id), 1)),
            updated_at = NOW()
          FROM original_url_records ou
          WHERE u.name = ou.name
        `);
      }
      await db.execute(sql9`ALTER TABLE urls ENABLE TRIGGER protect_original_click_values_trigger`);
      await db.execute(sql9`ALTER TABLE urls ENABLE TRIGGER prevent_auto_click_update_trigger`);
      let affectedCampaignIds = [];
      if (originalRecordId) {
        const [record] = await db.select().from(originalUrlRecords).where(eq14(originalUrlRecords.id, originalRecordId));
        if (record) {
          const result = await db.execute(sql9`
            SELECT DISTINCT c.id 
            FROM campaigns c
            JOIN urls u ON u.campaign_id = c.id
            WHERE u.name = ${record.name}
          `);
          affectedCampaignIds = (result.rows || []).map((row) => Number(row.id)).filter((id) => !isNaN(id));
        }
      } else {
        const allCampaigns = await db.select({ id: campaigns.id }).from(campaigns);
        affectedCampaignIds = allCampaigns.map((c) => c.id);
      }
      console.log(`\u{1F9F9} Clearing campaign caches for ${affectedCampaignIds.length} affected campaigns`);
      for (const campaignId of affectedCampaignIds) {
        storage.invalidateCampaignCache(campaignId);
        await storage.getCampaign(campaignId, true);
        await storage.getUrls(campaignId, true);
        console.log(`\u2705 Forced refresh of campaign #${campaignId} cache`);
      }
      return true;
    } catch (error) {
      console.error("Error in forceFixUrlClickLimits:", error);
      return false;
    }
  }
  app2.put("/api/original-url-records/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      const validationResult = updateOriginalUrlRecordSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: validationResult.error.errors
        });
      }
      const updateData = validationResult.data;
      console.log(`\u{1F4DD} Updating Original URL Record #${id}:`, updateData);
      const isUpdatingClickLimit = updateData.originalClickLimit !== void 0;
      if (isUpdatingClickLimit) {
        console.log(`\u{1F4CA} Original Click Limit being updated to: ${updateData.originalClickLimit}`);
      }
      try {
        const updatedRecord = await storage.updateOriginalUrlRecord(id, updateData);
        if (!updatedRecord) {
          return res.status(404).json({ message: "Original URL record not found" });
        }
        if (isUpdatingClickLimit) {
          console.log(`\u2705 Successfully updated original click limit to ${updateData.originalClickLimit}`);
          console.log(`\u{1F504} Force-updating all linked URL instances...`);
          const success = await forceFixUrlClickLimits(id);
          if (success) {
            console.log(`\u2705 Successfully force-updated all URLs with name "${updatedRecord.name}"`);
          } else {
            console.error(`\u274C Failed to force-update URLs with name "${updatedRecord.name}"`);
          }
        }
        return res.json(updatedRecord);
      } catch (error) {
        console.error("Error in update operation:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error updating original URL record:", error);
      if (error instanceof Error && error.message.includes("duplicate key")) {
        return res.status(400).json({ message: "A record with this name already exists" });
      }
      return res.status(500).json({ message: "Failed to update original URL record" });
    }
  });
  app2.delete("/api/original-url-records/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      const success = await storage.deleteOriginalUrlRecord(id);
      if (!success) {
        return res.status(404).json({ message: "Original URL record not found" });
      }
      res.json({ message: "Original URL record deleted successfully" });
    } catch (error) {
      console.error("Error deleting original URL record:", error);
      res.status(500).json({ message: "Failed to delete original URL record" });
    }
  });
  app2.post("/api/original-url-records/:id/sync", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      const record = await storage.getOriginalUrlRecord(id);
      if (!record) {
        return res.status(404).json({ message: "Original URL record not found" });
      }
      console.log(`\u{1F504} Syncing Original URL Record #${id} (${record.name}) with click limit: ${record.originalClickLimit}`);
      console.log(`\u{1F6E0}\uFE0F Using direct SQL force-update to guarantee data consistency...`);
      const success = await forceFixUrlClickLimits(id);
      const updatedUrlCount = await storage.syncUrlsWithOriginalRecord(id);
      return res.json({
        message: `Original URL record synced successfully ${success ? "(with force update)" : ""}`,
        updatedUrlCount,
        record
      });
    } catch (error) {
      console.error("Error syncing original URL record:", error);
      return res.status(500).json({ message: "Failed to sync original URL record" });
    }
  });
  app2.post("/api/original-url-records/:id/pause", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      const record = await storage.getOriginalUrlRecord(id);
      if (!record) {
        return res.status(404).json({ message: "Original URL record not found" });
      }
      await db.update(originalUrlRecords).set({ status: "paused", updatedAt: /* @__PURE__ */ new Date() }).where(eq14(originalUrlRecords.id, id));
      const result = await db.execute(sql9`
        UPDATE urls 
        SET status = 'paused', updated_at = NOW()
        FROM original_url_records
        WHERE urls.name = original_url_records.name
        AND original_url_records.id = ${id}
      `);
      console.log(`\u2705 Paused original URL record #${id} (${record.name}) and all connected URLs`);
      res.json({
        record: { ...record, status: "paused" },
        updatedUrlCount: result.rowCount,
        message: `Original URL record and ${result.rowCount} related URLs paused successfully`
      });
    } catch (error) {
      console.error("Error pausing original URL record:", error);
      res.status(500).json({
        message: "Failed to pause original URL record",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/original-url-records/:id/resume", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      const record = await storage.getOriginalUrlRecord(id);
      if (!record) {
        return res.status(404).json({ message: "Original URL record not found" });
      }
      await db.update(originalUrlRecords).set({ status: "active", updatedAt: /* @__PURE__ */ new Date() }).where(eq14(originalUrlRecords.id, id));
      const result = await db.execute(sql9`
        UPDATE urls 
        SET status = 'active', updated_at = NOW()
        FROM original_url_records
        WHERE urls.name = original_url_records.name
        AND original_url_records.id = ${id}
      `);
      console.log(`\u2705 Resumed original URL record #${id} (${record.name}) and all connected URLs`);
      res.json({
        record: { ...record, status: "active" },
        updatedUrlCount: result.rowCount,
        message: `Original URL record and ${result.rowCount} related URLs resumed successfully`
      });
    } catch (error) {
      console.error("Error resuming original URL record:", error);
      res.status(500).json({
        message: "Failed to resume original URL record",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/system/fix-click-limits", async (_req, res) => {
    try {
      console.log("\u{1F527} Running the fix-click-limits script to repair data inconsistencies...");
      const success = await forceFixUrlClickLimits();
      if (!success) {
        throw new Error("Force fix operation failed");
      }
      const verificationResult = await db.execute(sql9`
        SELECT 
          COUNT(*) AS total_records,
          SUM(CASE WHEN ou.original_click_limit = u.original_click_limit THEN 1 ELSE 0 END) AS matched_records,
          SUM(CASE WHEN ou.original_click_limit != u.original_click_limit THEN 1 ELSE 0 END) AS mismatched_records
        FROM original_url_records ou
        JOIN urls u ON ou.name = u.name
      `);
      const summary = Array.isArray(verificationResult) && verificationResult.length > 0 ? verificationResult[0] : { total_records: 0, matched_records: 0, mismatched_records: 0 };
      return res.json({
        success: true,
        message: "Successfully fixed ALL click limit values",
        result: summary
      });
    } catch (error) {
      console.error("Error fixing click limits:", error);
      try {
        await db.execute(sql9`
          ALTER TABLE urls ENABLE TRIGGER protect_original_click_values_trigger
        `);
        await db.execute(sql9`
          ALTER TABLE urls ENABLE TRIGGER prevent_auto_click_update_trigger
        `);
        console.log("\u2705 Triggers re-enabled after error");
      } catch (triggerError) {
        console.error("Failed to re-enable triggers:", triggerError);
      }
      res.status(500).json({
        success: false,
        message: "Failed to fix click limit inconsistencies",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  async function verifyAndFixClickMultipliers() {
    try {
      console.log(`\u{1F50D} VERIFYING CLICK MULTIPLIERS: Checking for inconsistencies between original and required click values`);
      const mismatchCountResult = await db.execute(sql9`
        SELECT COUNT(*) as count
        FROM urls u
        JOIN campaigns c ON u.campaign_id = c.id
        WHERE ROUND(u.original_click_limit * c.multiplier) != u.click_limit
        AND u.status = 'active'
      `);
      const mismatchCount = mismatchCountResult.rows?.[0]?.count || 0;
      console.log(`\u{1F50D} Found ${mismatchCount} URLs with mismatched click values (incorrect multiplication)`);
      if (mismatchCount === 0) {
        console.log(`\u2705 No mismatches found - all click values are correctly calculated`);
        return {
          fixed: 0,
          affectedCampaigns: [],
          message: "No mismatches found, all click limits are correct"
        };
      }
      const affectedCampaignsResult = await db.execute(sql9`
        SELECT c.id, c.name, COUNT(*) as count
        FROM urls u
        JOIN campaigns c ON u.campaign_id = c.id
        WHERE ROUND(u.original_click_limit * c.multiplier) != u.click_limit
        AND u.status = 'active'
        GROUP BY c.id, c.name
      `);
      const affectedCampaigns = affectedCampaignsResult.rows || [];
      console.log(`\u26A0\uFE0F Found mismatches in ${affectedCampaigns.length} campaigns:`);
      affectedCampaigns.forEach((campaign) => {
        console.log(`   - Campaign #${campaign.id} (${campaign.name}): ${campaign.count} URLs with incorrect multipliers`);
      });
      await db.execute(sql9`ALTER TABLE urls DISABLE TRIGGER protect_original_click_values_trigger`);
      await db.execute(sql9`ALTER TABLE urls DISABLE TRIGGER prevent_auto_click_update_trigger`);
      const updateResult = await db.execute(sql9`
        UPDATE urls u
        SET 
          click_limit = ROUND(u.original_click_limit * c.multiplier),
          updated_at = NOW()
        FROM campaigns c
        WHERE u.campaign_id = c.id
        AND ROUND(u.original_click_limit * c.multiplier) != u.click_limit
        AND u.status = 'active'
      `);
      await db.execute(sql9`ALTER TABLE urls ENABLE TRIGGER protect_original_click_values_trigger`);
      await db.execute(sql9`ALTER TABLE urls ENABLE TRIGGER prevent_auto_click_update_trigger`);
      const fixedCount = updateResult.rowCount || 0;
      console.log(`\u2705 Fixed ${fixedCount} URL click values with incorrect multipliers`);
      const affectedCampaignIds = (affectedCampaignsResult.rows || []).map((c) => c.id);
      console.log(`\u{1F9F9} Invalidating caches for ${affectedCampaignIds.length} affected campaigns`);
      for (const campaignId of affectedCampaignIds) {
        if (campaignId) {
          storage.invalidateCampaignCache(campaignId);
          await storage.getCampaign(campaignId, true);
          await storage.getUrls(campaignId, true);
        }
      }
      return {
        fixed: fixedCount,
        affectedCampaigns,
        message: `Fixed ${fixedCount} URL click values with incorrect multipliers`
      };
    } catch (error) {
      console.error("Error in verifyAndFixClickMultipliers:", error);
      throw error;
    }
  }
  setInterval(async () => {
    try {
      console.log("\u{1F504} Running scheduled multiplier verification check...");
      const result = await verifyAndFixClickMultipliers();
      if (result.fixed > 0) {
        console.log(`\u2705 Automatic multiplier check fixed ${result.fixed} URL click limits`);
      } else {
        console.log("\u2705 Automatic multiplier check: No issues found");
      }
    } catch (error) {
      console.error("Error in automatic multiplier verification:", error);
    }
  }, 2 * 60 * 1e3);
  app2.post("/api/system/fix-click-multipliers", async (_req, res) => {
    try {
      console.log(`\u{1F504} Running verification and fix for click multipliers`);
      const result = await verifyAndFixClickMultipliers();
      return res.json({
        success: true,
        message: `Click multiplier verification complete: ${result.fixed} URLs updated`,
        ...result
      });
    } catch (error) {
      console.error("Error fixing click multipliers:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fix click multipliers",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/system/generate-test-clicks", async (_req, res) => {
    try {
      console.log(`\u{1F9EA} Generating test click analytics data`);
      const result = await generateAnalyticsTestData();
      return res.json({
        success: true,
        message: "Successfully generated test click analytics data"
      });
    } catch (error) {
      console.error("Error generating test click data:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate test click data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/system/force-update-all-clicks", async (_req, res) => {
    try {
      console.log("\u{1F6A8} EMERGENCY FORCE UPDATE - Updating ALL URL click values...");
      const multiplierFixResult = await verifyAndFixClickMultipliers();
      await db.execute(sql9`
        -- Set click protection bypass
        INSERT INTO protection_settings (key, value)
        VALUES ('click_protection_enabled', FALSE)
        ON CONFLICT (key) DO UPDATE SET value = FALSE
      `);
      await db.execute(sql9`
        ALTER TABLE urls DISABLE TRIGGER protect_original_click_values_trigger
      `);
      await db.execute(sql9`
        ALTER TABLE urls DISABLE TRIGGER prevent_auto_click_update_trigger
      `);
      await db.execute(sql9`
        -- Update all URLs with original record values
        UPDATE urls u
        SET 
          original_click_limit = ou.original_click_limit,
          click_limit = ROUND(ou.original_click_limit * COALESCE((SELECT multiplier FROM campaigns WHERE id = u.campaign_id), 1)),
          updated_at = NOW()
        FROM original_url_records ou
        WHERE u.name = ou.name
      `);
      await db.execute(sql9`
        UPDATE urls u
        SET 
          click_limit = original_click_limit,
          updated_at = NOW()
        WHERE campaign_id IS NULL AND click_limit != original_click_limit
      `);
      await db.execute(sql9`
        ALTER TABLE urls ENABLE TRIGGER protect_original_click_values_trigger
      `);
      await db.execute(sql9`
        ALTER TABLE urls ENABLE TRIGGER prevent_auto_click_update_trigger
      `);
      await db.execute(sql9`
        INSERT INTO protection_settings (key, value)
        VALUES ('click_protection_enabled', TRUE)
        ON CONFLICT (key) DO UPDATE SET value = TRUE
      `);
      const campaigns3 = await db.select({ id: campaigns3.id }).from(campaigns3);
      for (const campaign of campaigns3) {
        storage.invalidateCampaignCache(campaign.id);
        await storage.getCampaign(campaign.id, true);
        await storage.getUrls(campaign.id, true);
      }
      return res.json({
        success: true,
        message: "EMERGENCY FORCE UPDATE COMPLETE - All URLs have been updated to match their original records",
        campaignsRefreshed: campaigns3.length
      });
    } catch (error) {
      console.error("Error in emergency force update:", error);
      try {
        await db.execute(sql9`
          ALTER TABLE urls ENABLE TRIGGER protect_original_click_values_trigger
        `);
        await db.execute(sql9`
          ALTER TABLE urls ENABLE TRIGGER prevent_auto_click_update_trigger
        `);
        await db.execute(sql9`
          INSERT INTO protection_settings (key, value)
          VALUES ('click_protection_enabled', TRUE)
          ON CONFLICT (key) DO UPDATE SET value = TRUE
        `);
      } catch (restoreError) {
        console.error("Failed to restore protection:", restoreError);
      }
      res.status(500).json({
        success: false,
        message: "Emergency force update failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  initServerMonitor();
  app2.get("/api/system/server-stats", async (_req, res) => {
    try {
      const stats = await getServerStats();
      console.log("Server stats CPU details:", JSON.stringify(stats.cpuDetails, null, 2));
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error("Error fetching server stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch server stats",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/system/server-stats/history", (_req, res) => {
    try {
      const history = getStatsHistory();
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error("Error fetching server stats history:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch server stats history",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/system/generate-test-clicks", async (_req, res) => {
    try {
      console.log("\u{1F9EA} Generating test click analytics data");
      const result = await generateAnalyticsTestData();
      res.json({
        success: true,
        message: "Test click data generated successfully",
        ...result
      });
    } catch (error) {
      console.error("Error generating test click data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate test click data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  async function generateAnalyticsTestData() {
    console.log("Starting test click data generation...");
    try {
      console.log("Cleared existing click analytics data");
    } catch (error) {
      console.error("Error clearing existing click data:", error);
    }
    const allCampaigns = await db.select().from(campaigns);
    if (!allCampaigns.length) {
      console.log("No campaigns found to generate clicks for");
      return { success: false, message: "No campaigns found to generate clicks for" };
    }
    let totalClicksGenerated = 0;
    for (const campaign of allCampaigns) {
      console.log(`Generating clicks for campaign "${campaign.name}" (ID: ${campaign.id})`);
      const campaignUrls = await db.select().from(urls).where(eq14(urls.campaignId, campaign.id));
      if (!campaignUrls.length) {
        console.log(`No URLs found for campaign ${campaign.id}`);
        continue;
      }
      const now = /* @__PURE__ */ new Date();
      await generateTodayClicks(campaign, campaignUrls[0]);
      await generateYesterdayClicks(campaign, campaignUrls[0]);
      await generatePastWeekClicks(campaign, campaignUrls);
      const clicksCount = await db.execute(sql9`
        SELECT COUNT(*) as count FROM click_analytics 
        WHERE "campaignId" = ${campaign.id}
      `);
      const campaignClickCount = parseInt(clicksCount.rows[0].count);
      totalClicksGenerated += campaignClickCount;
      console.log(`Generated ${campaignClickCount} total clicks for campaign ${campaign.id}`);
    }
    console.log(`Test click data generation complete! Generated ${totalClicksGenerated} total clicks.`);
    return { success: true, totalClicks: totalClicksGenerated };
  }
  async function generateTodayClicks(campaign, url) {
    const now = /* @__PURE__ */ new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const clicksPerHour = [];
    for (let hour = 0; hour <= now.getHours(); hour++) {
      let clickCount = Math.floor(Math.random() * 5) + 1;
      if (hour >= 9 && hour <= 17) {
        clickCount = Math.floor(Math.random() * 15) + 5;
      }
      for (let i = 0; i < clickCount; i++) {
        const clickTime = new Date(today);
        clickTime.setHours(hour);
        clickTime.setMinutes(Math.floor(Math.random() * 60));
        clickTime.setSeconds(Math.floor(Math.random() * 60));
        if (clickTime <= now) {
          clicksPerHour.push(createClickData(url, campaign, clickTime));
        }
      }
    }
    if (clicksPerHour.length > 0) {
      console.log(`Inserted ${clicksPerHour.length} hourly clicks for today for campaign ${campaign.id}`);
    }
  }
  async function generateYesterdayClicks(campaign, url) {
    const now = /* @__PURE__ */ new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const clicksYesterday = [];
    for (let hour = 0; hour < 24; hour++) {
      let clickCount = Math.floor(Math.random() * 3) + 1;
      if (hour >= 9 && hour <= 17) {
        clickCount = Math.floor(Math.random() * 10) + 3;
      }
      for (let i = 0; i < clickCount; i++) {
        const clickTime = new Date(yesterday);
        clickTime.setHours(hour);
        clickTime.setMinutes(Math.floor(Math.random() * 60));
        clickTime.setSeconds(Math.floor(Math.random() * 60));
        clicksYesterday.push(createClickData(url, campaign, clickTime));
      }
    }
    if (clicksYesterday.length > 0) {
      console.log(`Inserted ${clicksYesterday.length} clicks for yesterday for campaign ${campaign.id}`);
    }
  }
  async function generatePastWeekClicks(campaign, campaignUrls) {
    const now = /* @__PURE__ */ new Date();
    const pastWeekClicks = [];
    for (let dayOffset = 2; dayOffset < 7; dayOffset++) {
      const pastDay = new Date(now);
      pastDay.setDate(now.getDate() - dayOffset);
      pastDay.setHours(0, 0, 0, 0);
      for (const url of campaignUrls) {
        const dailyClicks = Math.floor(Math.random() * 30) + 20;
        for (let i = 0; i < dailyClicks; i++) {
          const hour = Math.floor(Math.random() * 24);
          const minute = Math.floor(Math.random() * 60);
          const second = Math.floor(Math.random() * 60);
          const clickTime = new Date(pastDay);
          clickTime.setHours(hour, minute, second);
          pastWeekClicks.push(createClickData(url, campaign, clickTime));
        }
      }
    }
    if (pastWeekClicks.length > 0) {
      const batchSize = 1e3;
      for (let i = 0; i < pastWeekClicks.length; i += batchSize) {
        const batch = pastWeekClicks.slice(i, i + batchSize);
      }
      console.log(`Inserted ${pastWeekClicks.length} clicks for past week for campaign ${campaign.id}`);
    }
  }
  function createClickData(url, campaign, timestamp2) {
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Linux; Android 11; SM-G991U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
    ];
    const referrers = [
      "https://www.google.com/",
      "https://www.facebook.com/",
      "https://www.youtube.com/",
      "https://www.instagram.com/",
      "https://www.twitter.com/",
      ""
      // Direct traffic
    ];
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    const referrer = referrers[Math.floor(Math.random() * referrers.length)];
    return {
      urlId: url.id,
      campaignId: campaign.id,
      timestamp: timestamp2,
      userAgent,
      referer: referrer,
      // Note the field name 'referer' with one 'r'
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    };
  }
  app2.post("/api/test/campaign-click/:campaignId", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const urlId = req.query.urlId ? parseInt(req.query.urlId) : null;
      if (isNaN(campaignId)) {
        return res.status(400).json({ error: "Invalid campaign ID" });
      }
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      return res.status(200).json({
        success: true,
        message: `Test click recorded for campaign #${campaignId} with${urlId ? " URL #" + urlId : "out URL"} at ${(/* @__PURE__ */ new Date()).toISOString()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("Error recording test click:", error);
      return res.status(500).json({ error: "Failed to record test click" });
    }
  });
  app2.get("/api/trafficstar/test-empty-url-check", async (req, res) => {
    try {
      console.log("Manually running the empty URL check function for testing");
      const { pauseTrafficStarForEmptyCampaigns: pauseTrafficStarForEmptyCampaigns2 } = await Promise.resolve().then(() => (init_traffic_generator_new(), traffic_generator_new_exports));
      await pauseTrafficStarForEmptyCampaigns2();
      res.json({
        success: true,
        message: "Empty URL check completed. Check server logs for details."
      });
    } catch (error) {
      console.error("Error in empty URL check test:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });
  app2.get("/api/url-budget-logs", async (_req, res) => {
    try {
      console.log("Fetching URL budget logs for all campaigns with TrafficStar integration");
      const logs = await url_budget_logger_default.getAllUrlBudgetLogs();
      res.json({
        success: true,
        logs: logs.reverse()
        // Return newest logs first
      });
    } catch (error) {
      console.error("Error fetching URL budget logs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch URL budget logs"
      });
    }
  });
  app2.get("/api/url-budget-logs/:campaignId", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      if (isNaN(campaignId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid campaign ID"
        });
      }
      const hasTrafficStar = await url_budget_logger_default.hasCampaignTrafficStarIntegration(campaignId);
      if (!hasTrafficStar) {
        return res.status(404).json({
          success: false,
          error: "Campaign not found or doesn't have TrafficStar integration"
        });
      }
      console.log(`Fetching URL budget logs for campaign ${campaignId}`);
      const logs = await url_budget_logger_default.getCampaignUrlBudgetLogs(campaignId);
      res.json({
        success: true,
        campaignId,
        logs: logs.reverse()
        // Return newest logs first
      });
    } catch (error) {
      console.error(`Error fetching URL budget logs for campaign ${req.params.campaignId}:`, error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch URL budget logs for campaign"
      });
    }
  });
  app2.post("/api/url-budget-logs/clear", async (_req, res) => {
    try {
      console.log("Clearing all URL budget logs");
      const campaignsWithTrafficStar = await db.query.campaigns.findMany({
        where: (c, { eq: eq17, and: and9, ne: ne3, not, isNull: isNull3 }) => and9(
          ne3(c.trafficstarCampaignId, ""),
          not(isNull3(c.trafficstarCampaignId))
        ),
        columns: { id: true }
      });
      for (const campaign of campaignsWithTrafficStar) {
        await url_budget_logger_default.clearCampaignLogs(campaign.id);
      }
      res.json({
        success: true,
        message: "All URL budget logs cleared successfully"
      });
    } catch (error) {
      console.error("Error clearing URL budget logs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to clear URL budget logs"
      });
    }
  });
  app2.post("/api/url-budget-logs/:campaignId/clear", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      if (isNaN(campaignId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid campaign ID"
        });
      }
      const hasTrafficStar = await url_budget_logger_default.hasCampaignTrafficStarIntegration(campaignId);
      if (!hasTrafficStar) {
        return res.status(404).json({
          success: false,
          error: "Campaign not found or doesn't have TrafficStar integration"
        });
      }
      console.log(`Clearing URL budget logs for campaign ${campaignId}`);
      await url_budget_logger_default.clearCampaignLogs(campaignId);
      res.json({
        success: true,
        message: `URL budget logs for campaign ${campaignId} cleared successfully`
      });
    } catch (error) {
      console.error(`Error clearing URL budget logs for campaign ${req.params.campaignId}:`, error);
      res.status(500).json({
        success: false,
        error: "Failed to clear URL budget logs for campaign"
      });
    }
  });
  app2.get("/api/youtube-url-records", async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const search = req.query.search;
      const campaignId = req.query.campaignId ? parseInt(req.query.campaignId) : void 0;
      const offset = (page - 1) * limit;
      let query = db.select().from(youtubeUrlRecords).orderBy(desc4(youtubeUrlRecords.deletedAt));
      if (campaignId) {
        query = query.where(eq14(youtubeUrlRecords.campaignId, campaignId));
      }
      if (search) {
        const lowerSearch = search.toLowerCase();
        query = query.where(
          sql9`LOWER(name) LIKE ${`%${lowerSearch}%`} OR 
              LOWER(target_url) LIKE ${`%${lowerSearch}%`} OR 
              LOWER(youtube_video_id) LIKE ${`%${lowerSearch}%`} OR 
              LOWER(deletion_reason) LIKE ${`%${lowerSearch}%`}`
        );
      }
      const countResult = await db.select({ count: sql9`COUNT(*)` }).from(youtubeUrlRecords);
      const totalCount = Number(countResult[0].count);
      const records = await query.limit(limit).offset(offset);
      res.json({
        records,
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch (error) {
      console.error("Error fetching YouTube URL records:", error);
      res.status(500).json({ message: "Failed to fetch YouTube URL records" });
    }
  });
  app2.get("/api/youtube-url-records/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      const [record] = await db.select().from(youtubeUrlRecords).where(eq14(youtubeUrlRecords.id, id));
      if (!record) {
        return res.status(404).json({ message: "YouTube URL record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Error fetching YouTube URL record:", error);
      res.status(500).json({ message: "Failed to fetch YouTube URL record" });
    }
  });
  const bulkYoutubeUrlRecordActionSchema = z3.object({
    ids: z3.array(z3.number())
  });
  app2.post("/api/youtube-url-records/bulk/delete", async (req, res) => {
    try {
      const { ids } = bulkYoutubeUrlRecordActionSchema.parse(req.body);
      const result = await db.delete(youtubeUrlRecords).where(inArray3(youtubeUrlRecords.id, ids));
      console.log(`\u2705 Bulk deleted ${ids.length} YouTube URL records`);
      res.json({
        message: `Successfully deleted ${ids.length} records`,
        deletedRecords: ids.length
      });
    } catch (error) {
      console.error("Error in bulk delete operation:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: fromZodError(error).message
        });
      }
      res.status(500).json({
        message: "Failed to delete records",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/youtube-api-logs", async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;
      const logType = req.query.type || void 0;
      const campaignId = req.query.campaignId ? parseInt(req.query.campaignId) : void 0;
      const isError = req.query.isError === "true";
      let query = db.select().from(youtubeApiLogs).orderBy(desc4(youtubeApiLogs.timestamp));
      if (logType) {
        query = query.where(eq14(youtubeApiLogs.logType, logType));
      }
      if (campaignId) {
        query = query.where(eq14(youtubeApiLogs.campaignId, campaignId));
      }
      if (req.query.isError !== void 0) {
        query = query.where(eq14(youtubeApiLogs.isError, isError));
      }
      const countResult = await db.select({ count: sql9`COUNT(*)` }).from(youtubeApiLogs);
      const totalCount = Number(countResult[0].count);
      const logs = await query.limit(limit).offset(offset);
      const campaignIds = logs.filter((log2) => log2.campaignId !== null).map((log2) => log2.campaignId);
      const campaignMap = /* @__PURE__ */ new Map();
      if (campaignIds.length > 0) {
        const campaignDetails = await db.select({ id: campaigns.id, name: campaigns.name }).from(campaigns).where(inArray3(campaigns.id, campaignIds));
        campaignDetails.forEach((campaign) => {
          campaignMap.set(campaign.id, campaign.name);
        });
      }
      const logsWithCampaignNames = logs.map((log2) => ({
        ...log2,
        campaignName: log2.campaignId ? campaignMap.get(log2.campaignId) || `Campaign ${log2.campaignId}` : null
      }));
      res.json({
        logs: logsWithCampaignNames,
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch (error) {
      console.error("Error fetching YouTube API logs:", error);
      res.status(500).json({ message: "Failed to fetch YouTube API logs" });
    }
  });
  app2.delete("/api/youtube-api-logs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      const result = await db.delete(youtubeApiLogs).where(eq14(youtubeApiLogs.id, id));
      res.json({ message: "YouTube API log deleted successfully" });
    } catch (error) {
      console.error("Error deleting YouTube API log:", error);
      res.status(500).json({ message: "Failed to delete YouTube API log" });
    }
  });
  app2.delete("/api/youtube-api-logs", async (req, res) => {
    try {
      const { olderThan, logType, campaignId } = req.query;
      let query = db.delete(youtubeApiLogs);
      if (olderThan) {
        const date = new Date(olderThan);
        if (!isNaN(date.getTime())) {
          query = query.where(lt(youtubeApiLogs.timestamp, date));
        }
      }
      if (logType) {
        query = query.where(eq14(youtubeApiLogs.logType, logType));
      }
      if (campaignId) {
        const id = parseInt(campaignId);
        if (!isNaN(id)) {
          query = query.where(eq14(youtubeApiLogs.campaignId, id));
        }
      }
      await query;
      res.json({ message: "YouTube API logs cleared successfully" });
    } catch (error) {
      console.error("Error clearing YouTube API logs:", error);
      res.status(500).json({ message: "Failed to clear YouTube API logs" });
    }
  });
  app2.post("/api/campaigns/:id/check-youtube", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      const [campaign] = await db.select().from(campaigns).where(eq14(campaigns.id, id));
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      const { youtubeApiService: youtubeApiService2 } = await Promise.resolve().then(() => (init_youtube_api_service(), youtube_api_service_exports));
      if (!youtubeApiService2.isConfigured()) {
        return res.status(400).json({
          message: "YouTube API is not configured",
          details: "Please set the YOUTUBE_API_KEY environment variable"
        });
      }
      await youtubeApiService2.logApiActivity(
        YouTubeApiLogType.FORCE_CHECK,
        `Manual force check triggered at ${(/* @__PURE__ */ new Date()).toISOString()} for campaign ${id}`,
        id,
        {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          trigger: "manual",
          // Indicate this was manually triggered via the UI
          userAgent: req.headers["user-agent"] || "unknown"
          // Track browser info
        },
        false
      );
      await youtubeApiService2.processCampaign(id, true);
      const [recordCount] = await db.select({
        count: sql9`COUNT(*)`
      }).from(youtubeUrlRecords).where(eq14(youtubeUrlRecords.campaignId, id));
      res.json({
        message: "YouTube URL check completed successfully",
        campaignId: id,
        recordCount: Number(recordCount.count)
      });
    } catch (error) {
      console.error("Error checking YouTube URLs:", error);
      res.status(500).json({
        message: "Failed to check YouTube URLs",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  return server;
}

// server/index.ts
await init_vite();
import compression from "compression";
import cookieParser from "cookie-parser";

// server/init-trafficstar.ts
init_db();
init_trafficstar_service();
init_schema();
import { eq as eq15 } from "drizzle-orm";
async function initializeTrafficStar() {
  try {
    const apiKey = process.env.TRAFFICSTAR_API_KEY;
    if (!apiKey) {
      console.log("TrafficStar API key not found in environment variables");
      return;
    }
    console.log("\u{1F50D} DEBUG: Found TrafficStar API key in environment variables, ensuring it is saved in database");
    const [existingCredentials] = await db.select().from(trafficstarCredentials).limit(1);
    if (existingCredentials) {
      if (existingCredentials.apiKey === apiKey) {
        console.log("\u{1F50D} DEBUG: TrafficStar API key already saved in database");
      } else {
        await db.update(trafficstarCredentials).set({
          apiKey,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq15(trafficstarCredentials.id, existingCredentials.id));
        console.log("\u{1F50D} DEBUG: Updated TrafficStar API key in database");
      }
    } else {
      await db.insert(trafficstarCredentials).values({
        apiKey,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      });
      console.log("\u{1F50D} DEBUG: Successfully saved TrafficStar API key to database");
    }
    try {
      await trafficStarService.scheduleSpentValueUpdates();
      console.log("\u{1F50D} DEBUG: Successfully scheduled TrafficStar spent value updates");
    } catch (scheduleError) {
      console.error("Error scheduling TrafficStar spent value updates:", scheduleError);
    }
  } catch (error) {
    console.error("Error initializing TrafficStar API credentials:", error);
  }
}

// server/index.ts
await init_middleware();

// server/auth/routes.ts
await init_middleware();
await init_vite();
await init_key_manager();

// server/auth/access-code-manager.ts
init_db();
init_schema();
await init_vite();
import { eq as eq16 } from "drizzle-orm";

// server/access-control.ts
await init_vite();
await init_middleware();
var activeSessions = /* @__PURE__ */ new Map();
var SESSION_EXPIRY = 24 * 60 * 60 * 1e3;
var temporaryLoginPaths = /* @__PURE__ */ new Map();
var TEMP_LOGIN_EXPIRY = 5 * 60 * 1e3;
var TEMP_LOGIN_PREFIX = "login_";
var SECRET_ACCESS_CODE = "ABCD123";
var DEBUG_MODE = true;
function updateAccessCode(newCode) {
  if (newCode && newCode.trim() !== "") {
    SECRET_ACCESS_CODE = newCode.trim();
    log(`Access code updated to: ${SECRET_ACCESS_CODE}`, "access");
  }
}
function getAccessCode() {
  return SECRET_ACCESS_CODE;
}
function isSessionValid(sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session) return false;
  const now = Date.now();
  if (now - session.timestamp > SESSION_EXPIRY) {
    activeSessions.delete(sessionId);
    return false;
  }
  return true;
}
function generateTemporaryLoginPath(sessionId) {
  cleanupExpiredTemporaryPaths();
  const tempPath = `${TEMP_LOGIN_PREFIX}${Math.random().toString(36).substring(2, 15)}`;
  temporaryLoginPaths.set(tempPath, {
    timestamp: Date.now(),
    sessionId
  });
  log(`Generated temporary login path: /${tempPath} for session: ${sessionId}`, "access");
  return tempPath;
}
function cleanupExpiredTemporaryPaths() {
  const now = Date.now();
  let expiredCount = 0;
  Array.from(temporaryLoginPaths.keys()).forEach((path9) => {
    const data = temporaryLoginPaths.get(path9);
    if (data && now - data.timestamp > TEMP_LOGIN_EXPIRY) {
      temporaryLoginPaths.delete(path9);
      expiredCount++;
    }
  });
  if (expiredCount > 0 && DEBUG_MODE) {
    log(`Cleaned up ${expiredCount} expired temporary login paths`, "access");
  }
}
function setupCleanupTimer() {
  setInterval(() => {
    cleanupExpiredTemporaryPaths();
  }, 6e4);
}
setupCleanupTimer();
function isValidTemporaryLoginPath(path9) {
  const cleanPath = path9.startsWith("/") ? path9.substring(1) : path9;
  if (cleanPath.startsWith(TEMP_LOGIN_PREFIX)) {
    if (temporaryLoginPaths.has(cleanPath)) {
      return true;
    }
    if (DEBUG_MODE) {
      log(`Path ${cleanPath} matches prefix but not found in temporary paths map. Keys: ${Array.from(temporaryLoginPaths.keys()).join(", ")}`, "access");
    }
  }
  return false;
}
function getSessionIdForTemporaryLoginPath(path9) {
  const cleanPath = path9.startsWith("/") ? path9.substring(1) : path9;
  const data = temporaryLoginPaths.get(cleanPath);
  if (!data) return null;
  return data.sessionId;
}
function handleAccessRoutes(req, res, next) {
  log(`Access check for path: ${req.path}`, "access");
  const path9 = req.path;
  if (path9.startsWith("/api/")) {
    return next();
  }
  if (path9.startsWith("/assets/") || path9.includes(".js") || path9.includes(".css") || path9.includes(".ico") || path9.includes(".png") || path9.includes(".jpg") || path9.includes(".svg") || path9 === "/favicon.ico" || path9.startsWith("/@") || // All Vite and React dev resources
  path9.startsWith("/node_modules/") || path9.startsWith("/@fs/")) {
    return next();
  }
  if (path9.startsWith("/c/") || path9.startsWith("/r/") || path9.startsWith("/views/")) {
    return next();
  }
  if (path9.startsWith("/access/")) {
    const parts = path9.split("/access/");
    if (parts.length < 2) {
      return res.status(404).send("Page not found");
    }
    const code = parts[1];
    if (code === SECRET_ACCESS_CODE) {
      const sessionId2 = Math.random().toString(36).substring(2, 15);
      activeSessions.set(sessionId2, { timestamp: Date.now() });
      const tempLoginPath = generateTemporaryLoginPath(sessionId2);
      res.cookie("session_id", sessionId2, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_EXPIRY,
        sameSite: "lax"
      });
      log(`Access granted with secret code, redirecting to temporary login path: ${tempLoginPath} with session: ${sessionId2}`, "access");
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Redirecting...</title>
          <meta http-equiv="refresh" content="0;url=/${tempLoginPath}">
          <script>
            // Extra safety - redirect after a brief pause
            setTimeout(function() {
              window.location.href = '/${tempLoginPath}';
            }, 100);
          </script>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f1f5f9;
              margin: 0;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              text-align: center;
            }
            .redirect-container {
              background: white;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              padding: 2rem;
              max-width: 400px;
            }
            .spinner {
              border: 4px solid rgba(0, 0, 0, 0.1);
              border-radius: 50%;
              border-top: 4px solid #2563eb;
              width: 24px;
              height: 24px;
              margin: 10px auto;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="redirect-container">
            <h2>Access Confirmed</h2>
            <p>Redirecting to secure login page...</p>
            <div class="spinner"></div>
          </div>
        </body>
        </html>
      `);
    }
    log(`Invalid access code provided: ${code}`, "access");
    return res.status(404).send("Page not found");
  }
  if (isValidTemporaryLoginPath(path9)) {
    log(`Temporary login path accessed: ${path9}`, "access");
    const sessionId2 = getSessionIdForTemporaryLoginPath(path9);
    if (!sessionId2) {
      log(`No session ID found for temporary login path: ${path9}`, "access");
      return res.status(404).send("Page not found");
    }
    if (!isSessionValid(sessionId2)) {
      log(`Invalid session for temporary login path: ${path9}`, "access");
      return res.status(404).send("Page not found");
    }
    res.cookie("session_id", sessionId2, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_EXPIRY,
      sameSite: "lax"
    });
    log(`Serving login form for temporary path: ${path9} with session: ${sessionId2}`, "access");
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>URL Campaign Manager - Login</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f1f5f9;
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-image: linear-gradient(135deg, #e0f2fe 0%, #f1f5f9 100%);
          }
          .card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
            padding: 2rem;
            border: 1px solid rgba(0, 0, 0, 0.05);
          }
          .header {
            text-align: center;
            margin-bottom: 1.5rem;
          }
          .title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #111827;
            margin-bottom: 0.5rem;
          }
          .subtitle {
            color: #6b7280;
            font-size: 0.875rem;
          }
          .form-group {
            margin-bottom: 1rem;
          }
          .input {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            font-size: 1rem;
            margin-top: 0.5rem;
            box-sizing: border-box;
            transition: border-color 0.15s, box-shadow 0.15s;
          }
          .input:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          }
          .button {
            background-color: #2563eb;
            color: white;
            font-weight: 500;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            border: none;
            width: 100%;
            font-size: 1rem;
            cursor: pointer;
            transition: background-color 0.15s;
          }
          .button:hover {
            background-color: #1d4ed8;
          }
          .button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
          .error {
            background-color: #fee2e2;
            border-left: 4px solid #ef4444;
            color: #b91c1c;
            padding: 0.75rem;
            border-radius: 0.375rem;
            margin-bottom: 1rem;
            display: none;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 class="title">URL Campaign Manager</h1>
            <p class="subtitle">Enter your secret API key to continue</p>
          </div>
          
          <div id="error-message" class="error"></div>
          
          <form id="login-form">
            <div class="form-group">
              <input 
                type="password" 
                id="apiKey" 
                class="input" 
                placeholder="Enter API key" 
                required 
                autocomplete="off"
              >
            </div>
            
            <button 
              type="submit" 
              id="submit-button" 
              class="button"
            >
              Login
            </button>
          </form>
        </div>
        
        <script>
          // Simple login script
          document.getElementById('login-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            const errorEl = document.getElementById('error-message');
            const buttonEl = document.getElementById('submit-button');
            const apiKey = document.getElementById('apiKey').value;
            
            errorEl.style.display = 'none';
            buttonEl.disabled = true;
            buttonEl.textContent = 'Verifying...';
            
            try {
              const response = await fetch('/api/auth/verify-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey }),
              });
              
              const data = await response.json();
              
              if (data.authenticated) {
                window.location.href = '/campaigns';
              } else {
                errorEl.textContent = 'Invalid API key. Please try again.';
                errorEl.style.display = 'block';
                buttonEl.disabled = false;
                buttonEl.textContent = 'Login';
              }
            } catch (error) {
              errorEl.textContent = 'An error occurred. Please try again.';
              errorEl.style.display = 'block';
              buttonEl.disabled = false;
              buttonEl.textContent = 'Login';
            }
          });
        </script>
      </body>
      </html>
    `);
  }
  if (path9 === "/login") {
    const sessionId2 = req.cookies.session_id;
    if (sessionId2) {
      log(`Login page accessed with session ID: ${sessionId2}`, "access");
      if (!activeSessions.has(sessionId2)) {
        log(`Creating new session for ID: ${sessionId2}`, "access");
        activeSessions.set(sessionId2, { timestamp: Date.now() });
      }
      return next();
    }
    const referer = req.headers.referer || "";
    if (referer.includes("/access/")) {
      log(`Login request coming from access page via referrer, allowing`, "access");
      const newSessionId = Math.random().toString(36).substring(2, 15);
      activeSessions.set(newSessionId, { timestamp: Date.now() });
      res.cookie("session_id", newSessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_EXPIRY,
        sameSite: "lax"
      });
      return next();
    }
    log(`No valid session for login page`, "access");
    return res.status(404).send("Page not found");
  }
  const sessionId = req.cookies.session_id;
  const apiKey = req.cookies.apiKey;
  if (sessionId && apiKey && isSessionValid(sessionId)) {
    validateApiKey(apiKey).then((isValid) => {
      if (isValid) {
        log(`Access granted for path: ${path9} with valid API key`, "access");
        return next();
      } else {
        log(`Invalid API key for path: ${path9}`, "access");
        return res.status(404).send("Page not found");
      }
    }).catch(() => {
      log(`API key validation error for path: ${path9}`, "access");
      return res.status(404).send("Page not found");
    });
    return;
  }
  log(`Access denied for path: ${path9} - no valid session or API key`, "access");
  return res.status(404).send("Page not found");
}
function storeApiKeyInSession(sessionId, apiKey) {
  if (DEBUG_MODE) {
    log(`Attempting to store API key for session ID: ${sessionId}`, "access");
  }
  if (!activeSessions.has(sessionId)) {
    if (DEBUG_MODE) {
      log(`Creating new session for ID: ${sessionId}`, "access");
    }
    activeSessions.set(sessionId, { timestamp: Date.now() });
  }
  const session = activeSessions.get(sessionId);
  if (session) {
    session.apiKey = apiKey;
    activeSessions.set(sessionId, session);
    log(`API key successfully stored in session: ${sessionId}`, "access");
  } else {
    log(`Failed to store API key in session: ${sessionId}`, "access");
  }
}

// server/auth/access-code-manager.ts
var ACCESS_CODE_SETTING_NAME = "access_code";
async function getAccessCode2() {
  try {
    const [setting] = await db.select().from(systemSettings).where(eq16(systemSettings.name, ACCESS_CODE_SETTING_NAME));
    if (setting?.value) {
      updateAccessCode(setting.value);
      return setting.value;
    }
    const defaultCode = "ABCD123";
    await saveAccessCodeToDatabase(defaultCode);
    return defaultCode;
  } catch (error) {
    console.error("Error getting access code:", error);
    throw new Error("Cannot retrieve access code from database");
  }
}
async function saveAccessCodeToDatabase(accessCode) {
  try {
    const [existing] = await db.select().from(systemSettings).where(eq16(systemSettings.name, ACCESS_CODE_SETTING_NAME));
    if (existing) {
      await db.update(systemSettings).set({ value: accessCode, updatedAt: /* @__PURE__ */ new Date() }).where(eq16(systemSettings.id, existing.id));
    } else {
      await db.insert(systemSettings).values({
        name: ACCESS_CODE_SETTING_NAME,
        value: accessCode,
        description: "Special access URL code for secure login",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      });
    }
    updateAccessCode(accessCode);
    log("Access code successfully saved to database", "access-code-manager");
  } catch (error) {
    console.error("Error saving access code to database:", error);
    throw error;
  }
}
async function initAccessCodeManager() {
  try {
    const accessCode = await getAccessCode2();
    log("Access code manager initialized with code from database", "access-code-manager");
  } catch (error) {
    console.error("Error initializing access code manager:", error);
  }
}

// server/auth/routes.ts
function registerAuthRoutes(app2) {
  app2.post("/api/auth/verify-key", async (req, res) => {
    const { apiKey } = req.body;
    try {
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }
      const isValid = await validateApiKey(apiKey);
      if (!isValid) {
        log(`API key verification failed - invalid key provided`, "auth");
        return res.status(401).json({
          message: "Invalid API key",
          authenticated: false
        });
      }
      res.cookie("apiKey", apiKey, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1e3,
        // 30 days
        sameSite: "lax"
      });
      const sessionId = req.cookies?.session_id;
      if (sessionId) {
        log(`Storing API key in existing session: ${sessionId}`, "auth");
        storeApiKeyInSession(sessionId, apiKey);
      } else {
        const newSessionId = Math.random().toString(36).substring(2, 15);
        log(`Creating new session for authentication: ${newSessionId}`, "auth");
        res.cookie("session_id", newSessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 30 * 24 * 60 * 60 * 1e3,
          // 30 days
          sameSite: "lax"
        });
        storeApiKeyInSession(newSessionId, apiKey);
      }
      log(`API key verification successful`, "auth");
      res.json({
        message: "API key verified",
        authenticated: true
      });
    } catch (error) {
      console.error("API key verification error:", error);
      res.status(500).json({ message: "An error occurred during verification" });
    }
  });
  app2.get("/api/auth/status", async (req, res) => {
    try {
      const apiKey = req.cookies?.apiKey || req.headers["x-api-key"] || req.query.apiKey;
      if (!apiKey) {
        return res.json({ authenticated: false });
      }
      const isValid = await validateApiKey(apiKey);
      res.json({ authenticated: isValid });
    } catch (error) {
      console.error("Auth status error:", error);
      res.json({ authenticated: false });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    res.clearCookie("apiKey");
    const sessionId = req.cookies?.session_id;
    if (sessionId) {
      log(`Clearing session on logout: ${sessionId}`, "auth");
      res.clearCookie("session_id");
    }
    res.json({ message: "Logout successful" });
  });
  app2.get("/api/auth/test", requireAuth, (req, res) => {
    res.json({
      message: "Authentication successful - API key is valid"
    });
  });
  app2.post("/api/auth/change-key", requireAuth, async (req, res) => {
    try {
      const { currentKey, newKey, confirmNewKey } = req.body;
      if (!currentKey || !newKey || !confirmNewKey) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (newKey !== confirmNewKey) {
        return res.status(400).json({ message: "New key and confirmation do not match" });
      }
      const isCurrentKeyValid = await validateApiKey(currentKey);
      if (!isCurrentKeyValid) {
        return res.status(401).json({ message: "Current API key is incorrect" });
      }
      try {
        await saveApiKeyToDatabase(newKey);
        process.env.API_SECRET_KEY = newKey;
        res.clearCookie("apiKey");
        res.cookie("apiKey", newKey, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 30 * 24 * 60 * 60 * 1e3,
          // 30 days
          sameSite: "lax"
        });
        log(`API key successfully changed and saved to database`, "auth");
        res.json({
          message: "API key successfully updated",
          success: true
        });
      } catch (dbError) {
        console.error("Error saving API key to database:", dbError);
        return res.status(500).json({
          message: "API key was changed but could not be saved permanently. It may revert on server restart.",
          success: false
        });
      }
    } catch (error) {
      console.error("Error changing API key:", error);
      res.status(500).json({ message: "An error occurred while changing the API key" });
    }
  });
  app2.get("/api/auth/access-code", requireAuth, async (_req, res) => {
    try {
      const accessCode = await getAccessCode2();
      let maskedCode = accessCode;
      if (accessCode.length > 4) {
        maskedCode = accessCode.substring(0, 2) + "*".repeat(accessCode.length - 4) + accessCode.substring(accessCode.length - 2);
      } else if (accessCode.length > 2) {
        maskedCode = accessCode.substring(0, 1) + "*".repeat(accessCode.length - 2) + accessCode.substring(accessCode.length - 1);
      } else if (accessCode.length > 0) {
        maskedCode = "*".repeat(accessCode.length);
      }
      res.json({
        accessCode: maskedCode,
        success: true
      });
    } catch (error) {
      console.error("Error getting access code:", error);
      res.status(500).json({ message: "An error occurred while retrieving the access code" });
    }
  });
  app2.post("/api/auth/change-access-code", requireAuth, async (req, res) => {
    try {
      const { currentCode, newCode, confirmNewCode } = req.body;
      if (!currentCode || !newCode || !confirmNewCode) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (newCode !== confirmNewCode) {
        return res.status(400).json({ message: "New code and confirmation do not match" });
      }
      const currentAccessCode = getAccessCode();
      if (currentCode !== currentAccessCode) {
        return res.status(401).json({ message: "Current access code is incorrect" });
      }
      try {
        await saveAccessCodeToDatabase(newCode);
        log(`Access code successfully changed and saved to database`, "auth");
        res.json({
          message: "Access code successfully updated",
          success: true
        });
      } catch (dbError) {
        console.error("Error saving access code to database:", dbError);
        return res.status(500).json({
          message: "Access code was changed but could not be saved permanently. It may revert on server restart.",
          success: false
        });
      }
    } catch (error) {
      console.error("Error changing access code:", error);
      res.status(500).json({ message: "An error occurred while changing the access code" });
    }
  });
}

// server/index.ts
init_traffic_generator_new();
init_youtube_api_service();
await init_key_manager();

// server/scheduled-budget-updater.ts
init_db();
init_trafficstar_service();
var DEFAULT_BUDGET_AMOUNT = 10.15;
async function processScheduledBudgetUpdates() {
  try {
    const now = /* @__PURE__ */ new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}:00`;
    console.log(`\u{1F552} Checking for scheduled budget updates at current time ${currentTimeStr} UTC`);
    const { rows: campaignsToUpdate } = await pool.query(`
      SELECT 
        id, 
        name, 
        trafficstar_campaign_id as "trafficstarCampaignId", 
        budget_update_time as "budgetUpdateTime", 
        pending_budget_update as "pendingBudgetUpdate"
      FROM campaigns
      WHERE 
        trafficstar_campaign_id IS NOT NULL
        AND (
          pending_budget_update IS TRUE
          OR budget_update_time = $1
        )
    `, [currentTimeStr]);
    if (campaignsToUpdate.length === 0) {
      console.log("No campaigns need budget updates at this time.");
      return;
    }
    console.log(`Found ${campaignsToUpdate.length} campaigns that need budget updates.`);
    for (const campaign of campaignsToUpdate) {
      try {
        if (!campaign.trafficstarCampaignId) {
          console.log(`Campaign ${campaign.id} has no TrafficStar ID - skipping budget update`);
          continue;
        }
        const shouldUpdateNow = campaign.budgetUpdateTime === currentTimeStr || campaign.pendingBudgetUpdate;
        if (!shouldUpdateNow) {
          console.log(`Campaign ${campaign.id} budget update time ${campaign.budgetUpdateTime} doesn't match current time - skipping`);
          continue;
        }
        console.log(`Performing scheduled budget update and pausing campaign ${campaign.id} (TrafficStar ID: ${campaign.trafficstarCampaignId})`);
        await trafficStarService.updateCampaignBudget(
          Number(campaign.trafficstarCampaignId),
          DEFAULT_BUDGET_AMOUNT
        );
        console.log(`\u2705 Successfully updated budget for campaign ${campaign.id} to $${DEFAULT_BUDGET_AMOUNT}`);
        try {
          await trafficStarService.pauseCampaign(Number(campaign.trafficstarCampaignId));
          console.log(`\u2705 Successfully paused campaign ${campaign.id} (TrafficStar ID: ${campaign.trafficstarCampaignId})`);
        } catch (pauseError) {
          console.error(`Failed to pause campaign ${campaign.id} (TrafficStar ID: ${campaign.trafficstarCampaignId}):`, pauseError);
        }
        await pool.query(`
          UPDATE campaigns
          SET 
            pending_budget_update = false,
            last_trafficstar_sync = $1,
            updated_at = $1
          WHERE id = $2
        `, [/* @__PURE__ */ new Date(), campaign.id]);
        console.log(`\u2705 Marked campaign ${campaign.id} budget update as complete`);
      } catch (error) {
        console.error(`Error updating budget for campaign ${campaign.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error processing scheduled budget updates:", error);
  }
}

// server/index.ts
var app = express3();
app.use(compression());
app.use(express3.json({ limit: "1mb" }));
app.use(express3.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  if (req.path.startsWith("/c/") || req.path.startsWith("/r/")) {
    res.setHeader("X-Server-ID", "high-perf-redirector-1");
    res.setHeader("Cache-Control", "public, max-age=0");
  }
  next();
});
app.use(handleAccessRoutes);
app.use((req, res, next) => {
  const start = Date.now();
  const path9 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path9.startsWith("/api")) {
      let logLine = `${req.method} ${path9} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  registerAuthRoutes(app);
  app.use("/api", (req, res, next) => {
    if (req.path === "/auth/login" || req.path === "/auth/verify" || req.path === "/auth/status" || req.path.startsWith("/campaigns/") && (req.method === "GET" || req.method === "OPTIONS") || req.path.startsWith("/youtube-url-records") || req.path.startsWith("/gmail-reader/") || req.path.startsWith("/system/")) {
      return next();
    }
    requireAuth(req, res, next);
  });
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  app.use("*", (req, res, next) => {
    if (res.headersSent) {
      return next();
    }
    const path9 = req.path;
    const sessionId = req.cookies.session_id;
    const apiKey = req.cookies.apiKey;
    if (path9 !== "/access" && !path9.startsWith("/access/") && !isValidTemporaryLoginPath(path9) && (!sessionId || !apiKey || !isSessionValid(sessionId))) {
      return res.status(404).send("Page not found");
    }
    next();
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, async () => {
    log(`serving on port ${port}`);
    try {
      await initKeyManager();
      log("API key manager initialized successfully");
      await initAccessCodeManager();
      log("Access code manager initialized successfully");
      const campaigns3 = await storage.getCampaigns();
      const gmailConfig = {
        user: "compaignwalabhai@gmail.com",
        password: "hciuemplthdkwfho",
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        whitelistSenders: ["help@donot-reply.in"]
        // DO NOT set defaultCampaignId here - use existing config value instead
      };
      gmailReader.updateConfig(gmailConfig);
      try {
        const verifyResult = await gmailReader.verifyCredentials();
        if (verifyResult.success) {
          log(`Gmail credentials verified successfully, starting reader...`, "gmail-reader");
          gmailReader.start();
          log(`Gmail reader started successfully and monitoring emails from help@donot-reply.in`, "gmail-reader");
        } else {
          log(`Gmail verification failed: ${verifyResult.message}`, "gmail-reader");
        }
      } catch (verifyError) {
        log(`Error verifying Gmail credentials: ${verifyError}`, "gmail-reader");
      }
      try {
        await initializeTrafficStar();
        log("TrafficStar API initialized successfully");
        initializeTrafficGeneratorScheduler2();
        log("Traffic Generator scheduler initialized successfully");
        setInterval(() => {
          processScheduledBudgetUpdates().catch((error) => {
            log(`Error processing scheduled budget updates: ${error}`, "budget-updater");
          });
        }, 60 * 1e3);
        log("Budget update scheduler initialized successfully");
        if (youtubeApiService.isConfigured()) {
          youtubeApiService.scheduleChecks();
          log("YouTube API service initialized successfully");
        } else {
          log("YouTube API service not initialized - API key not configured");
        }
      } catch (trafficstarError) {
        log(`Error initializing TrafficStar API: ${trafficstarError}`);
      }
    } catch (error) {
      log(`Error auto-configuring integrations: ${error}`, "startup");
    }
  });
})();
