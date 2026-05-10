import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as db from '../systems/database.js';
import { ok, err, info } from '../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('⛔ Manage the ticket system blacklist (staff only)')
    .addSubcommand(s => s
      .setName('add')
      .setDescription('Blacklist a user from the ticket system')
      .addUserOption(o => o.setName('user').setDescription('User to blacklist').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for blacklisting').setRequired(false)),
    )
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Remove a user from the blacklist')
      .addUserOption(o => o.setName('user').setDescription('User to unblacklist').setRequired(true)),
    )
    .addSubcommand(s => s.setName('list').setDescription('Show all blacklisted users'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub    = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') ?? null;

    if (sub === 'add') {
      if (db.isBlacklisted(target.id, interaction.guild.id)) {
        return interaction.reply({ embeds: [err('Already Blacklisted', `${target} is already blacklisted.`)], ephemeral: true });
      }
      db.addToBlacklist(target.id, interaction.guild.id, reason, interaction.user.id);
      db.auditLog({ guildId: interaction.guild.id, staffId: interaction.user.id, userId: target.id, action: 'blacklist_add', detail: reason ?? 'No reason provided' });
      return interaction.reply({
        embeds: [ok('User Blacklisted', `${target} has been blacklisted from the ticket system.\n${reason ? `**Reason:** ${reason}` : ''}`)],
        ephemeral: true,
      });
    }

    if (sub === 'remove') {
      if (!db.isBlacklisted(target.id, interaction.guild.id)) {
        return interaction.reply({ embeds: [err('Not Blacklisted', `${target} is not blacklisted.`)], ephemeral: true });
      }
      db.removeFromBlacklist(target.id, interaction.guild.id);
      db.auditLog({ guildId: interaction.guild.id, staffId: interaction.user.id, userId: target.id, action: 'blacklist_rem', detail: 'Removed by staff' });
      return interaction.reply({ embeds: [ok('Removed', `${target} has been removed from the blacklist.`)], ephemeral: true });
    }

    if (sub === 'list') {
      const list = db.getAllBlacklisted(interaction.guild.id);
      if (!list.length) {
        return interaction.reply({ embeds: [info('Blacklist', 'No users are currently blacklisted.')], ephemeral: true });
      }
      const lines = list.map(b => `• <@${b.user_id}> — ${b.reason ?? 'No reason'} — <t:${b.added_at}:R>`).join('\n');
      return interaction.reply({
        embeds: [info(`⛔ Blacklist (${list.length})`, lines)],
        ephemeral: true,
      });
    }
  }, 
};
