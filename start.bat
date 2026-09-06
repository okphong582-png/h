@echo off
title WormGPT Enhanced
echo.
echo ===========================================
echo    WormGPT Enhanced - Starting Server
echo ===========================================
echo.

where ollama >nul 2>nul
if %errorlevel% equ 0 (
    echo [*] Starting Ollama service...
    start "" /b ollama serve >nul 2>nul
    timeout /t 2 /nobreak >nul
)

cd /d "%~dp0server"

echo [*] Starting WormGPT server at http://localhost:3001 ...
start "" http://localhost:3001

echo.
echo ===========================================
echo   WormGPT Enhanced Running!
echo   URL: http://localhost:3001
echo   Password: Realnojokepplwazy1234
echo ===========================================
echo.
echo Press Ctrl+C in this window to stop the server.
echo.

node index.js
pause
