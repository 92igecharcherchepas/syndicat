const fs = require('fs');
const path = require('path');
const { ActivityType, Client, Collection, Events, GatewayIntentBits, REST, Routes } = require('discord.js');
require('dotenv').config();

if (!process.env.TOKEN) {
  console.error('Variable TOKEN manquante. Crée un fichier .env dans syndicat/.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandsData = [];
for (const file of fs.readdirSync(commandsPath).filter((name) => name.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
  commandsData.push(command.data.toJSON());
}
console.log(`Commandes chargées : ${commandsData.map((command) => `/${command.name}`).join(', ')}`);

const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter((name) => name.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  client.on(event.name, (...args) => event.execute(...args, client));
}

client.once(Events.ClientReady, async (readyClient) => {
  readyClient.user.setPresence({
    activities: [{ name: '.gg/mizy', type: ActivityType.Streaming, url: 'https://www.twitch.tv/mizy' }],
  });
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    const guildRoute = process.env.GUILD_ID
      ? Routes.applicationGuildCommands(readyClient.user.id, process.env.GUILD_ID)
      : null;
    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationCommands(readyClient.user.id), { body: [] });
      await rest.put(guildRoute, { body: [] });
      await rest.put(guildRoute, { body: commandsData });
    } else {
      await rest.put(Routes.applicationCommands(readyClient.user.id), { body: commandsData });
    }
    console.log(`${commandsData.length} commandes déployées ${process.env.GUILD_ID ? 'sur le serveur configuré, anciennes copies nettoyées' : 'globalement'}.`);
  } catch (error) {
    console.error('Impossible de déployer les commandes :', error);
  }
  console.log(`Connecté en tant que ${readyClient.user.tag}`);
});

client.login(process.env.TOKEN).catch((error) => {
  console.error('Connexion Discord impossible :', error.message);
});
