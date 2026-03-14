const Parser = require('rss-parser');
const { EmbedBuilder } = require('discord.js');

const parser = new Parser();
let botClient = null;
let interval = null;
let lastItems = new Map();

async function start(client, config) {
  botClient = client;
  if (!config.feeds?.length || !config.channel_id) return;

  const checkInterval = (config.check_interval || 300) * 1000;

  // Ilk kontrol
  await checkFeeds(config);

  // Periyodik kontrol
  interval = setInterval(() => checkFeeds(config), checkInterval);
}

async function stop() {
  if (interval) clearInterval(interval);
  interval = null;
  botClient = null;
}

async function checkFeeds(config) {
  if (!botClient || !config.channel_id) return;

  const channel = botClient.channels.cache.get(config.channel_id);
  if (!channel) return;

  for (const feedUrl of config.feeds) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const lastKey = feedUrl;
      const prevItems = lastItems.get(lastKey) || [];

      const newItems = feed.items.filter(item =>
        !prevItems.includes(item.link || item.guid)
      );

      // Ilk calistirmada sadece kaydet
      if (prevItems.length === 0) {
        lastItems.set(lastKey, feed.items.map(i => i.link || i.guid).slice(0, 50));
        continue;
      }

      for (const item of newItems.slice(0, 5)) {
        const embed = new EmbedBuilder()
          .setTitle(item.title?.slice(0, 256) || 'Yeni icerik')
          .setURL(item.link || '')
          .setColor(0xff6600)
          .setDescription(item.contentSnippet?.slice(0, 300) || '')
          .setFooter({ text: feed.title || feedUrl })
          .setTimestamp(item.pubDate ? new Date(item.pubDate) : new Date());

        await channel.send({ embeds: [embed] });
      }

      lastItems.set(lastKey, feed.items.map(i => i.link || i.guid).slice(0, 50));
    } catch {}
  }
}

module.exports = { start, stop };
