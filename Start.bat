@echo off
chcp 65001 >nul
title VPN Scanner Suite
cd /d "%~dp0"

echo ============================================
echo    VPN Scanner Suite
echo ============================================
echo.

REM نصب وابستگی‌های اسکنرها در صورت نبود
if not exist "scanners\purevpn\node_modules" (
  echo نصب وابستگی‌های PureVPN...
  call npm --prefix scanners\purevpn install
)
if not exist "scanners\expressvpn\node_modules" (
  echo نصب وابستگی‌های ExpressVPN...
  call npm --prefix scanners\expressvpn install
)
if not exist "scanners\mullvad\node_modules" (
  echo نصب وابستگی‌های Mullvad...
  call npm --prefix scanners\mullvad install
)
if not exist "scanners\pia\node_modules" (
  echo نصب وابستگی‌های PIA...
  call npm --prefix scanners\pia install
)
if not exist "scanners\windscribe\node_modules" (
  echo نصب وابستگی‌های Windscribe...
  call npm --prefix scanners\windscribe install
)
if not exist "scanners\proton\node_modules" (
  echo نصب وابستگی‌های Proton VPN...
  call npm --prefix scanners\proton install
)

echo در حال راه‌اندازی... مرورگر به‌صورت خودکار باز می‌شود.
echo برای بستن، این پنجره را ببندید یا Ctrl+C بزنید.
echo.

node suite.js

pause
