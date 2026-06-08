@echo off
cd /d "%~dp0"
echo Starting Surfshark Dashboard...
start "" /B node surf_server.js
timeout /t 2 /nobreak >nul
start "" "http://localhost:3002/dashboard.html"