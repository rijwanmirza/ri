-- Migration to add child TrafficStar campaigns table
CREATE TABLE IF NOT EXISTS child_trafficstar_campaigns (
  id SERIAL PRIMARY KEY,
  parent_campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  trafficstar_campaign_id TEXT NOT NULL,
  click_remaining_threshold INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on parent_campaign_id for faster lookups
CREATE INDEX IF NOT EXISTS child_trafficstar_campaigns_parent_campaign_id_idx 
ON child_trafficstar_campaigns(parent_campaign_id);