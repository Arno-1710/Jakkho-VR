param(
    [int]$Port = 5173,
    [switch]$NoBrowser,
    [switch]$Fullscreen
)

$ErrorActionPreference = "Continue"

# 1. Locate the Web Platform Directory (prioritize directory with installed dependencies)
$possibleDirs = @(
    "H:\DMIL_VR\simple.webplatform",
    "$PSScriptRoot\simple.webplatform",
    "D:\Profile\DMIL_VR\simple.webplatform"
)

$targetDir = $null
foreach ($dir in $possibleDirs) {
    if ((Test-Path "$dir\node_modules") -and (Test-Path "$dir\package.json")) {
        $targetDir = $dir
        break
    }
}

if (-not $targetDir) {
    foreach ($dir in $possibleDirs) {
        if (Test-Path "$dir\package.json") {
            $targetDir = $dir
            break
        }
    }
}

if (-not $targetDir) {
    Write-Host "[ERROR] Could not find simple.webplatform folder." -ForegroundColor Red
    pause
    exit 1
}

# 2. Find Local IPv4 Addresses for Wi-Fi / Meta Quest Casting
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

# 3. Determine URLs
$targetPath = if ($Fullscreen) { "streamFullscreen" } else { "cast" }
$localUrl = "http://localhost:" + $Port + "/" + $targetPath
$lanUrl   = "http://" + $primaryLanIp + ":" + $Port + "/" + $targetPath
$unityUrl = "http://" + $primaryLanIp + ":8085/stream.mjpg"
$gridUrl  = "http://" + $primaryLanIp + ":" + $Port + "/streamPlayerScreen"

# 4. Display Formatted HUD Banner
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

# 5. Launch Browser in background
if (-not $NoBrowser) {
    Start-Process powershell -ArgumentList "-NoProfile", "-Command", "Start-Sleep -Seconds 2; Start-Process '$localUrl'" -WindowStyle Hidden
    Write-Host "[INFO] Opening browser to $localUrl..." -ForegroundColor Cyan
}

# 6. Execute Vite Server
Set-Location -Path $targetDir
$env:PORT = "$Port"
$env:WEB_APPLICATION_PORT = "$Port"
$env:WEB_APPLICATION_HOST = "0.0.0.0"

npx vite --host 0.0.0.0 --port $Port
