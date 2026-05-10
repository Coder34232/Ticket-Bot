import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { panelEmbed, panelRow, err } from '../utils/embeds.js';
import * as db from '../systems/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('🎫 Send the support ticket panel')
    .addChannelOption(o =>
      o.setName('channel').setDescription('Channel to send the panel to (default: current)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const enabled = db.isTicketSystemEnabled(interaction.guild.id);
    try {
      await channel.send({
        embeds:     [panelEmbed(interaction.guild.name, enabled)],
        components: [panelRow(enabled)],
      });
      await interaction.reply({ content: `✅ Panel sent in ${channel}!`, ephemeral: true });
    } catch (e) {
      await interaction.reply({ embeds: [err('Error', e.message)], ephemeral: true });
    }
  },
}; 
