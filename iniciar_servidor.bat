@echo off
title Motor de Cotizaciones Multi-Agente (Servidor Local)
color 0b

echo =======================================================
echo   🚢 INICIANDO MOTOR DE COTIZACIONES MULTI-AGENTE
echo =======================================================
echo.

cd /d "%~dp0"

:: Liberar puerto 3000 si estaba ocupado previamente
powershell -NoProfile -Command "$conn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue; if ($conn) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue }"

:: Iniciar el servidor Node.js
"C:\Users\user\AppData\Roaming\Antigravity\bin\agy-node.cmd" server.js

pause
