@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title FyDCBot - GELISTIRICI MODU

echo.
echo   ========================================
echo          FyDCBot v1.0.0
echo      ^^^>^^^>^^^> GELISTIRICI MODU ^^^<^^^<^^^<
echo   ========================================
echo.

:: ============================================================
:: SISTEM BILGISI
:: ============================================================
echo [DEBUG] ========== SISTEM BILGISI ==========
echo   Tarih       : %DATE% %TIME%
echo   Bilgisayar  : %COMPUTERNAME%
echo   Kullanici   : %USERNAME%
echo   Calisma Diz : %CD%

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   Node.js     : BULUNAMADI [!!]
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo   Node.js     : %%i [OK]
for /f "tokens=*" %%i in ('npm -v') do echo   npm         : v%%i

where docker >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('docker --version') do echo   Docker      : %%i
) else (
    echo   Docker      : BULUNAMADI [!!]
)

where git >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('git branch --show-current 2^>nul') do set "BRANCH=%%i"
    for /f "tokens=*" %%i in ('git rev-parse --short HEAD 2^>nul') do set "COMMIT=%%i"
    echo   Git         : !BRANCH! @ !COMMIT!
)

echo.

:: ============================================================
:: .ENV KONTROL
:: ============================================================
echo [DEBUG] ========== ENV KONTROL ==========

if not exist .env (
    echo   .env YOK - olusturuluyor...
    copy .env.example .env >nul 2>&1
)
echo   .env        : Mevcut [OK]

set "WEBPORT=3000"
for /f "tokens=1,* delims==" %%a in ('findstr /b "PORT=" .env 2^>nul') do set "WEBPORT=%%b"
echo   PORT        : !WEBPORT!

echo.

:: ============================================================
:: DOCKER KONTEYNERLER
:: ============================================================
echo [DEBUG] ========== DOCKER KONTEYNERLER ==========

where docker >nul 2>&1
if %errorlevel% neq 0 goto :SKIP_DOCKER

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo   Docker calismyor [!!]
    goto :SKIP_DOCKER
)

echo   Docker calisiyor [OK]
docker ps -a --filter "name=fydcbot" --format "  {{.Names}}  {{.Status}}  {{.Ports}}" 2>nul

:: DB container kontrol
docker ps --filter "name=fydcbot-db" --format "{{.Names}}" 2>nul | findstr /c:"fydcbot-db" >nul 2>&1
if %errorlevel% neq 0 (
    echo   PostgreSQL container calismyor, baslatiliyor...
    docker compose up -d db 2>nul
    echo   Bekleniyor...
    timeout /t 5 /nobreak >nul
)

:SKIP_DOCKER
echo.

:: ============================================================
:: BAGIMLILIKLAR
:: ============================================================
if not exist node_modules (
    echo [DEBUG] ========== BAGIMLILIKLAR ==========
    echo   node_modules YOK - yukleniyor...
    call npm install
    echo.
)

:: ============================================================
:: VERITABANI TESTI
:: ============================================================
echo [DEBUG] ========== VERITABANI TESTI ==========

if not exist node_modules goto :SKIP_DB

for /f "tokens=1,2,3,4 delims=|" %%a in ('node src/utils/dev-check.js db-test 2^>nul') do (
    set "DB_STATUS=%%a"
    set "DB_NAME=%%b"
    set "DB_SIZE=%%c"
    set "DB_VER=%%d"
)

if "!DB_STATUS!"=="OK" (
    echo   Baglanti    : BASARILI [OK]
    echo   Veritabani  : !DB_NAME! ^(!DB_SIZE!^)
    echo   PostgreSQL  : !DB_VER!
) else (
    echo   Baglanti    : BASARISIZ [!!]
    echo   Hata        : !DB_NAME!
    goto :SKIP_DB_DETAIL
)

for /f "tokens=*" %%i in ('node src/utils/dev-check.js db-tables 2^>nul') do echo   Tablo sayisi: %%i
for /f "tokens=*" %%i in ('node src/utils/dev-check.js db-migration 2^>nul') do echo   Migration   : v%%i

