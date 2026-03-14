const { EmbedBuilder } = require('discord.js');

let botClient = null;

async function start(client, config) {
  botClient = client;
  // GitHub webhook endpoint web sunucuya eklenir
}

async function stop() {
  botClient = null;
}

// GitHub webhook handler
async function handleWebhook(event, payload, config) {
  if (!botClient || !config.channel_id) return;

  const channel = botClient.channels.cache.get(config.channel_id);
  if (!channel) return;

  let embed;

  switch (event) {
    case 'push': {
      const commits = payload.commits || [];
      embed = new EmbedBuilder()
        .setTitle(`Push: ${payload.repository?.name}`)
        .setColor(0x24292e)
        .setDescription(commits.map(c => `[\`${c.id.slice(0, 7)}\`](${c.url}) ${c.message}`).join('\n').slice(0, 2000))
        .setFooter({ text: `${commits.length} commit | ${payload.pusher?.name}` })
        .setTimestamp();
      break;
    }
    case 'pull_request': {
      embed = new EmbedBuilder()
        .setTitle(`PR ${payload.action}: ${payload.pull_request?.title}`)
        .setURL(payload.pull_request?.html_url)
        .setColor(payload.action === 'opened' ? 0x28a745 : 0x6f42c1)
        .setDescription(payload.pull_request?.body?.slice(0, 500) || '')
        .setFooter({ text: payload.pull_request?.user?.login })
        .setTimestamp();
      break;
    }
    case 'issues': {
      embed = new EmbedBuilder()
        .setTitle(`Issue ${payload.action}: ${payload.issue?.title}`)
        .setURL(payload.issue?.html_url)
        .setColor(0xd73a49)
        .setTimestamp();
      break;
    }
    default:
      return;
  }

  if (embed) {
    await channel.send({ embeds: [embed] });
  }
}

module.exports = { start, stop, handleWebhook };
