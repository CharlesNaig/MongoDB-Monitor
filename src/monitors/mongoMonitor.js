/**
 * MongoMonitorBot - MongoDB Monitor
 * Handles connections and monitoring for all MongoDB instances
 */

const { MongoClient } = require('mongodb');
const logger = require('../utils/logger');
const healthCheck = require('./healthCheck');
const { getCurrentTimestamp } = require('../utils/time');

/**
 * Store for tracking reconnection attempts per instance
 */
const reconnectInfo = new Map();

/**
 * Store for active MongoDB clients (for cleanup)
 */
const activeClients = new Map();

/**
 * Initialize reconnect tracking for an instance
 * @param {string} name - Instance name
 */
function initReconnectTracking(name) {
    if (!reconnectInfo.has(name)) {
        reconnectInfo.set(name, {
            attempts: 0,
            lastAttempt: null,
            lastSuccess: null,
            lastFailure: null,
            failureReason: null,
            consecutiveFailures: 0
        });
    }
}

/**
 * Update reconnect info on success
 * @param {string} name - Instance name
 */
function recordSuccess(name) {
    const info = reconnectInfo.get(name);
    if (info) {
        info.lastSuccess = getCurrentTimestamp();
        info.consecutiveFailures = 0;
        info.failureReason = null;
    }
}

/**
 * Update reconnect info on failure
 * @param {string} name - Instance name
 * @param {string} reason - Failure reason
 */
function recordFailure(name, reason) {
    const info = reconnectInfo.get(name);
    if (info) {
        info.attempts++;
        info.lastAttempt = getCurrentTimestamp();
        info.lastFailure = getCurrentTimestamp();
        info.consecutiveFailures++;
        info.failureReason = reason;
    }
}

/**
 * Get reconnect info for all instances
 * @returns {Object} Reconnect info map as object
 */
function getReconnectInfo() {
    const result = {};
    for (const [name, info] of reconnectInfo) {
        result[name] = { ...info };
    }
    return result;
}

/**
 * Create MongoDB connection options
 * @param {Object} instanceConfig - Instance configuration
 * @returns {Object} MongoDB client options
 */
function createConnectionOptions(instanceConfig) {
    return {
        authSource: instanceConfig.authSource || 'admin',
        serverSelectionTimeoutMS: instanceConfig.timeoutMS || 5000,
        connectTimeoutMS: instanceConfig.timeoutMS || 5000,
        socketTimeoutMS: instanceConfig.timeoutMS || 5000,
        maxPoolSize: 1, // Minimal pool for monitoring
        minPoolSize: 0,
        maxIdleTimeMS: 10000,
        directConnection: false
    };
}

/**
 * Connect to a MongoDB instance and gather metrics
 * @param {Object} instanceConfig - Instance configuration
 * @returns {Promise<Object>} Health check results
 */
async function checkInstance(instanceConfig) {
    const { name, uri, timeoutMS } = instanceConfig;
    let client = null;
    
    initReconnectTracking(name);
    
    const result = {
        name,
        online: false,
        ping: null,
        uptime: null,
        connections: null,
        memory: null,
        network: null,
        operations: null,
        storageEngine: null,
        version: null,
        replication: null,
        error: null,
        lastCheck: getCurrentTimestamp()
    };
    
    try {
        logger.debug(`[MongoDB] Connecting to ${name}...`);
        
        // Create client with options
        const options = createConnectionOptions(instanceConfig);
        client = new MongoClient(uri, options);
        
        // Store client for cleanup
        activeClients.set(name, client);
        
        // Connect with timeout
        const connectPromise = client.connect();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Connection timeout')), timeoutMS || 5000);
        });
        
        await Promise.race([connectPromise, timeoutPromise]);
        
        // Get database reference
        const db = client.db('admin');
        
        // Ping the database
        const pingResult = await healthCheck.pingDatabase(db);
        
        if (!pingResult.success) {
            throw new Error(pingResult.error || 'Ping failed');
        }
        
        result.ping = pingResult.latency;
        
        // Get server status
        const statusResult = await healthCheck.getServerStatus(db);
        
        if (!statusResult.success) {
            // Partial success - connected but couldn't get full status
            result.online = true;
            result.error = statusResult.error;
            logger.warn(`[MongoDB] ${name}: Connected but serverStatus failed: ${statusResult.error}`);
        } else {
            // Full success - compile all metrics
            const health = healthCheck.compileHealthMetrics(pingResult, statusResult);
            
            result.online = true;
            result.uptime = health.metrics.uptime;
            result.connections = health.metrics.connections;
            result.memory = health.metrics.memory;
            result.network = health.metrics.network;
            result.operations = health.metrics.operations;
            result.storageEngine = health.metrics.storageEngine;
            result.version = health.metrics.version;
            result.replication = health.metrics.replication;
        }
        
        recordSuccess(name);
        logger.mongoStatus(name, true, result.ping);
        
    } catch (error) {
        result.online = false;
        result.error = error.message;
        
        recordFailure(name, error.message);
        logger.mongoStatus(name, false);
        logger.debug(`[MongoDB] ${name} error: ${error.message}`);
        
    } finally {
        // Always close the client after checking
        if (client) {
            try {
                await client.close();
                activeClients.delete(name);
            } catch (closeError) {
                logger.debug(`[MongoDB] Error closing ${name} connection: ${closeError.message}`);
            }
        }
    }
    
    return result;
}

/**
 * Check all MongoDB instances
 * @param {Array<Object>} instances - Array of instance configurations
 * @returns {Promise<Array<Object>>} Array of health check results
 */
async function checkAllInstances(instances) {
    logger.debug(`[MongoDB] Checking ${instances.length} instance(s)...`);
    
    const results = [];
    
    // Check instances sequentially to avoid connection issues
    for (const instance of instances) {
        try {
            const result = await checkInstance(instance);
            results.push(result);
        } catch (error) {
            // Should never reach here due to error handling in checkInstance
            logger.error(`[MongoDB] Unexpected error checking ${instance.name}: ${error.message}`);
            results.push({
                name: instance.name,
                online: false,
                error: error.message,
                lastCheck: getCurrentTimestamp()
            });
        }
    }
    
    // Log summary
    const onlineCount = results.filter(r => r.online).length;
    logger.info(`[MongoDB] Health check complete: ${onlineCount}/${results.length} online`);
    
    return results;
}

/**
 * Close all active MongoDB connections
 */
async function closeAllConnections() {
    logger.info('[MongoDB] Closing all active connections...');
    
    for (const [name, client] of activeClients) {
        try {
            await client.close();
            logger.debug(`[MongoDB] Closed connection: ${name}`);
        } catch (error) {
            logger.debug(`[MongoDB] Error closing ${name}: ${error.message}`);
        }
    }
    
    activeClients.clear();
    logger.info('[MongoDB] All connections closed');
}

/**
 * Get status summary for quick checks
 * @param {Array<Object>} results - Health check results
 * @returns {Object} Status summary
 */
function getStatusSummary(results) {
    const total = results.length;
    const online = results.filter(r => r.online).length;
    const offline = total - online;
    
    let status;
    if (online === total) {
        status = 'all_online';
    } else if (online === 0) {
        status = 'all_offline';
    } else {
        status = 'partial';
    }
    
    return {
        total,
        online,
        offline,
        status,
        percentage: total > 0 ? Math.round((online / total) * 100) : 0
    };
}

module.exports = {
    checkInstance,
    checkAllInstances,
    closeAllConnections,
    getReconnectInfo,
    getStatusSummary
};
