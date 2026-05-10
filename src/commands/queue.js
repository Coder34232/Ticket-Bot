import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as db from '../systems/database.js';
import { queueListEmbed, ok, err, info } from '../utils/embeds.js';
import { isStaff } from '../utils/permissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('⏳ Manage the support waitlist')
    .addSubcommand(s => s.setName('list').setDescription('Show everyone in the waitlist'))
    .addSubcommand(s => s.setName('position').setDescription('Check your position in the waitlist'))
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Remove a user from the waitlist (staff only)')
      .addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true)),
    )
    .addSubcommand(s => s.setName('clear').setDescription('Clear the entire waitlist (staff only)')),

  async execute(interaction) {
    const sub      = interaction.options.getSubcommand();
    const staff    = isStaff(interaction.member);

    if (sub === 'list') {
      const entries = db.getAllWaitlistEntries(interaction.guild.id);
      return interaction.reply({
        embeds:    [queueListEmbed(entries, interaction.guild.name)],
        ephemeral: !staff,
      });
    }

    if (sub === 'position') {
      const pos   = db.getWaitlistPosition(interaction.user.id, interaction.guild.id);
      const total = db.getWaitlistCount(interaction.guild.id);

      if (!pos) {
        return interaction.reply({
          embeds: [info('Not in Waitlist', 'You are not currently in the support waitlist.')],
          ephemeral: true,
        });
      }

      const eta = pos * 30;
      return interaction.reply({
        embeds: [info('Your Waitlist Position',
          `**Position:** \`${pos} / ${total}\`\n` +
          `**Estimated wait:** ~${eta} minute(s)\n\n` +
          'You will receive a **DM** when your ticket is ready to be created.')],
        ephemeral: true,
      });
    }

    if (!staff) {
      return interaction.reply({ embeds: [err('Access Denied', 'Only staff can use this command.')], ephemeral: true });
    }

    if (sub === 'remove') {
      const target = interaction.options.getUser('user');
      if (!db.isInWaitlist(target.id, interaction.guild.id)) {
        return interaction.reply({ embeds: [err('Not Found', `${target} is not in the waitlist.`)], ephemeral: true });
      }
      db.removeUserFromWaitlist(target.id, interaction.guild.id);
      db.auditLog({ guildId: interaction.guild.id, staffId: interaction.user.id, userId: target.id, action: 'waitlist_remove', detail: 'Removed by staff' });
      return interaction.reply({ embeds: [ok('Removed', `${target} has been removed from the waitlist.`)], ephemeral: true });
    }

    if (sub === 'clear') {
      const count = db.getWaitlistCount(interaction.guild.id);
      db.clearWaitlist(interaction.guild.id);
      db.auditLog({ guildId: interaction.guild.id, staffId: interaction.user.id, action: 'waitlist_clear', detail: `Cleared ${count} entries` });
      return interaction.reply({ embeds: [ok('Waitlist Cleared', `Removed **${count}** user(s) from the waitlist.`)], ephemeral: true });
    }
  },
};
