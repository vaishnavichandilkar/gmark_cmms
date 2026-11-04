@echo off
rem Check if PostgreSQL is already running on port 5432
netstat -ano | findstr :5432 | findstr LISTENING >nul
if %ERRORLEVEL% equ 0 (
  echo PostgreSQL is already running on port 5432.
  exit /b 0
)

rem If not running, check for stale postmaster.pid
if exist "C:\Users\DELL\Downloads\PostgreSQL\18\data\postmaster.pid" (
  echo Cleaning up stale postmaster.pid...
  del /f /q "C:\Users\DELL\Downloads\PostgreSQL\18\data\postmaster.pid"
)

echo Starting PostgreSQL from D:\pgsql\bin...
"D:\pgsql\bin\pg_ctl.exe" start -D "C:\Users\DELL\Downloads\PostgreSQL\18\data"
