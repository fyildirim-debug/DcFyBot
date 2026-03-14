# DcFyBot
**Tarih:** 2026-03-15

## Ozet
AI destekli Discord botu. Web panelden yonetilebilir, AI ile komple sunucu kurulumu, mesaj yonetimi, drag-drop kanal siralama, detayli izin sistemi, plugin web-extension, Docker uyumlu.

## Yapi
- Kok: package.json, Dockerfile, docker-compose.yml, start.bat/sh, dev.bat/sh
- src/: bot/, web/, db/, ai/, plugins/, langs/, utils/
- public/: SPA frontend (OLED dark theme, Fira Code/Sans)
- data/: yedekler

## Teknoloji
- Discord.js v14, Express.js, PostgreSQL (pg)
- Anthropic SDK + OpenAI SDK (ayarlanabilir, 128K token)
- JWT auth, bcrypt, Docker
- Vanilla JS SPA, OLED dark theme, drag-drop

## Ozellikler
- AI ile komple sunucu kurulumu (roller+kanallar+izinler tek seferde)
- AI ile kanal/rol olusturma (dogal dil ile, izinler dahil)
- Mesaj yonetimi (chat gorunumu, toplu secim/silme, pin, mention resolve)
- Drag-drop kanal siralama, detayli rol izin yonetimi (40+ izin)
- Plugin web-extension (sidebar nav, sayfa, route kaydedebilir)
- Setup wizard, bot rehber paneli, i18n (TR/EN)
- Kanal/uye/yetki CRUD + yedekleme/geri yukleme

## Istatistik
Dosya: ~60, Teknoloji: Node.js monolith
