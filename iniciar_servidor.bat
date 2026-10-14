@echo off
title Motor de Cotizaciones Multi-Agente (Servidor + Qwen2.5 3B Local)
color 0b

echo =======================================================
echo   🚢 INICIANDO MOTOR DE COTIZACIONES MULTI-AGENTE
echo   🧠 AGENTE TEXTPARSER: Qwen2.5 3B Instruct (Local)
echo =======================================================
echo.

cd /d "%~dp0"

:: 1. Liberar puertos 3000 y 3001 si estaban ocupados previamente
powershell -NoProfile -Command "$c1 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue; if ($c1) { Stop-Process -Id $c1.OwningProcess -Force -ErrorAction SilentlyContinue }; $c2 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue; if ($c2) { Stop-Process -Id $c2.OwningProcess -Force -ErrorAction SilentlyContinue }"

:: 2. Iniciar el servicio local del LLM Qwen2.5 3B en segundo plano
echo [1/2] Iniciando servicio local Qwen2.5 3B Instruct (FastAPI)...
start /B "" python qwen_service.py

:: Breve espera para inicializar el modelo
timeout /t 3 /nobreak >nul

:: 3. Iniciar el servidor web Node.js
echo [2/2] Iniciando servidor web Node.js...
"C:\Users\user\AppData\Roaming\Antigravity\bin\agy-node.cmd" server.js

pause
