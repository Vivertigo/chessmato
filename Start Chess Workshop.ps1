$ErrorActionPreference='Stop'
$engine=Get-Command node -ErrorAction SilentlyContinue
if($engine){$nodePath=$engine.Source}else{$nodePath=Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'}
if(-not (Test-Path -LiteralPath $nodePath)){Write-Host 'Node.js is required for local bot play. Install Node.js LTS, then reopen this launcher.';Read-Host 'Press Enter';exit 1}
$existing=Get-NetTCPConnection -LocalPort 8767 -State Listen -ErrorAction SilentlyContinue
if($existing){Start-Process 'http://127.0.0.1:8767';exit}
Start-Process -FilePath $nodePath -ArgumentList ('"'+(Join-Path $PSScriptRoot 'server.cjs')+'"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
