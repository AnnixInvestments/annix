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
            Set-EnvValue -Key $key -Value $value
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

function Set-EnvValue {
    param(
        [string]$Key,
        [string]$Value
    )

    $script:EnvConfig[$Key] = $Value
    if ($null -ne $Value) {
        Set-Item -Path Env:$Key -Value $Value
    }
    else {
        Remove-Item -Path Env:$Key -ErrorAction SilentlyContinue
    }
}

function Test-PortInUse {
    param(
        [string]$Host,
        [int]$Port
    )

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($Host, $Port, $null, $null)
        if ($async.AsyncWaitHandle.WaitOne(200) -and $client.Connected) {
            $client.EndConnect($async)
            return $true
        }
    }
    catch {
        return $false
    }
    finally {
        $client.Dispose()
    }
    return $false
}

function Find-AvailablePort {
    param(
        [string]$Host,
        [int]$Start,
        [int]$End
    )

    for ($port = $Start; $port -le $End; $port++) {
        if (-not (Test-PortInUse -Host $Host -Port $port)) {
            return $port
        }
    }

    Throw-Error "Unable to find a free port between $Start and $End for Docker Postgres."
}

function Wait-DockerPostgresReady {
    param(
        [string]$ContainerName,
        [string]$Host,
        [int]$Port,
        [string]$User,
        [string]$Password
    )

    $retries = 30
    if ($env:DOCKER_POSTGRES_READY_RETRIES) {
        $retries = [int]$env:DOCKER_POSTGRES_READY_RETRIES
    }

    for ($i = 0; $i -lt $retries; $i++) {
        if (Invoke-PsqlScript -Host $Host -Port $Port -User $User -Password $Password -Database "postgres" -Script "SELECT 1;" -Mode "docker" -ContainerName $ContainerName) {
            Write-Info "Docker Postgres is ready at $Host:$Port."
            return
        }
        Start-Sleep -Seconds 1
    }

    Write-Info "Docker Postgres did not report ready after waiting. Continuing anyway..."
}

function Ensure-DockerPostgres {
    if ($env:USE_DOCKER_POSTGRES -ne "1") {
        return
    }

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Throw-Error "USE_DOCKER_POSTGRES=1 but docker is not available."
    }

    try {
        docker info | Out-Null
    }
    catch {
        Throw-Error "Docker daemon is not reachable. Start Docker Desktop before running this script."
    }

    $host = Get-EnvValue "DATABASE_HOST" "localhost"
    if ($host -ne "localhost" -and $host -ne "127.0.0.1") {
        Throw-Error "USE_DOCKER_POSTGRES expects DATABASE_HOST=localhost or 127.0.0.1 (found $host)."
    }

    $originalPort = [int](Get-EnvValue "DATABASE_PORT" "5432")
    $port = $originalPort
    $container = if ($env:POSTGRES_CONTAINER_NAME) { $env:POSTGRES_CONTAINER_NAME } else { "annix-postgres" }
    $volume = if ($env:POSTGRES_CONTAINER_VOLUME) { $env:POSTGRES_CONTAINER_VOLUME } else { "annix-postgres-data" }
    $image = if ($env:POSTGRES_CONTAINER_IMAGE) { $env:POSTGRES_CONTAINER_IMAGE } else { "postgres:15" }
    $superUser = if ($env:PG_SUPERUSER) { $env:PG_SUPERUSER } else { "postgres" }
    $dockerSuperPass = if ($env:DOCKER_POSTGRES_PASSWORD) { $env:DOCKER_POSTGRES_PASSWORD } else { "postgres" }
    $superPass = if ($env:PG_SUPERPASS) { $env:PG_SUPERPASS } else { $dockerSuperPass }
    Set-EnvValue -Key "PG_SUPERUSER" -Value $superUser
    Set-EnvValue -Key "PG_SUPERPASS" -Value $superPass

    $containerExists = $false
    $existingRunning = $false
    $existingPort = $null

    try {
        docker inspect $container | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $containerExists = $true
            $existingRunning = ((docker inspect -f "{{.State.Running}}" $container).Trim() -eq "true")
            $existingPort = (docker inspect -f "{{range $p,$cfg := .NetworkSettings.Ports}}{{if eq $p \"5432/tcp\"}}{{(index $cfg 0).HostPort}}{{end}}{{end}}" $container).Trim()
        }
    }
    catch {
        $containerExists = $false
    }

    if ($existingPort) {
        $port = [int]$existingPort
        Set-EnvValue -Key "DATABASE_PORT" -Value "$port"
        Set-EnvValue -Key "DATABASE_HOST" -Value $host
    }

    if (Test-PortInUse -Host $host -Port $port) {
        if ($existingRunning) {
            Write-Info "Reusing running container $container on $host:$port."
        }
        else {
            if ($containerExists) {
                Write-Info "Removing stopped container $container to adjust port mapping..."
                docker rm $container | Out-Null
                $containerExists = $false
            }
            $fallbackStart = 55432
            $fallbackEnd = 55452
            if ($env:DOCKER_POSTGRES_PORT_FALLBACK_START) {
                $fallbackStart = [int]$env:DOCKER_POSTGRES_PORT_FALLBACK_START
            }
            if ($env:DOCKER_POSTGRES_PORT_FALLBACK_END) {
                $fallbackEnd = [int]$env:DOCKER_POSTGRES_PORT_FALLBACK_END
            }
            $port = Find-AvailablePort -Host $host -Start $fallbackStart -End $fallbackEnd
            Set-EnvValue -Key "DATABASE_PORT" -Value "$port"
            Write-Info "Port $originalPort is already in use; Docker Postgres will listen on $port instead."
        }
    }

    try {
        docker volume inspect $volume | Out-Null
    }
    catch {
        docker volume create $volume | Out-Null
    }

    if (-not $containerExists) {
        Write-Info "Creating Postgres container $container ($image)..."
        docker run -d `
            --name $container `
            -e "POSTGRES_USER=$superUser" `
            -e "POSTGRES_PASSWORD=$superPass" `
            -p "$port`:5432" `
            -v "$volume`:/var/lib/postgresql/data" `
            $image | Out-Null
    }
    elseif (-not $existingRunning) {
        Write-Info "Starting Postgres container $container..."
        docker start $container | Out-Null
    }

    Wait-DockerPostgresReady -ContainerName $container -Host "localhost" -Port 5432 -User $superUser -Password $superPass
}