for /f "tokens=*" %%i in ('node src/utils/dev-check.js db-setup 2^>nul') do set "SETUP_OK=%%i"
if "!SETUP_OK!"=="true" (
    echo   Kurulum     : TAMAMLANMIS [OK]
) else (
    echo   Kurulum     : TAMAMLANMAMIS [!]
)

:SKIP_DB_DETAIL
:SKIP_DB
echo.

:: ============================================================
:: PAKET VERSIYONLARI
:: ============================================================
echo [DEBUG] ========== PAKET VERSIYONLARI ==========

if not exist node_modules goto :SKIP_PKG

for %%p in (discord.js express pg openai jsonwebtoken bcryptjs) do (
    for /f "tokens=*" %%v in ('node src/utils/dev-check.js pkg-version %%p 2^>nul') do echo     %%p: v%%v
)

:SKIP_PKG
echo.

:: ============================================================
:: DOSYA YAPISI
:: ============================================================
echo [DEBUG] ========== DOSYA YAPISI ==========

set MISS=0
for %%f in (src\index.js src\db\index.js src\web\server.js src\bot\client.js src\ai\provider.js src\plugins\loader.js src\langs\tr.json public\index.html docker-compose.yml Dockerfile) do (
    if exist "%%f" (
        echo   [OK] %%f
    ) else (
        echo   [!!] %%f EKSIK
        set /a MISS+=1
    )
)

if !MISS! gtr 0 (
    echo   !MISS! kritik dosya eksik!
) else (
    echo   Tum dosyalar mevcut [OK]
)

echo.

:: ============================================================
:: LOG DOSYASI
:: ============================================================
echo [DEBUG] ========== LOG DOSYASI ==========

for /f "tokens=*" %%i in ('node src/utils/dev-check.js today 2^>nul') do set "TODAY=%%i"
if not defined TODAY set "TODAY=unknown"

set "LOG_DIR=%CD%\logs"
set "LOG_FILE=!LOG_DIR!\!TODAY!.log"

if not exist "!LOG_DIR!" mkdir "!LOG_DIR!"

echo   Log dosyasi : logs\!TODAY!.log

echo.

:: ============================================================
:: BASLAT
:: ============================================================
echo [DEBUG] ========== BASLATILIYOR ==========
echo   Watch modu: dosya degisince otomatik yeniden baslar
echo   Durdurmak: Ctrl+C
echo.
echo   Web Panel     : http://localhost:!WEBPORT!
echo   Log dosyasi   : logs\!TODAY!.log
echo   Log API       : http://localhost:!WEBPORT!/api/stats/file-logs
echo   Log Stream    : http://localhost:!WEBPORT!/api/stats/file-logs/stream
echo.

:: --tail: ayri pencerede canli log izle
if "%1"=="--tail" (
    start "FyDCBot Logs" cmd /k "title FyDCBot Logs & color 0A & echo Log izleniyor: !LOG_FILE! & echo Bekleniyor... & timeout /t 3 /nobreak >nul & powershell -Command Get-Content '!LOG_FILE!' -Wait -Tail 50"
)

echo ===================================================
echo.
echo   [!] Log dosyasi Node.js tarafindan yazilir.
echo   [!] Canli izlemek icin ayri terminalde:
echo       powershell -Command "Get-Content logs\!TODAY!.log -Wait -Tail 50"
echo       veya: dev.bat --tail
echo.

set NODE_ENV=development
set DEBUG=fydcbot:*

:: Node.js logger zaten logs/YYYY-MM-DD.log dosyasina yaziyor
:: Tee-Object KULLANMA - ayni dosyaya iki islem yazamaz (EBUSY hatasi)
node --watch src/index.js

if %errorlevel% neq 0 (
    echo.
    echo [!!] FyDCBot durdu. Hata: %errorlevel%
    pause
)
