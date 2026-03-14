#!/bin/bash
# FyDCBot - Linux/macOS Baslat
# Kullanim: chmod +x start.sh && ./start.sh

set -e

echo ""
echo "  ╔═══════════════════════════════╗"
echo "  ║         FyDCBot v1.0.0         ║"
echo "  ║   AI-Powered Discord Bot       ║"
echo "  ╚═══════════════════════════════╝"
echo ""

# Docker var mi kontrol
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "[?] Nasil baslatmak istersiniz?"
    echo "  1) Docker ile (onerilir)"
    echo "  2) Dogrudan Node.js ile"
    read -p "Seciminiz [1/2]: " choice

    if [ "$choice" = "1" ]; then
        echo "[*] Docker ile baslatiliyor..."
        docker-compose up -d
        echo "[+] FyDCBot baslatildi!"
        echo "    Web Panel: http://localhost:3000"
        echo "    Loglar: docker-compose logs -f"
        exit 0
    fi
fi

# Node.js kontrol
if ! command -v node &> /dev/null; then
    echo "[!] Node.js bulunamadi. Lutfen kurun: https://nodejs.org"
    exit 1
fi

echo "[*] Node.js versiyonu: $(node -v)"

# PostgreSQL kontrol
if ! command -v psql &> /dev/null; then
    echo "[!] PostgreSQL bulunamadi."
    echo "    Docker kullanmak icin: docker-compose up -d db"
    echo "    Veya PostgreSQL kurun: https://postgresql.org"

    # Docker ile sadece DB baslatmayi dene
    if command -v docker &> /dev/null; then
        read -p "[?] Docker ile PostgreSQL baslatilsin mi? [E/h]: " dbchoice
        if [ "$dbchoice" != "h" ] && [ "$dbchoice" != "H" ]; then
            docker-compose up -d db
            echo "[+] PostgreSQL Docker ile baslatildi"
            sleep 3
        fi
    fi
fi

# .env kontrol
if [ ! -f .env ]; then
    echo "[*] .env dosyasi olusturuluyor..."
    cp .env.example .env
    echo "[!] .env dosyasini duzenleyin: DATABASE_URL, JWT_SECRET"
fi

# Bagimliliklari yukle
if [ ! -d node_modules ]; then
    echo "[*] Bagimliliklar yukleniyor..."
    npm install
fi

echo "[*] FyDCBot baslatiliyor..."
echo "    Web Panel: http://localhost:${PORT:-3000}"
echo ""

node src/index.js
