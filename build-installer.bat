@echo off
chcp 65001 >nul
title VPN Scanner Suite Installer Builder
cd /d "%~dp0"

echo ============================================
echo    Build VPN Scanner Suite Installer
echo ============================================
echo.

echo 1) نصب وابستگی‌های ریشه...
call npm install
echo.
echo 2) دانلود Node باندل‌شده در صورت نیاز...
call npm run setup-node
echo.
echo 3) ساخت نصب‌کننده با electron-builder...
call npm run dist
echo.
echo پایان. فایل نصب در پوشه dist قرار می‌گیرد.
pause
