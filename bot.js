// Load environment variables from .env file
require('dotenv').config();
console.log('Token from .env:', process.env.DISCORD_BOT_TOKEN ? '[TOKEN SET]' : '[NO TOKEN]');

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// ========== EXPRESS SERVER FOR UPTIME ==========
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(PORT, () => console.log(`🌐 Uptime server running on port ${PORT}`));

// OPTIONAL: Self-ping to keep Railway/Render active
const SELF_PING_URL = process.env.SELF_PING_URL || 'https://your-render-url.com';
setInterval(() => {
  axios.get(SELF_PING_URL)
    .then(() => console.log('🔁 Self-ping successful'))
    .catch(err => console.error('❌ Self-ping failed:', err.message));
}, 270000); // every 4.5 minutes

// ========== DISCORD BOT ==========
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const CHANNEL_IDS = {
  infernal: '1382541305720344607',
  dungeon: '1382543480848519218',
  worldBosses: '1382543528957186109',
};

const ROLE_IDS = {
  infernal: '1382546145728921620',
  dungeon: '1382546016716460124',
  worldBosses: '1382545829134336080',
};

const cooldowns = {
  infernal: 0,
  dungeon: 0,
  worldBosses: 0,
};
const COOLDOWN_MS = 5 * 60 * 1000;

client.on('messageCreate', async (message) => {
  // Ignore bots, webhooks, and DMs
  if (!message.guild || message.author.bot || message.webhookId) return;

  const now = Date.now();
  const channelId = message.channel.id;
  const content = message.content.trim();
  let pinged = false; // prevents double ping per message

  console.log(`[${message.channel.name || 'Unknown'}] ${message.author?.tag || 'Unknown'}: ${content}`);

  // ===== World Boss ping =====
  if (!pinged && channelId === CHANNEL_IDS.worldBosses && now > cooldowns.worldBosses) {
    const trigger = content.toLowerCase().includes('@world boss ping') || content.includes(`<@&${ROLE_IDS.worldBosses}>`);
    if (trigger) {
      cooldowns.worldBosses = now + COOLDOWN_MS;
      await message.channel.send(`Hey <@&${ROLE_IDS.worldBosses}>! Spidey just pinged your event!`);
      console.log(`📣 Pinged <@&${ROLE_IDS.worldBosses}>`);
      pinged = true;
    }
  }

  // ===== Dungeon ping =====
  if (!pinged && channelId === CHANNEL_IDS.dungeon && now > cooldowns.dungeon) {
    const trigger = content.toLowerCase().includes('@dungeon') || content.includes(`<@&${ROLE_IDS.dungeon}>`);
    if (trigger) {
      cooldowns.dungeon = now + COOLDOWN_MS;
      await message.channel.send(`Hey <@&${ROLE_IDS.dungeon}>! A dungeon event might have appeared!`);
      console.log(`📣 Pinged <@&${ROLE_IDS.dungeon}>`);
      pinged = true;
    }
  }

  // ===== Infernal ping =====
  if (!pinged && channelId === CHANNEL_IDS.infernal && now > cooldowns.infernal) {
    const trigger = content.toLowerCase().includes('@infernal') || content.includes(`<@&${ROLE_IDS.infernal}>`);
    if (trigger) {
      cooldowns.infernal = now + COOLDOWN_MS;
      await message.channel.send(`Hey <@&${ROLE_IDS.infernal}>! An Infernal Castle might be spawning!`);
      console.log(`📣 Pinged <@&${ROLE_IDS.infernal}>`);
      pinged = true;
    }
  }
});

// Logs
client.on('messageUpdate', (oldMsg, newMsg) => {
  if (oldMsg.content !== newMsg.content) {
    console.log(`[Edited] ${oldMsg.author?.tag}: "${oldMsg.content}" ➜ "${newMsg.content}"`);
  }
});
client.on('messageDelete', (msg) => {
  console.log(`[Deleted] ${msg.author?.tag}: ${msg.content}`);
});

client.once('ready', () => {
  console.log(`🟢 Logged in as ${client.user.tag}`);
});



// ==========================================================
// ===============  🔵  FULL LOGGING SYSTEM  🔵  ==============
// ==========================================================

const LOG_CHANNEL_ID = "1447027328600379392";

// Bot ready event (startup)
client.once("ready", async () => {
  const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
  if (logChannel) {
    logChannel.send(`🟢 **Bot started successfully** at <t:${Math.floor(Date.now()/1000)}:T>`);
  }
  console.log("Logging system active.");
});

// Reconnecting
client.on("reconnecting", () => {
  const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
  if (logChannel) logChannel.send("🔄 **Bot reconnecting to Discord...**");
});

// Disconnect
client.on("disconnect", () => {
  const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
  if (logChannel) logChannel.send("🔴 **Bot disconnected from Discord!**");
});

// A) CHAT LOGGING
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.channel.id === LOG_CHANNEL_ID) return;

  const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
  if (!logChannel) return;

  logChannel.send({
    content: `💬 **Message Sent**  
**User:** ${message.author.tag}  
**Channel:** <#${message.channel.id}>  
**Content:** ${message.content || "*No text*"}`
  });
});

// B1) MESSAGE DELETE
client.on("messageDelete", async (message) => {
  if (!message.guild || message.author?.bot) return;

  const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
  if (!logChannel) return;

  logChannel.send({
    content: `🗑️ **Message Deleted**  
**User:** ${message.author?.tag || "Unknown"}  
**Channel:** <#${message.channel.id}>  
**Content:** ${message.content || "*No text*"}`
  });
});

// B2) MESSAGE EDITED
client.on("messageUpdate", async (oldMsg, newMsg) => {
  if (!newMsg.guild || newMsg.author?.bot) return;
  if (oldMsg.content === newMsg.content) return;

  const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
  if (!logChannel) return;

  logChannel.send({
    content: `✏️ **Message Edited**  
**User:** ${newMsg.author.tag}  
**Channel:** <#${newMsg.channel.id}>  

**Before:** ${oldMsg.content || "*No text*"}  
**After:** ${newMsg.content || "*No text*"}`
  });
});

// B3) USER JOIN
client.on("guildMemberAdd", (member) => {
  const logChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (logChannel) logChannel.send(`📥 **User Joined:** ${member.user.tag}`);
});

// B4) USER LEAVE
client.on("guildMemberRemove", (member) => {
  const logChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (logChannel) logChannel.send(`📤 **User Left:** ${member.user.tag}`);
});


// ==========================================================
// ===================== END LOGGING SYSTEM =================
// ==========================================================


client.login(process.env.DISCORD_BOT_TOKEN);
