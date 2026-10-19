const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const configManager = require('../utils/configManager');
const { logAction } = require('../utils/autolog');

const rankRoles = {
  inspecteur: 'inspecteurRoleIds',
  'chef-gestion': 'chefGestionRoleIds',
  'gestion-staff': 'gestionStaffRoleIds',
  'gestion-abus': 'gestionAbusRoleIds',
};

function hasConfiguredRole(member, roleIds) {
  return roleIds.some((roleId) => member.roles.cache.has(roleId));
}

function canGrant(member, config, rank) {
  if (member.permissions.has(PermissionFlagsBits.Administrator) || config.ownerIds.includes(member.id)) return true;
  // Syndicat peut donner tous les grades
  if (hasConfiguredRole(member, config.syndicatRoleIds)) return true;
  if (rank === 'chef-gestion') return hasConfiguredRole(member, config.inspecteurRoleIds);
  return hasConfiguredRole(member, config.chefGestionRoleIds);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Donne un grade de gestion à un membre')
    .addUserOption((option) => option.setName('membre').setDescription('Membre à promouvoir').setRequired(true))
    .addStringOption((option) => option
      .setName('grade')
      .setDescription('Grade à donner')
      .setRequired(true)
      .addChoices(
        { name: 'Inspecteur', value: 'inspecteur' },
        { name: 'Chef gestion', value: 'chef-gestion' },
        { name: 'Gestion staff', value: 'gestion-staff' },
        { name: 'Gestion abus', value: 'gestion-abus' },
      )),

  async execute(interaction) {
    const config = configManager.getGuildConfig(interaction.guild.id);
    if (!config.enabled) {
      await interaction.reply({ content: 'Le système Syndicat est actuellement désactivé.', ephemeral: true });
      return;
    }

    const target = interaction.options.getMember('membre');
    const rank = interaction.options.getString('grade');
    const roleIds = config[rankRoles[rank]];
    const roles = roleIds.map((roleId) => interaction.guild.roles.cache.get(roleId)).filter(Boolean);

    if (!target) {
      await interaction.reply({ content: 'Ce membre est introuvable sur le serveur.', ephemeral: true });
      return;
    }
    if (!roleIds.length || !roles.length) {
      await interaction.reply({ content: 'Ce grade n’est pas encore configuré dans `/panel`.', ephemeral: true });
      return;
    }
    if (!canGrant(interaction.member, config, rank)) {
      await interaction.reply({ content: rank === 'inspecteur'
        ? 'Seuls les Syndicats ou les administrateurs peuvent donner Inspecteur.'
        : rank === 'chef-gestion'
        ? 'Seuls les Inspecteurs ou les administrateurs peuvent donner Chef gestion.'
        : 'Seuls les Chefs gestion ou les administrateurs peuvent donner ce grade.', ephemeral: true });
      return;
    }
    if (target.id === interaction.user.id) {
      await interaction.reply({ content: 'Tu ne peux pas te donner un grade à toi-même.', ephemeral: true });
      return;
    }
    if (target.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
      await interaction.reply({ content: 'Je ne peux pas modifier les rôles de ce membre : son rôle le plus haut est supérieur au mien.', ephemeral: true });
      return;
    }
    if (roles.some((role) => !role.editable)) {
      await interaction.reply({ content: 'Un des rôles configurés est au-dessus du rôle du bot.', ephemeral: true });
      return;
    }

    const managedRoleIds = Object.values(rankRoles).flatMap((key) => config[key]);
    await target.roles.remove(managedRoleIds.filter((roleId) => interaction.guild.roles.cache.has(roleId)));
    await target.roles.add(roles);
    await interaction.reply(`✅ ${target} est maintenant **${rank.replace('-', ' ')}**.`);
    await logAction(interaction, config, 'rank', 'Nouveau grade Syndicat', `${target} reçoit le grade **${rank.replace('-', ' ')}**.`);
  },
};
