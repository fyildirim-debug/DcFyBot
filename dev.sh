#!/bin/bash
# FyDCBot - Gelistirici Modu (Linux/macOS)
# Kullanim: chmod +x dev.sh && ./dev.sh

set -e

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${BLUE}${BOLD}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║         FyDCBot v1.0.0                ║"
echo "  ║   >>> GELISTIRICI MODU <<<            ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================
# SISTEM BILGISI
# ============================================================
echo -e "${CYAN}[DEBUG] ========== SISTEM BILGISI ==========${NC}"
echo -e "${GRAY}  Tarih       : $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${GRAY}  Isletim Sis : $(uname -s) $(uname -r) $(uname -m)${NC}"
echo -e "${GRAY}  Kullanici   : $(whoami)${NC}"
echo -e "${GRAY}  Calisma Diz : $(pwd)${NC}"
echo -e "${GRAY}  Shell       : $SHELL${NC}"

# Node.js
if command -v node &> /dev/null; then
    echo -e "${GREEN}  Node.js     : $(node -v)${NC}"
    echo -e "${GRAY}  npm         : $(npm -v)${NC}"
else
    echo -e "${RED}  Node.js     : BULUNAMADI${NC}"
fi

# Docker
if command -v docker &> /dev/null; then
    DOCKER_VER=$(docker --version 2>/dev/null | head -1)
    echo -e "${GREEN}  Docker      : $DOCKER_VER${NC}"
    if docker info &> /dev/null; then
        echo -e "${GREEN}  Docker Durum: Calisiyor${NC}"
    else
        echo -e "${RED}  Docker Durum: CALISMYOR${NC}"
    fi
else
    echo -e "${RED}  Docker      : BULUNAMADI${NC}"
fi

# Git
if command -v git &> /dev/null; then
    BRANCH=$(git branch --show-current 2>/dev/null || echo "?")
    COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "?")
    DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    echo -e "${GREEN}  Git         : $(git --version | cut -d' ' -f3)${NC}"
    echo -e "${GRAY}  Branch      : ${BOLD}$BRANCH${NC}${GRAY} @ $COMMIT${NC}"
    if [ "$DIRTY" != "0" ]; then
        echo -e "${YELLOW}  Degisiklik  : $DIRTY dosya degismis${NC}"
    else
        echo -e "${GREEN}  Degisiklik  : Temiz${NC}"
    fi
fi

echo ""

# ============================================================
# .ENV KONTROL
# ============================================================
echo -e "${CYAN}[DEBUG] ========== ENV KONTROL ==========${NC}"

if [ -f .env ]; then
    echo -e "${GREEN}  .env        : Mevcut${NC}"

    # DATABASE_URL kontrol
    DB_URL=$(grep -E "^DATABASE_URL=" .env 2>/dev/null | cut -d'=' -f2-)
    if [ -n "$DB_URL" ]; then
        # Sifre maskele
        MASKED=$(echo "$DB_URL" | sed 's/:\/\/\([^:]*\):\([^@]*\)@/:\/\/\1:***@/')
        echo -e "${GRAY}  DATABASE_URL: $MASKED${NC}"
    else
        echo -e "${RED}  DATABASE_URL: AYARLANMAMIS${NC}"
    fi

    # PORT
    PORT_VAL=$(grep -E "^PORT=" .env 2>/dev/null | cut -d'=' -f2-)
    echo -e "${GRAY}  PORT        : ${PORT_VAL:-3000}${NC}"

    # JWT_SECRET
    JWT=$(grep -E "^JWT_SECRET=" .env 2>/dev/null | cut -d'=' -f2-)
    if [ -n "$JWT" ]; then
        echo -e "${GRAY}  JWT_SECRET  : ${JWT:0:10}...${NC}"
    else
        echo -e "${RED}  JWT_SECRET  : AYARLANMAMIS${NC}"
    fi
else
    echo -e "${RED}  .env        : YOK - olusturuluyor...${NC}"
    cp .env.example .env
    echo -e "${GREEN}  .env        : .env.example'dan kopyalandi${NC}"
