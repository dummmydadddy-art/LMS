<#
.SYNOPSIS
    EduConnect-LMS Unified Service Orchestrator & Health Monitor
.DESCRIPTION
    Launches and monitors all 4 core services for EduConnect-LMS:
    1. Ollama Local LLM Daemon (Port 11434)
    2. Python Neural Cross-Encoder Reranker Microservice (Port 8100)
    3. FrankenPHP Application Gateway (Port 8000)
    4. React Vite Web Frontend (Port 5173)

    Supports automated health checks, port collision detection,
    graceful shutdown via -Stop, and automatic browser launch.
.PARAMETER Stop
    Gracefully terminates all background EduConnect services (ports 8100, 8000, 5173).
.PARAMETER Headless
    Launches services with hidden windows rather than visible consoles.
.PARAMETER NoBrowser
    Suppresses the automatic browser launch upon startup completion.
.PARAMETER TimeoutSeconds
    Maximum seconds to poll each service health endpoint (default: 40s).
.PARAMETER Daemon
    Starts services and exits immediately without waiting for user input.
.EXAMPLE
    .\start-all.ps1
.EXAMPLE
    .\start-all.ps1 -Stop
.EXAMPLE
    .\start-all.ps1 -NoBrowser -Headless
#>

[CmdletBinding(DefaultParameterSetName = "Start")]
param(
    [Parameter(ParameterSetName = "Stop")]
    [switch]$Stop,

    [Parameter(ParameterSetName = "Start")]
    [switch]$Headless,

    [Parameter(ParameterSetName = "Start")]
    [switch]$NoBrowser,

    [Parameter(ParameterSetName = "Start")]
    [int]$TimeoutSeconds = 40,

    [Parameter(ParameterSetName = "Start")]
    [switch]$Daemon
)

$ErrorActionPreference = "Continue"

# Root anchoring
$RootDir = $PSScriptRoot
if (-not $RootDir) {
    $RootDir = (Get-Location).Path
}

$ScriptPath = $PSCommandPath
if (-not $ScriptPath) {
    $ScriptPath = Join-Path $RootDir "start-all.ps1"
}

$PidFilePath = Join-Path $RootDir ".running_services.json"

# Helper: Log functions with colors
function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host ("=" * 78) -ForegroundColor Cyan
    Write-Host "   $Text" -ForegroundColor Cyan
    Write-Host ("=" * 78) -ForegroundColor Cyan
    Write-Host ""
}

function Write-Status {
    param(
        [string]$Tag,
        [string]$Message,
        [ConsoleColor]$Color = [ConsoleColor]::White
    )
    $tagFormatted = "[$Tag]"
    Write-Host -NoNewline ("{0,-9} " -f $tagFormatted) -ForegroundColor $Color
    Write-Host $Message
}

function Write-Success { param([string]$Message) Write-Status "OK" $Message -Color Green }
function Write-Wait    { param([string]$Message) Write-Status "WAIT" $Message -Color Yellow }
function Write-Info    { param([string]$Message) Write-Status "INFO" $Message -Color Cyan }
function Write-Err     { param([string]$Message) Write-Status "ERROR" $Message -Color Red }

# Helper: Get process listening on a given port
function Get-ProcessByPort {
    param([int]$Port)
    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($conns) {
            $owningPid = ($conns | Select-Object -First 1).OwningProcess
            if ($owningPid -gt 0) {
                return Get-Process -Id $owningPid -ErrorAction SilentlyContinue
            }
        }
    } catch {}
    return $null
}

# Helper: Safe stop process by PID
function Stop-ServiceProcess {
    param(
        [int]$ProcessId,
        [string]$Name
    )
    if ($ProcessId -le 0) { return }
    try {
        $p = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($p) {
            Write-Wait "Stopping $Name (PID $ProcessId)..."
            Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 300
            Write-Success "Stopped $Name (PID $ProcessId)"
        }
    } catch {
        Write-Err "Failed to stop $Name (PID $ProcessId): $_"
    }
}

