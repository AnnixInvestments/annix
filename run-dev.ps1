[CmdletBinding()]
param(
    [string]$NodeVersion = "22.21.1",
    [string]$BackendLog = "backend-dev.log",
    [string]$FrontendLog = "frontend-dev.log"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RepoRoot "annix-backend"
$FrontendDir = Join-Path $RepoRoot "annix-frontend"

$script:EnvConfig = @{}

function Write-Info {
    param([string]$Message)
    Write-Host "[run-dev] $Message" -ForegroundColor Green
}

function Throw-Error {
    param([string]$Message)
    throw "[run-dev] $Message"
}

function Use-NodeVersion {
    if (Get-Command nvm -ErrorAction SilentlyContinue) {
        nvm install $NodeVersion | Out-Null
        nvm use $NodeVersion | Out-Null
        Write-Info "Using Node $(node -v) via nvm-windows"
        return
    }

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Throw-Error "Node.js not detected. Install Node $NodeVersion or nvm-windows."
    }

    $current = (node -v)
    $normalized = [Version]($current.TrimStart('v'))
    if ($normalized.Major -lt 22) {
        Throw-Error "Node $current is too old. Install Node $NodeVersion or newer."
    }
    Write-Info "Using system Node $current"
}

function Ensure-EnvFile {
    $envPath = Join-Path $BackendDir ".env"
    if (-not (Test-Path $envPath)) {
        Throw-Error "Missing $envPath. Copy .env.example and update JWT_SECRET/database settings."
    }
}

function Load-EnvFile {
    $envPath = Join-Path $BackendDir ".env"
    $script:EnvConfig = @{}
    foreach ($line in Get-Content $envPath) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        if ($line.TrimStart().StartsWith("#")) { continue }
        $pair = $line -split "=", 2
        if ($pair.Count -eq 2) {
            $key = $pair[0].Trim()
            $value = $pair[1].Trim()
            $value = $value.Trim('"')
            $value = $value.Trim("'")
            $script:EnvConfig[$key] = $value
        }
    }
}

function Get-EnvValue {
    param(
        [string]$Key,
        [string]$Default = $null
    )
    if ($script:EnvConfig.ContainsKey($Key)) {
        return $script:EnvConfig[$Key]
    }
    return $Default
}

function Install-Backend {
    Push-Location $BackendDir
    try {
        Write-Info "Installing backend dependencies…"
        yarn install | Out-Null
        Write-Info "Running backend migrations…"
        yarn migration:run
    }
    finally {
        Pop-Location
    }
}

function Install-Frontend {
    Push-Location $FrontendDir
    try {
        Write-Info "Installing frontend dependencies…"
        npm install | Out-Null
    }
    finally {
        Pop-Location
    }
}

function Start-ServiceJobs {
    $jobs = @{}

    if (-not $env:NEXT_PUBLIC_API_URL) {
        $env:NEXT_PUBLIC_API_URL = "http://localhost:4001"
    }

    foreach ($definition in @(
        @{ Name = "backend"; WorkingDir = $BackendDir; Command = @("yarn", "start:dev"); Log = Join-Path $RepoRoot $BackendLog },
        @{ Name = "frontend"; WorkingDir = $FrontendDir; Command = @("npm", "run", "dev"); Log = Join-Path $RepoRoot $FrontendLog }
    )) {
        if (Test-Path $definition.Log) {
            Remove-Item $definition.Log
        }

        $jobs[$definition.Name] = @{
            Log = $definition.Log
            Job = Start-Job -Name $definition.Name -ScriptBlock {
                param($WorkingDir, $Command)
                Set-StrictMode -Version Latest
                Set-Location $WorkingDir
                & $Command[0] $Command[1..($Command.Count - 1)]
            } -ArgumentList $definition.WorkingDir, $definition.Command
        }
    }

    Write-Info "Backend and frontend are starting. Press Ctrl+C to stop them."

    try {
        while ($true) {
            $running = $false

            foreach ($entry in $jobs.GetEnumerator()) {
                $job = $entry.Value.Job
                $logPath = $entry.Value.Log

                $output = Receive-Job -Job $job -ErrorAction SilentlyContinue
                if ($output) {
                    $prefixed = $output | ForEach-Object { "[{0}] {1}" -f $entry.Key, $_ }
                    $prefixed | Tee-Object -FilePath $logPath -Append
                }

                if ($job.State -eq 'Running') {
                    $running = $true
                }
            }

            if (-not $running) { break }
            Start-Sleep -Milliseconds 250
        }

        foreach ($entry in $jobs.GetEnumerator()) {
            Receive-Job -Job $entry.Value.Job -ErrorAction SilentlyContinue | Out-File -FilePath $entry.Value.Log -Append
        }
        Wait-Job -Job ($jobs.Values | ForEach-Object { $_.Job }) | Out-Null
    }
    finally {
        foreach ($entry in $jobs.GetEnumerator()) {
            $job = $entry.Value.Job
            if ($job.State -eq 'Running') {
                Stop-Job -Job $job -Force
            }
            Remove-Job -Job $job -Force
        }
    }
}

