const {
  ActionRowBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  SlashCommandBuilder,
} = require('discord.js');
const configManager = require('../utils/configManager');

function buildPanel(config, guild) {
  const rolesText = (roleIds) => roleIds.length ? roleIds.map((id) => `<@&${id}>`).join(', ') : '*Non configuré*';

  const embed = new EmbedBuilder()
    .setColor(0x1f8b4c)
    .setTitle('Panel Syndicat')
    .setDescription(`Gestion des syndicats de **${guild.name}**\n\nStatut : ${config.enabled ? '🟢 Activé' : '🔴 Désactivé'}\n\nLes rôles configurés déterminent qui peut utiliser la commande \`/rank\`.`)
    .addFields(
      { name: 'Rôle Syndicat', value: rolesText(config.syndicatRoleIds), inline: true },
      { name: 'Rôle Inspecteur', value: rolesText(config.inspecteurRoleIds), inline: true },
      { name: 'Rôle Chef gestion', value: rolesText(config.chefGestionRoleIds), inline: true },
      { name: 'Gestion staff', value: rolesText(config.gestionStaffRoleIds), inline: true },
      { name: 'Gestion abus', value: rolesText(config.gestionAbusRoleIds), inline: true },
    )
    .setFooter({ text: 'Réservé aux administrateurs' });

  const roleSelect = (customId, placeholder) => new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder).setMinValues(0).setMaxValues(10)
  );

  return {
    embeds: [embed],
    components: [
      roleSelect('syndicat_roles', 'Rôles Syndicat'),
      roleSelect('inspecteur_roles', 'Rôles Inspecteur'),
      roleSelect('chef_gestion_roles', 'Rôles Chef gestion'),
      roleSelect('gestion_staff_roles', 'Rôles Gestion staff'),
      roleSelect('gestion_abus_roles', 'Rôles Gestion abus'),
    ],
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Ouvre le panel de gestion des syndicats'),

  async execute(interaction) {
    const config = configManager.getGuildConfig(interaction.guild.id);
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    if (!isAdmin && !config.ownerIds.includes(interaction.user.id)) {
      await interaction.reply({ content: 'Seuls les administrateurs ou les owners peuvent ouvrir ce panel.', ephemeral: true });
      return;
    }
    await interaction.reply(buildPanel(config, interaction.guild));
  },

  buildPanel,
};