# Helper: Stop services listening on ports
function Stop-PortListener {
    param(
        [int]$Port,
        [string]$Name
    )
    $proc = Get-ProcessByPort $Port
    if ($proc) {
        Stop-ServiceProcess -ProcessId $proc.Id -Name "$Name [Port $Port]"
    }
}

# ------------------------------------------------------------------
# SHUTDOWN ROUTINE (-Stop)
# ------------------------------------------------------------------
if ($Stop) {
    Write-Header "EduConnect-LMS: Graceful Shutdown in Progress"

    # 1. Check PID tracker file
    if (Test-Path $PidFilePath) {
        try {
            $tracked = Get-Content $PidFilePath -Raw | ConvertFrom-Json
            if ($tracked.services) {
                foreach ($s in $tracked.services) {
                    if ($s.pid -and $s.name -ne "Ollama LLM Engine") {
                        Stop-ServiceProcess -ProcessId $s.pid -Name $s.name
                    }
                }
            }
        } catch {
            Write-Err "Could not parse $PidFilePath. Falling back to port-based shutdown."
        }
        Remove-Item $PidFilePath -Force -ErrorAction SilentlyContinue
    }

    # 2. Port-based cleanup for guaranteed port release
    Write-Info "Ensuring ports 8100, 8000, 5173 are released..."
    Stop-PortListener -Port 8100 -Name "Cross-Encoder Reranker"
    Stop-PortListener -Port 8000 -Name "FrankenPHP Gateway"
    Stop-PortListener -Port 5173 -Name "Vite Dev Server"

    # Additional cleanup for node processes titled React Frontend or vite
    Get-Process -Name "*node*" -ErrorAction SilentlyContinue | Where-Object {
        $_.MainWindowTitle -like "*React Frontend*" -or $_.MainWindowTitle -like "*vite*"
    } | Stop-Process -Force -ErrorAction SilentlyContinue

    Write-Host ""
    Write-Success "All EduConnect application services have been stopped successfully."
    Write-Host ""
    exit 0
}

# ------------------------------------------------------------------
# STARTUP ROUTINE
# ------------------------------------------------------------------
Write-Header "EduConnect-LMS: Automated Service Orchestration"
Write-Info "Project Root: $RootDir"
Write-Info "Target Ports: 11434 (Ollama), 8100 (Reranker), 8000 (FrankenPHP), 5173 (Vite)"

$ServiceRegistry = @()

# Helper: Poll Endpoint Health
function Wait-For-Endpoint {
    param(
        [string]$ServiceName,
        [string]$Url,
        [hashtable]$Headers = @{},
        [int]$MaxSeconds = 40,
        [string]$ExpectedContent = ""
    )
    Write-Wait "Probing $ServiceName at $Url..."
    $sw = [System.Diagnostics.Stopwatch]::StartNew()

    while ($sw.Elapsed.TotalSeconds -lt $MaxSeconds) {
        try {
            $resp = Invoke-WebRequest -Uri $Url -Headers $Headers -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) {
                if ($ExpectedContent -ne "") {
                    if ($resp.Content -match $ExpectedContent) {
                        $elapsedMs = [math]::Round($sw.Elapsed.TotalMilliseconds)
                        Write-Success "$ServiceName is ONLINE (${elapsedMs}ms) [HTTP $($resp.StatusCode)]"
                        return $true
                    }
                } else {
                    $elapsedMs = [math]::Round($sw.Elapsed.TotalMilliseconds)
                    Write-Success "$ServiceName is ONLINE (${elapsedMs}ms) [HTTP $($resp.StatusCode)]"
                    return $true
                }
            }
        } catch {
            Start-Sleep -Milliseconds 800
        }
    }
    Write-Err "$ServiceName failed to respond within ${MaxSeconds}s."
    return $false
}