fi

echo ""

# ============================================================
# DOCKER KONTEYNER DURUMU
# ============================================================
echo -e "${CYAN}[DEBUG] ========== DOCKER KONTEYNERLER ==========${NC}"

if command -v docker &> /dev/null && docker info &> /dev/null; then
    # FyDCBot container'lari
    CONTAINERS=$(docker ps -a --filter "name=fydcbot" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null)
    if [ -n "$CONTAINERS" ]; then
        echo -e "${GRAY}$CONTAINERS${NC}"
    else
        echo -e "${YELLOW}  FyDCBot container bulunamadi${NC}"
    fi

    # Port kullanimi
    echo ""
    echo -e "${CYAN}[DEBUG] ========== PORT KULLANIMI ==========${NC}"
    PG_PORT=$(grep -E "^DB_PORT=" .env 2>/dev/null | cut -d'=' -f2- || echo "5433")
    PG_PORT=${PG_PORT:-5433}
    WEB_PORT=$(grep -E "^PORT=" .env 2>/dev/null | cut -d'=' -f2- || echo "3000")
    WEB_PORT=${WEB_PORT:-3000}

    # Port kontrol
    if lsof -i :$PG_PORT &> /dev/null || ss -tlnp 2>/dev/null | grep -q ":$PG_PORT "; then
        echo -e "${GREEN}  :$PG_PORT (PostgreSQL) : KULLANIMDA${NC}"
    else
        echo -e "${RED}  :$PG_PORT (PostgreSQL) : BOS${NC}"
    fi

    if lsof -i :$WEB_PORT &> /dev/null || ss -tlnp 2>/dev/null | grep -q ":$WEB_PORT "; then
        echo -e "${YELLOW}  :$WEB_PORT (Web Panel)  : KULLANIMDA (baska uygulama?)${NC}"
    else
        echo -e "${GREEN}  :$WEB_PORT (Web Panel)  : BOS - kullanilabilir${NC}"
    fi
else
    echo -e "${YELLOW}  Docker calismyor, konteyner bilgisi alinamadi${NC}"
fi

echo ""

# ============================================================
# POSTGRESQL BAGLANTI TESTI
# ============================================================
echo -e "${CYAN}[DEBUG] ========== VERITABANI TESTI ==========${NC}"

# PostgreSQL container baslatma
if command -v docker &> /dev/null && docker info &> /dev/null; then
    DB_RUNNING=$(docker ps --filter "name=fydcbot-db" --format "{{.Names}}" 2>/dev/null)
    if [ -z "$DB_RUNNING" ]; then
        echo -e "${YELLOW}  PostgreSQL container calismyor, baslatiliyor...${NC}"
        docker compose up -d db 2>/dev/null || docker-compose up -d db 2>/dev/null
        echo -e "${GRAY}  Container baslatildi, bekleniyor (5sn)...${NC}"
        sleep 5
    else
        echo -e "${GREEN}  PostgreSQL container: $DB_RUNNING${NC}"
    fi
fi