function Install-Backend {
    Push-Location $BackendDir
    try {
        Write-Info "Installing backend dependencies..."
        yarn install | Out-Null
        Write-Info "Running backend migrations..."
        yarn migration:run
    }
    finally {
        Pop-Location
    }
}

function Install-Frontend {
    Push-Location $FrontendDir
    try {
        Write-Info "Installing frontend dependencies..."
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
        [string]$Database,
        [string]$Mode = "host",
        [string]$ContainerName = $null
    )

    if ($Mode -eq "docker") {
        return Invoke-PsqlScript -Host $Host -Port $Port -User $User -Password $Password -Database $Database -Script "SELECT 1;" -Mode "docker" -ContainerName $ContainerName
    }

    return Invoke-PsqlScript -Host $Host -Port $Port -User $User -Password $Password -Database $Database -Script "SELECT 1;"
}

function Invoke-PsqlScript {
    param(
        [string]$Host,
        [string]$Port,
        [string]$User,
        [string]$Password,
        [string]$Database,
        [string]$Script,
        [string]$Mode = "host",
        [string]$ContainerName = $null
    )

    if ($Mode -eq "docker") {
        if (-not $ContainerName) {
            Throw-Error "Container name is required when running psql inside Docker."
        }
        $dockerArgs = @("exec", "-i", "-e", "PGPASSWORD=$Password", $ContainerName, "psql", "-h", $Host, "-p", $Port, "-U", $User, "-d", $Database, "-v", "ON_ERROR_STOP=1")
        $Script | & docker @dockerArgs > $null 2>&1
        return $LASTEXITCODE -eq 0
    }

    if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
        return $false
    }

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
    $dbHost = Get-EnvValue "DATABASE_HOST" "localhost"
    $dbPort = Get-EnvValue "DATABASE_PORT" "5432"
    $dbUser = Get-EnvValue "DATABASE_USERNAME" "annix_user"
    $dbPass = Get-EnvValue "DATABASE_PASSWORD" "annix_password"
    $dbName = Get-EnvValue "DATABASE_NAME" "annix_db"
    $psqlMode = "host"
    $dockerContainer = if ($env:POSTGRES_CONTAINER_NAME) { $env:POSTGRES_CONTAINER_NAME } else { "annix-postgres" }

    if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
        if ($env:USE_DOCKER_POSTGRES -eq "1") {
            $psqlMode = "docker"
            Write-Info "psql not found on host; using docker exec into $dockerContainer for provisioning."
        }
        else {
            Write-Info "psql not found; skipping automatic database provisioning (install PostgreSQL or enable Docker Postgres)."
            return
        }
    }

    $psqlHost = $dbHost
    $psqlPort = $dbPort
    if ($psqlMode -eq "docker") {
        $psqlHost = "localhost"
        $psqlPort = "5432"
    }

    if (Test-DbConnection -Host $psqlHost -Port $psqlPort -User $dbUser -Password $dbPass -Database $dbName -Mode $psqlMode -ContainerName $dockerContainer) {
        Write-Info "Database $dbName already accessible as $dbUser."
        return
    }

    $superUser = $env:PG_SUPERUSER
    if ([string]::IsNullOrWhiteSpace($superUser)) { $superUser = "postgres" }
    $superPass = $env:PG_SUPERPASS

    Write-Info "Attempting to provision PostgreSQL role/database via $superUser..."
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

    if (-not (Invoke-PsqlScript -Host $psqlHost -Port $psqlPort -User $superUser -Password $superPass -Database "postgres" -Script $script -Mode $psqlMode -ContainerName $dockerContainer)) {
        Write-Host "[run-dev] Automatic provisioning failed. Set PG_SUPERPASS (and optionally PG_SUPERUSER) if superuser access requires credentials." -ForegroundColor Yellow
        return
    }

    if (Test-DbConnection -Host $psqlHost -Port $psqlPort -User $dbUser -Password $dbPass -Database $dbName -Mode $psqlMode -ContainerName $dockerContainer) {
        Write-Info "Provisioned database $dbName for $dbUser."
    }
    else {
        Write-Host "[run-dev] Provisioning ran but $dbUser still cannot connect. Verify pg_hba.conf or credentials." -ForegroundColor Yellow
    }
}

Use-NodeVersion
Ensure-EnvFile
Load-EnvFile
Ensure-DockerPostgres
Ensure-Database
Install-Backend
Install-Frontend

Write-Info "Logs -> $(Join-Path $RepoRoot $BackendLog) and $(Join-Path $RepoRoot $FrontendLog)"
Start-ServiceJobs