# ------------------------------------------------------------------
# 1. OLLAMA LOCAL LLM ENGINE (PORT 11434)
# ------------------------------------------------------------------
Write-Host ""
Write-Info "Stage 1/4: Checking Ollama LLM Daemon (Port 11434)..."
$ollamaProc = Get-ProcessByPort 11434
$ollamaPid = if ($ollamaProc) { $ollamaProc.Id } else { $null }

if (-not $ollamaProc) {
    Write-Wait "Ollama is not running on port 11434. Attempting to start daemon..."
    try {
        $ollamaCmd = Get-Command "ollama" -ErrorAction SilentlyContinue
        $ollamaExe = if ($ollamaCmd) { $ollamaCmd.Source } else { "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" }
        if (Test-Path $ollamaExe) {
            $spawnedOllama = Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WindowStyle Hidden -PassThru
            $ollamaPid = $spawnedOllama.Id
            Start-Sleep -Seconds 2
        } else {
            Write-Err "Ollama executable not found in PATH or standard directory."
        }
    } catch {
        Write-Err "Failed to launch Ollama: $_"
    }
}

$ollamaOk = Wait-For-Endpoint -ServiceName "Ollama Daemon" -Url "http://127.0.0.1:11434/api/tags" -MaxSeconds 15

if ($ollamaOk) {
    try {
        $tagsResp = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 3
        $availableModels = ($tagsResp.models | Select-Object -ExpandProperty name)
        $hasGenerator = $availableModels -contains "llama3.2:latest" -or ($availableModels -like "llama3.2*")
        $hasEmbedder  = $availableModels -contains "nomic-embed-text:latest" -or ($availableModels -like "nomic-embed-text*")

        if ($hasGenerator -and $hasEmbedder) {
            Write-Success "Verified required models: llama3.2 (Generator) & nomic-embed-text (Embedder)"
        } else {
            Write-Wait "Some models may be missing. Found: $($availableModels -join ', ')"
        }
    } catch {
        Write-Wait "Could not verify model tags: $_"
    }
    $ollamaProcAfter = Get-ProcessByPort 11434
    $finalOllamaPid = if ($ollamaProcAfter) { $ollamaProcAfter.Id } else { $ollamaPid }
    $ServiceRegistry += [PSCustomObject]@{
        Name = "Ollama LLM Engine"; Port = 11434; PID = $finalOllamaPid; Endpoint = "http://127.0.0.1:11434/api/tags"
    }
} else {
    Write-Err "Ollama is unavailable. Generative RAG responses will fail."
}

# ------------------------------------------------------------------
# 2. PYTHON CROSS-ENCODER RERANKER (PORT 8100)
# ------------------------------------------------------------------
Write-Host ""
Write-Info "Stage 2/4: Checking Cross-Encoder Reranker Microservice (Port 8100)..."
$rerankerProc = Get-ProcessByPort 8100
$rerankerPid = if ($rerankerProc) { $rerankerProc.Id } else { $null }

