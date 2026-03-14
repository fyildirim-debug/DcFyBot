const fs = require('fs');
const path = require('path');
const { queryOne, query } = require('../db');
const { loadPluginLanguage } = require('../langs/i18n');
const logger = require('../utils/logger');

const plugins = new Map();
const pluginsDir = path.join(__dirname);

// Eklentileri tara ve yukle
async function loadPlugins(botClient) {
  const dirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const dir of dirs) {
    const pluginPath = path.join(pluginsDir, dir);
    const manifestPath = path.join(pluginPath, 'plugin.json');
    const indexPath = path.join(pluginPath, 'index.js');

    if (!fs.existsSync(manifestPath) || !fs.existsSync(indexPath)) continue;

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const plugin = require(indexPath);

      // Dil dosyalarini yukle
      const langDir = path.join(pluginPath, 'langs');
      if (fs.existsSync(langDir)) {
        loadPluginLanguage(manifest.name, langDir);
      }

      plugins.set(manifest.name, {
        manifest,
        instance: plugin,
        loaded: true,
        pluginPath
      });

      logger.info('plugins', `Eklenti yuklendi: ${manifest.name} v${manifest.version}`);
    } catch (err) {
      logger.error('plugins', `Eklenti yuklenemedi [${dir}]: ${err.message}`);
    }
  }

  return plugins;
}

// Aktif eklentileri baslat
async function startPlugins(botClient) {
  for (const [name, plugin] of plugins) {
    try {
      const settings = await queryOne(
        'SELECT * FROM plugin_settings WHERE plugin_name = $1 AND guild_id = $2',
        [name, '_global']
      );

      if (settings?.enabled && plugin.instance.start) {
        await plugin.instance.start(botClient, settings.config || {});
        logger.info('plugins', `Eklenti baslatildi: ${name}`);
      }
    } catch (err) {
      logger.error('plugins', `Eklenti baslatilamadi [${name}]: ${err.message}`);
    }
  }
}

// Eklenti listesi
function getPlugins() {
  return Array.from(plugins.entries()).map(([name, p]) => ({
    name,
    ...p.manifest,
    loaded: p.loaded
  }));
}

// Eklenti etkinlestir/devre disi birak
async function togglePlugin(name, guildId = '_global', enabled = true) {
  await query(
    `INSERT INTO plugin_settings (plugin_name, guild_id, enabled) VALUES ($1, $2, $3)
     ON CONFLICT (plugin_name, guild_id) DO UPDATE SET enabled = $3, updated_at = NOW()`,
    [name, guildId, enabled]
  );
}

// Eklenti ayarlarini guncelle
async function updatePluginConfig(name, guildId = '_global', config = {}) {
  await query(
    `INSERT INTO plugin_settings (plugin_name, guild_id, config) VALUES ($1, $2, $3)
     ON CONFLICT (plugin_name, guild_id) DO UPDATE SET config = $3, updated_at = NOW()`,
    [name, guildId, JSON.stringify(config)]
  );
}

// Plugin web registry - nav items, page scripts, routes
function getPluginWebRegistry() {
  const registry = [];
  for (const [name, p] of plugins) {
    const web = p.manifest.web;
    if (!web) continue;
    registry.push({
      name,
      navItems: web.navItems || [],
      pages: (web.pages || []).map(f => `/plugins/${name}/${f}`),
      hasRoutes: !!(web.routes && web.routes.length > 0)
    });
  }
  return registry;
}

// Mount plugin Express routes and static assets
function mountPluginWeb(app) {
  const express = require('express');

  for (const [name, p] of plugins) {
    const web = p.manifest.web;
    if (!web) continue;

    // Serve plugin web/ directory as static
    const webDir = path.join(p.pluginPath, 'web');
    if (fs.existsSync(webDir)) {
      app.use(`/plugins/${name}`, express.static(webDir));
    }

    // Mount plugin Express routes
    if (web.routes) {
      for (const routeFile of web.routes) {
        const routePath = path.join(p.pluginPath, routeFile);
        if (fs.existsSync(routePath)) {
          try {
            const router = require(routePath);
            app.use(`/api/plugins/${name}`, router);
            logger.info('plugins', `Eklenti web route yuklendi: ${name}`);
          } catch (err) {
            logger.error('plugins', `Eklenti route yuklenemedi [${name}]: ${err.message}`);
          }
        }
      }
    }
  }
}

module.exports = { loadPlugins, startPlugins, getPlugins, getPluginWebRegistry, mountPluginWeb, togglePlugin, updatePluginConfig };
