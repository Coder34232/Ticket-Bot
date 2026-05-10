import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { forceClose, setSystemEnabled } from '../systems/ticket-flow.js';
import { err } from '../utils/embeds.js';
import { isStaff } from '../utils/permissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('🎫 Ticket management commands (staff only)')
    .addSubcommand(s => s.setName('close').setDescription('Force close the ticket in this channel'))
    .addSubcommand(s => s.setName('on').setDescription('Enable the ticket system'))
    .addSubcommand(s => s.setName('off').setDescription('Disable the ticket system'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ embeds: [err('Access Denied', 'Only staff can use ticket commands.')], ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    if (sub === 'close') return forceClose(interaction);
    if (sub === 'on')    return setSystemEnabled(interaction, true);
    if (sub === 'off')   return setSystemEnabled(interaction, false);
  },
};