# Node ile DB testi
if command -v node &> /dev/null && [ -d node_modules ]; then
    DB_TEST=$(node -e "
        require('dotenv').config();
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
        pool.query('SELECT version() as v, current_database() as db, pg_size_pretty(pg_database_size(current_database())) as size')
            .then(r => {
                const row = r.rows[0];
                console.log('OK|' + row.db + '|' + row.size + '|' + row.v.split(' ').slice(0,2).join(' '));
                pool.end();
            })
            .catch(e => { console.log('FAIL|' + e.message); pool.end(); });
    " 2>&1)

    if [[ "$DB_TEST" == OK* ]]; then
        IFS='|' read -r STATUS DB_NAME DB_SIZE PG_VER <<< "$DB_TEST"
        echo -e "${GREEN}  Baglanti    : BASARILI${NC}"
        echo -e "${GRAY}  Veritabani  : $DB_NAME ($DB_SIZE)${NC}"
        echo -e "${GRAY}  PostgreSQL  : $PG_VER${NC}"

        # Tablo kontrol
        TABLE_COUNT=$(node -e "
            require('dotenv').config();
            const { Pool } = require('pg');
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            pool.query(\"SELECT count(*) as c FROM information_schema.tables WHERE table_schema = 'public'\")
                .then(r => { console.log(r.rows[0].c); pool.end(); })
                .catch(() => { console.log('0'); pool.end(); });
        " 2>&1)
        echo -e "${GRAY}  Tablo sayisi: $TABLE_COUNT${NC}"

        # Migration kontrol
        MIG_VER=$(node -e "
            require('dotenv').config();
            const { Pool } = require('pg');
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            pool.query('SELECT COALESCE(MAX(version),0) as v FROM _migrations')
                .then(r => { console.log(r.rows[0].v); pool.end(); })
                .catch(() => { console.log('0'); pool.end(); });
        " 2>&1)
        echo -e "${GRAY}  Migration   : v$MIG_VER${NC}"

        # Setup durumu
        SETUP=$(node -e "
            require('dotenv').config();
            const { Pool } = require('pg');
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            pool.query(\"SELECT value FROM system_settings WHERE key = 'setup_complete'\")
                .then(r => { console.log(r.rows[0]?.value || 'false'); pool.end(); })
                .catch(() => { console.log('false'); pool.end(); });
        " 2>&1)
        if [ "$SETUP" = "true" ]; then
            echo -e "${GREEN}  Kurulum     : TAMAMLANMIS${NC}"
        else
            echo -e "${YELLOW}  Kurulum     : TAMAMLANMAMIS (setup wizard bekliyor)${NC}"
        fi
    else
        ERR=$(echo "$DB_TEST" | cut -d'|' -f2-)
        echo -e "${RED}  Baglanti    : BASARISIZ${NC}"
        echo -e "${RED}  Hata        : $ERR${NC}"
    fi
else
    echo -e "${YELLOW}  node_modules yok, DB testi atlanıyor${NC}"
fi

echo ""

# ============================================================
# BAGIMLILIK KONTROL
# ============================================================
echo -e "${CYAN}[DEBUG] ========== BAGIMLILIKLAR ==========${NC}"

if [ -d node_modules ]; then
    PKG_COUNT=$(ls node_modules 2>/dev/null | wc -l | tr -d ' ')
    echo -e "${GREEN}  node_modules: $PKG_COUNT paket${NC}"

    # Kritik paketler
    for pkg in discord.js express pg @anthropic-ai/sdk openai jsonwebtoken bcryptjs; do
        if [ -d "node_modules/$pkg" ]; then
            VER=$(node -e "try{console.log(require('$pkg/package.json').version)}catch{console.log('?')}" 2>/dev/null)
            echo -e "${GRAY}    $pkg: v$VER${NC}"
        else
            echo -e "${RED}    $pkg: EKSIK${NC}"
        fi
    done
else
    echo -e "${RED}  node_modules: YOK${NC}"
    echo -e "${YELLOW}  npm install calistiriliyor...${NC}"
    npm install
fi

echo ""

# ============================================================
# DOSYA YAPISI KONTROL
# ============================================================
echo -e "${CYAN}[DEBUG] ========== DOSYA YAPISI ==========${NC}"

CRITICAL_FILES=(
    "src/index.js"
    "src/db/index.js"
    "src/db/migrations.js"
    "src/web/server.js"
    "src/bot/client.js"
    "src/ai/provider.js"
    "src/plugins/loader.js"
    "src/langs/tr.json"
    "public/index.html"
    "public/js/app.js"
    "docker-compose.yml"
    "Dockerfile"
)

MISSING=0
for f in "${CRITICAL_FILES[@]}"; do
    if [ -f "$f" ]; then
        SIZE=$(wc -c < "$f" | tr -d ' ')
        echo -e "${GRAY}  [OK] $f (${SIZE}b)${NC}"
    else
        echo -e "${RED}  [!!] $f EKSIK${NC}"
        MISSING=$((MISSING + 1))
    fi
done

if [ $MISSING -gt 0 ]; then
    echo -e "${RED}  $MISSING kritik dosya eksik!${NC}"
else
    echo -e "${GREEN}  Tum kritik dosyalar mevcut${NC}"
fi

# Toplam dosya/satir
TOTAL_FILES=$(find src public -name "*.js" -o -name "*.json" -o -name "*.html" -o -name "*.css" 2>/dev/null | wc -l | tr -d ' ')
TOTAL_LINES=$(find src public -name "*.js" -o -name "*.json" -o -name "*.html" -o -name "*.css" 2>/dev/null -exec cat {} + 2>/dev/null | wc -l | tr -d ' ')
echo -e "${GRAY}  Toplam      : $TOTAL_FILES dosya, $TOTAL_LINES satir${NC}"

echo ""

# ============================================================
# LOG DOSYASI
# ============================================================
echo -e "${CYAN}[DEBUG] ========== LOG DOSYASI ==========${NC}"

LOG_DIR="$(pwd)/logs"
TODAY=$(date '+%Y-%m-%d')
LOG_FILE="$LOG_DIR/$TODAY.log"

if [ -d "$LOG_DIR" ]; then
    LOG_COUNT=$(ls "$LOG_DIR"/*.log 2>/dev/null | wc -l | tr -d ' ')
    TOTAL_SIZE=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
    echo -e "${GRAY}  Log dizini  : $LOG_DIR${NC}"
    echo -e "${GRAY}  Dosya sayisi: $LOG_COUNT${NC}"
    echo -e "${GRAY}  Toplam boyut: $TOTAL_SIZE${NC}"

    if [ -f "$LOG_FILE" ]; then
        FSIZE=$(wc -c < "$LOG_FILE" | tr -d ' ')
        FLINES=$(wc -l < "$LOG_FILE" | tr -d ' ')
        echo -e "${GREEN}  Bugunun logu: $TODAY.log (${FSIZE}b, ${FLINES} satir)${NC}"
    fi
else
    echo -e "${GRAY}  Log dizini henuz olusturulmadi (ilk calistirmada olusur)${NC}"
fi

echo ""

# ============================================================
# BASLAT
# ============================================================
echo -e "${CYAN}[DEBUG] ========== BASLATILIYOR ==========${NC}"
echo -e "${YELLOW}  Node.js --watch modu (dosya degisikliklerinde otomatik yeniden baslatir)${NC}"
echo -e "${GRAY}  Durdurmak icin: Ctrl+C${NC}"
echo ""
echo -e "${GREEN}  Web Panel     : http://localhost:${PORT_VAL:-3000}${NC}"
echo -e "${GREEN}  Log dosyasi   : logs/$TODAY.log${NC}"
echo -e "${GREEN}  Canli log     : tail -f logs/$TODAY.log${NC}"
echo -e "${GREEN}  Log API       : http://localhost:${PORT_VAL:-3000}/api/stats/file-logs${NC}"
echo -e "${GREEN}  Log Stream    : http://localhost:${PORT_VAL:-3000}/api/stats/file-logs/stream${NC}"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

# DEBUG modunda calistir
export NODE_ENV=development
export DEBUG=fydcbot:*

# Ayri terminal'de tail calistir (opsiyonel)
if [ "$1" = "--tail" ]; then
    echo -e "${YELLOW}[*] Log tail ayri pencerede aciliyor...${NC}"
    mkdir -p logs
    touch "logs/$TODAY.log"

    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "tail -f logs/$TODAY.log; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "tail -f logs/$TODAY.log" &
    elif [ "$(uname)" = "Darwin" ]; then
        osascript -e "tell application \"Terminal\" to do script \"cd $(pwd) && tail -f logs/$TODAY.log\""
    fi
fi

# Node.js logger zaten logs/YYYY-MM-DD.log dosyasina yaziyor
# tee KULLANMA - ayni dosyaya iki islem yazamaz (EBUSY hatasi)
node --watch src/index.js
