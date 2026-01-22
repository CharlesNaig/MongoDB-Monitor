/**
 * MongoMonitorBot - Logger Utility
 * Clean, structured logging with timestamps
 */

const config = require('../config');

/**
 * Log levels and their priorities
 */
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    gray: '\x1b[90m',
    cyan: '\x1b[36m'
};

/**
 * Get current log level from config
 */
function getCurrentLevel() {
    const level = config?.logging?.level || 'info';
    return LOG_LEVELS[level] ?? LOG_LEVELS.info;
}

/**
 * Format timestamp for log output
 */
function formatTimestamp() {
    const now = new Date();
    return now.toISOString();
}

/**
 * Format log message with level and timestamp
 */
function formatMessage(level, message, color) {
    const timestamp = formatTimestamp();
    const levelTag = level.toUpperCase().padEnd(5);
    return `${COLORS.gray}[${timestamp}]${COLORS.reset} ${color}[${levelTag}]${COLORS.reset} ${message}`;
}

/**
 * Logger instance
 */
const logger = {
    /**
     * Log error message
     * @param {string} message - Message to log
     * @param {Error} [error] - Optional error object
     */
    error(message, error = null) {
        if (getCurrentLevel() >= LOG_LEVELS.error) {
            console.error(formatMessage('error', message, COLORS.red));
            if (error?.stack) {
                console.error(`${COLORS.gray}${error.stack}${COLORS.reset}`);
            }
        }
    },

    /**
     * Log warning message
     * @param {string} message - Message to log
     */
    warn(message) {
        if (getCurrentLevel() >= LOG_LEVELS.warn) {
            console.warn(formatMessage('warn', message, COLORS.yellow));
        }
    },

    /**
     * Log info message
     * @param {string} message - Message to log
     */
    info(message) {
        if (getCurrentLevel() >= LOG_LEVELS.info) {
            console.log(formatMessage('info', message, COLORS.green));
        }
    },

    /**
     * Log debug message
     * @param {string} message - Message to log
     */
    debug(message) {
        if (getCurrentLevel() >= LOG_LEVELS.debug) {
            console.log(formatMessage('debug', message, COLORS.blue));
        }
    },

    /**
     * Log a divider line
     */
    divider() {
        console.log(`${COLORS.gray}${'─'.repeat(60)}${COLORS.reset}`);
    },

    /**
     * Log MongoDB connection status
     * @param {string} name - Instance name
     * @param {boolean} online - Connection status
     * @param {number} [ping] - Ping latency in ms
     */
    mongoStatus(name, online, ping = null) {
        const status = online 
            ? `${COLORS.green}ONLINE${COLORS.reset}` 
            : `${COLORS.red}OFFLINE${COLORS.reset}`;
        const pingStr = ping !== null ? ` (${ping}ms)` : '';
        this.info(`[MongoDB] ${name}: ${status}${pingStr}`);
    }
};

module.exports = logger;
