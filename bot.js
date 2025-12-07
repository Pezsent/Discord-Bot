// Load environment variables from .env file
require('dotenv').config();
console.log('Token from .env:', process.env.DISCORD_BOT_TOKEN ? '[TOKEN SET]' : '[NO TOKEN]');

const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
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
    GatewayIntentBits.GuildMembers, // needed for join/leave logs
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

const LOG_CHANNEL_ID = "1447027328600379392";

// Helper function for dashboard-style embeds
function createLogEmbed({ title, description, color, footer }) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: footer || 'Illusion Logs' });
}

// ========== DISCORD EVENTS ==========

// ----- Message Create (Ping + Chat Logging) -----
client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot || message.webhookId) return;

  const now = Date.now();
  const channelId = message.channel.id;
  const content = message.content.trim();
  let pinged = false;

  const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);

  // ----- World Boss Ping -----
  if (!pinged && channelId === CHANNEL_IDS.worldBosses && now > cooldowns.worldBosses) {
    const trigger = content.toLowerCase().includes('@world boss ping') || content.includes(`<@&${ROLE_IDS.worldBosses}>`);
    if (trigger) {
      cooldowns.worldBosses = now + COOLDOWN_MS;
      const embed = createLogEmbed({
        title: "📣 World Boss Ping",
        description: `**Triggered by:** ${message.author.tag}\n**Channel:** <#${message.channel.id}>\nPing sent to <@&${ROLE_IDS.worldBosses}>!`,
        color: 0x8A2BE2 // bright purple
      });
      await message.channel.send({ embeds: [embed] });
      if (logChannel) logChannel.send({ embeds: [embed] });
      console.log(`📣 Pinged <@&${ROLE_IDS.worldBosses}>`);
      pinged = true;
    }
  }

  // ----- Dungeon Ping -----
  if (!pinged && channelId === CHANNEL_IDS.dungeon && now > cooldowns.dungeon) {
    const trigger = content.toLowerCase().includes('@dungeon') || content.includes(`<@&${ROLE_IDS.dungeon}>`);
    if (trigger) {
      cooldowns.dungeon = now + COOLDOWN_MS;
      const embed = createLogEmbed({
        title: "📣 Dungeon Ping",
        description: `**Triggered by:** ${message.author.tag}\n**Channel:** <#${message.channel.id}>\nPing sent to <@&${ROLE_IDS.dungeon}>!`,
        color: 0x7B68EE // medium purple
      });
      await message.channel.send({ embeds: [embed] });
      if (logChannel) logChannel.send({ embeds: [embed] });
      console.log(`📣 Pinged <@&${ROLE_IDS.dungeon}>`);
      pinged = true;
    }
  }

  // ----- Infernal Ping -----
  if (!pinged && channelId === CHANNEL_IDS.infernal && now > cooldowns.infernal) {
    const trigger = content.toLowerCase().includes('@infernal') || content.includes(`<@&${ROLE_IDS.infernal}>`);
    if (trigger) {
      cooldowns.infernal = now + COOLDOWN_MS;
      const embed = createLogEmbed({
        title: "📣 Infernal Ping",
        description: `**Triggered by:** ${message.author.tag}\n**Channel:** <#${message.channel.id}>\nPing sent to <@&${ROLE_IDS.infernal}>!`,
        color: 0x9932CC // deep purple
      });
      await message.channel.send({ embeds: [embed] });
      if (logChannel) logChannel.send({ embeds: [embed] });
      console.log(`📣 Pinged <@&${ROLE_IDS.infernal}>`);
      pinged = true;
    }
  }

  // ----- Chat Logging -----
  if (!pinged && logChannel && message.channel.id !== LOG_CHANNEL_ID) {
    logChannel.send({ embeds: [createLogEmbed({
      title: "💬 Message Sent",
      description: `**User:** ${message.author.tag}\n**Channel:** <#${message.channel.id}>\n**Content:** ${message.content || "*No text*"}`,
      color: 0x1ABC9C // teal/cyan
    })] });
  }
});

// ----- Message Edited -----
client.on("messageUpdate", async (oldMsg, newMsg) => {
  if (!newMsg.guild || newMsg.author?.bot) return;
  if (oldMsg.content === newMsg.content) return;

  const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
  if (logChannel) logChannel.send({ embeds: [createLogEmbed({
    title: "✏️ Message Edited",
    description: `**User:** ${newMsg.author.tag}\n**Channel:** <#${newMsg.channel.id}>\n\n**Before:** ${oldMsg.content || "*No text*"}\n**After:** ${newMsg.content || "*No text*"}`,
    color: 0xF1C40F // yellow
  })] });
});

// ----- Message Deleted -----
client.on("messageDelete", async (message) => {
  if (!message.guild || message.author?.bot) return;

  const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
  if (logChannel) logChannel.send({ embeds: [createLogEmbed({
    title: "🗑️ Message Deleted",
    description: `**User:** ${message.author?.tag || "Unknown"}\n**Channel:** <#${message.channel.id}>\n**Content:** ${message.content || "*No text*"}`,
    color: 0xE74C3C // red
  })] });
});

// ----- User Join -----
client.on("guildMemberAdd", (member) => {
  const logChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (logChannel) logChannel.send({ embeds: [createLogEmbed({
    title: "📥 User Joined",
    description: `${member.user.tag} joined the server.`,
    color: 0xD8BFD8 // light purple
  })] });
});

// ----- User Leave -----
client.on("guildMemberRemove", (member) => {
  const logChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (logChannel) logChannel.send({ embeds: [createLogEmbed({
    title: "📤 User Left",
    description: `${member.user.tag} left the server.`,
    color: 0xE67E22 // orange
  })] });
});

// ----- Bot Events -----
client.once("ready", async () => {
  console.log(`🟢 Logged in as ${client.user.tag}`);
  const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
  if (logChannel) logChannel.send({ embeds: [createLogEmbed({
    title: "🟢 Bot Started",
    description: `Logged in as **${client.user.tag}**`,
    color: 0x4B0082 // dark purple
  })] });
});

client.on("reconnecting", () => {
  const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
  if (logChannel) logChannel.send({ embeds: [createLogEmbed({
    title: "🔄 Bot Reconnecting",
    description: "Attempting to reconnect to Discord...",
    color: 0x4B0082 // dark purple
  })] });
});

client.on("disconnect", () => {
  const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
  if (logChannel) logChannel.send({ embeds: [createLogEmbed({
    title: "🔴 Bot Disconnected",
    description: "Bot has disconnected from Discord!",
    color: 0x4B0082 // dark purple
  })] });
});

// ==========================================================
// ===================== END LOGGING SYSTEM =================
// ==========================================================

client.login(process.env.DISCORD_BOT_TOKEN);
