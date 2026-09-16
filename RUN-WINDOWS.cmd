@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Janani Swasthya Setup

echo [Janani] Checking Docker Desktop...
where docker >nul 2>nul
if errorlevel 1 goto installDocker
goto startDocker

:installDocker
echo [Janani] Docker Desktop is not installed. Installing it with WinGet...
where winget >nul 2>nul
if errorlevel 1 goto noWinget
winget install --id Docker.DockerDesktop -e --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto installFailed
set "PATH=%PATH%;%ProgramFiles%\Docker\Docker\resources\bin;%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin"

:startDocker
docker --version >nul 2>nul
if errorlevel 1 goto restartNeeded
docker info >nul 2>nul
if not errorlevel 1 goto dockerReady

echo [Janani] Starting Docker Desktop...
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
if exist "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe" start "" "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
echo [Janani] Waiting for Docker. Accept the Docker licence prompt if this is the first launch.

for /L %%G in (1,1,100) do (
  docker info >nul 2>nul && goto dockerReady
  timeout /t 3 /nobreak >nul
)
goto dockerNotReady

:dockerReady
docker compose version >nul 2>nul
if errorlevel 1 goto composeMissing

echo [Janani] Building and starting the website...
docker compose up --build -d
if errorlevel 1 goto composeFailed

echo [Janani] Waiting for Janani Swasthya...
for /L %%G in (1,1,60) do (
  powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing http://localhost:4000/api/health -TimeoutSec 2; if($r.StatusCode -eq 200){exit 0}else{exit 1} } catch { exit 1 }" >nul 2>nul && goto siteReady
  timeout /t 2 /nobreak >nul
)
docker compose logs --tail=80 app
echo [Janani] ERROR: The website did not become ready. The latest logs are shown above.
goto failed

:siteReady
start "" http://localhost:4000
echo.
echo Janani Swasthya is running: http://localhost:4000
echo Worker:     worker@janani.gov.np      Password: Admin@123
echo Supervisor: supervisor@janani.gov.np  Password: Admin@123
echo Admin:      admin@janani.gov.np       Password: Admin@123
echo.
echo You may close this window. Stop later with: docker compose down
pause
exit /b 0

:noWinget
echo [Janani] ERROR: WinGet is unavailable. Install Docker Desktop from:
echo https://docs.docker.com/desktop/setup/install/windows-install/
goto failed

:installFailed
echo [Janani] ERROR: Docker Desktop installation failed. Check the message above.
goto failed

:restartNeeded
echo [Janani] Docker was installed, but Windows has not refreshed its environment yet.
echo Restart Windows, then double-click RUN-WINDOWS.cmd again.
goto failed

:dockerNotReady
echo [Janani] ERROR: Docker Desktop was not ready after five minutes.
echo Complete the Docker first-run setup and ensure WSL 2 and BIOS virtualisation are enabled.
echo Then double-click this file again.
goto failed

:composeMissing
echo [Janani] ERROR: Docker Compose is unavailable. Update Docker Desktop and retry.
goto failed

:composeFailed
echo [Janani] ERROR: The Docker build failed. Review the messages above.

:failed
pause
exit /b 1
