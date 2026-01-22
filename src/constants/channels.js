/**
 * MongoMonitorBot - Channel Constants
 * Channel configuration and permissions
 */

const { ChannelType, PermissionFlagsBits } = require('discord.js');

/**
 * Default channel configuration for the monitoring channel
 */
const CHANNEL_CONFIG = {
    MONITOR_CHANNEL: {
        type: ChannelType.GuildText,
        topic: '🔍 MongoDB Monitoring Dashboard - Auto-updated every 60 seconds',
        reason: 'MongoMonitorBot - Auto-created monitoring channel',
        permissionOverwrites: [
            // Bot permissions will be added dynamically
        ]
    }
};

/**
 * Required bot permissions for the monitoring channel
 */
const REQUIRED_PERMISSIONS = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ReadMessageHistory
];

/**
 * Permission names for display
 */
const PERMISSION_NAMES = {
    [PermissionFlagsBits.ViewChannel]: 'View Channel',
    [PermissionFlagsBits.SendMessages]: 'Send Messages',
    [PermissionFlagsBits.EmbedLinks]: 'Embed Links',
    [PermissionFlagsBits.ManageChannels]: 'Manage Channels',
    [PermissionFlagsBits.ReadMessageHistory]: 'Read Message History'
};

module.exports = {
    CHANNEL_CONFIG,
    REQUIRED_PERMISSIONS,
    PERMISSION_NAMES
};
