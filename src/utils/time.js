/**
 * MongoMonitorBot - Time Utilities
 * Helper functions for time formatting and calculations
 */

/**
 * Convert seconds to human-readable duration
 * @param {number} seconds - Duration in seconds
 * @returns {string} Human-readable duration string
 */
function formatUptime(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
        return 'Unknown';
    }

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];

    if (days > 0) {
        parts.push(`${days}d`);
    }
    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }
    if (secs > 0 || parts.length === 0) {
        parts.push(`${secs}s`);
    }

    return parts.join(' ');
}

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Size in bytes
 * @param {number} [decimals=2] - Decimal places
 * @returns {string} Human-readable size string
 */
function formatBytes(bytes, decimals = 2) {
    if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
        return 'Unknown';
    }

    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));

    return `${size} ${sizes[i]}`;
}

/**
 * Get current timestamp in ISO format
 * @returns {string} ISO timestamp
 */
function getCurrentTimestamp() {
    return new Date().toISOString();
}

/**
 * Get formatted timestamp for display
 * @returns {string} Formatted timestamp
 */
function getDisplayTimestamp() {
    return new Date().toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

/**
 * Get Discord timestamp format
 * @param {Date} [date] - Date object (defaults to now)
 * @param {string} [style='F'] - Discord timestamp style
 * @returns {string} Discord timestamp string
 * 
 * Styles:
 * - t: Short time (16:20)
 * - T: Long time (16:20:30)
 * - d: Short date (20/04/2021)
 * - D: Long date (20 April 2021)
 * - f: Short date/time (20 April 2021 16:20)
 * - F: Long date/time (Tuesday, 20 April 2021 16:20)
 * - R: Relative (2 months ago)
 */
function getDiscordTimestamp(date = new Date(), style = 'F') {
    const timestamp = Math.floor(date.getTime() / 1000);
    return `<t:${timestamp}:${style}>`;
}

/**
 * Calculate time difference in milliseconds
 * @param {number} startTime - Start time (from Date.now() or performance.now())
 * @returns {number} Elapsed time in milliseconds
 */
function getElapsedTime(startTime) {
    return Date.now() - startTime;
}

/**
 * Format ping latency for display
 * @param {number} ms - Latency in milliseconds
 * @returns {string} Formatted latency string with indicator
 */
function formatPing(ms) {
    if (typeof ms !== 'number' || isNaN(ms)) {
        return '❓ Unknown';
    }

    if (ms < 50) {
        return `🟢 ${ms}ms`;
    } else if (ms < 150) {
        return `🟡 ${ms}ms`;
    } else if (ms < 300) {
        return `🟠 ${ms}ms`;
    } else {
        return `🔴 ${ms}ms`;
    }
}

module.exports = {
    formatUptime,
    formatBytes,
    getCurrentTimestamp,
    getDisplayTimestamp,
    getDiscordTimestamp,
    getElapsedTime,
    formatPing
};
