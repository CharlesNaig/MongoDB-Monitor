/**
 * MongoMonitorBot - Shard Manager Entry Point
 * Handles bot sharding for scalability
 */

require('dotenv').config();

const { ShardingManager } = require('discord.js');
const path = require('path');
const logger = require('./utils/logger');

const manager = new ShardingManager(path.join(__dirname, 'bot.js'), {
    token: process.env.DISCORD_TOKEN,
    totalShards: 'auto',
    respawn: true,
    mode: 'process'
});

// Shard event handlers
manager.on('shardCreate', (shard) => {
    logger.info(`[ShardManager] Launched shard ${shard.id}`);

    shard.on('ready', () => {
        logger.info(`[Shard ${shard.id}] Ready`);
    });

    shard.on('disconnect', () => {
        logger.warn(`[Shard ${shard.id}] Disconnected`);
    });

    shard.on('reconnecting', () => {
        logger.info(`[Shard ${shard.id}] Reconnecting...`);
    });

    shard.on('death', (process) => {
        logger.error(`[Shard ${shard.id}] Died with exit code ${process.exitCode}`);
    });

    shard.on('error', (error) => {
        logger.error(`[Shard ${shard.id}] Error: ${error.message}`);
    });
});

// Graceful shutdown handling
const shutdown = async (signal) => {
    logger.info(`[ShardManager] Received ${signal}, shutting down gracefully...`);
    
    for (const [id, shard] of manager.shards) {
        logger.info(`[ShardManager] Killing shard ${id}...`);
        shard.kill();
    }
    
    logger.info('[ShardManager] All shards terminated. Exiting.');
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Spawn shards
manager.spawn({ timeout: 60000 })
    .then((shards) => {
        logger.info(`[ShardManager] Successfully spawned ${shards.size} shard(s)`);
    })
    .catch((error) => {
        logger.error(`[ShardManager] Failed to spawn shards: ${error.message}`);
        process.exit(1);
    });
