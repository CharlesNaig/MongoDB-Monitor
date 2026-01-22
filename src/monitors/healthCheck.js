/**
 * MongoMonitorBot - Health Check Utilities
 * Functions for checking MongoDB health metrics
 */

const logger = require('../utils/logger');

/**
 * Execute ping command to check connectivity
 * @param {import('mongodb').Db} db - MongoDB database instance
 * @returns {Promise<{success: boolean, latency: number}>}
 */
async function pingDatabase(db) {
    const startTime = Date.now();
    
    try {
        await db.admin().command({ ping: 1 });
        const latency = Date.now() - startTime;
        
        return {
            success: true,
            latency
        };
    } catch (error) {
        return {
            success: false,
            latency: Date.now() - startTime,
            error: error.message
        };
    }
}

/**
 * Get server status with all metrics
 * @param {import('mongodb').Db} db - MongoDB database instance
 * @returns {Promise<Object>} Server status object
 */
async function getServerStatus(db) {
    try {
        const status = await db.admin().command({ serverStatus: 1 });
        return {
            success: true,
            data: status
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Extract uptime from server status
 * @param {Object} serverStatus - Server status object
 * @returns {number} Uptime in seconds
 */
function extractUptime(serverStatus) {
    return serverStatus?.uptime ?? 0;
}

/**
 * Extract connection metrics from server status
 * @param {Object} serverStatus - Server status object
 * @returns {Object} Connection metrics
 */
function extractConnections(serverStatus) {
    const connections = serverStatus?.connections ?? {};
    
    return {
        current: connections.current ?? 0,
        available: connections.available ?? 0,
        totalCreated: connections.totalCreated ?? 0,
        active: connections.active ?? 0,
        threaded: connections.threaded ?? 0,
        exhaustIsMaster: connections.exhaustIsMaster ?? 0,
        exhaustHello: connections.exhaustHello ?? 0,
        awaitingTopologyChanges: connections.awaitingTopologyChanges ?? 0
    };
}

/**
 * Extract memory metrics from server status
 * @param {Object} serverStatus - Server status object
 * @returns {Object} Memory metrics in bytes
 */
function extractMemory(serverStatus) {
    const mem = serverStatus?.mem ?? {};
    const tcmalloc = serverStatus?.tcmalloc?.generic ?? {};
    
    // mem values are in MB, convert to bytes for consistency
    return {
        resident: (mem.resident ?? 0) * 1024 * 1024,      // Resident memory
        virtual: (mem.virtual ?? 0) * 1024 * 1024,        // Virtual memory
        mapped: (mem.mapped ?? 0) * 1024 * 1024,          // Mapped memory (MMAPv1)
        mappedWithJournal: (mem.mappedWithJournal ?? 0) * 1024 * 1024,
        // TCMalloc specific (if available)
        heapSize: tcmalloc.heap_size ?? null,
        currentAllocated: tcmalloc.current_allocated_bytes ?? null
    };
}

/**
 * Extract network metrics from server status
 * @param {Object} serverStatus - Server status object
 * @returns {Object} Network metrics
 */
function extractNetwork(serverStatus) {
    const network = serverStatus?.network ?? {};
    
    return {
        bytesIn: network.bytesIn ?? 0,
        bytesOut: network.bytesOut ?? 0,
        numRequests: network.numRequests ?? 0,
        physicalBytesIn: network.physicalBytesIn ?? 0,
        physicalBytesOut: network.physicalBytesOut ?? 0
    };
}

/**
 * Extract operations metrics from server status
 * @param {Object} serverStatus - Server status object
 * @returns {Object} Operations metrics
 */
function extractOperations(serverStatus) {
    const opcounters = serverStatus?.opcounters ?? {};
    
    return {
        insert: opcounters.insert ?? 0,
        query: opcounters.query ?? 0,
        update: opcounters.update ?? 0,
        delete: opcounters.delete ?? 0,
        getmore: opcounters.getmore ?? 0,
        command: opcounters.command ?? 0
    };
}

/**
 * Extract storage engine info from server status
 * @param {Object} serverStatus - Server status object
 * @returns {Object} Storage engine info
 */
function extractStorageEngine(serverStatus) {
    const storageEngine = serverStatus?.storageEngine ?? {};
    
    return {
        name: storageEngine.name ?? 'unknown',
        persistent: storageEngine.persistent ?? false,
        supportsCommittedReads: storageEngine.supportsCommittedReads ?? false
    };
}

/**
 * Extract version info from server status
 * @param {Object} serverStatus - Server status object
 * @returns {Object} Version info
 */
function extractVersionInfo(serverStatus) {
    return {
        version: serverStatus?.version ?? 'unknown',
        process: serverStatus?.process ?? 'unknown',
        host: serverStatus?.host ?? 'unknown',
        pid: serverStatus?.pid ?? 0
    };
}

/**
 * Extract replication info from server status
 * @param {Object} serverStatus - Server status object
 * @returns {Object|null} Replication info or null if not a replica set
 */
function extractReplicationInfo(serverStatus) {
    const repl = serverStatus?.repl;
    
    if (!repl) {
        return null;
    }
    
    return {
        setName: repl.setName ?? 'unknown',
        ismaster: repl.ismaster ?? false,
        secondary: repl.secondary ?? false,
        primary: repl.primary ?? null,
        hosts: repl.hosts ?? [],
        me: repl.me ?? null
    };
}

/**
 * Compile all health metrics into a single object
 * @param {Object} pingResult - Result from pingDatabase
 * @param {Object} serverStatusResult - Result from getServerStatus
 * @returns {Object} Compiled health metrics
 */
function compileHealthMetrics(pingResult, serverStatusResult) {
    if (!serverStatusResult.success) {
        return {
            online: pingResult.success,
            ping: pingResult.latency,
            error: serverStatusResult.error || pingResult.error,
            metrics: null
        };
    }
    
    const status = serverStatusResult.data;
    
    return {
        online: true,
        ping: pingResult.latency,
        error: null,
        metrics: {
            uptime: extractUptime(status),
            connections: extractConnections(status),
            memory: extractMemory(status),
            network: extractNetwork(status),
            operations: extractOperations(status),
            storageEngine: extractStorageEngine(status),
            version: extractVersionInfo(status),
            replication: extractReplicationInfo(status)
        }
    };
}

module.exports = {
    pingDatabase,
    getServerStatus,
    extractUptime,
    extractConnections,
    extractMemory,
    extractNetwork,
    extractOperations,
    extractStorageEngine,
    extractVersionInfo,
    extractReplicationInfo,
    compileHealthMetrics
};
