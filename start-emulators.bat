@echo off
echo 🚀 Iniciando Firebase Emulators con datos locales...

REM 🔒 Cerrar cualquier proceso que use el puerto 8080
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080') do taskkill /PID %%a /F >nul 2>&1

REM 📂 Crear carpeta de datos si no existe
if not exist "firebase_data" (
  mkdir firebase_data
  echo 📁 Carpeta firebase_data creada.
)

REM 🚀 Iniciar emuladores con import/export automático
firebase emulators:start --project embarcadero-ba3cc --import ./firebase_data --export-on-exit ./firebase_data
pause
