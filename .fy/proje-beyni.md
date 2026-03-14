# FyDCBot
**Tarih:** 2026-03-14

## Ozet
AI destekli Discord botu. Web panelden yonetilebilir, kurulum sihirbazi, kanal/uye/yetki yonetimi, yedekleme, plugin sistemi. Docker uyumlu, PostgreSQL, tek komutla calisir.

## Yapi
- Kok: package.json, Dockerfile, docker-compose.yml
- src/: bot/, web/, db/, ai/, plugins/, langs/, utils/
- public/: SPA frontend (HTML/CSS/JS)
- data/: yedekler

## Teknoloji
- Discord.js v14, Express.js, PostgreSQL (pg)
- Anthropic SDK + OpenAI SDK (ayarlanabilir)
- JWT auth, bcrypt, Docker
- Vanilla JS SPA frontend

## Ozellikler
- Setup wizard (ilk kurulum web'den)
- AI (Claude/OpenAI uyumlu, base_url/model/key ayarlanabilir)
- Kanal/uye/yetki yonetimi + yedekleme/geri yukleme
- Plugin sistemi (GitHub, RSS, Captcha)
- i18n (TR/EN)

## Istatistik
Dosya: ~50, Teknoloji: Node.js monolith
