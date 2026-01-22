/**
 * MongoMonitorBot - Embed Builder
 * Creates rich Discord embeds for monitoring display
 */

const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { formatUptime, formatBytes, getDiscordTimestamp, formatPing } = require('../utils/time');
const mongoMonitor = require('../monitors/mongoMonitor');

/**
 * Emoji constants for status display
 */
const EMOJI = {
    ONLINE: '`🟢`',
    OFFLINE: '`🔴`',
    PARTIAL: '`🟡`',
    PING: '`⏱️`',
    MEMORY: '`💾`',
    CONNECTIONS: '`🔌`',
    UPTIME: '`⏰`',
    DATABASE: '`🗄️`',
    VERSION: '`📦`',
    STORAGE: '`💿`',
    NETWORK: '`🌐`',
    OPERATIONS: '`📊`',
    ERROR: '`❌`',
    WARNING: '`⚠️`',
    INFO: '`ℹ️`',
    REPLICATION: '`🔄`'
};

/**
 * Get embed color based on status
 * @param {Array<Object>} results - Health check results
 * @returns {number} Color code
 */
function getStatusColor(results) {
    const summary = mongoMonitor.getStatusSummary(results);
    
    switch (summary.status) {
        case 'all_online':
            return config.colors.online;
        case 'all_offline':
            return config.colors.offline;
        case 'partial':
            return config.colors.partial;
        default:
            return config.colors.info;
    }
}

/**
 * Get overall status text
 * @param {Array<Object>} results - Health check results
 * @returns {string} Status text with emoji
 */
function getOverallStatus(results) {
    const summary = mongoMonitor.getStatusSummary(results);
    
    switch (summary.status) {
        case 'all_online':
            return `${EMOJI.ONLINE} All Systems Operational`;
        case 'all_offline':
            return `${EMOJI.OFFLINE} All Systems Offline`;
        case 'partial':
            return `${EMOJI.PARTIAL} Partial Outage (${summary.online}/${summary.total} Online)`;
        default:
            return `${EMOJI.INFO} Status Unknown`;
    }
}

/**
 * Format instance status for embed field
 * @param {Object} instance - Instance health data
 * @returns {string} Formatted status string
 */
function formatInstanceStatus(instance) {
    const lines = [];
    
    // Status line
    const statusEmoji = instance.online ? EMOJI.ONLINE : EMOJI.OFFLINE;
    const statusText = instance.online ? 'ONLINE' : 'OFFLINE';
    lines.push(`**Status:** ${statusEmoji} ${statusText}`);
    
    if (instance.online) {
        // Ping
        if (instance.ping !== null) {
            lines.push(`${EMOJI.PING} **Ping:** ${formatPing(instance.ping)}`);
        }
        
        // Uptime
        if (instance.uptime !== null) {
            lines.push(`${EMOJI.UPTIME} **Uptime:** ${formatUptime(instance.uptime)}`);
        }
        
        // Connections
        if (instance.connections) {
            const conn = instance.connections;
            lines.push(`${EMOJI.CONNECTIONS} **Connections:** ${conn.current} active / ${conn.available} available`);
        }
        
        // Memory
        if (instance.memory) {
            const mem = instance.memory;
            lines.push(`${EMOJI.MEMORY} **Memory:** ${formatBytes(mem.resident)} resident / ${formatBytes(mem.virtual)} virtual`);
        }
        
        // Version info
        if (instance.version) {
            lines.push(`${EMOJI.VERSION} **Version:** ${instance.version.version}`);
        }
        
        // Storage engine
        if (instance.storageEngine) {
            lines.push(`${EMOJI.STORAGE} **Storage:** ${instance.storageEngine.name}`);
        }
        
        // Replication status (if applicable)
        if (instance.replication) {
            const repl = instance.replication;
            const role = repl.ismaster ? 'Primary' : (repl.secondary ? 'Secondary' : 'Unknown');
            lines.push(`${EMOJI.REPLICATION} **Replica Set:** ${repl.setName} (${role})`);
        }
        
    } else {
        // Offline - show error
        if (instance.error) {
            lines.push(`${EMOJI.ERROR} **Error:** ${instance.error}`);
        }
    }
    
    return lines.join('\n');
}

/**
 * Build the main status embed
 * @param {Array<Object>} results - Health check results
 * @returns {EmbedBuilder} Discord embed
 */
