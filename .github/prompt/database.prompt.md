# 🧠 MongoMonitorBot – Copilot Master Plan Prompt

## 🎯 Objective
Create a **Discord bot** using **discord.js (latest version)** that monitors **multiple MongoDB instances** defined in a `config.js` file and provides **PM2-like monitoring features** through Discord.

The bot must:
- Monitor MongoDB health via authenticated connections
- Track uptime, ping latency, connections, memory usage
- Send **automatic updates every 60 seconds**
- Post updates to a **specific Discord channel**
- Automatically **create the channel if it does not exist**
- Gracefully handle connection failures
- Support multiple MongoDB instances
- Be production-ready and well-structured

---

## 🧱 Tech Stack
- Node.js (LTS)
- discord.js@latest
- mongodb (official MongoDB Node driver)
- node-cron OR setInterval
- dotenv
- system-friendly async code
- CommonJS or ESModules (choose one and be consistent)

---

## 📁 Required Project Structure

```

src/
├─ index.js
├─ bot.js
├─ config.js
├─ monitors/
│   ├─ mongoMonitor.js
│   ├─ healthCheck.js
├─ services/
│   ├─ discordService.js
│   ├─ embedBuilder.js
├─ utils/
│   ├─ logger.js
│   ├─ time.js
└─ constants/
└─ channels.js

````

---

## ⚙️ config.js Specification

```js
module.exports = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    guildId: "GUILD_ID",
    channelName: "mongo-monitor"
  },

  interval: 60_000,

  mongodbInstances: [
    {
      name: "Main-DB",
      uri: "mongodb://user:pass@IP:27017/admin",
      authSource: "admin",
      timeoutMS: 5000
    },
    {
      name: "Backup-DB",
      uri: "mongodb://user:pass@IP:27017/admin",
      authSource: "admin",
      timeoutMS: 5000
    }
  ]
}
````

---

## 🔍 MongoDB Monitoring Features (PM2-like)

For EACH MongoDB instance:

* Connection status (ONLINE / OFFLINE)
* Ping latency (ms)
* Uptime (seconds → human readable)
* Active connections
* Memory usage (resident & virtual)
* Last check timestamp
* Failure reason if offline

Use:

```js
db.admin().command({ ping: 1 })
db.admin().command({ serverStatus: 1 })
```

---

## 🤖 Bot Behavior

### On Startup

1. Login to Discord
2. Fetch target guild
3. Find monitoring channel by name
4. If channel does not exist:

   * Create text channel
   * Log creation
5. Start monitoring loop

---

### Monitoring Loop (every 60s)

For each MongoDB instance:

* Attempt connection with timeout
* If successful:

  * Collect metrics
  * Mark as ONLINE
* If failed:

  * Mark as OFFLINE
  * Capture error message

Then:

* Build a **single embed message** containing:

  * Bot header (🟢 Overall Status)
  * One section per MongoDB instance
* Edit the **same message** every minute (do NOT spam)

---

## 📊 Embed Design Rules

* Color:

  * Green → All DBs online
  * Yellow → Partial issues
  * Red → All offline
* Use emojis:

  * 🟢 ONLINE
  * 🔴 OFFLINE
  * ⏱️ Ping
  * 💾 Memory
  * 🔌 Connections
* Footer:

  * "Last updated: <timestamp>"

---

## 🧠 Reliability Rules

* Never crash on one DB failure
* Use try/catch per instance
* Close MongoDB clients after each check
* Respect timeoutMS
* Log errors cleanly

---

## 📡 Discord Permissions Required

* View Channels
* Send Messages
* Embed Links
* Manage Channels (only for auto-create)

---

## 🧪 Extra (Optional but Encouraged)

* Slash command: `/mongo status`
* Slash command: `/mongo restart-info` (shows reconnect attempts)
* Config hot-reload (restart-safe)
* Graceful shutdown handling (SIGINT)

---

## 🧾 Output Expectations

* Clean, readable code
* Modular functions
* No hardcoded IDs
* No deprecated discord.js syntax
* Ready to run with `node src/index.js`
* Compatible with PM2 (bot only, not MongoDB)

---

## 🚫 Explicit Non-Goals

* Do NOT attempt to manage MongoDB processes
* Do NOT restart MongoDB
* Monitoring only, not orchestration

---

## ✅ Final Instruction to Copilot

"Generate the full implementation following this plan exactly.
Prioritize stability, clarity, and production-readiness.
Do not simplify or skip monitoring fields."

```