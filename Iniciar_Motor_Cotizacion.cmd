@echo off
title Motor de Cotización de Cambios de Tripulantes
cd /d "%~dp0"

echo =======================================================
echo  🚢 INICIANDO MOTOR DE COTIZACIÓN DE TRIPULANTES
echo =======================================================
echo  Servidor local: http://localhost:3000
echo =======================================================
echo.

:: Abrir navegador en 2 segundos
start "" "http://localhost:3000"

:: Ejecutar servidor Node
"C:\Users\user\AppData\Roaming\Antigravity\bin\agy-node.cmd" server.js

pause