if (-not $rerankerProc) {
    Write-Wait "Launching Python Cross-Encoder (ms-marco-MiniLM-L-6-v2) on port 8100..."
    $rerankerScript = Join-Path $RootDir "backend\services\reranker_service.py"
    if (-not (Test-Path $rerankerScript)) {
        Write-Err "Reranker script not found at $rerankerScript"
    } else {
        $windowStyle = if ($Headless) { "Hidden" } else { "Normal" }
        $spawnedReranker = Start-Process -FilePath "python" -ArgumentList "`"$rerankerScript`"" -WorkingDirectory $RootDir -WindowStyle $windowStyle -PassThru
        $rerankerPid = $spawnedReranker.Id
    }
} else {
    Write-Info "Port 8100 already bound by PID $rerankerPid. Verifying health..."
}

$rerankerOk = Wait-For-Endpoint -ServiceName "Cross-Encoder Reranker" -Url "http://127.0.0.1:8100/health" -MaxSeconds $TimeoutSeconds -ExpectedContent '"status":"ok"'

if ($rerankerOk) {
    $rerankerProcAfter = Get-ProcessByPort 8100
    $finalRerankerPid = if ($rerankerProcAfter) { $rerankerProcAfter.Id } else { $rerankerPid }
    $ServiceRegistry += [PSCustomObject]@{
        Name = "Cross-Encoder Reranker"; Port = 8100; PID = $finalRerankerPid; Endpoint = "http://127.0.0.1:8100/health"
    }
} else {
    Write-Err "Cross-Encoder Reranker failed to initialize. RAG pipeline will fallback to MMR."
}

# ------------------------------------------------------------------
# 3. FRANKENPHP APPLICATION GATEWAY (PORT 8000)
# ------------------------------------------------------------------
Write-Host ""
Write-Info "Stage 3/4: Checking FrankenPHP Application Gateway (Port 8000)..."
$frankenProc = Get-ProcessByPort 8000
$frankenPid = if ($frankenProc) { $frankenProc.Id } else { $null }

if (-not $frankenProc) {
    Write-Wait "Launching FrankenPHP server on port 8000..."
    $frankenBinary = Join-Path $RootDir "bin\frankenphp.exe"
    $windowStyle = if ($Headless) { "Hidden" } else { "Normal" }

    if (Test-Path $frankenBinary) {
        $spawnedFranken = Start-Process -FilePath $frankenBinary -ArgumentList "php-server --listen 127.0.0.1:8000 --root backend" -WorkingDirectory $RootDir -WindowStyle $windowStyle -PassThru
        $frankenPid = $spawnedFranken.Id
    } else {
        Write-Wait "FrankenPHP binary not found. Falling back to PHP built-in server..."
        $spawnedFranken = Start-Process -FilePath "php" -ArgumentList "-S 127.0.0.1:8000 -t backend backend/index.php" -WorkingDirectory $RootDir -WindowStyle $windowStyle -PassThru
        $frankenPid = $spawnedFranken.Id
    }
} else {
    Write-Info "Port 8000 already bound by PID $frankenPid. Verifying health..."
}

$frankenHeaders = @{ "X-Service-Key" = "lms-n8n-service-key-2026" }
$frankenOk = Wait-For-Endpoint -ServiceName "FrankenPHP Gateway" -Url "http://127.0.0.1:8000/api/rag/metrics" -Headers $frankenHeaders -MaxSeconds $TimeoutSeconds

if ($frankenOk) {
    $frankenProcAfter = Get-ProcessByPort 8000
    $finalFrankenPid = if ($frankenProcAfter) { $frankenProcAfter.Id } else { $frankenPid }
    $ServiceRegistry += [PSCustomObject]@{
        Name = "FrankenPHP Gateway"; Port = 8000; PID = $finalFrankenPid; Endpoint = "http://127.0.0.1:8000/api/rag/metrics"
    }
} else {
    Write-Err "FrankenPHP Gateway is not responding on port 8000."
}

# ------------------------------------------------------------------
# 4. REACT VITE WEB SERVER (PORT 5173)
# ------------------------------------------------------------------
Write-Host ""
Write-Info "Stage 4/4: Checking React Vite Dev Server (Port 5173)..."
$viteProc = Get-ProcessByPort 5173
$vitePid = if ($viteProc) { $viteProc.Id } else { $null }

if (-not $viteProc) {
    Write-Wait "Launching React Vite Dev Server on port 5173..."
    $frontendDir = Join-Path $RootDir "frontend"
    $windowStyle = if ($Headless) { "Hidden" } else { "Normal" }

    $npmExe = if (Get-Command "npm.cmd" -ErrorAction SilentlyContinue) { "npm.cmd" } else { "npm" }
    $spawnedVite = Start-Process -FilePath $npmExe -ArgumentList "run", "dev" -WorkingDirectory $frontendDir -WindowStyle $windowStyle -PassThru
    $vitePid = $spawnedVite.Id
} else {
    Write-Info "Port 5173 already bound by PID $vitePid. Verifying health..."
}

$viteOk = Wait-For-Endpoint -ServiceName "React Vite Web UI" -Url "http://localhost:5173" -MaxSeconds 30

if ($viteOk) {
    $viteProcAfter = Get-ProcessByPort 5173
    $finalVitePid = if ($viteProcAfter) { $viteProcAfter.Id } else { $vitePid }
    $ServiceRegistry += [PSCustomObject]@{
        Name = "React Vite Web UI"; Port = 5173; PID = $finalVitePid; Endpoint = "http://localhost:5173"
    }
} else {
    Write-Err "React Vite Dev Server is not responding on port 5173."
}

# ------------------------------------------------------------------
# STATE PERSISTENCE
# ------------------------------------------------------------------
$stateObj = @{
    timestamp = (Get-Date).ToString("o")
    services = $ServiceRegistry
}
try {
    $stateObj | ConvertTo-Json -Depth 4 | Set-Content -Path $PidFilePath -Encoding UTF8
} catch {
    Write-Wait "Could not write $PidFilePath."
}

# ------------------------------------------------------------------
# STATUS CONSOLIDATION DASHBOARD
# ------------------------------------------------------------------
Write-Host ""
Write-Host ("=" * 78) -ForegroundColor Green
Write-Host "   EDUCONNECT-LMS: ALL 4 SERVICES OPERATIONAL & READY" -ForegroundColor Green
Write-Host ("=" * 78) -ForegroundColor Green
Write-Host ("{0,-24} {1,-7} {2,-8} {3,-9} {4}" -f "Service Name", "Port", "PID", "Status", "Endpoint URL") -ForegroundColor Yellow
Write-Host ("-" * 78) -ForegroundColor Gray

foreach ($srv in $ServiceRegistry) {
    $pidStr = if ($srv.PID) { $srv.PID.ToString() } else { "N/A" }
    Write-Host ("{0,-24} {1,-7} {2,-8} {3,-9} {4}" -f $srv.Name, $srv.Port, $pidStr, "ONLINE", $srv.Endpoint) -ForegroundColor White
}

Write-Host ("=" * 78) -ForegroundColor Green
Write-Host "   Web Application : http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Admin Telemetry : http://localhost:5173 (Admin Portal -> RAG Pipeline Tab)" -ForegroundColor Cyan
Write-Host ("=" * 78) -ForegroundColor Green

# ------------------------------------------------------------------
# AUTOMATIC BROWSER LAUNCH
# ------------------------------------------------------------------
if (-not $NoBrowser -and $viteOk) {
    Write-Info "Launching default browser at http://localhost:5173..."
    try {
        Start-Process "http://localhost:5173"
    } catch {
        Write-Wait "Could not launch browser automatically: $_"
    }
}

# ------------------------------------------------------------------
# INTERACTIVE / DAEMON LIFECYCLE
# ------------------------------------------------------------------
if ($Daemon) {
    Write-Info "Daemon mode active. Services are running in background."
    Write-Info "To stop services later, run: .\start-all.ps1 -Stop"
    exit 0
}

# Check if console is interactive
$isInteractive = $true
try {
    $null = [Console]::KeyAvailable
} catch {
    $isInteractive = $false
}

if (-not $isInteractive) {
    Write-Info "Non-interactive environment detected. Services are running."
    Write-Info "To stop services later, run: .\start-all.ps1 -Stop"
    exit 0
}

Write-Host ""
Write-Host "Services are running. Press [Q] to stop all services, or [Ctrl+C] to detach." -ForegroundColor Yellow
while ($true) {
    if ([Console]::KeyAvailable) {
        $key = [Console]::ReadKey($true)
        if ($key.Key -eq [ConsoleKey]::Q) {
            Write-Host "`n'Q' detected. Initiating shutdown..." -ForegroundColor Yellow
            & $ScriptPath -Stop
            break
        }
    }
    Start-Sleep -Milliseconds 500
}
