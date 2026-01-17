@echo off
REM Scalperium MT5 Agent Build Script
REM Run this on Windows to build the installer

echo ========================================
echo Scalperium MT5 Agent Build Script
echo ========================================
echo.

REM Check for .NET SDK
where dotnet >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: .NET SDK not found!
    echo Please install .NET 8.0 SDK from https://dotnet.microsoft.com/download
    exit /b 1
)

REM Check for Inno Setup
set ISCC="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if not exist %ISCC% (
    echo ERROR: Inno Setup 6 not found!
    echo Please install from https://jrsoftware.org/isdl.php
    exit /b 1
)

echo [1/4] Restoring NuGet packages...
cd /d "%~dp0..\src\MT5Agent.Service"
dotnet restore
if %errorlevel% neq 0 (
    echo ERROR: Failed to restore packages
    exit /b 1
)

echo.
echo [2/4] Building Release configuration...
dotnet publish -c Release -r win-x64 --self-contained true -o "%~dp0bin\Release\net8.0-windows\publish"
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    exit /b 1
)

echo.
echo [3/4] Checking for required assets...
if not exist "%~dp0assets\scalperium.ico" (
    echo WARNING: scalperium.ico not found in assets folder
    echo The installer will be created without a custom icon
    echo See assets\README.txt for instructions on creating the icon
    echo.
)

echo.
echo [4/4] Creating installer...
cd /d "%~dp0"
%ISCC% MT5AgentSetup.iss
if %errorlevel% neq 0 (
    echo ERROR: Installer creation failed
    exit /b 1
)

echo.
echo ========================================
echo BUILD SUCCESSFUL!
echo ========================================
echo.
echo Installer created at: %~dp0output\MT5AgentSetup-1.0.0.exe
echo.
echo Next steps:
echo 1. Copy MT5AgentSetup-1.0.0.exe to your Windows VPS
echo 2. Run the installer as Administrator
echo 3. Follow the wizard to configure your agent
echo.
pause
