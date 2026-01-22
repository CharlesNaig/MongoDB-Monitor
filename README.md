# 🗄️ MongoDB Monitor Bot

A production-ready Discord bot for PM2-like monitoring of multiple MongoDB instances. Built with discord.js v14+ and featuring automatic health checks, embed-based dashboards, and shard management for scalability.

![Discord.js](https://img.shields.io/badge/discord.js-v14+-blue)
![Node.js](https://img.shields.io/badge/node.js-18+-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## ✨ Features

- **Multi-Instance Monitoring** - Monitor multiple MongoDB instances from a single bot
- **PM2-like Metrics** - Uptime, memory usage, connections, operations, and more
- **Real-time Dashboard** - Single embed message that updates every 60 seconds
- **Auto-Channel Creation** - Automatically creates the monitoring channel if missing
- **Shard Manager** - Built-in sharding support for large-scale deployments
- **Slash Commands** - `/mongo status` and `/mongo restart-info` commands
- **Graceful Shutdown** - Proper cleanup on SIGINT/SIGTERM signals
- **Color-coded Status** - Green (all online), Yellow (partial), Red (all offline)

## 📊 Monitored Metrics

For each MongoDB instance:
- ✅ Connection status (ONLINE/OFFLINE)
- ⏱️ Ping latency (ms)
- ⏰ Uptime (human-readable)
- 🔌 Active/available connections
- 💾 Memory usage (resident & virtual)
- 📦 MongoDB version
- 💿 Storage engine type
- 🔄 Replica set info (if applicable)
- ❌ Error details (if offline)

## 📁 Project Structure

```
src/
├── index.js              # Shard manager entry point
├── bot.js                # Main bot file
├── config.js             # Configuration
├── monitors/
│   ├── mongoMonitor.js   # MongoDB connection & monitoring
│   └── healthCheck.js    # Health check utilities
├── services/
│   ├── discordService.js # Discord API interactions
│   └── embedBuilder.js   # Embed creation
├── utils/
│   ├── logger.js         # Logging utility
│   └── time.js           # Time formatting utilities
└── constants/
    └── channels.js       # Channel configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- A Discord bot token
- MongoDB instance(s) to monitor

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/CharlesNaig/MongoDB-Monitor.git
   cd MongoDB-Monitor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your values:
   ```env
   DISCORD_TOKEN=your_discord_bot_token
   DISCORD_GUILD_ID=your_guild_id
   MONGODB_MAIN_URI=mongodb://user:pass@localhost:27017/admin
   MONGODB_BACKUP_URI=mongodb://user:pass@localhost:27018/admin
   ```

4. **Configure MongoDB instances** (optional)
   
   Edit `src/config.js` to add/remove MongoDB instances:
   ```javascript
   mongodbInstances: [
     {
       name: "Main-DB",
       uri: process.env.MONGODB_MAIN_URI,
       authSource: "admin",
       timeoutMS: 5000
     },
     // Add more instances here
   ]
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Discord bot token | ✅ |
| `DISCORD_GUILD_ID` | Target server ID | ✅ |
| `DISCORD_CHANNEL_NAME` | Monitoring channel name (default: `mongo-monitor`) | ❌ |
| `MONITOR_INTERVAL` | Check interval in ms (default: `60000`) | ❌ |
| `LOG_LEVEL` | Logging level: `error`, `warn`, `info`, `debug` | ❌ |
| `MONGODB_MAIN_URI` | Main MongoDB connection URI | ✅ |
| `MONGODB_BACKUP_URI` | Backup MongoDB connection URI | ❌ |

### Discord Bot Permissions

The bot requires these permissions:
- View Channels
- Send Messages
- Embed Links
- Manage Channels (for auto-create)
- Read Message History

**Recommended Invite URL Permission Integer:** `84992`

## 📡 Slash Commands

| Command | Description |
|---------|-------------|
| `/mongo status` | Get current MongoDB status (ephemeral) |
| `/mongo restart-info` | Show reconnection attempts info |

## 🐳 Running with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot
pm2 start src/index.js --name "mongo-monitor"

# View logs
pm2 logs mongo-monitor

# Restart
pm2 restart mongo-monitor

# Stop
pm2 stop mongo-monitor
```

## 🔄 Running with Docker

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "src/index.js"]
```

Build and run:
```bash
docker build -t mongo-monitor .
docker run -d --env-file .env mongo-monitor
```

## 📸 Screenshots

### Dashboard Embed
```
🗄️ MongoDB Monitor Dashboard
🟢 All Systems Operational

🟢 Main-DB
Status: 🟢 ONLINE
⏱️ Ping: 🟢 12ms
⏰ Uptime: 5d 12h 30m 15s
🔌 Connections: 45 active / 800 available
💾 Memory: 256 MB resident / 1.2 GB virtual
📦 Version: 7.0.4
💿 Storage: wiredTiger

🟢 Backup-DB
Status: 🟢 ONLINE
⏱️ Ping: 🟢 8ms
⏰ Uptime: 5d 12h 30m 10s
🔌 Connections: 12 active / 800 available
💾 Memory: 128 MB resident / 512 MB virtual
📦 Version: 7.0.4
💿 Storage: wiredTiger

2/2 instances online (100%) • Last updated
```

## ⚠️ Important Notes

- **Monitoring Only** - This bot monitors MongoDB, it does NOT manage or restart MongoDB processes
- **Production Ready** - Designed for production use with proper error handling
- **Resource Efficient** - Uses minimal connections (pool size 1) per check
- **Shard Support** - Built-in sharding for large Discord bot deployments

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues, please [open an issue](https://github.com/CharlesNaig/MongoDB-Monitor/issues) on GitHub

