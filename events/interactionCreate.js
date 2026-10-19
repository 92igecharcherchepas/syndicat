const { Events, PermissionFlagsBits } = require('discord.js');
const configManager = require('../utils/configManager');
const panel = require('../commands/panel');

const ID_PATTERN = /^\d{17,20}$/;

function parseIds(value) {
  const values = value.split(/[\s,;]+/).map((id) => id.trim()).filter(Boolean);
  const invalid = values.filter((id) => !ID_PATTERN.test(id));
  return { ids: [...new Set(values.filter((id) => ID_PATTERN.test(id)))], invalid };
}

function isAdministrator(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
}

async function executeCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Erreur /${interaction.commandName}:`, error);
    const response = { content: 'Une erreur est survenue pendant l’exécution de la commande.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(response);
    else await interaction.reply(response);
  }
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.guild) return;

    if (interaction.isChatInputCommand()) {
      await executeCommand(interaction);
      return;
    }

    if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isRoleSelectMenu()) return;
    const config = configManager.getGuildConfig(interaction.guild.id);
    if (!isAdministrator(interaction) && !config.ownerIds.includes(interaction.user.id)) {
      await interaction.reply({ content: 'Seuls les administrateurs peuvent utiliser ce panel.', ephemeral: true });
      return;
    }

    if (interaction.isRoleSelectMenu()) {
      const roleConfigKeys = {
        syndicat_roles: 'syndicatRoleIds',
        inspecteur_roles: 'inspecteurRoleIds',
        chef_gestion_roles: 'chefGestionRoleIds',
        gestion_staff_roles: 'gestionStaffRoleIds',
        gestion_abus_roles: 'gestionAbusRoleIds',
      };
      const configKey = roleConfigKeys[interaction.customId];
      if (!configKey) return;
      await interaction.deferUpdate();
      const updated = configManager.updateGuildConfig(interaction.guild.id, () => ({ [configKey]: interaction.values }));
      await interaction.editReply(panel.buildPanel(updated, interaction.guild));
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'syndicat_add') {
        await interaction.showModal(panel.buildIdsModal('syndicat_add_modal', 'Ajouter des IDs', 'IDs des syndicats', 'Un ou plusieurs IDs séparés par des virgules'));
      } else if (interaction.customId === 'syndicat_remove') {
        await interaction.showModal(panel.buildIdsModal('syndicat_remove_modal', 'Retirer des IDs', 'IDs à retirer', 'Un ou plusieurs IDs séparés par des virgules'));
      } else if (interaction.customId === 'syndicat_toggle') {
        const updated = configManager.updateGuildConfig(interaction.guild.id, (current) => ({ enabled: !current.enabled }));
        await interaction.update(panel.buildPanel(updated, interaction.guild));
      } else if (interaction.customId === 'syndicat_clear') {
        const updated = configManager.updateGuildConfig(interaction.guild.id, () => ({ syndicatRoleIds: [] }));
        await interaction.update(panel.buildPanel(updated, interaction.guild));
      } else if (interaction.customId === 'syndicat_refresh') {
        await interaction.update(panel.buildPanel(configManager.getGuildConfig(interaction.guild.id), interaction.guild));
      }
      return;
    }

    if (interaction.customId === 'syndicat_add_modal' || interaction.customId === 'syndicat_remove_modal') {
      const value = interaction.fields.getTextInputValue(interaction.customId);
      const { ids, invalid } = parseIds(value);
      if (invalid.length) {
        await interaction.reply({ content: `IDs invalides : ${invalid.map((id) => `\`${id}\``).join(', ')}. Un ID Discord contient 17 à 20 chiffres.`, ephemeral: true });
        return;
      }

      const updated = configManager.updateGuildConfig(interaction.guild.id, (current) => ({
        syndicatRoleIds: interaction.customId === 'syndicat_add_modal'
          ? [...new Set([...current.syndicatRoleIds, ...ids])]
          : current.syndicatRoleIds.filter((id) => !ids.includes(id)),
      }));
      await interaction.reply({ ...panel.buildPanel(updated, interaction.guild), ephemeral: true });
    }
  },
};
