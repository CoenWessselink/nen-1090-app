param(
  [string]$RepoPath = "C:\NEN1090\nen-1090-app",
  [string]$BaseUrl = "https://nen-1090-app.pages.dev",
  [int]$InstallTimeoutMinutes = 20,
  [int]$TypecheckTimeoutMinutes = 10,
  [int]$BuildTimeoutMinutes = 15,
  [int]$SmokeTimeoutMinutes = 15,
  [int]$AuthTimeoutMinutes = 15,
  [int]$UltraTimeoutMinutes = 25
)

$ErrorActionPreference = "Stop"

function Write-Section([string]$Title) {
  Write-Host ""
  Write-Host ("=" * 80) -ForegroundColor DarkGray
  Write-Host $Title -ForegroundColor Cyan
  Write-Host ("=" * 80) -ForegroundColor DarkGray
}

function Invoke-StepWithTimeout {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][int]$TimeoutMinutes,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string]$LogDirectory,
    [hashtable]$EnvironmentVariables = @{}
  )

  Write-Section $Name
  $safeName = ($Name -replace '[^a-zA-Z0-9_-]', '_')
  $outLog = Join-Path $LogDirectory "$safeName.out.log"
  $errLog = Join-Path $LogDirectory "$safeName.err.log"

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "powershell.exe"
  $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -Command ""$Command"""
  $psi.WorkingDirectory = $WorkingDirectory
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true

  foreach ($key in $EnvironmentVariables.Keys) {
    $psi.Environment[$key] = [string]$EnvironmentVariables[$key]
  }

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $psi
  $null = $process.Start()

  $stdoutTask = $process.StandardOutput.ReadToEndAsync()
  $stderrTask = $process.StandardError.ReadToEndAsync()

  $timeoutMs = $TimeoutMinutes * 60 * 1000
  $finished = $process.WaitForExit($timeoutMs)

  if (-not $finished) {
    try { $process.Kill($true) } catch {}
    $stdoutTask.Wait()
    $stderrTask.Wait()
    Set-Content -Path $outLog -Value $stdoutTask.Result -Encoding UTF8
    Set-Content -Path $errLog -Value $stderrTask.Result -Encoding UTF8
    throw "Step timed out: $Name`nStdout: $outLog`nStderr: $errLog"
  }

  $stdoutTask.Wait()
  $stderrTask.Wait()

  Set-Content -Path $outLog -Value $stdoutTask.Result -Encoding UTF8
  Set-Content -Path $errLog -Value $stderrTask.Result -Encoding UTF8

  Write-Host "Exit code : $($process.ExitCode)"
  Write-Host "Stdout log: $outLog"
  Write-Host "Stderr log: $errLog"

  if ($process.ExitCode -ne 0) {
    Write-Host ""
    Write-Host "---- STDOUT (tail) ----" -ForegroundColor Yellow
    $stdoutTask.Result.Split("`n") | Select-Object -Last 40 | ForEach-Object { $_ }
    Write-Host "---- STDERR (tail) ----" -ForegroundColor Yellow
    $stderrTask.Result.Split("`n") | Select-Object -Last 40 | ForEach-Object { $_ }
    throw "Step failed: $Name"
  }
}

function Resolve-SmokeTarget([string]$RepoPath) {
  $candidates = @(
    "tests/e2e/smoke",
    "tests/e2e/smoke.spec.ts",
    "tests/e2e/smoke-app.spec.ts",
    "tests/e2e/app-smoke.spec.ts",
    "tests/e2e/phase-11-smoke",
    "tests/e2e/phase-11/smoke.spec.ts"
  )

  foreach ($candidate in $candidates) {
    $full = Join-Path $RepoPath $candidate
    if (Test-Path $full) {
      return $candidate
    }
  }

  return $null
}

if (-not (Test-Path $RepoPath)) {
  throw "Repo path not found: $RepoPath"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logDirectory = Join-Path $RepoPath "tools\test-output\$timestamp"
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

Push-Location $RepoPath
try {
  Write-Section "Phase 11 v8 full proof run"
  Write-Host "Repo      : $RepoPath"
  Write-Host "Base URL  : $BaseUrl"
  Write-Host "Log dir   : $logDirectory"

  Invoke-StepWithTimeout -Name "npm-ci" -Command "npm ci" -TimeoutMinutes $InstallTimeoutMinutes -WorkingDirectory $RepoPath -LogDirectory $logDirectory
  Invoke-StepWithTimeout -Name "playwright-install" -Command "npx playwright install chromium" -TimeoutMinutes $InstallTimeoutMinutes -WorkingDirectory $RepoPath -LogDirectory $logDirectory
  Invoke-StepWithTimeout -Name "typecheck" -Command "npm run typecheck" -TimeoutMinutes $TypecheckTimeoutMinutes -WorkingDirectory $RepoPath -LogDirectory $logDirectory
  Invoke-StepWithTimeout -Name "build" -Command "npm run build" -TimeoutMinutes $BuildTimeoutMinutes -WorkingDirectory $RepoPath -LogDirectory $logDirectory

  $envs = @{ PLAYWRIGHT_BASE_URL = $BaseUrl }

  $smokeTarget = Resolve-SmokeTarget -RepoPath $RepoPath
  if ($smokeTarget) {
    Invoke-StepWithTimeout -Name "smoke-suite" -Command "npx playwright test $smokeTarget --project=desktop-chromium --reporter=line" -TimeoutMinutes $SmokeTimeoutMinutes -WorkingDirectory $RepoPath -LogDirectory $logDirectory -EnvironmentVariables $envs
  } else {
    Write-Section "smoke-suite"
    Write-Host "No dedicated smoke suite found in repo. Skipping smoke step." -ForegroundColor Yellow
  }

  Invoke-StepWithTimeout -Name "auth-lifecycle" -Command "npx playwright test tests/e2e/phase-11/auth-session-lifecycle.spec.ts --project=desktop-chromium --reporter=line" -TimeoutMinutes $AuthTimeoutMinutes -WorkingDirectory $RepoPath -LogDirectory $logDirectory -EnvironmentVariables $envs
  Invoke-StepWithTimeout -Name "phase11-ultra" -Command "npx playwright test tests/e2e/phase-11-ultra --project=desktop-chromium --reporter=line" -TimeoutMinutes $UltraTimeoutMinutes -WorkingDirectory $RepoPath -LogDirectory $logDirectory -EnvironmentVariables $envs

  Write-Section "RESULT"
  Write-Host "ALL STEPS PASSED" -ForegroundColor Green
  Write-Host "Logs: $logDirectory" -ForegroundColor Green
}
catch {
  Write-Host ""
  Write-Host "FINAL RESULT: FAIL" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host "Logs: $logDirectory" -ForegroundColor Yellow
  exit 1
}
finally {
  Pop-Location
}
