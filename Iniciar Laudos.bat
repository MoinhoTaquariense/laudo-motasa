@echo off
setlocal
cd /d "%~dp0"
if not defined LAUDOS_OCULTO (
  start "" wscript.exe "%~dp0Iniciar Laudos.vbs"
  exit /b 0
)
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale o Node.js e tente novamente. > "%TEMP%\motasa-laudos.log"
  exit /b 1
)
node "%~dp0iniciar-laudos.cjs" > "%TEMP%\motasa-laudos.log" 2>&1
if errorlevel 1 (
  exit /b 1
)
endlocal
