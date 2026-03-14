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
echo   Windows     : %OS%

for /f "tokens=4-5 delims=. " %%i in ('ver') do set WINVER=%%i.%%j
echo   Win Versiyon: %WINVER%

:: Node.js
where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node -v') do echo   Node.js     : %%i [OK]
    for /f "tokens=*" %%i in ('npm -v') do echo   npm         : v%%i
) else (
    echo   Node.js     : BULUNAMADI [!!]
)

:: Docker
where docker >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('docker --version') do echo   Docker      : %%i [OK]
    docker info >nul 2>&1
    if !errorlevel! equ 0 (
        echo   Docker Durum: Calisiyor [OK]
    ) else (
        echo   Docker Durum: CALISMYOR [!!]
    )
) else (
    echo   Docker      : BULUNAMADI [!!]
)

:: Git
where git >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('git --version') do echo   Git         : %%i
    for /f "tokens=*" %%i in ('git branch --show-current 2^>nul') do set BRANCH=%%i
    for /f "tokens=*" %%i in ('git rev-parse --short HEAD 2^>nul') do set COMMIT=%%i
    echo   Branch      : !BRANCH! @ !COMMIT!

    :: Degisiklik sayisi
    set DIRTY=0
    for /f %%i in ('git status --porcelain 2^>nul ^| find /c /v ""') do set DIRTY=%%i
    if !DIRTY! gtr 0 (
        echo   Degisiklik  : !DIRTY! dosya degismis [!]
    ) else (
        echo   Degisiklik  : Temiz [OK]
    )
)

echo.

:: ============================================================
:: .ENV KONTROL
:: ============================================================
echo [DEBUG] ========== ENV KONTROL ==========

if exist .env (
    echo   .env        : Mevcut [OK]

    for /f "tokens=1,* delims==" %%a in ('findstr /b "DATABASE_URL" .env 2^>nul') do (
        set "DBURL=%%b"
    )
    if defined DBURL (
        :: Basit maskeleme
        echo   DATABASE_URL: postgresql://***:***@...
    ) else (
        echo   DATABASE_URL: AYARLANMAMIS [!!]
    )

    for /f "tokens=1,* delims==" %%a in ('findstr /b "PORT=" .env 2^>nul') do set "WEBPORT=%%b"
    if not defined WEBPORT set WEBPORT=3000
    echo   PORT        : !WEBPORT!

    for /f "tokens=1,* delims==" %%a in ('findstr /b "JWT_SECRET" .env 2^>nul') do set "JWT=%%b"
    if defined JWT (
        echo   JWT_SECRET  : !JWT:~0,10!...
    ) else (
        echo   JWT_SECRET  : AYARLANMAMIS [!!]
    )
) else (
    echo   .env        : YOK - olusturuluyor...
    copy .env.example .env >nul 2>&1
    echo   .env        : .env.example'dan kopyalandi [OK]
    set WEBPORT=3000
)

echo.

:: ============================================================
:: DOCKER KONTEYNER DURUMU
:: ============================================================
echo [DEBUG] ========== DOCKER KONTEYNERLER ==========

where docker >nul 2>&1
if %errorlevel% equ 0 (
    docker info >nul 2>&1
    if !errorlevel! equ 0 (
        echo   --- FyDCBot Konteynerleri ---
        docker ps -a --filter "name=fydcbot" --format "  {{.Names}}  {{.Status}}  {{.Ports}}" 2>nul
        echo.

        :: fydcbot-db calisiyor mu?
        docker ps --filter "name=fydcbot-db" --format "{{.Names}}" 2>nul | findstr /c:"fydcbot-db" >nul 2>&1
        if !errorlevel! neq 0 (
            echo   PostgreSQL container calismyor, baslatiliyor...
            docker compose up -d db 2>nul || docker-compose up -d db 2>nul
            echo   Bekleniyor (5sn^)...
            timeout /t 5 /nobreak >nul
        )
    ) else (
        echo   Docker calismyor, konteyner bilgisi alinamadi
    )
) else (
    echo   Docker bulunamadi
)

echo.

:: ============================================================
:: VERITABANI TESTI
:: ============================================================
echo [DEBUG] ========== VERITABANI TESTI ==========

