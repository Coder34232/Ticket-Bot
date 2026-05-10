import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { readdirSync }   from 'fs';
import { pathToFileURL } from 'url';
import path              from 'path';
import { fileURLToPath } from 'url';
import { startAutoClose } from './systems/ticket-flow.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.BOT_TOKEN) { console.error('❌ BOT_TOKEN missing in .env'); process.exit(1); }
if (!process.env.CLIENT_ID) { console.error('❌ CLIENT_ID missing in .env'); process.exit(1); }

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

process.on('uncaughtException',  e => console.error('[UNCAUGHT EXCEPTION]', e));
process.on('unhandledRejection', e => console.error('[UNHANDLED REJECTION]', e));
client.on('error', e => console.error('[CLIENT ERROR]', e.message));

async function loadDir(dir, callback) {
  const files = readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const mod = await import(pathToFileURL(path.join(dir, file)).href);
    callback(mod.default, file);
  }
}

async function main() {
  console.log('\n🚀 Starting Minecraft Ticket Bot...\n');

  client.commands = new Collection();
  console.log('📦 Loading commands...');
  await loadDir(path.join(__dirname, 'commands'), (cmd, file) => {
    if (cmd?.data && cmd?.execute) {
      client.commands.set(cmd.data.name, cmd);
      console.log(`  ✅ /${cmd.data.name}`);
    } else {
      console.warn(`  ⚠️  ${file} skipped (missing data or execute)`);
    }
  });
  console.log(`📦 ${client.commands.size} command(s) loaded.\n`);

  console.log('📡 Loading events...');
  await loadDir(path.join(__dirname, 'events'), (event, file) => {
    if (!event?.name || !event?.execute) return console.warn(`  ⚠️  ${file} skipped`);
    const fn = (...args) => event.execute(...args, client);
    event.once ? client.once(event.name, fn) : client.on(event.name, fn);
    console.log(`  ✅ ${event.name}`);
  });
  console.log();

  console.log('🔑 Connecting to Discord...\n');
  await client.login(process.env.BOT_TOKEN);

  startAutoClose(client);
}

main().catch(e => { console.error('❌ Fatal error:', e); process.exit(1); });
