@echo off
chcp 65001 >nul
title VPN Scanner Suite
cd /d "%~dp0"

echo ============================================
echo    VPN Scanner Suite
echo ============================================
echo.

REM نصب وابستگی‌های اسکنرهای Express در صورت نبود
if not exist "scanners\purevpn\node_modules" (
  echo نصب وابستگی‌های PureVPN...
  call npm --prefix scanners\purevpn install
)
if not exist "scanners\expressvpn\node_modules" (
  echo نصب وابستگی‌های ExpressVPN...
  call npm --prefix scanners\expressvpn install
)

echo در حال راه‌اندازی... مرورگر به‌صورت خودکار باز می‌شود.
echo برای بستن، این پنجره را ببندید یا Ctrl+C بزنید.
echo.

node suite.js

pause
