@echo off
chcp 65001 >nul
title Öğrenci Yoklama Sistemi (Yerel Sunucu)
cd /d "%~dp0"
echo ========================================================
echo   Öğrenci Yoklama ve Takip Sistemi Yerel Sunucusu
echo ========================================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0start_app.ps1"
pause
