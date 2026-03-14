@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title FyDCBot

echo.
echo   ========================================
echo          FyDCBot v1.0.0
echo      AI-Powered Discord Bot
echo   ========================================
echo.

:: ============================================================
:: DOCKER KONTROL
:: ============================================================
where docker >nul 2>&1
if %errorlevel% equ 0 (
    echo [+] Docker bulundu.
    docker info >nul 2>&1
    if !errorlevel! equ 0 (
        goto :DOCKER_MENU
    ) else (
        echo [!] Docker kurulu ama calismyor. Docker Desktop acik mi?
        echo     Docker Desktop'i acip tekrar deneyin.
        echo.
        goto :NO_DOCKER
    )
) else (
    goto :NO_DOCKER
)

:DOCKER_MENU
echo [?] Nasil baslatmak istersiniz?
echo   1) Docker ile (onerilir)
echo   2) Dogrudan Node.js ile
set /p "dchoice=Seciminiz [1/2]: "

if "!dchoice!"=="1" (
    echo.
    echo [*] Docker ile baslatiliyor...
    docker compose up -d --build 2>nul || docker-compose up -d --build
    echo.
    echo [+] FyDCBot baslatildi!
    echo     Web Panel: http://localhost:3000
    echo     Loglar: docker compose logs -f
    echo.
    pause
    exit /b 0
)
goto :NODE_START

:: ============================================================
:: DOCKER KURULUM (Windows)
:: ============================================================
:NO_DOCKER
echo [!] Docker bulunamadi.
echo.
echo [?] Ne yapmak istersiniz?
echo   1) Docker Desktop kur ve Docker ile baslat (onerilir)
echo   2) Docker Desktop kur ama Node.js ile baslat
echo   3) Docker kurma, Node.js ile devam et
set /p "nchoice=Seciminiz [1/2/3]: "

if "!nchoice!"=="3" goto :NODE_START

echo.
echo [*] Docker Desktop kurulumu baslatiliyor...
echo.

:: winget ile Docker Desktop kur
where winget >nul 2>&1
if %errorlevel% equ 0 (
    echo [*] winget ile Docker Desktop kuruluyor...
    winget install -e --id Docker.DockerDesktop --accept-source-agreements --accept-package-agreements
    if !errorlevel! equ 0 (
        echo.
        echo [+] Docker Desktop kuruldu!
        echo [!] ONEMLI: Docker Desktop'i acmaniz gerekiyor.
        echo     Actiktan sonra bu scripti tekrar calistirin.
        echo.

        if "!nchoice!"=="1" (
            echo [*] Docker Desktop baslatiliyor...
            start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" 2>nul
            echo [!] Docker Desktop acildiktan sonra (yesl ikon) bu scripti tekrar calistirin.
            pause
            exit /b 0
        )
        goto :NODE_START
    )
)

:: winget yoksa chocolatey dene
where choco >nul 2>&1
if %errorlevel% equ 0 (
    echo [*] Chocolatey ile Docker Desktop kuruluyor...
    choco install docker-desktop -y
    if !errorlevel! equ 0 (
        echo [+] Docker Desktop kuruldu!
        echo [!] Docker Desktop'i acip tekrar calistirin.
        pause
        exit /b 0
    )
)

:: Hicbiri yoksa indirme linki ver
echo [!] Otomatik kurulum yapilamadi.
echo     Docker Desktop'i buradan indirin:
echo     https://desktop.docker.com/win/main/amd64/Docker%%20Desktop%%20Installer.exe
echo.
echo     Kurulumdan sonra bu scripti tekrar calistirin.
echo.

if "!nchoice!"=="1" (
    echo [*] Indirme sayfasi aciliyor...
    start https://www.docker.com/products/docker-desktop/
    pause
    exit /b 0
)

:: ============================================================
:: NODE.JS ILE CALISTIRMA
:: ============================================================
:NODE_START
echo.

:: Node.js kontrol
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Node.js bulunamadi.
    echo.
    echo [*] Node.js kurulumu baslatiliyor...

    where winget >nul 2>&1
    if !errorlevel! equ 0 (
        echo [*] winget ile Node.js kuruluyor...
        winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
        if !errorlevel! equ 0 (
            echo [+] Node.js kuruldu!
            echo [!] Terminali kapatip tekrar acin, sonra bu scripti tekrar calistirin.
            pause
            exit /b 0
        )
    )

    where choco >nul 2>&1
    if !errorlevel! equ 0 (
        echo [*] Chocolatey ile Node.js kuruluyor...
        choco install nodejs-lts -y
        if !errorlevel! equ 0 (
            echo [+] Node.js kuruldu! Terminali yeniden acip tekrar calistirin.
            pause
            exit /b 0
        )
    )

    echo [!] Otomatik kurulum yapilamadi.
    echo     Node.js'i buradan indirin: https://nodejs.org
    start https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do echo [+] Node.js: %%i

:: PostgreSQL - Docker ile baslat
echo.
echo [*] PostgreSQL kontrol ediliyor...

where docker >nul 2>&1
if %errorlevel% equ 0 (
    docker info >nul 2>&1
    if !errorlevel! equ 0 (
        echo [*] PostgreSQL Docker ile baslatiliyor...
        docker compose up -d db 2>nul || docker-compose up -d db 2>nul
        echo [+] PostgreSQL baslatildi
        timeout /t 5 /nobreak >nul
    ) else (
        echo [!] Docker calismyor. PostgreSQL icin Docker Desktop'i acin.
        echo     Veya PostgreSQL'i manuel kurun: https://postgresql.org
    )
) else (
    echo [!] Docker yok. PostgreSQL manuel kurulu olmali.
    echo     DATABASE_URL .env dosyasinda dogru ayarlanmis olmali.
)

:: .env kontrol
if not exist .env (
    echo.
    echo [*] .env dosyasi olusturuluyor...
    copy .env.example .env >nul
    echo [+] .env olusturuldu
)

:: Bagimliliklar
if not exist node_modules (
    echo.
    echo [*] npm bagimliliklari yukleniyor...
    call npm install
)

echo.
echo [*] FyDCBot baslatiliyor...
echo     Web Panel: http://localhost:3000
echo.

node src/index.js

if %errorlevel% neq 0 (
    echo.
    echo [!] FyDCBot durdu. Hata kodu: %errorlevel%
    pause
)
