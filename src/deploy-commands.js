import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync }   from 'fs';
import { pathToFileURL } from 'url';
import path              from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commands  = [];
const dir       = path.join(__dirname, 'commands');

console.log('📦 Collecting commands...\n');
for (const file of readdirSync(dir).filter(f => f.endsWith('.js'))) {
  const { default: cmd } = await import(pathToFileURL(path.join(dir, file)).href);
  if (cmd?.data) {
    commands.push(cmd.data.toJSON());
    console.log(`  ✅ ${cmd.data.name}`);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
console.log(`\n📤 Registering ${commands.length} command(s)...\n`);

if (process.env.GUILD_ID) {
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands },
  );
  console.log(`✅ Registered in guild ${process.env.GUILD_ID} (instant)`);
} else {
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
  console.log('✅ Registered globally (up to 1h to propagate)');
}
