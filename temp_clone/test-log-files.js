const fs = require('fs');
const path = require('path');

// Log directories
const urlBudgetLogsDir = path.join('/var/www/UrlCampaignTracker', 'url_budget_logs');
const activeUrlBudgetLogsDir = path.join('/var/www/UrlCampaignTracker', 'Active_Url_Budget_Logs');

// Check if directories exist
console.log(`url_budget_logs directory exists: ${fs.existsSync(urlBudgetLogsDir)}`);
console.log(`Active_Url_Budget_Logs directory exists: ${fs.existsSync(activeUrlBudgetLogsDir)}`);

// Check campaign 1 log file
const campaign1LogPath = path.join(urlBudgetLogsDir, 'campaign_1_url_budget_logs');
console.log(`Campaign 1 log file exists: ${fs.existsSync(campaign1LogPath)}`);
if (fs.existsSync(campaign1LogPath)) {
  console.log(`Campaign 1 log content: ${fs.readFileSync(campaign1LogPath, 'utf8')}`);
}

// Check campaign 2 log file
const campaign2LogPath = path.join(urlBudgetLogsDir, 'campaign_2_url_budget_logs');
console.log(`Campaign 2 log file exists: ${fs.existsSync(campaign2LogPath)}`);
if (fs.existsSync(campaign2LogPath)) {
  console.log(`Campaign 2 log content: ${fs.readFileSync(campaign2LogPath, 'utf8')}`);
}

// Check active logs file
const activeLogsPath = path.join(activeUrlBudgetLogsDir, 'Active_Url_Budget_Logs');
console.log(`Active logs file exists: ${fs.existsSync(activeLogsPath)}`);
if (fs.existsSync(activeLogsPath)) {
  console.log(`Active logs content: ${fs.readFileSync(activeLogsPath, 'utf8')}`);
}
