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

# ============================================================
# DOCKER KURULUM
# ============================================================
install_docker() {
    echo "[*] Docker kurulumu baslatiliyor..."

    if [ "$(uname)" = "Darwin" ]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "[*] Homebrew ile Docker kuruluyor..."
            brew install --cask docker
            echo "[+] Docker Desktop kuruldu. Lutfen Docker Desktop uygulamasini acin."
            echo "    Actiktan sonra bu scripti tekrar calistirin."
            exit 0
        else
            echo "[!] Docker kurulumu icin Homebrew gerekli."
            echo "    Homebrew kur: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            echo "    Veya Docker Desktop indirin: https://docker.com/products/docker-desktop"
            exit 1
        fi
    fi

    # Linux
    if [ -f /etc/os-release ]; then
        . /etc/os-release

        case "$ID" in
            ubuntu|debian|linuxmint|pop)
                echo "[*] apt ile Docker kuruluyor..."
                sudo apt-get update -qq
                sudo apt-get install -y -qq ca-certificates curl gnupg lsb-release
                sudo install -m 0755 -d /etc/apt/keyrings
                curl -fsSL https://download.docker.com/linux/$ID/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
                sudo chmod a+r /etc/apt/keyrings/docker.gpg
                echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$ID $(lsb_release -cs 2>/dev/null || echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
                sudo apt-get update -qq
                sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
                ;;
            fedora|rhel|centos|rocky|alma)
                echo "[*] dnf/yum ile Docker kuruluyor..."
                sudo dnf -y install dnf-plugins-core 2>/dev/null || sudo yum -y install yum-utils
                sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo 2>/dev/null || \
                    sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
                sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null || \
                    sudo yum -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
                ;;
            arch|manjaro)
                echo "[*] pacman ile Docker kuruluyor..."
                sudo pacman -S --noconfirm docker docker-compose
                ;;
            opensuse*|sles)
                echo "[*] zypper ile Docker kuruluyor..."
                sudo zypper install -y docker docker-compose
                ;;
            *)
                echo "[!] Desteklenmeyen Linux dagilimi: $ID"
                echo "    Manuel kurulum: https://docs.docker.com/engine/install/"
                exit 1
                ;;
        esac

        # Docker servisini baslat
        sudo systemctl start docker 2>/dev/null || sudo service docker start 2>/dev/null
        sudo systemctl enable docker 2>/dev/null || true

        # Kullaniciyi docker grubuna ekle
        sudo usermod -aG docker $USER 2>/dev/null || true
        echo "[+] Docker kuruldu!"
        echo "[!] 'docker' grubuna eklenmek icin oturumu kapatip acmaniz gerekebilir."
        echo "    Veya: newgrp docker"
    else
        echo "[!] Isletim sistemi taninamadi."
        echo "    Manuel kurulum: https://docs.docker.com/engine/install/"
        exit 1
    fi
}

# docker-compose komutu (v1 veya v2)
docker_compose_cmd() {
    if docker compose version &> /dev/null; then
        docker compose "$@"
    elif command -v docker-compose &> /dev/null; then
        docker-compose "$@"
    else
        echo "[!] docker-compose bulunamadi"
        return 1
    fi
}

# ============================================================
# NODE.JS KURULUM
# ============================================================
install_node() {
    echo "[*] Node.js kurulumu baslatiliyor..."

    if [ "$(uname)" = "Darwin" ]; then
        if command -v brew &> /dev/null; then
            brew install node
        else
            echo "[!] Homebrew ile kurun: brew install node"
            echo "    Veya: https://nodejs.org"
            exit 1
        fi
    else
        # Linux - nvm ile kur
        echo "[*] nvm ile Node.js kuruluyor..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
        nvm install --lts
        nvm use --lts
    fi

    echo "[+] Node.js kuruldu: $(node -v)"
}

# ============================================================
# ANA AKIS
# ============================================================

# Docker kontrol
DOCKER_OK=false
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        DOCKER_OK=true
    else
        echo "[!] Docker kurulu ama calismyor. Docker Desktop acik mi?"
    fi
fi

if [ "$DOCKER_OK" = true ]; then
    echo "[+] Docker bulundu: $(docker --version | head -1)"
    echo ""
    echo "[?] Nasil baslatmak istersiniz?"
    echo "  1) Docker ile (onerilir)"
    echo "  2) Dogrudan Node.js ile"
    read -p "Seciminiz [1/2]: " choice

    if [ "$choice" = "1" ]; then
        echo ""
        echo "[*] Docker ile baslatiliyor..."
        docker_compose_cmd up -d --build
        echo ""
        echo "[+] FyDCBot baslatildi!"
        echo "    Web Panel: http://localhost:3000"
        echo "    Loglar:    docker compose logs -f"
        exit 0
    fi
else
    echo "[!] Docker bulunamadi."
    echo ""
    echo "[?] Ne yapmak istersiniz?"
    echo "  1) Docker kur ve Docker ile baslat (onerilir)"
    echo "  2) Docker kur ama Node.js ile baslat"
    echo "  3) Docker kurma, Node.js ile devam et"
    read -p "Seciminiz [1/2/3]: " choice

    case "$choice" in
        1)
            install_docker
            echo ""
            echo "[*] Docker ile baslatiliyor..."
            docker_compose_cmd up -d --build
            echo ""
            echo "[+] FyDCBot baslatildi!"
            echo "    Web Panel: http://localhost:3000"
            exit 0
            ;;
        2)
            install_docker
            echo "[+] Docker kuruldu. Node.js ile devam ediliyor..."
            ;;
        3)
            echo "[*] Docker olmadan devam ediliyor..."
            ;;
    esac
fi

# ============================================================
# NODE.JS ILE CALISTIRMA
# ============================================================

# Node.js kontrol
if ! command -v node &> /dev/null; then
    echo ""
    echo "[!] Node.js bulunamadi."
    read -p "[?] Node.js kurulsun mu? [E/h]: " nodechoice
    if [ "$nodechoice" != "h" ] && [ "$nodechoice" != "H" ]; then
        install_node
    else
        echo "[!] Node.js olmadan devam edilemez."
        exit 1
    fi
fi

echo "[+] Node.js: $(node -v)"

# PostgreSQL - Docker ile baslat
echo ""
echo "[*] PostgreSQL kontrol ediliyor..."

# psql ile baglanti test et
PG_OK=false
if command -v psql &> /dev/null; then
    if psql "$DATABASE_URL" -c "SELECT 1" &> /dev/null 2>&1; then
        PG_OK=true
        echo "[+] PostgreSQL baglantisi basarili"
    fi
fi

if [ "$PG_OK" = false ]; then
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        echo "[*] PostgreSQL Docker ile baslatiliyor..."
        docker_compose_cmd up -d db
        echo "[+] PostgreSQL baslatildi, bekleniyor..."
        sleep 5
    else
        echo "[!] PostgreSQL bulunamadi ve Docker da yok."
        echo "    PostgreSQL kurun: https://postgresql.org"
        echo "    Veya Docker kurup tekrar deneyin."
        exit 1
    fi
fi

# .env kontrol
if [ ! -f .env ]; then
    echo "[*] .env dosyasi olusturuluyor..."
    cp .env.example .env
    echo "[+] .env olusturuldu"
fi

# Bagimliliklari yukle
if [ ! -d node_modules ]; then
    echo "[*] npm bagimliklar yukleniyor..."
    npm install
fi

echo ""
echo "[*] FyDCBot baslatiliyor..."
echo "    Web Panel: http://localhost:${PORT:-3000}"
echo ""

node src/index.js
