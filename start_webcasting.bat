@echo off
title JAKKHO VR Live Webcasting Hub
set "SCRIPT="
if exist "D:\Profile\DMIL_VR\start_webcasting.ps1" set "SCRIPT=D:\Profile\DMIL_VR\start_webcasting.ps1"
if not defined SCRIPT if exist "H:\DMIL_VR\start_webcasting.ps1" set "SCRIPT=H:\DMIL_VR\start_webcasting.ps1"
if not defined SCRIPT if exist "%~dp0start_webcasting.ps1" set "SCRIPT=%~dp0start_webcasting.ps1"

if defined SCRIPT (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*
) else (
    echo [ERROR] Could not find start_webcasting.ps1!
    pause
)