where node >nul 2>&1
if %errorlevel% equ 0 (
    if exist node_modules (
        :: DB baglanti testi
        for /f "tokens=*" %%i in ('node -e "require('dotenv').config();const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});p.query('SELECT current_database() as db, pg_size_pretty(pg_database_size(current_database())) as size').then(r=>{console.log('OK '+r.rows[0].db+' '+r.rows[0].size);p.end()}).catch(e=>{console.log('FAIL '+e.message);p.end()})" 2^>nul') do set "DBTEST=%%i"

        echo   !DBTEST!

        if "!DBTEST:~0,2!"=="OK" (
            echo   Baglanti    : BASARILI [OK]

            :: Tablo sayisi
            for /f "tokens=*" %%i in ('node -e "require('dotenv').config();const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(\"SELECT count(*) as c FROM information_schema.tables WHERE table_schema='public'\").then(r=>{console.log(r.rows[0].c);p.end()}).catch(()=>{console.log(0);p.end()})" 2^>nul') do echo   Tablo sayisi: %%i

            :: Migration
            for /f "tokens=*" %%i in ('node -e "require('dotenv').config();const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query('SELECT COALESCE(MAX(version),0) as v FROM _migrations').then(r=>{console.log(r.rows[0].v);p.end()}).catch(()=>{console.log(0);p.end()})" 2^>nul') do echo   Migration   : v%%i

            :: Setup durumu
            for /f "tokens=*" %%i in ('node -e "require('dotenv').config();const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(\"SELECT value FROM system_settings WHERE key='setup_complete'\").then(r=>{console.log(r.rows[0]?.value||'false');p.end()}).catch(()=>{console.log('false');p.end()})" 2^>nul') do (
                if "%%i"=="true" (
                    echo   Kurulum     : TAMAMLANMIS [OK]
                ) else (
                    echo   Kurulum     : TAMAMLANMAMIS [!] ^(setup wizard bekliyor^)
                )
            )
        ) else (
            echo   Baglanti    : BASARISIZ [!!]
            echo   Hata        : !DBTEST:~5!
        )
    ) else (
        echo   node_modules yok, DB testi atlaniyor
    )
)

echo.

:: ============================================================
:: BAGIMLILIK KONTROL
:: ============================================================
echo [DEBUG] ========== BAGIMLILIKLAR ==========

if exist node_modules (
    :: Kritik paketler
    for %%p in (discord.js express pg @anthropic-ai/sdk openai jsonwebtoken bcryptjs) do (
        if exist "node_modules\%%p" (
            for /f "tokens=*" %%v in ('node -e "try{console.log(require('%%p/package.json').version)}catch{console.log('?')}" 2^>nul') do (
                echo     %%p: v%%v [OK]
            )
        ) else (
            echo     %%p: EKSIK [!!]
        )
    )
) else (
    echo   node_modules: YOK
    echo   npm install calistiriliyor...
    call npm install
)

echo.

:: ============================================================
:: DOSYA YAPISI KONTROL
:: ============================================================
echo [DEBUG] ========== DOSYA YAPISI ==========

set MISSING=0
for %%f in (
    src\index.js
    src\db\index.js
    src\db\migrations.js
    src\web\server.js
    src\bot\client.js
    src\ai\provider.js
    src\plugins\loader.js
    src\langs\tr.json
    public\index.html
    public\js\app.js
    docker-compose.yml
    Dockerfile
) do (
    if exist "%%f" (
        echo   [OK] %%f
    ) else (
        echo   [!!] %%f EKSIK
        set /a MISSING+=1
    )
)

if !MISSING! gtr 0 (
    echo   !MISSING! kritik dosya eksik!
) else (
    echo   Tum kritik dosyalar mevcut [OK]
)

echo.

:: ============================================================
:: BASLAT
:: ============================================================
echo [DEBUG] ========== BASLATILIYOR ==========
echo   Node.js --watch modu ^(dosya degisikliklerinde otomatik yeniden baslatir^)
echo   Durdurmak icin: Ctrl+C
echo.
echo   Web Panel: http://localhost:!WEBPORT!
echo.
echo ===================================================
echo.

:: DEBUG modunda calistir
set NODE_ENV=development
set DEBUG=fydcbot:*

node --watch src/index.js

if %errorlevel% neq 0 (
    echo.
    echo [!!] FyDCBot durdu. Hata kodu: %errorlevel%
    pause
)
