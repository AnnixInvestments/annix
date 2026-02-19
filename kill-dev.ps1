. "$PSScriptRoot\dev-lib.ps1"

Stop-AnnixService -Port ($env:ANNIX_BACKEND_PORT -as [int] ?? 4001)
Stop-AnnixService -Port ($env:ANNIX_FRONTEND_PORT -as [int] ?? 3000)
