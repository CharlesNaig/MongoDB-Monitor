/**
 * MongoMonitorBot - Configuration
 * Central configuration for Discord and MongoDB instances
 */

require('dotenv').config();

module.exports = {
    // Discord configuration
    discord: {
        token: process.env.DISCORD_TOKEN,
        guildId: process.env.DISCORD_GUILD_ID || "GUILD_ID",
        channelName: process.env.DISCORD_CHANNEL_NAME || "status"
    },

    // Monitoring interval in milliseconds (60 seconds)
    interval: parseInt(process.env.MONITOR_INTERVAL, 10) || 60_000,

    // MongoDB instances to monitor
    // Add or remove instances as needed
    mongodbInstances: [
        {
            name: "Naig Database",
            uri: process.env.MONGODB_MAIN_URI || "mongodb://user:pass@localhost:27017/admin",
            authSource: "admin",
            timeoutMS: 5000
        },
        {
            name: "TamTap Database",
            uri: process.env.MONGODB_BACKUP_URI || "mongodb://user:pass@localhost:27018/admin",
            authSource: "admin",
            timeoutMS: 5000
        }
        // Add more instances here as needed:
        // {
        //     name: "Analytics-DB",
        //     uri: process.env.MONGODB_ANALYTICS_URI || "mongodb://user:pass@localhost:27019/admin",
        //     authSource: "admin",
        //     timeoutMS: 5000
        // }
    ],

    // Embed colors
    colors: {
        online: 0x00FF00,    // Green
        partial: 0xFFFF00,   // Yellow
        offline: 0xFF0000,   // Red
        info: 0x5865F2       // Discord blurple
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        timestamps: true
    }
};
