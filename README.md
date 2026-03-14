# DcFyBot

**AI-Powered Discord Bot with Web Management Panel**

A full-featured Discord bot with a modern web dashboard, AI integration (Claude/OpenAI), plugin system, and Docker support. Manage your Discord server entirely from a beautiful dark-themed web panel.

---

## Features

### AI Integration
- **AI Server Builder** — Describe your server in natural language, AI creates roles, channels, categories, and permissions in one go
- **AI Channel/Role Creator** — Create individual channels or roles with AI, including permission configuration
- **Multi-Provider Support** — Works with Anthropic (Claude), OpenAI, or any compatible API
- **Configurable** — Base URL, API key, model, max tokens, temperature all adjustable from web panel

### Web Management Panel
- **OLED Dark Theme** — Professional dark UI with Fira Code/Sans fonts and glow effects
- **Setup Wizard** — First-time setup via web (language, admin account, Discord token, AI config)
- **Dashboard** — Server stats, bot status, recent activity, quick actions
- **Channel Management** — Create, edit, delete channels with drag-and-drop reordering
- **Message Management** — Discord-like chat view, bulk select/delete, pin/unpin, mention resolution
- **Member Management** — View, edit roles, kick, ban, advanced mute system
- **Role Management** — Create, edit with 40+ permission toggles organized by category
- **Word Filter** — 6 actions (delete/censor/warn/timeout/kick/ban), 6 match types, custom warnings
- **Server Settings** — Edit server name, description, verification, invites, bot nickname
- **Backup & Restore** — Channel and role backups with one-click restore
- **Plugin System** — Web-extensible plugins with sidebar navigation, pages, and API routes
- **Version Manager** — Auto-check updates from GitHub, version history viewer
- **Logs** — Real-time log viewer with level/source filtering
- **i18n** — Turkish and English language support

### Discord Bot
- **Slash Commands** — Chat (AI), ping, help, status
- **Auto-Moderation** — Word filter with auto-delete, censor, timeout, kick, ban
- **Mute System** — Timed mute with auto-delete messages + DM warnings with remaining time
- **Welcome Messages** — Configurable welcome messages with placeholders
- **Activity Status** — Customizable bot presence (watching, playing, listening, competing)

### Plugins (Extensible)
- **GitHub** — Commit, PR, and issue tracking with Discord embeds
- **RSS** — RSS feed monitoring and notifications
- **Captcha** — Member verification with captcha
- Plugins can register their own sidebar items, web pages, and API routes

### Infrastructure
- **Docker Ready** — Single `docker-compose up` to run everything
- **PostgreSQL** — Reliable database with auto-migrations
- **Windows Debug** — `dev.bat` for easy development on Windows
- **File Logging** — Auto-rotating log files with memory usage tracking

---

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/fyildirim-debug/DcFyBot.git
cd DcFyBot
docker-compose up -d
```

Open `http://localhost:3000` and follow the setup wizard.

### Manual

**Prerequisites:** Node.js 18+, PostgreSQL 14+

```bash
git clone https://github.com/fyildirim-debug/DcFyBot.git
cd DcFyBot
cp .env.example .env
# Edit .env with your database URL
npm install
npm start
```

### Windows Development

```bash
dev.bat
```

This automatically installs dependencies, starts PostgreSQL via Docker, and launches the app with live reload.

---

## Configuration

All configuration is done through the web panel after first launch. The setup wizard will guide you through:

1. **Language** — Choose Turkish or English
2. **Admin Account** — Create your panel login credentials
3. **Discord Bot** — Enter your bot token and client ID
4. **AI Settings** — (Optional) Configure AI provider, API key, and model

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://fydcbot:fydcbot123@localhost:5433/fydcbot` |
| `PORT` | Web panel port | `3000` |
| `JWT_SECRET` | JWT signing secret | `fydcbot-dev-secret-key` |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Bot | Discord.js v14 |
| Web Server | Express.js |
| Database | PostgreSQL (pg) |
| AI | Anthropic SDK, OpenAI SDK |
| Auth | JWT + bcrypt |
| Frontend | Vanilla JS SPA |
| Styling | Custom CSS (OLED Dark Theme) |
| Fonts | Fira Code, Fira Sans |
| Container | Docker + Docker Compose |

---

## Project Structure

```
DcFyBot/
├── src/
│   ├── index.js          # Entry point
│   ├── config.js          # Configuration manager
│   ├── bot/               # Discord bot
│   │   ├── client.js      # Bot client setup
│   │   ├── commands/      # Slash commands
│   │   └── events/        # Event handlers
│   ├── web/               # Web panel
│   │   ├── server.js      # Express server
│   │   ├── routes/        # API endpoints
│   │   └── middleware/     # Auth middleware
│   ├── db/                # Database
│   │   ├── index.js       # Connection pool
│   │   └── migrations.js  # Auto-migrations
│   ├── ai/                # AI provider
│   │   └── provider.js    # Claude/OpenAI adapter
│   ├── plugins/           # Plugin system
│   │   ├── loader.js      # Plugin loader
│   │   ├── github/        # GitHub plugin
│   │   ├── rss/           # RSS plugin
│   │   └── captcha/       # Captcha plugin
│   ├── langs/             # i18n translations
│   └── utils/             # Logger, helpers
├── public/                # Frontend SPA
│   ├── css/app.css        # OLED dark theme
│   ├── js/
│   │   ├── app.js         # Main app + router
│   │   ├── api.js         # API client
│   │   ├── router.js      # SPA router + sidebar
│   │   └── pages/         # Page renderers
│   └── index.html
├── .fy/                   # Project metadata
│   ├── version.json       # Version history
│   └── proje-beyni.md     # Project brain
├── docker-compose.yml
├── Dockerfile
├── start.bat / start.sh   # Auto-install launchers
└── dev.bat / dev.sh       # Development mode
```

---

## API Endpoints

All API endpoints require JWT authentication (except setup and login).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/guilds` | List bot's servers |
| `GET` | `/api/guilds/:id/details` | Server details + invites |
| `PUT` | `/api/guilds/:id/settings` | Update server settings |
| `POST` | `/api/guilds/:id/ai-setup` | AI full server setup |
| `GET` | `/api/channels/:guildId` | List channels |
| `POST` | `/api/channels/:guildId` | Create channel |
| `PUT` | `/api/channels/:guildId/reorder` | Reorder channels |
| `POST` | `/api/channels/:guildId/ai-create` | AI create channels |
| `GET` | `/api/members/:guildId` | List members |
| `POST` | `/api/members/:guildId/:id/mute` | Mute member |
| `POST` | `/api/members/:guildId/:id/unmute` | Unmute member |
| `GET` | `/api/roles/:guildId` | List roles |
| `POST` | `/api/roles/:guildId/ai-create` | AI create roles |
| `GET` | `/api/messages/:guildId/:channelId` | Get messages |
| `POST` | `/api/messages/:guildId/:channelId/send` | Send message as bot |
| `GET` | `/api/wordfilter/:guildId` | List word filters |
| `GET` | `/api/settings/ai` | AI configuration |
| `GET` | `/api/settings/bot` | Bot configuration |
| `GET` | `/api/backup/:guildId/channels` | Channel backups |
| `GET` | `/api/version` | Current version |

---

## Screenshots

> Web panel with OLED dark theme, channel management, and AI server builder.

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is open source. See the repository for license details.

---

## Author

**Furkan YILDIRIM** — [GitHub](https://github.com/fyildirim-debug)

Built with Claude Code (Anthropic)
