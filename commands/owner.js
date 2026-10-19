const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const configManager = require('../utils/configManager');
const { logAction } = require('../utils/autolog');

function canManageOwners(interaction, config) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) || config.ownerIds.includes(interaction.user.id);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('owner')
    .setDescription('Gère les owners du bot sur ce serveur')
    .addSubcommand((subcommand) => subcommand
      .setName('add')
      .setDescription('Ajoute un owner')
      .addUserOption((option) => option.setName('membre').setDescription('Membre à ajouter').setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName('remove')
      .setDescription('Retire un owner')
      .addUserOption((option) => option.setName('membre').setDescription('Membre à retirer').setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName('list')
      .setDescription('Affiche les owners configurés')),

  async execute(interaction) {
    const config = configManager.getGuildConfig(interaction.guild.id);
    if (!canManageOwners(interaction, config)) {
      await interaction.reply({ content: 'Seuls les administrateurs ou les owners peuvent utiliser cette commande.', ephemeral: true });
      return;
    }

    const action = interaction.options.getSubcommand();
    if (action === 'list') {
      const owners = config.ownerIds.length
        ? config.ownerIds.map((id) => `<@${id}>`).join('\n')
        : '*Aucun owner configuré*';
      await interaction.reply({ content: `**Owners du serveur**\n${owners}`, ephemeral: true });
      return;
    }

    const user = interaction.options.getUser('membre');
    const ownerIds = action === 'add'
      ? [...new Set([...config.ownerIds, user.id])]
      : config.ownerIds.filter((id) => id !== user.id);
    const updated = configManager.updateGuildConfig(interaction.guild.id, () => ({ ownerIds }));
    const verb = action === 'add' ? 'ajouté aux owners' : 'retiré des owners';
    await interaction.reply({ content: `✅ ${user} a été ${verb}.\nOwners actuels : **${updated.ownerIds.length}**`, ephemeral: true });
    await logAction(interaction, updated, 'owner', 'Modification des owners', `${user} a été ${verb}.`);
  },
};
