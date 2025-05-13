import { log } from './vite';
import { getServerStats } from './server-monitor';

// Default threshold for critical disk space warning (90%)
const DEFAULT_WARNING_THRESHOLD = 90;

// Minimum interval between notifications (12 hours)
const MIN_NOTIFICATION_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

// Store last notification times to prevent spam
const lastNotificationTimes: Record<string, number> = {};

/**
 * Check disk space and log warnings if space is critically low
 * @param warningThreshold Percentage at which to trigger a warning (default: 90%)
 */
export async function checkDiskSpace(warningThreshold = DEFAULT_WARNING_THRESHOLD): Promise<void> {
  try {
    log('Performing scheduled disk space check', 'disk-monitor');
    
    // Get server stats which includes disk information
    const stats = await getServerStats();
    const { diskStats } = stats;
    
    // Check overall disk usage
    if (diskStats.usedPercent >= warningThreshold) {
      const now = Date.now();
      const lastNotification = lastNotificationTimes['overall'] || 0;
      
      // Only notify if enough time has passed since last notification
      if (now - lastNotification > MIN_NOTIFICATION_INTERVAL) {
        log(`⚠️ CRITICAL: Overall disk space is critically low (${diskStats.usedPercent}% used)`, 'disk-monitor');
        log(`Total: ${formatBytes(diskStats.total)}, Used: ${formatBytes(diskStats.used)}, Free: ${formatBytes(diskStats.free)}`, 'disk-monitor');
        
        // Update last notification time
        lastNotificationTimes['overall'] = now;
      }
    }
    
    // Check individual filesystems
    for (const fs of diskStats.filesystems) {
      if (fs.usedPercent >= warningThreshold) {
        const fsKey = `${fs.filesystem}:${fs.mount}`;
        const now = Date.now();
        const lastNotification = lastNotificationTimes[fsKey] || 0;
        
        // Only notify if enough time has passed since last notification
        if (now - lastNotification > MIN_NOTIFICATION_INTERVAL) {
          log(`⚠️ CRITICAL: Filesystem ${fs.mount} (${fs.filesystem}) is critically low on space (${fs.usedPercent}% used)`, 'disk-monitor');
          log(`Size: ${formatBytes(fs.size)}, Used: ${formatBytes(fs.used)}, Free: ${formatBytes(fs.free)}`, 'disk-monitor');
          
          // Update last notification time
          lastNotificationTimes[fsKey] = now;
        }
      }
    }
    
    // Log all clear if no critical issues
    const criticalFilesystems = diskStats.filesystems.filter(fs => fs.usedPercent >= warningThreshold);
    if (diskStats.usedPercent < warningThreshold && criticalFilesystems.length === 0) {
      log(`✅ Disk space check completed. All filesystems have adequate space.`, 'disk-monitor');
      log(`Overall: ${diskStats.usedPercent}% used (${formatBytes(diskStats.free)} free)`, 'disk-monitor');
    }
  } catch (error) {
    log(`Error checking disk space: ${error}`, 'disk-monitor');
  }
}

/**
 * Schedule regular disk space checks
 * @param intervalMinutes How often to check disk space in minutes (default: 60)
 * @param warningThreshold Percentage at which to trigger a warning (default: 90%)
 */
export function startDiskSpaceMonitoring(intervalMinutes = 60, warningThreshold = DEFAULT_WARNING_THRESHOLD): NodeJS.Timeout {
  // Run the first check immediately
  checkDiskSpace(warningThreshold)
    .catch(err => log.error('Error in initial disk space check:', err));
  
  // Schedule regular checks
  const intervalMs = intervalMinutes * 60 * 1000;
  return setInterval(() => {
    checkDiskSpace(warningThreshold)
      .catch(err => log.error('Error in scheduled disk space check:', err));
  }, intervalMs);
}

/**
 * Format bytes to a human readable string with appropriate unit
 * @param bytes The number of bytes
 * @param decimals Decimal places to show
 * @returns Formatted string (e.g., "10.5 GB")
 */
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}