@echo off
chcp 65001 >nul
title VPN Scanner Suite
cd /d "%~dp0"

echo ============================================
echo    VPN Scanner Suite
echo ============================================
echo.

REM بررسی نصب بودن Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo [خطا] Node.js نصب نیست.
  echo لطفا از https://nodejs.org نصب کن و دوباره این فایل را اجرا کن.
  echo.
  pause
  exit /b 1
)

REM نصب وابستگی‌های ریشه (postinstall وابستگی‌های همه‌ی اسکنرها را هم نصب می‌کند)
if not exist "node_modules" (
  echo نصب وابستگی‌ها برای اولین بار... ممکن است چند دقیقه طول بکشد.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [خطا] نصب وابستگی‌ها ناموفق بود. لطفا اتصال اینترنت را بررسی کن.
    echo.
    pause
    exit /b 1
  )
)

REM در صورت نبود node_modules در هر اسکنر، نصبش کن
for %%S in (purevpn expressvpn mullvad pia windscribe proton nord surfshark) do (
  if not exist "scanners\%%S\node_modules" (
    echo نصب وابستگی‌های %%S...
    call npm --prefix "scanners\%%S" install
  )
)

echo.
echo در حال راه‌اندازی... مرورگر به‌صورت خودکار باز می‌شود.
echo برای بستن، این پنجره را ببندید یا Ctrl+C بزنید.
echo.

node suite.js

echo.
pause
