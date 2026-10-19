const { ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const logChannels = ['rank', 'owner', 'systeme'];

async function configureAutoLog(guild, config, enabled) {
  if (!enabled) {
    config.enabled = false;
    return 'Les logs Syndicat sont désactivés. Les salons sont conservés.';
  }

  await guild.fetch();
  const botMember = guild.members.me || await guild.members.fetchMe();
  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)
    || !botMember.permissions.has(PermissionFlagsBits.SendMessages)) {
    const error = new Error('Permissions insuffisantes sur le serveur de logs');
    error.code = 'MISSING_PERMISSIONS';
    throw error;
  }

  let category = config.categoryId ? guild.channels.cache.get(config.categoryId) : null;
  if (!category || category.type !== ChannelType.GuildCategory) {
    category = await guild.channels.create({ name: 'syndicat-logs', type: ChannelType.GuildCategory });
    config.categoryId = category.id;
  }

  for (const name of logChannels) {
    let channel = config.channels[name] ? guild.channels.cache.get(config.channels[name]) : null;
    if (!channel || !channel.isTextBased()) {
      channel = await guild.channels.create({ name: `logs-${name}`, type: ChannelType.GuildText, parent: category.id });
      config.channels[name] = channel.id;
    }
  }

  config.enabled = true;
  return `Logs activés dans **${guild.name}** : ${logChannels.map((name) => `#logs-${name}`).join(', ')}.`;
}

async function logAction(interaction, config, channelName, title, description) {
  const autoLog = config.autoLog;
  if (!autoLog?.enabled || (autoLog.sourceGuildId && autoLog.sourceGuildId !== interaction.guild.id)) return;

  const logGuild = autoLog.targetGuildId
    ? interaction.client.guilds.cache.get(autoLog.targetGuildId)
    : null;
  const channelId = autoLog.channels[channelName] || autoLog.channels.systeme;
  const channel = logGuild?.channels.cache.get(channelId);
  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(0x1f8b4c)
    .setTitle(title)
    .setDescription(description)
    .addFields(
      { name: 'Serveur officiel', value: `${interaction.guild.name} (${interaction.guild.id})` },
      { name: 'Auteur', value: `${interaction.user.tag} (${interaction.user.id})` },
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch((error) => {
    console.error('Impossible d’envoyer un log Syndicat :', error.message);
  });
}

module.exports = { configureAutoLog, logAction };
