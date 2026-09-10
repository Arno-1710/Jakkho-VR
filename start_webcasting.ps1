param(
    [int]$Port = 5173,
    [switch]$NoBrowser,
    [switch]$Fullscreen
)

$ErrorActionPreference = "Continue"

# 1. Check if Node.js is installed
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host ""
    Write-Host "==================================================================" -ForegroundColor Red
    Write-Host " [ERROR] Node.js is not installed on this PC!                    " -ForegroundColor Yellow
    Write-Host "==================================================================" -ForegroundColor Red
    Write-Host " Please download and install Node.js from: https://nodejs.org/   " -ForegroundColor White
    Write-Host " After installing Node.js, restart this script.                  " -ForegroundColor Gray
    Write-Host "==================================================================" -ForegroundColor Red
    Write-Host ""
    pause
    exit 1
}

# 2. Locate the Web Platform Directory
$possibleDirs = @(
    (Join-Path $PSScriptRoot "simple.webplatform"),
    "H:\DMIL_VR\simple.webplatform",
    "D:\Profile\DMIL_VR\simple.webplatform"
)

$targetDir = $null
foreach ($dir in $possibleDirs) {
    if (Test-Path "$dir\package.json") {
        $targetDir = $dir
        break
    }
}

if (-not $targetDir) {
    Write-Host "[ERROR] Could not find simple.webplatform folder in repository." -ForegroundColor Red
    pause
    exit 1
}

# 3. Auto-Install Dependencies if first time setup
if (-not (Test-Path "$targetDir\node_modules")) {
    Write-Host ""
    Write-Host "==================================================================" -ForegroundColor Cyan
    Write-Host " [SETUP] First-time setup detected! Installing dependencies...   " -ForegroundColor Yellow
    Write-Host "==================================================================" -ForegroundColor Cyan
    Write-Host " Running 'npm install' in $targetDir ... Please wait..." -ForegroundColor Gray
    Write-Host ""
    Set-Location -Path $targetDir
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARNING] npm install had warnings, continuing to launch..." -ForegroundColor Yellow
    } else {
        Write-Host "[SUCCESS] Dependencies installed successfully!" -ForegroundColor Green
    }
}

# 4. Find Local IPv4 Addresses for Wi-Fi / Meta Quest Casting
$lanIps = @()
try {
    $lanIps = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | 
        Where-Object { $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and -not [System.Net.IPAddress]::IsLoopback($_) } | 
        ForEach-Object { $_.IPAddressToString }
} catch {
    $lanIps = @("127.0.0.1")
}

# Pick Wi-Fi / LAN IP (prefer 192.168.x.x)
$primaryLanIp = "localhost"
foreach ($ip in $lanIps) {
    if ($ip.StartsWith("192.168.8.") -or $ip.StartsWith("192.168.1.") -or $ip.StartsWith("192.168.0.") -or $ip.StartsWith("192.168.")) {
        $primaryLanIp = $ip
        break
    }
}
if ($primaryLanIp -eq "localhost" -and $lanIps.Count -gt 0) {
    $primaryLanIp = $lanIps[0]
}

# 5. Determine URLs
$targetPath = if ($Fullscreen) { "streamFullscreen" } else { "cast" }
$localUrl = "http://localhost:" + $Port + "/" + $targetPath
$lanUrl   = "http://" + $primaryLanIp + ":" + $Port + "/" + $targetPath
$unityUrl = "http://" + $primaryLanIp + ":8085/stream.mjpg"
$gridUrl  = "http://" + $primaryLanIp + ":" + $Port + "/streamPlayerScreen"

# 6. Display Formatted HUD Banner
Clear-Host
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "            JAKKHO VR - LIVE WEBCASTING HUB (POWERSHELL)                     " -ForegroundColor Yellow
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Local PC Viewer:        " -NoNewline -ForegroundColor White
Write-Host $localUrl -ForegroundColor Cyan
Write-Host "  Meta Quest / Phone LAN: " -NoNewline -ForegroundColor White
Write-Host $lanUrl -ForegroundColor Green
Write-Host "  Unity Direct MJPEG:     " -NoNewline -ForegroundColor White
Write-Host $unityUrl -ForegroundColor Magenta
Write-Host "  Multi-View Grid URL:    " -NoNewline -ForegroundColor White
Write-Host $gridUrl -ForegroundColor Yellow
Write-Host ""
if ($lanIps.Count -gt 1) {
    $otherIps = $lanIps -join ', '
    Write-Host "  All Detected LAN IPs: $otherIps" -ForegroundColor DarkGray
}
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "[INFO] Starting Web Server on port $Port..." -ForegroundColor Green
Write-Host "[INFO] Press Ctrl+C anytime to stop." -ForegroundColor Gray
Write-Host ""

# 7. Launch Browser in background
if (-not $NoBrowser) {
    Start-Process powershell -ArgumentList "-NoProfile", "-Command", "Start-Sleep -Seconds 2; Start-Process '$localUrl'" -WindowStyle Hidden
    Write-Host "[INFO] Opening browser to $localUrl..." -ForegroundColor Cyan
}

# 8. Execute Vite Server
Set-Location -Path $targetDir
$env:PORT = "$Port"
$env:WEB_APPLICATION_PORT = "$Port"
$env:WEB_APPLICATION_HOST = "0.0.0.0"

npx vite --host 0.0.0.0 --port $Port
