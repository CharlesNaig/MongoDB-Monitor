/**
 * MongoMonitorBot - Discord Service
 * Handles Discord API interactions and channel management
 */

const { ChannelType, PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');

/**
 * Get a guild by ID
 * @param {import('discord.js').Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @returns {Promise<import('discord.js').Guild|null>} Guild or null
 */
async function getGuild(client, guildId) {
    try {
        const guild = await client.guilds.fetch(guildId);
        return guild;
    } catch (error) {
        logger.error(`[Discord] Failed to fetch guild ${guildId}: ${error.message}`);
        return null;
    }
}

/**
 * Find a channel by name in a guild
 * @param {import('discord.js').Guild} guild - Discord guild
 * @param {string} channelName - Channel name to find
 * @returns {Promise<import('discord.js').TextChannel|null>} Channel or null
 */
async function findChannelByName(guild, channelName) {
    try {
        const channels = await guild.channels.fetch();
        const channel = channels.find(
            ch => ch && ch.type === ChannelType.GuildText && ch.name === channelName
        );
        return channel || null;
    } catch (error) {
        logger.error(`[Discord] Failed to fetch channels: ${error.message}`);
        return null;
    }
}

/**
 * Create a text channel in a guild
 * @param {import('discord.js').Guild} guild - Discord guild
 * @param {string} channelName - Channel name
 * @param {Object} options - Channel options
 * @returns {Promise<import('discord.js').TextChannel|null>} Created channel or null
 */
async function createChannel(guild, channelName, options = {}) {
    try {
        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            topic: options.topic || 'MongoDB Monitoring Channel',
            reason: options.reason || 'MongoMonitorBot - Auto-created monitoring channel',
            permissionOverwrites: options.permissionOverwrites || []
        });
        
        logger.info(`[Discord] Created channel: #${channelName} (${channel.id})`);
        return channel;
    } catch (error) {
        logger.error(`[Discord] Failed to create channel ${channelName}: ${error.message}`);
        return null;
    }
}

/**
 * Get or create a monitoring channel
 * @param {import('discord.js').Guild} guild - Discord guild
 * @param {string} channelName - Channel name
 * @param {Object} channelConfig - Channel configuration
 * @returns {Promise<import('discord.js').TextChannel|null>} Channel or null
 */
async function getOrCreateChannel(guild, channelName, channelConfig = {}) {
    // Try to find existing channel
    let channel = await findChannelByName(guild, channelName);
    
    if (channel) {
        logger.info(`[Discord] Found existing channel: #${channelName}`);
        return channel;
    }
    
    // Channel doesn't exist, create it
    logger.info(`[Discord] Channel #${channelName} not found, creating...`);
    
    channel = await createChannel(guild, channelName, {
        topic: channelConfig.topic || '🔍 MongoDB Monitoring Dashboard - Auto-updated every 60 seconds',
        reason: channelConfig.reason || 'MongoMonitorBot - Auto-created monitoring channel'
    });
    
    return channel;
}

/**
 * Send a message to a channel
 * @param {import('discord.js').TextChannel} channel - Target channel
 * @param {Object} messageOptions - Message options (content, embeds, etc.)
 * @returns {Promise<import('discord.js').Message|null>} Sent message or null
 */
async function sendMessage(channel, messageOptions) {
    try {
        const message = await channel.send(messageOptions);
        return message;
    } catch (error) {
        logger.error(`[Discord] Failed to send message: ${error.message}`);
        return null;
    }
}

/**
 * Edit an existing message
 * @param {import('discord.js').Message} message - Message to edit
 * @param {Object} messageOptions - New message options
 * @returns {Promise<import('discord.js').Message|null>} Edited message or null
 */
async function editMessage(message, messageOptions) {
    try {
        const edited = await message.edit(messageOptions);
        return edited;
    } catch (error) {
        logger.error(`[Discord] Failed to edit message: ${error.message}`);
        return null;
    }
}

/**
 * Delete a message
 * @param {import('discord.js').Message} message - Message to delete
 * @returns {Promise<boolean>} Success status
 */
async function deleteMessage(message) {
    try {
        await message.delete();
        return true;
    } catch (error) {
        logger.error(`[Discord] Failed to delete message: ${error.message}`);
        return false;
    }
}

/**
 * Check if bot has required permissions in a channel
 * @param {import('discord.js').TextChannel} channel - Channel to check
 * @param {Array<bigint>} requiredPermissions - Array of permission flags
 * @returns {Object} Permission check result
 */
function checkPermissions(channel, requiredPermissions) {
    const botMember = channel.guild.members.me;
    if (!botMember) {
        return {
            hasAll: false,
            missing: requiredPermissions,
            details: 'Bot member not found'
        };
    }
    
    const permissions = channel.permissionsFor(botMember);
    const missing = [];
    
    for (const perm of requiredPermissions) {
        if (!permissions.has(perm)) {
            missing.push(perm);
        }
    }
    
    return {
        hasAll: missing.length === 0,
        missing,
        details: missing.length > 0 ? `Missing ${missing.length} permission(s)` : 'All permissions granted'
    };
}

/**
 * Get the last message in a channel (for resuming)
 * @param {import('discord.js').TextChannel} channel - Target channel
 * @param {string} [botId] - Bot's user ID to filter messages
 * @returns {Promise<import('discord.js').Message|null>} Last bot message or null
 */
async function getLastBotMessage(channel, botId) {
    try {
        const messages = await channel.messages.fetch({ limit: 10 });
        
        if (botId) {
            const botMessage = messages.find(m => m.author.id === botId);
            return botMessage || null;
        }
        
        return messages.first() || null;
    } catch (error) {
        logger.error(`[Discord] Failed to fetch messages: ${error.message}`);
        return null;
    }
}

module.exports = {
    getGuild,
    findChannelByName,
    createChannel,
    getOrCreateChannel,
    sendMessage,
    editMessage,
    deleteMessage,
    checkPermissions,
    getLastBotMessage
};
