# Spotpatch - One-Liner PowerShell Installer
# Run locally: .\install.ps1
# Or from web: iwr -useb https://raw.githubusercontent.com/<user>/<repo>/main/install.ps1 | iex

[CmdletBinding()]
param(
    [switch]$Uninstall,
    [string]$RepoUrl = "https://github.com/Iayss/spotpatch/archive/refs/heads/main.zip",
    [string]$InstallDir = "$env:APPDATA\spotpatch"
)

$ErrorActionPreference = "Stop"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Spotpatch - Spotify CEF Theme Engine & Patcher" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Locate Python 3.11+
$pyCmd = $null
if (Get-Command py -ErrorAction SilentlyContinue) {
    $pyCmd = "py"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $pyCmd = "python"
}

if (-not $pyCmd) {
    Write-Host "[!] Python 3.11+ is not found in PATH." -ForegroundColor Yellow
    Write-Host "    Attempting to install Python via winget..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        try {
            winget install --id Python.Python.3.12 -e --silent --accept-package-agreements --accept-source-agreements
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            if (Get-Command python -ErrorAction SilentlyContinue) { $pyCmd = "python" }
        } catch {
            Write-Host "[x] Automated installation via winget failed." -ForegroundColor Red
        }
    }
}

if (-not $pyCmd) {
    Write-Host "[ERROR] Python 3.11 or newer is required to run spotpatch." -ForegroundColor Red
    Write-Host "        Please install it from https://www.python.org/downloads/ or run:" -ForegroundColor Red
    Write-Host "        winget install Python.Python.3.12" -ForegroundColor White
    exit 1
}

# 2. Determine target working directory
$workDir = $null
if ($PSScriptRoot -and (Test-Path "$PSScriptRoot\patcher.py")) {
    $workDir = $PSScriptRoot
} elseif (Test-Path ".\patcher.py") {
    $workDir = (Get-Item ".\patcher.py").DirectoryName
} else {
    # One-liner execution from web: ensure InstallDir exists and fetch code
    Write-Host "[*] Fetching spotpatch package..." -ForegroundColor Gray
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }
    
    $zipPath = Join-Path $env:TEMP "spotpatch_latest.zip"
    try {
        Invoke-WebRequest -Uri $RepoUrl -OutFile $zipPath -UseBasicParsing
        Expand-Archive -Path $zipPath -DestinationPath $env:TEMP\spotpatch_unpack -Force
        $unpacked = Get-ChildItem "$env:TEMP\spotpatch_unpack" -Directory | Select-Object -First 1
        Copy-Item -Path "$($unpacked.FullName)\*" -Destination $InstallDir -Recurse -Force
        Remove-Item -Path "$env:TEMP\spotpatch_unpack", $zipPath -Recurse -Force -ErrorAction SilentlyContinue
    } catch {
        # If repo archive download fails (e.g. repo not yet created or offline)
        if (-not (Test-Path "$InstallDir\patcher.py")) {
            Write-Host "[ERROR] Could not download remote repository archive: $_" -ForegroundColor Red
            exit 1
        }
    }
    $workDir = $InstallDir
}

# 3. Execute patcher
Set-Location $workDir

if ($Uninstall) {
    Write-Host "[*] Restoring original Spotify..." -ForegroundColor Cyan
    & $pyCmd patcher.py restore --restart
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[OK] Spotify restored successfully to pristine state!" -ForegroundColor Green
    } else {
        Write-Host "`n[ERROR] Restore operation failed." -ForegroundColor Red
    }
} else {
    Write-Host "[*] Applying theme and patching Spotify..." -ForegroundColor Cyan
    & $pyCmd patcher.py apply --restart
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[OK] Spotpatch successfully applied! Spotify has been relaunched." -ForegroundColor Green
    } else {
        Write-Host "`n[ERROR] Patching operation failed." -ForegroundColor Red
    }
}

