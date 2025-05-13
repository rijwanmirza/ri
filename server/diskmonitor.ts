import * as si from 'systeminformation';
import { log } from './utils/logger';

/**
 * Interface for disk space information
 */
export interface DiskSpaceInfo {
  filesystem: string;
  size: number;
  used: number;
  available: number;
  usedPercent: number;
  mount: string;
  sizeFormatted: string;
  usedFormatted: string;
  availableFormatted: string;
}

/**
 * Format bytes to a human readable string with appropriate unit
 * @param bytes The number of bytes
 * @param decimals Decimal places to show
 * @returns Formatted string (e.g., "10.5 GB")
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get disk space information for all filesystems
 * @returns Promise with array of disk space info
 */
export async function getDiskSpaceInfo(): Promise<DiskSpaceInfo[]> {
  try {
    // Get all file system stats
    const fsSize = await si.fsSize();
    
    return fsSize.map(fs => {
      const usedPercent = Math.round((fs.used / fs.size) * 100);
      
      return {
        filesystem: fs.fs,
        size: fs.size,
        used: fs.used,
        available: fs.size - fs.used,
        usedPercent,
        mount: fs.mount,
        sizeFormatted: formatBytes(fs.size),
        usedFormatted: formatBytes(fs.used),
        availableFormatted: formatBytes(fs.size - fs.used)
      };
    });
  } catch (error) {
    log.error('Error getting disk space info:', error);
    return [];
  }
}

/**
 * Get overall disk space usage (aggregated across all filesystems)
 * @returns Promise with overall disk space info
 */
export async function getOverallDiskUsage(): Promise<{
  totalSize: number;
  totalUsed: number;
  totalAvailable: number;
  usedPercent: number;
  totalSizeFormatted: string;
  totalUsedFormatted: string;
  totalAvailableFormatted: string;
}> {
  try {
    const fsInfo = await getDiskSpaceInfo();
    
    // Calculate totals
    const totalSize = fsInfo.reduce((acc, fs) => acc + fs.size, 0);
    const totalUsed = fsInfo.reduce((acc, fs) => acc + fs.used, 0);
    const totalAvailable = totalSize - totalUsed;
    const usedPercent = Math.round((totalUsed / totalSize) * 100);
    
    return {
      totalSize,
      totalUsed,
      totalAvailable,
      usedPercent,
      totalSizeFormatted: formatBytes(totalSize),
      totalUsedFormatted: formatBytes(totalUsed),
      totalAvailableFormatted: formatBytes(totalAvailable)
    };
  } catch (error) {
    log.error('Error calculating overall disk usage:', error);
    return {
      totalSize: 0,
      totalUsed: 0,
      totalAvailable: 0,
      usedPercent: 0,
      totalSizeFormatted: '0 Bytes',
      totalUsedFormatted: '0 Bytes',
      totalAvailableFormatted: '0 Bytes'
    };
  }
}

/**
 * Check if disk space is critically low
 * @param threshold Percentage threshold to trigger warning (default: 90%)
 * @returns Promise with warning info if disk space is low
 */
export async function checkDiskSpaceWarning(threshold = 90): Promise<{
  isLow: boolean;
  warningMessage?: string;
  criticalMounts?: string[];
}> {
  try {
    const fsInfo = await getDiskSpaceInfo();
    const criticalMounts = fsInfo
      .filter(fs => fs.usedPercent >= threshold)
      .map(fs => `${fs.mount} (${fs.usedPercent}% used)`);
    
    if (criticalMounts.length > 0) {
      return {
        isLow: true,
        warningMessage: `Disk space critically low on: ${criticalMounts.join(', ')}`,
        criticalMounts
      };
    }
    
    return { isLow: false };
  } catch (error) {
    log.error('Error checking disk space warning:', error);
    return { isLow: false };
  }
}

// Export a monitoring function that can be called periodically
export async function monitorDiskSpace(warningThreshold = 90): Promise<void> {
  const warning = await checkDiskSpaceWarning(warningThreshold);
  if (warning.isLow) {
    log.warn(warning.warningMessage);
  }
  
  const usage = await getOverallDiskUsage();
  log.info(`Disk usage: ${usage.usedPercent}% (${usage.totalUsedFormatted} used of ${usage.totalSizeFormatted})`);
}