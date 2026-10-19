const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const configManager = require('../utils/configManager');
const { configureAutoLog } = require('../utils/autolog');

function canManage(interaction, config) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
    || config.ownerIds.includes(interaction.user.id);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autolog')
    .setDescription('Relie le serveur officiel à un serveur de logs')
    .addStringOption((option) => option
      .setName('action')
      .setDescription('Action à effectuer')
      .setRequired(true)
      .addChoices(
        { name: 'Configurer', value: 'configurer' },
        { name: 'Activer', value: 'activer' },
        { name: 'Désactiver', value: 'desactiver' },
      ))
    .addStringOption((option) => option
      .setName('serveur_id')
      .setDescription('ID du serveur dédié aux logs, requis pour configurer')),

  async execute(interaction) {
    const config = configManager.getGuildConfig(interaction.guild.id);
    if (!canManage(interaction, config)) {
      await interaction.reply({ content: 'Seuls les administrateurs ou les owners peuvent gérer les logs.', ephemeral: true });
      return;
    }

    const action = interaction.options.getString('action');
    const targetGuildId = interaction.options.getString('serveur_id');
    if (action === 'configurer') {
      if (!targetGuildId || !/^\d{17,20}$/.test(targetGuildId)) {
        await interaction.reply({ content: 'Indique un ID de serveur Discord valide.', ephemeral: true });
        return;
      }
      if (targetGuildId === interaction.guild.id) {
        await interaction.reply({ content: 'Le serveur de logs doit être différent du serveur officiel.', ephemeral: true });
        return;
      }
      let targetGuild;
      try {
        targetGuild = await interaction.client.guilds.fetch(targetGuildId);
      } catch {
        await interaction.reply({ content: 'Le bot doit être présent sur le serveur officiel et le serveur de logs.', ephemeral: true });
        return;
      }

      config.autoLog = {
        enabled: false,
        sourceGuildId: interaction.guild.id,
        targetGuildId,
        categoryId: null,
        channels: {},
      };
      configManager.updateGuildConfig(interaction.guild.id, () => ({ autoLog: config.autoLog }));
      await interaction.reply({ content: `✅ Serveur de logs relié : **${targetGuild.name}**. Lance maintenant /autolog action:activer.`, ephemeral: true });
      return;
    }

    if (!config.autoLog?.targetGuildId) {
      await interaction.reply({ content: 'Configure d’abord le serveur avec `/autolog action:configurer serveur_id:ID`.', ephemeral: true });
      return;
    }
    let targetGuild;
    try {
      targetGuild = await interaction.client.guilds.fetch(config.autoLog.targetGuildId);
      await targetGuild.fetch();
      await targetGuild.members.fetchMe();
      await targetGuild.channels.fetch();
    } catch {
      await interaction.reply({ content: 'Le bot n’est plus présent sur le serveur de logs configuré.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      const autoLog = { ...config.autoLog, channels: { ...config.autoLog.channels } };
      const message = await configureAutoLog(targetGuild, autoLog, action === 'activer');
      configManager.updateGuildConfig(interaction.guild.id, () => ({ autoLog }));
      await interaction.editReply(`✅ ${message}`);
    } catch (error) {
      console.error('Erreur autolog:', error);
      const details = error.code ? `Code ${error.code}` : error.message || 'Erreur inconnue';
      await interaction.editReply(`Impossible de configurer les salons. ${details}. Vérifie les permissions effectives du bot et que le serveur ID est correct.`);
    }
  },
};
