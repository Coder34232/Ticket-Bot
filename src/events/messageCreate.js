import * as db from '../systems/database.js';

export default {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const ticket = db.getTicket(message.channel.id);
    if (!ticket || ticket.status !== 'open') return;

    db.touchActivity(message.channel.id);

    db.saveMessage(ticket.id, {
      userId:      message.author.id,
      username:    message.author.username,
      avatarUrl:   message.author.displayAvatarURL({ size: 64 }),
      content:     message.content || null,
      attachments: [...message.attachments.values()].map(a => `${a.name} (${a.url})`).join(', ') || null,
    });
  },
};
