$ErrorActionPreference = "Stop"
$reportPath = Join-Path $PSScriptRoot "TEST_REPORT_FULL.txt"
function Write-Section($title) {
  Add-Content -Path $reportPath -Value ""
  Add-Content -Path $reportPath -Value ("=" * 80)
  Add-Content -Path $reportPath -Value $title
  Add-Content -Path $reportPath -Value ("=" * 80)
}
if (Test-Path $reportPath) { Remove-Item $reportPath -Force }
Write-Section "CWS NEN-1090 APP TEST REPORT"
Add-Content -Path $reportPath -Value ("Started: " + (Get-Date -Format s))
Push-Location $PSScriptRoot
try {
  Write-Section "TYPECHECK"
  cmd /c npm run typecheck *>> $reportPath
  Write-Section "BUILD"
  cmd /c npm run build *>> $reportPath
  Write-Section "PLAYWRIGHT TEST LIST"
  cmd /c node node_modules/@playwright/test/cli.js test --list *>> $reportPath
  Write-Section "DONE"
  Add-Content -Path $reportPath -Value "Result: SUCCESS"
} catch {
  Write-Section "FAILED"
  Add-Content -Path $reportPath -Value $_
  throw
} finally {
  Add-Content -Path $reportPath -Value ("Finished: " + (Get-Date -Format s))
  Pop-Location
}
