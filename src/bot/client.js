const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { queryOne, query } = require('../db');
const logger = require('../utils/logger');

let client = null;
let isRunning = false;

function getClient() { return client; }
function isOnline() { return client?.isReady() || false; }

async function startBot() {
  if (isRunning) return client;

  const settings = await queryOne('SELECT * FROM bot_settings WHERE id = 1');
  if (!settings?.token) {
    logger.warn('bot', 'Bot token ayarlanmamis, bot baslatilmiyor');
    return null;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences
    ]
  });

  // Komutlari yukle
  client.commands = new Collection();
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  const commandsData = [];

  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      commandsData.push(command.data.toJSON());
    }
  }

  // Eventleri yukle
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }

  // Slash komutlarini kaydet
  try {
    const rest = new REST({ version: '10' }).setToken(settings.token);
    logger.info('bot', `${commandsData.length} slash komut kaydediliyor...`);

    await rest.put(
      Routes.applicationCommands(settings.client_id),
      { body: commandsData }
    );

    logger.info('bot', 'Slash komutlar kaydedildi');
  } catch (err) {
    logger.error('bot', `Komut kaydi hatasi: ${err.message}`);
  }

  // Giris yap
  try {
    await client.login(settings.token);
    isRunning = true;
    logger.info('bot', `Bot giris yapti: ${client.user?.tag}`);
    return client;
  } catch (err) {
    logger.error('bot', `Bot giris hatasi: ${err.message}`);
    client = null;
    return null;
  }
}

async function stopBot() {
  if (client) {
    client.destroy();
    client = null;
    isRunning = false;
    logger.info('bot', 'Bot durduruldu');
  }
}

async function restartBot() {
  await stopBot();
  // Komut modullerini temizle
  const commandsPath = path.join(__dirname, 'commands');
  const eventsPath = path.join(__dirname, 'events');
  for (const dir of [commandsPath, eventsPath]) {
    for (const file of fs.readdirSync(dir)) {
      delete require.cache[require.resolve(path.join(dir, file))];
    }
  }
  return await startBot();
}

module.exports = { getClient, isOnline, startBot, stopBot, restartBot };
