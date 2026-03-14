require('dotenv').config();

const { testConnection } = require('./db');
const { runMigrations } = require('./db/migrations');
const { createServer, attachBotClient } = require('./web/server');
const { startBot, getClient } = require('./bot/client');
const { loadPlugins, startPlugins } = require('./plugins/loader');
const config = require('./config');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

async function main() {
  console.log('');
  console.log('  ╔═══════════════════════════════╗');
  console.log('  ║         FyDCBot v1.0.0         ║');
  console.log('  ║   AI-Powered Discord Bot       ║');
  console.log('  ╚═══════════════════════════════╝');
  console.log('');

  // 1. Veritabani baglan
  console.log('[*] Veritabanina baglaniliyor...');
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('[!] Veritabani baglantisi basarisiz!');
    console.error('    DATABASE_URL kontrol edin: ' + (process.env.DATABASE_URL || 'ayarlanmamis'));
    console.error('    Docker kullaniyorsaniz: npm run docker:up');
    process.exit(1);
  }
  console.log('[+] Veritabani baglandi');

  // 2. Migration'lari calistir
  await runMigrations();
  console.log('[+] Veritabani tablolari hazir');

  // 3. Web sunucuyu baslat
  const app = createServer();
  const server = app.listen(PORT, () => {
    console.log(`[+] Web panel: http://localhost:${PORT}`);
  });

  // 4. Kurulum kontrol
  const setupComplete = await config.isSetupComplete();

  if (!setupComplete) {
    console.log('');
    console.log('[!] Kurulum tamamlanmamis!');
    console.log(`    Tarayicinizda acin: http://localhost:${PORT}`);
    console.log('    Kurulum sihirbazi sizi yonlendirecek.');
    console.log('');
  } else {
    // 5. Bot'u baslat
    console.log('[*] Discord bot baslatiliyor...');
    const client = await startBot();

    if (client) {
      // Web route'larina bot client'i bagla
      attachBotClient(client);

      // 6. Eklentileri yukle ve baslat
      await loadPlugins(client);
      await startPlugins(client);
      console.log('[+] Eklentiler yuklendi');
    } else {
      console.log('[!] Bot baslatılamadı - token kontrol edin');
    }
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[*] Kapatiliyor...');
    const { stopBot } = require('./bot/client');
    await stopBot();
    server.close();
    const { close } = require('./db');
    await close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    const { stopBot } = require('./bot/client');
    await stopBot();
    server.close();
    const { close } = require('./db');
    await close();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('[!] Kritik hata:', err);
  process.exit(1);
});
