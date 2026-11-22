# Starts the whole studio: Docker (the database), the backend, the frontend and ComfyUI (Qwen-Image, Wan).
# Run it from PowerShell:  powershell -ExecutionPolicy Bypass -File C:\Users\adars\code\video-studion\start-all.ps1
# Anything already running is left alone. Backend and frontend open in their own windows (close a window to stop it).
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Up($port) { [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) }

# 1. the database (Docker Desktop, container videostudio-db)
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Starting Docker Desktop..."
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    for ($i = 0; $i -lt 60; $i++) { Start-Sleep 5; docker info *> $null; if ($LASTEXITCODE -eq 0) { break } }
}
if (-not (Up 5442)) { docker start videostudio-db *> $null }
for ($i = 0; $i -lt 20 -and -not (Up 5442); $i++) { Start-Sleep 2 }

# 2. the backend (port 8020, open to the home network)
if (-not (Up 8020)) {
    Start-Process powershell -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle='backend'; cd '$root\backend'; .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8020"
}

# 3. the frontend (port 3030)
if (-not (Up 3030)) {
    Start-Process powershell -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle='frontend'; cd '$root\frontend'; npm run dev"
}

# 4. ComfyUI (port 8188; models on C: and D:)
if (-not (Up 8188)) {
    $comfy = "$env:LOCALAPPDATA\Comfy-Desktop"
    $dir = "$comfy\ComfyUI-Installs\ComfyUI\ComfyUI"
    Start-Process -FilePath "$dir\.venv\Scripts\python.exe" -WorkingDirectory $dir -WindowStyle Hidden `
        -RedirectStandardOutput "$comfy\comfy-server.log" -RedirectStandardError "$comfy\comfy-server.log.err" `
        -ArgumentList 'main.py', '--listen', '127.0.0.1', '--port', '8188', '--extra-model-paths-config', "`"$comfy\video-studio-models.yaml`"", '--output-directory', "`"$comfy\ComfyUI-Shared\output`""
}

Write-Host "Waiting for everything to answer..."
for ($i = 0; $i -lt 40 -and -not ((Up 3030) -and (Up 8020) -and (Up 8188) -and (Up 5442)); $i++) { Start-Sleep 3 }
foreach ($p in @(@{n = 'frontend'; p = 3030 }, @{n = 'backend'; p = 8020 }, @{n = 'ComfyUI'; p = 8188 }, @{n = 'database'; p = 5442 })) {
    "{0,-9} {1}  {2}" -f $p.n, $p.p, ($(if (Up $p.p) { 'up' } else { 'not yet (give it a minute)' }))
}
Write-Host "Open http://localhost:3030  (from another computer on the Wi-Fi: http://<this PC's IP>:3030)"
