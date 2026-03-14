@echo off
chcp 65001 >nul 2>&1
title FyDCBot

echo.
echo   ╔═══════════════════════════════╗
echo   ║         FyDCBot v1.0.0         ║
echo   ║   AI-Powered Discord Bot       ║
echo   ╚═══════════════════════════════╝
echo.

:: Node.js kontrol
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Node.js bulunamadi. Lutfen kurun: https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do echo [*] Node.js versiyonu: %%i

:: Docker kontrol
where docker >nul 2>&1
if %errorlevel% equ 0 (
    echo [?] Nasil baslatmak istersiniz?
    echo   1^) Docker ile ^(onerilir^)
    echo   2^) Dogrudan Node.js ile
    set /p choice="Seciminiz [1/2]: "

    if "!choice!"=="1" (
        echo [*] Docker ile baslatiliyor...
        docker-compose up -d
        echo [+] FyDCBot baslatildi!
        echo     Web Panel: http://localhost:3000
        echo     Loglar: docker-compose logs -f
        pause
        exit /b 0
    )
)

:: .env kontrol
if not exist .env (
    echo [*] .env dosyasi olusturuluyor...
    copy .env.example .env >nul
    echo [!] .env dosyasini duzenleyin: DATABASE_URL, JWT_SECRET
)

:: Bagimliliklar
if not exist node_modules (
    echo [*] Bagimliliklar yukleniyor...
    call npm install
)

:: PostgreSQL kontrol - Docker ile DB baslatma
echo.
echo [*] PostgreSQL baglantisi kontrol ediliyor...
where docker >nul 2>&1
if %errorlevel% equ 0 (
    docker-compose up -d db 2>nul
    echo [+] PostgreSQL Docker ile baslatildi
    timeout /t 3 /nobreak >nul
)

echo [*] FyDCBot baslatiliyor...
echo     Web Panel: http://localhost:3000
echo.

node src/index.js

if %errorlevel% neq 0 (
    echo.
    echo [!] FyDCBot durdu. Hata kodu: %errorlevel%
    pause
)
