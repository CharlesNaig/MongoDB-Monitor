/**
 * MongoMonitorBot - Main Bot File
 * Handles Discord client and monitoring loop
 */

require('dotenv').config();

const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
const config = require('./config');
const logger = require('./utils/logger');
const discordService = require('./services/discordService');
const mongoMonitor = require('./monitors/mongoMonitor');
const embedBuilder = require('./services/embedBuilder');
const { CHANNEL_CONFIG } = require('./constants/channels');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Store for the monitoring message
let monitorMessage = null;
let monitoringInterval = null;
let isShuttingDown = false;

/**
 * Register slash commands
 */
async function registerCommands() {
    const commands = [
        new SlashCommandBuilder()
            .setName('mongo')
            .setDescription('MongoDB monitoring commands')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('status')
                    .setDescription('Get current MongoDB status'))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('restart-info')
                    .setDescription('Show reconnection attempts info'))
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(config.discord.token);

    try {
        logger.info('[Bot] Registering slash commands...');
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, config.discord.guildId),
            { body: commands }
        );
        logger.info('[Bot] Slash commands registered successfully');
    } catch (error) {
        logger.error(`[Bot] Failed to register slash commands: ${error.message}`);
    }
}

/**
 * Handle slash command interactions
 */
async function handleInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'mongo') {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'status') {
            await interaction.deferReply({ ephemeral: true });
            
            try {
                const results = await mongoMonitor.checkAllInstances(config.mongodbInstances);
                const embed = embedBuilder.buildStatusEmbed(results);
                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                logger.error(`[Bot] Status command error: ${error.message}`);
                await interaction.editReply({ content: '❌ Failed to fetch MongoDB status.' });
            }
        } else if (subcommand === 'restart-info') {
            await interaction.deferReply({ ephemeral: true });
            
            const reconnectInfo = mongoMonitor.getReconnectInfo();
            const embed = embedBuilder.buildReconnectInfoEmbed(reconnectInfo);
            await interaction.editReply({ embeds: [embed] });
        }
    }
}

/**
 * Main monitoring loop
 */
async function runMonitoringLoop(channel) {
    if (isShuttingDown) return;

    try {
        logger.info('[Monitor] Running health check cycle...');
        
        // Check all MongoDB instances
        const results = await mongoMonitor.checkAllInstances(config.mongodbInstances);
        
        // Build the status embed
        const embed = embedBuilder.buildStatusEmbed(results);
        
        // Update or create the monitoring message
        if (monitorMessage) {
            try {
                await monitorMessage.edit({ embeds: [embed] });
                logger.info('[Monitor] Updated monitoring message');
            } catch (editError) {
                // Message might have been deleted, create a new one
                logger.warn('[Monitor] Could not edit message, creating new one...');
                monitorMessage = await channel.send({ embeds: [embed] });
                logger.info('[Monitor] Created new monitoring message');
            }
        } else {
            // First run - create the message
            monitorMessage = await channel.send({ embeds: [embed] });
            logger.info('[Monitor] Created initial monitoring message');
        }
    } catch (error) {
        logger.error(`[Monitor] Monitoring loop error: ${error.message}`);
    }
}

/**
 * Find existing monitoring message from the bot in the channel
 */
async function findExistingMonitorMessage(channel, botId) {
    try {
        const messages = await channel.messages.fetch({ limit: 50 });
        const botMessage = messages.find(m => 
            m.author.id === botId && 
            m.embeds.length > 0 && 
            m.embeds[0].title?.includes('MongoDB Monitor')
        );
        return botMessage || null;
    } catch (error) {
        logger.warn(`[Monitor] Could not fetch existing messages: ${error.message}`);
        return null;
    }
}

/**
 * Start the monitoring service
 */
async function startMonitoring(channel) {
    logger.info('[Monitor] Starting monitoring service...');
    
    // Try to find an existing monitoring message to reuse
    const existingMessage = await findExistingMonitorMessage(channel, client.user.id);
    if (existingMessage) {
        monitorMessage = existingMessage;
        logger.info(`[Monitor] Found existing monitoring message (${existingMessage.id}), will reuse it`);
    }
    
    // Run immediately on start
    await runMonitoringLoop(channel);
    
    // Set up interval
    monitoringInterval = setInterval(() => {
        runMonitoringLoop(channel);
    }, config.interval);
    
    logger.info(`[Monitor] Monitoring loop started (interval: ${config.interval / 1000}s)`);
}

/**
 * Stop the monitoring service
 */
function stopMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        logger.info('[Monitor] Monitoring loop stopped');
    }
}

/**
 * Bot ready event handler
 */
client.once(Events.ClientReady, async (readyClient) => {
    logger.info(`[Bot] Logged in as ${readyClient.user.tag}`);
    logger.info(`[Bot] Shard ID: ${readyClient.shard?.ids[0] ?? 'N/A'}`);
    
    try {
        // Register slash commands
        await registerCommands();
        
        // Get the target guild
        const guild = await discordService.getGuild(client, config.discord.guildId);
        if (!guild) {
            logger.error('[Bot] Could not find target guild. Check DISCORD_GUILD_ID.');
            return;
        }
        logger.info(`[Bot] Connected to guild: ${guild.name}`);
        
        // Get or create the monitoring channel
        const channel = await discordService.getOrCreateChannel(
            guild,
            config.discord.channelName,
            CHANNEL_CONFIG.MONITOR_CHANNEL
        );
        
        if (!channel) {
            logger.error('[Bot] Could not find or create monitoring channel.');
            return;
        }
        logger.info(`[Bot] Using channel: #${channel.name} (${channel.id})`);
        
        // Start the monitoring loop
        await startMonitoring(channel);
        
    } catch (error) {
        logger.error(`[Bot] Startup error: ${error.message}`);
    }
});

// Handle interactions
client.on(Events.InteractionCreate, handleInteraction);

// Error handling
client.on(Events.Error, (error) => {
    logger.error(`[Bot] Client error: ${error.message}`);
});

client.on(Events.Warn, (warning) => {
    logger.warn(`[Bot] Client warning: ${warning}`);
});

// Graceful shutdown
const shutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    logger.info(`[Bot] Received ${signal}, shutting down gracefully...`);
    
    stopMonitoring();
    await mongoMonitor.closeAllConnections();
    
    client.destroy();
    logger.info('[Bot] Bot destroyed. Exiting.');
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`[Bot] Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
    logger.error(`[Bot] Uncaught Exception: ${error.message}`);
    process.exit(1);
});

// Login to Discord
client.login(config.discord.token)
    .catch((error) => {
        logger.error(`[Bot] Failed to login: ${error.message}`);
        process.exit(1);
    });
