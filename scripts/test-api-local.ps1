Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location 'C:\NEN1090\NEN10900-api'
if (-not (Test-Path '.venv')) {
  python -m venv .venv
}
& .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
pytest
