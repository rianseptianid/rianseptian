@echo off
title Install Paket Suara Bahasa Indonesia (TTS) Windows
color 0b

echo ================================================================
echo    INSTALLER SUARA BAHASA INDONESIA WINDOWS (TTS ONECORE & SAPI5)
echo ================================================================
echo.
echo Sedang memeriksa hak Administrator...

:: Check Administrator Privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Meminta izin Administrator (UAC)...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

echo [OK] Hak Administrator terdeteksi!
echo.
echo 1. Mengunduh dan memasang paket ucapan Bahasa Indonesia via DISM...
echo    (Proses ini memerlukan koneksi internet beberapa saat)
echo.

dism /online /Add-Capability /CapabilityName:Language.Speech~~~id-ID~0.0.1.0

echo.
echo 2. Mendaftarkan suara Indonesia OneCore ke SAPI5 Desktop Registry...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$oneCorePath = 'HKLM:\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens';" ^
  "$desktopPath = 'HKLM:\SOFTWARE\Microsoft\Speech\Voices\Tokens';" ^
  "$wow64Path   = 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Speech\Voices\Tokens';" ^
  "Get-ChildItem $oneCorePath -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -like '*id-ID*' -or $_.PSChildName -like '*idID*' -or $_.PSChildName -like '*Andika*' -or $_.PSChildName -like '*Gadis*' } | ForEach-Object {" ^
  "    $name = $_.PSChildName;" ^
  "    Write-Host \"Mendaftarkan suara: $name\";" ^
  "    reg copy \"HKLM\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens\$name\" \"HKLM\SOFTWARE\Microsoft\Speech\Voices\Tokens\$name\" /s /f >$null 2>&1;" ^
  "    reg copy \"HKLM\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens\$name\" \"HKLM\SOFTWARE\WOW6432Node\Microsoft\Speech\Voices\Tokens\$name\" /s /f >$null 2>&1;" ^
  "};"

echo.
echo ================================================================
echo    SELESAI! Paket Suara Bahasa Indonesia telah dipasang.
echo    Silakan restart aplikasi Nurearn Studio untuk memperbarui.
echo ================================================================
echo.
pause