function buildStatusEmbed(results) {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.DATABASE} MongoDB Monitor Dashboard`)
        .setDescription(getOverallStatus(results))
        .setColor(getStatusColor(results))
        .setTimestamp();
    
    // Add field for each MongoDB instance
    for (const instance of results) {
        embed.addFields({
            name: `${instance.online ? EMOJI.ONLINE : EMOJI.OFFLINE} ${instance.name}`,
            value: formatInstanceStatus(instance),
            inline: results.length <= 2 // Inline if 2 or fewer instances
        });
    }
    
    // Add summary footer
    const summary = mongoMonitor.getStatusSummary(results);
    embed.setFooter({
        text: `${summary.online}/${summary.total} instances online (${summary.percentage}%) • Last updated`
    });
    
    return embed;
}

/**
 * Build a detailed status embed for a single instance
 * @param {Object} instance - Instance health data
 * @returns {EmbedBuilder} Discord embed
 */
function buildDetailedInstanceEmbed(instance) {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.DATABASE} ${instance.name} - Detailed Status`)
        .setColor(instance.online ? config.colors.online : config.colors.offline)
        .setImage("https://cdn.discordapp.com/attachments/909355700453511199/1463903773444280340/0f77c13e-17e6-4099-91e6-a7e31c103080.png?ex=69738621&is=697234a1&hm=3f8030239ea65e8283bb9a1bdbf90bd67ac433c7422dfec4cab4948f0c668992&")
        .setTimestamp();
    
    // Status
    const statusEmoji = instance.online ? EMOJI.ONLINE : EMOJI.OFFLINE;
    embed.setDescription(`**Status:** ${statusEmoji} ${instance.online ? 'ONLINE' : 'OFFLINE'}`);
    
    if (instance.online) {
        // Connection Info
        embed.addFields({
            name: `${EMOJI.PING} Connection`,
            value: [
                `**Ping:** ${formatPing(instance.ping)}`,
                `**Uptime:** ${formatUptime(instance.uptime)}`
            ].join('\n'),
            inline: true
        });
        
        // Memory
        if (instance.memory) {
            embed.addFields({
                name: `${EMOJI.MEMORY} Memory Usage`,
                value: [
                    `**Resident:** ${formatBytes(instance.memory.resident)}`,
                    `**Virtual:** ${formatBytes(instance.memory.virtual)}`
                ].join('\n'),
                inline: true
            });
        }
        
        // Connections
        if (instance.connections) {
            embed.addFields({
                name: `${EMOJI.CONNECTIONS} Connections`,
                value: [
                    `**Current:** ${instance.connections.current}`,
                    `**Available:** ${instance.connections.available}`,
                    `**Total Created:** ${instance.connections.totalCreated}`
                ].join('\n'),
                inline: true
            });
        }
        
        // Network
        if (instance.network) {
            embed.addFields({
                name: `${EMOJI.NETWORK} Network`,
                value: [
                    `**Bytes In:** ${formatBytes(instance.network.bytesIn)}`,
                    `**Bytes Out:** ${formatBytes(instance.network.bytesOut)}`,
                    `**Requests:** ${instance.network.numRequests.toLocaleString()}`
                ].join('\n'),
                inline: true
            });
        }
        
        // Operations
        if (instance.operations) {
            const ops = instance.operations;
            embed.addFields({
                name: `${EMOJI.OPERATIONS} Operations`,
                value: [
                    `**Insert:** ${ops.insert.toLocaleString()}`,
                    `**Query:** ${ops.query.toLocaleString()}`,
                    `**Update:** ${ops.update.toLocaleString()}`,
                    `**Delete:** ${ops.delete.toLocaleString()}`
                ].join('\n'),
                inline: true
            });
        }
        
        // Server Info
        if (instance.version) {
            embed.addFields({
                name: `${EMOJI.VERSION} Server Info`,
                value: [
                    `**Version:** ${instance.version.version}`,
                    `**Process:** ${instance.version.process}`,
                    `**Host:** ${instance.version.host}`
                ].join('\n'),
                inline: true
            });
        }
        
    } else {
        embed.addFields({
            name: `${EMOJI.ERROR} Error Details`,
            value: instance.error || 'Unknown error',
            inline: false
        });
    }
    
    embed.setFooter({
        text: `Last checked`
    });
    
    return embed;
}

/**
 * Build reconnect info embed
 * @param {Object} reconnectInfo - Reconnect tracking data
 * @returns {EmbedBuilder} Discord embed
 */
function buildReconnectInfoEmbed(reconnectInfo) {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.REPLICATION} Reconnection Information`)
        .setColor(config.colors.info)
        .setTimestamp();
    
    if (Object.keys(reconnectInfo).length === 0) {
        embed.setDescription('No reconnection data available yet.');
        return embed;
    }
    
    for (const [name, info] of Object.entries(reconnectInfo)) {
        const lines = [
            `**Total Attempts:** ${info.attempts}`,
            `**Consecutive Failures:** ${info.consecutiveFailures}`,
            `**Last Attempt:** ${info.lastAttempt || 'Never'}`,
            `**Last Success:** ${info.lastSuccess || 'Never'}`,
            `**Last Failure:** ${info.lastFailure || 'Never'}`
        ];
        
        if (info.failureReason) {
            lines.push(`**Last Error:** ${info.failureReason}`);
        }
        
        embed.addFields({
            name: `${EMOJI.DATABASE} ${name}`,
            value: lines.join('\n'),
            inline: true
        });
    }
    
    embed.setFooter({
        text: 'Reconnection tracking information'
    });
    
    return embed;
}

/**
 * Build an error embed
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @returns {EmbedBuilder} Discord embed
 */
function buildErrorEmbed(title, message) {
    return new EmbedBuilder()
        .setTitle(`${EMOJI.ERROR} ${title}`)
        .setDescription(message)
        .setColor(config.colors.offline)
        .setTimestamp();
}

/**
 * Build an info embed
 * @param {string} title - Info title
 * @param {string} message - Info message
 * @returns {EmbedBuilder} Discord embed
 */
function buildInfoEmbed(title, message) {
    return new EmbedBuilder()
        .setTitle(`${EMOJI.INFO} ${title}`)
        .setDescription(message)
        .setColor(config.colors.info)
        .setTimestamp();
}

module.exports = {
    buildStatusEmbed,
    buildDetailedInstanceEmbed,
    buildReconnectInfoEmbed,
    buildErrorEmbed,
    buildInfoEmbed,
    EMOJI
};
