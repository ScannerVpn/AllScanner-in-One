@echo off
chcp 65001 >nul
title VPN Scanner Suite Installer Builder
cd /d "%~dp0"

echo ============================================
echo    Build VPN Scanner Suite Installer
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [خطا] Node.js نصب نیست. از https://nodejs.org نصب کن.
  echo.
  pause
  exit /b 1
)

echo 1) نصب وابستگی‌های ریشه...
call npm install
if errorlevel 1 ( echo [خطا] npm install ناموفق بود. & pause & exit /b 1 )
echo.
echo 2) دانلود Node باندل‌شده در صورت نیاز...
call npm run setup-node
echo.
echo 3) ساخت نصب‌کننده با electron-builder...
call npm run dist
if errorlevel 1 ( echo [خطا] ساخت نصب‌کننده ناموفق بود. & pause & exit /b 1 )
echo.
echo پایان. فایل نصب در پوشه dist قرار می‌گیرد.
pause
