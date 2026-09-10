@echo off
title JAKKHO VR Live Webcasting Hub
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_webcasting.ps1" %*
pause
