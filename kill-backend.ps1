. "$PSScriptRoot\dev-lib.ps1"
Stop-AnnixService -Port ($env:ANNIX_BACKEND_PORT ?? 4001)