function Test-DbConnection {
    param(
        [string]$Host,
        [string]$Port,
        [string]$User,
        [string]$Password,
        [string]$Database
    )

    if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
        return $false
    }

    $original = $env:PGPASSWORD
    if ($Password) { $env:PGPASSWORD = $Password } else { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
    try {
        & psql -h $Host -p $Port -U $User -d $Database -c "SELECT 1;" > $null 2>&1
        return $LASTEXITCODE -eq 0
    }
    finally {
        if ($null -ne $original) {
            $env:PGPASSWORD = $original
        } else {
            Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        }
    }
}

function Invoke-PsqlScript {
    param(
        [string]$Host,
        [string]$Port,
        [string]$User,
        [string]$Password,
        [string]$Database,
        [string]$Script
    )

    $original = $env:PGPASSWORD
    if ($Password) { $env:PGPASSWORD = $Password } else { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
    try {
        $Script | & psql -h $Host -p $Port -U $User -d $Database -v ON_ERROR_STOP=1 > $null 2>&1
        return $LASTEXITCODE -eq 0
    }
    finally {
        if ($null -ne $original) {
            $env:PGPASSWORD = $original
        } else {
            Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        }
    }
}

function Ensure-Database {
    if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
        Write-Info "psql not found; skipping automatic database provisioning (install PostgreSQL to enable)."
        return
    }

    $dbHost = Get-EnvValue "DATABASE_HOST" "localhost"
    $dbPort = Get-EnvValue "DATABASE_PORT" "5432"
    $dbUser = Get-EnvValue "DATABASE_USERNAME" "annix_user"
    $dbPass = Get-EnvValue "DATABASE_PASSWORD" "annix_password"
    $dbName = Get-EnvValue "DATABASE_NAME" "annix_db"

    if (Test-DbConnection -Host $dbHost -Port $dbPort -User $dbUser -Password $dbPass -Database $dbName) {
        Write-Info "Database $dbName already accessible as $dbUser."
        return
    }

    $superUser = $env:PG_SUPERUSER
    if ([string]::IsNullOrWhiteSpace($superUser)) { $superUser = "postgres" }
    $superPass = $env:PG_SUPERPASS

    Write-Info "Attempting to provision PostgreSQL role/database via $superUser…"
    $script = @"
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$dbUser') THEN
        EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', '$dbUser', '$dbPass');
    ELSE
        EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', '$dbUser', '$dbPass');
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '$dbName') THEN
        EXECUTE format('CREATE DATABASE %I OWNER %I', '$dbName', '$dbUser');
    END IF;
END $$;
"@

    if (-not (Invoke-PsqlScript -Host $dbHost -Port $dbPort -User $superUser -Password $superPass -Database "postgres" -Script $script)) {
        Write-Host "[run-dev] Automatic provisioning failed. Set PG_SUPERPASS (and optionally PG_SUPERUSER) if superuser access requires credentials." -ForegroundColor Yellow
        return
    }

    if (Test-DbConnection -Host $dbHost -Port $dbPort -User $dbUser -Password $dbPass -Database $dbName) {
        Write-Info "Provisioned database $dbName for $dbUser."
    }
    else {
        Write-Host "[run-dev] Provisioning ran but $dbUser still cannot connect. Verify pg_hba.conf or credentials." -ForegroundColor Yellow
    }
}

Use-NodeVersion
Ensure-EnvFile
Load-EnvFile
Ensure-Database
Install-Backend
Install-Frontend

Write-Info "Logs → $(Join-Path $RepoRoot $BackendLog) and $(Join-Path $RepoRoot $FrontendLog)"
Start-ServiceJobs
