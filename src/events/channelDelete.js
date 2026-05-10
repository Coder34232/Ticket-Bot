import * as db from '../systems/database.js';

export default {
  name: 'channelDelete',
  async execute(channel, client) {
    try {
      const ticket = db.getTicket(channel.id);
      if (!ticket || ticket.status === 'closed') return;

      db.closeTicket(channel.id, client.user.id, 'Channel deleted manually');
      db.auditLog({
        guildId:  channel.guildId,
        ticketId: ticket.id,
        staffId:  client.user.id,
        action:   'close',
        detail:   'Channel was manually deleted — ticket auto-closed in database',
      });

      console.log(`[CHANNEL DELETE] Ticket #${ticket.id} auto-closed (channel ${channel.id} deleted)`);

      if (channel.guild) {
        const { promoteFromWaitlist } = await import('../systems/ticket-flow.js');
        await promoteFromWaitlist(client, channel.guild);
      }
    } catch (err) {
      console.error('[CHANNEL DELETE]', err.message);
    }
  },
};
