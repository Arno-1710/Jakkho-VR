# Creates a clean Windows Desktop Shortcut (.lnk) for any user
$targetBat = Join-Path $PSScriptRoot "start_webcasting.bat"
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "Launch JAKKHO VR Cast.lnk"

try {
    $wscript = New-Object -ComObject WScript.Shell
    $shortcut = $wscript.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $targetBat
    $shortcut.WorkingDirectory = $PSScriptRoot
    $shortcut.Description = "Launch JAKKHO VR Live Webcasting Platform"
    $shortcut.Save()

    Write-Host ""
    Write-Host "==================================================================" -ForegroundColor Cyan
    Write-Host "  SUCCESS! Desktop Shortcut Created Successfully                  " -ForegroundColor Green
    Write-Host "==================================================================" -ForegroundColor Cyan
    Write-Host "  Shortcut Location: $shortcutPath" -ForegroundColor White
    Write-Host "  You can now launch JAKKHO VR anytime from your Desktop icon!    " -ForegroundColor Yellow
    Write-Host "==================================================================" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "[ERROR] Could not create desktop shortcut: $($_.Exception.Message)" -ForegroundColor Red
}
