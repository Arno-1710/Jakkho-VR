Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  JAKKHO DIY VR HAND CONTROLLER - LIVE USB BRIDGE   " -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Cyan

$comPort = "COM5"
$baudRate = 115200
$udpHost = "127.0.0.1"
$udpPort = 8888

Write-Host "[BRIDGE] Connecting to ESP32 on $comPort at $baudRate baud..." -ForegroundColor Gray

$port = $null
$udp = $null

try {
    $port = New-Object System.IO.Ports.SerialPort $comPort, $baudRate
    $port.ReadTimeout = 1000
    $port.DtrEnable = $true
    $port.RtsEnable = $true
    $port.Open()

    $udp = New-Object System.Net.Sockets.UdpClient
    $endpoint = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Parse($udpHost), $udpPort)

    Write-Host "[BRIDGE] SUCCESS! ESP32 Hand Controller is LIVE on $comPort" -ForegroundColor Green
    Write-Host "[BRIDGE] Streaming 80Hz tracking packets to Unity on ${udpHost}:${udpPort}" -ForegroundColor Green
    Write-Host "[BRIDGE] Live controller activity will display below:`n" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop.`n" -ForegroundColor DarkGray

    $buffer = New-Object byte[] 64
    $lastPrint = [DateTime]::Now

    while ($port.IsOpen) {
        try {
            $bytesRead = $port.Read($buffer, 0, $buffer.Length)
            if ($bytesRead -ge 20) {
                # Forward packet to Unity
                [void]$udp.Send($buffer, $bytesRead, $endpoint)

                # Show Live Telemetry in Terminal (every 100ms)
                if (([DateTime]::Now - $lastPrint).TotalMilliseconds -ge 100) {
                    $lastPrint = [DateTime]::Now

                    $rawW = [BitConverter]::ToInt16($buffer, 0)
                    $rawX = [BitConverter]::ToInt16($buffer, 2)
                    $rawY = [BitConverter]::ToInt16($buffer, 4)
                    $rawZ = [BitConverter]::ToInt16($buffer, 6)

                    $joyX = [BitConverter]::ToInt16($buffer, 8)
                    $joyY = [BitConverter]::ToInt16($buffer, 10)
                    $btn  = $buffer[12]

                    $bTrig = if (($btn -band 1) -ne 0) { "ON " } else { "off" }
                    $bGrip = if (($btn -band 2) -ne 0) { "ON " } else { "off" }
                    $bRec  = if (($btn -band 4) -ne 0) { "ON " } else { "off" }
                    $bJoy  = if (($btn -band 8) -ne 0) { "ON " } else { "off" }

                    Write-Host "`r[LIVE ESP32] JOY: X=$("{0,4}" -f $joyX) Y=$("{0,4}" -f $joyY) | BTNS: [Trigger:$bTrig Grip:$bGrip Recenter:$bRec] | QUAT: ($("{0,0:F2}" -f ($rawW/16384.0)),$("{0,0:F2}" -f ($rawX/16384.0)))   " -NoNewline -ForegroundColor Cyan
                }
            }
        } catch [System.TimeoutException] {
            # Continue polling
        }
    }
} catch {
    Write-Host "`n[ERROR] Could not open $comPort : $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please ensure Arduino Serial Monitor is CLOSED so $comPort is free.`n" -ForegroundColor Yellow
} finally {
    if ($port -ne $null -and $port.IsOpen) { 
        $port.Close()
        $port.Dispose()
    }
    if ($udp -ne $null) { 
        $udp.Close()
        $udp.Dispose()
    }
    Write-Host "`n[BRIDGE] Closed." -ForegroundColor Gray
}
