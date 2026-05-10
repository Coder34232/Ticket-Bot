import { ActivityType } from 'discord.js';
import * as db from '../systems/database.js';

export default {
  name: 'clientReady',
  once: true,

  async execute(client) {
    console.log('\n' + '═'.repeat(52));
    console.log(`  🎮 Minecraft Ticket Bot online: ${client.user.tag}`);
    console.log(`  🌐 Guilds   : ${client.guilds.cache.size}`);
    console.log(`  🤖 User ID  : ${client.user.id}`);
    console.log(`  ⏰ Started  : ${new Date().toLocaleString('en-GB')}`);
    console.log('═'.repeat(52) + '\n');

    let cleaned = 0;
    for (const guild of client.guilds.cache.values()) {
      try {
        for (const ticket of db.getOpenTickets(guild.id)) {
          if (!guild.channels.cache.has(ticket.channel_id)) {
            db.forceCloseOrphan(ticket.channel_id);
            cleaned++;
            console.log(`  🧹 Orphan closed: Ticket #${ticket.id} (channel ${ticket.channel_id} gone)`);
          }
        }
      } catch (err) {
        console.error(`  ⚠️  Orphan cleanup error — guild ${guild.id}:`, err.message);
      }
    }
    if (cleaned > 0) console.log(`  🧹 Cleaned ${cleaned} orphaned ticket(s)\n`);

    const statuses = [
      { name: 'Managing support tickets', type: ActivityType.Watching  },
      { name: 'the community',            type: ActivityType.Watching  },
      { name: 'Handling appeals',         type: ActivityType.Playing   },
      { name: '/panel to get started',    type: ActivityType.Listening },
    ];
    let i = 0;
    const rotate = () => {
      const s = statuses[i++ % statuses.length];
      client.user.setPresence({ activities: [{ name: s.name, type: s.type }], status: 'online' });
    };
    rotate();
    setInterval(rotate, 30_000);
  },
};
