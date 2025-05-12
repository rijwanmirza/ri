# URL Campaign Tracker - Consolidated Startup Guide

This guide explains how to ensure your URL Campaign Tracker app runs **only** using PM2, avoiding port conflicts and duplicate instances.

## Step 1: Install the Required Scripts

1. Copy all these scripts to your server:
   - `stop-all-instances.sh` - Stops all application instances
   - `pm2-start-improved.sh` - Proper startup script with token file handling
   - `update-auto-sync-manager.sh` - Updates the auto-sync script to use PM2
   - `url-tracker.service` - Systemd service file

2. Upload the files to your server:
   ```bash
   scp stop-all-instances.sh pm2-start-improved.sh update-auto-sync-manager.sh url-tracker.service root@your-server-ip:/var/www/UrlCampaignTracker/
   ```

## Step 2: Set Up Proper Process Management

1. SSH into your server:
   ```bash
   ssh root@your-server-ip
   ```

2. Make the scripts executable:
   ```bash
   cd /var/www/UrlCampaignTracker
   chmod +x stop-all-instances.sh pm2-start-improved.sh update-auto-sync-manager.sh
   ```

3. Update the auto-sync-manager script:
   ```bash
   bash update-auto-sync-manager.sh
   ```

4. Install the systemd service:
   ```bash
   cp url-tracker.service /etc/systemd/system/
   systemctl daemon-reload
   systemctl enable url-tracker.service
   ```

## Step 3: Stop All Instances and Start with PM2

1. Stop all existing instances:
   ```bash
   cd /var/www/UrlCampaignTracker
   bash stop-all-instances.sh
   ```

2. Start with PM2 properly:
   ```bash
   bash pm2-start-improved.sh
   ```

3. Save the PM2 process list so it survives reboots:
   ```bash
   pm2 save
   ```

## Step 4: Configure PM2 for Startup

1. Configure PM2 to start on system boot:
   ```bash
   pm2 startup
   ```
   
2. Follow the instructions from the above command to complete the setup.

## Step 5: Verify Everything Works

1. Check that only one instance is running:
   ```bash
   pm2 status
   ```

2. Verify the application is accessible:
   ```bash
   curl http://localhost:5000/api/health
   ```

3. Test a reboot:
   ```bash
   reboot
   ```

4. After reboot, check PM2 again:
   ```bash
   pm2 status
   ```

## Commands for Daily Management

- Check application status:
  ```bash
  pm2 status
  ```

- View real-time logs:
  ```bash
  pm2 logs url-tracker
  ```

- Restart the application:
  ```bash
  pm2 restart url-tracker
  ```

- Manually trigger sync and restart:
  ```bash
  /root/auto-sync-manager.sh sync
  ```