$ErrorActionPreference = 'Stop'

$env:TRPG_MASTER_KEY = Read-Host 'TRPG_MASTER_KEY'

try {
  & node "$PSScriptRoot/show-passwords.mjs" --restore
  if ($LASTEXITCODE -ne 0) {
    throw "Password restoration failed (exit code: $LASTEXITCODE)."
  }
} finally {
  Remove-Item Env:TRPG_MASTER_KEY -ErrorAction SilentlyContinue
}

Read-Host 'Press Enter to close this window'
