# Annix Local Development

This repository houses the NestJS API (`annix-backend`) and the Next.js application (`annix-frontend`). The instructions below describe everything that is needed to get both apps running locally on macOS/Linux and Windows without Docker, plus helper scripts that start both services with one command.

> **Current runtime targets**
>
> - Node.js **22.21.1**
> - Yarn **1.22.x** (bundled with the repo)
> - npm **10.x** (ships with Node 22)
> - PostgreSQL **15.x**
> - Bash (for `run-dev.sh`) or PowerShell 5+/7 (for `run-dev.ps1`)

---

## 🎨 New Feature Available: 3D Pipe Visualization

There's an optional **3D visualization feature** ready for review on the `feature/3d-pipe-visualization` branch.

### What It Does
- Interactive 3D previews of pipes and bends in the RFQ form
- Real-time visualization as users configure specifications
- Multiple camera angles, drag-to-rotate, zoom controls
- Shows flanges, welds, dimensions, and material properties

### How to Review & Decide

**Option 1: Try it out first (recommended)**
```bash
# Switch to the feature branch
git checkout feature/3d-pipe-visualization

# Run the app
./run-dev.sh  # or run-dev.ps1

# Navigate to RFQ form → Add Item → Configure a pipe or bend
# The 3D preview appears automatically
```

**Option 2: If you like it - Cherry-pick into main**
```bash
# Switch back to main
git checkout main

# Cherry-pick all 4 commits from the feature branch
git cherry-pick b2826fa 7082c5d a11360e ee2b5fa

# Continue working from main with 3D features included
```

**Option 3: If you don't want it - Just use main**
```bash
# Switch to main and ignore the feature branch
git checkout main

# Continue working normally (no 3D features)
```

### More Information
- **Detailed docs**: See `3D_VISUALIZATION_GUIDE.md` for full usage guide
- **Commits**: 4 clean, logical commits (components → dependencies → docs → integration)
- **Database safe**: No schema changes, safe to switch branches anytime
- **Easily removable**: Delete the feature branch if not needed

---

## Architecture & Ports

### Application Components

| Component | Port | Purpose | URL |
|-----------|------|---------|-----|
| **Frontend** | `3000` | Next.js web application | http://localhost:3000 |
| **Backend API** | `4001` | NestJS REST API | http://localhost:4001 |
| **Swagger UI** | `4001` | API documentation | http://localhost:4001/swagger |
| **PostgreSQL** | `5432` | Database (native or Docker) | localhost:5432 |

### Environment Variables

Key configuration in `annix-backend/.env`:
- `PORT=4001` - Backend API port
- `DATABASE_HOST=localhost` - Database host
- `DATABASE_PORT=5432` - Database port (auto-adjusted for Docker if needed)
- `DATABASE_NAME=annix_db` - Database name
- `DATABASE_USERNAME=annix_user` - Database user
- `DATABASE_PASSWORD=annix_password` - Database password

Frontend automatically connects to backend via `NEXT_PUBLIC_API_URL=http://localhost:4001`

### Docker Configuration

**Optional Docker PostgreSQL** (enabled via `USE_DOCKER_POSTGRES=1`):
- Container name: `annix-postgres`
- Image: `postgres:15`
- Volume: `annix-postgres-data` (persistent storage)
- Port: `5432` (auto-fallback to `55432-55452` if occupied)
- Superuser: `postgres`
- Password: Set via `DOCKER_POSTGRES_PASSWORD` (default: `postgres`)

**Production Docker images** (via `docker-compose.yaml`):
- Backend container: `annix_backend` (exposes port `4000` in prod)
- Frontend container: `annix_frontend`

Docker is completely optional for local development - you can use a native PostgreSQL installation instead.

---

## 1. Pre‑installation Checklist

### Common Requirements

- **Node.js 22.21.1** (via [nvm](https://github.com/nvm-sh/nvm), [nvm-windows](https://github.com/coreybutler/nvm-windows), or the installers from [nodejs.org](https://nodejs.org/en/download/current))
- **PostgreSQL 15** plus the `psql` client on your `PATH` (or enable the Dockerized Postgres option below so the scripts exec `psql` inside the container for you)
- Ability to run shell/PowerShell scripts (`run-dev.sh` or `run-dev.ps1`)

### macOS / Linux

1. Install Postgres and keep it running:
   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   ```
   (If you use another package manager, just ensure `psql` resolves on the command line.)
2. Install Node 22.21.1 (`nvm install 22.21.1` or download from nodejs.org).
3. Copy the backend env file and update only the secrets you care about:
   ```bash
   cp annix-backend/.env.example annix-backend/.env
   ```
4. Make the helper script executable (first run only):
   ```bash
   chmod +x run-dev.sh
   ```

### Windows

1. Install PostgreSQL 15 from the [official installer](https://www.postgresql.org/download/windows/) or via `winget install postgresql`.
2. Ensure `psql.exe` is on your `PATH` (re-open PowerShell after the install so the PATH change applies).
3. Install Node 22.21.1 with [nvm-windows](https://github.com/coreybutler/nvm-windows) or the MSI from nodejs.org.
4. Copy the env template:
   ```powershell
   Copy-Item annix-backend/.env.example annix-backend/.env
   ```
5. Run the helper script with PowerShell 7 (recommended) or Windows PowerShell 5.1.

### Automatic Database Provisioning

Both helper scripts now bootstrap PostgreSQL automatically:

- They check whether `annix_user` / `annix_db` already exist.
- If not, they connect as the Postgres superuser (defaults to `postgres`) and create the role and database for you.
- If your superuser requires a password, set environment variables **before** running the script:
  - macOS/Linux: `export PG_SUPERPASS='your-password'` (and optionally `export PG_SUPERUSER='your-admin-user'`)
  - Windows PowerShell: `$env:PG_SUPERPASS = 'your-password'`
- No manual SQL copy/paste is required; everything is handled automatically when `psql` is available.

### Optional: Run Postgres via Docker

If you prefer not to install PostgreSQL locally but do have Docker running, the helper scripts can spin up a containerized database automatically:

- Set `USE_DOCKER_POSTGRES=1` before invoking `run-dev.sh`/`run-dev.ps1`. The script will create (or restart) a `annix-postgres` container from `postgres:15`, expose it on `localhost:<DATABASE_PORT>` (defaults to 5432), and keep data in the `annix-postgres-data` Docker volume.
- Override `DOCKER_POSTGRES_PASSWORD` to change the container superuser password. The value is also wired into `PG_SUPERPASS` so migrations and provisioning work without any extra steps.
- `POSTGRES_CONTAINER_NAME`, `POSTGRES_CONTAINER_VOLUME`, `POSTGRES_CONTAINER_IMAGE`, and `DOCKER_POSTGRES_PASSWORD` can be customized if you have conflicting names/images already.
- If the requested host port is already in use (for example, a native Postgres instance is still running), the script auto-selects the first free port in the `DOCKER_POSTGRES_PORT_FALLBACK_START`–`DOCKER_POSTGRES_PORT_FALLBACK_END` range (defaults to `55432-55452`) and exports `DATABASE_PORT` for the current run so everything points to the container. Set `DATABASE_PORT` yourself to pin a specific port permanently.
- If you have the `psql` CLI locally, the scripts use it. If not, they automatically exec `psql` inside the container when provisioning the `annix_user`/`annix_db` role and database. Install the CLI locally if you plan to run manual queries outside the helper scripts.
- When you are done developing, stop the container with `docker stop annix-postgres` (or remove it entirely via `docker rm -f annix-postgres` if you no longer need the data volume).

---

## 2. Helper Run Scripts

The scripts perform the following:

1. Ensure the correct Node.js version is active (via `nvm`/`nvm-windows` when available).
2. Verify `annix-backend/.env` exists.
3. Bootstrap PostgreSQL automatically (creates/updates `annix_user` + `annix_db`; honours `PG_SUPERUSER`/`PG_SUPERPASS` if authentication is needed).
4. Install backend & frontend dependencies (`yarn install`, `npm install`).
5. Run backend migrations (`yarn migration:run`).
6. Export `NEXT_PUBLIC_API_URL=http://localhost:4001` (unless you already set another value) so the frontend always targets the running API.
7. Launch both dev servers with output mirrored to the console **and** to log files in the repo root (`backend-dev.log`, `frontend-dev.log`).
8. Terminate both servers when the script exits (Ctrl+C).

### macOS / Linux

```bash
./run-dev.sh
# override defaults if needed:
# NODE_VERSION=22.21.1 BACKEND_LOG=/tmp/api.log FRONTEND_LOG=/tmp/web.log ./run-dev.sh
```

The script provisions the Postgres role/database (if needed), streams both servers’ logs to your terminal, and leaves a copy in `backend-dev.log` / `frontend-dev.log`. Press `Ctrl+C` once to stop both processes. Set `PG_SUPERPASS` (and optionally `PG_SUPERUSER`) beforehand if your local Postgres install prompts for a password.

### Windows

Simplest option: double‑click `run-dev.bat` (or run it from `cmd.exe`) and it will launch `run-dev.ps1` for you. If you prefer PowerShell directly:

```powershell
pwsh -ExecutionPolicy Bypass -File ./run-dev.ps1
# or Windows PowerShell 5.1:
powershell -ExecutionPolicy Bypass -File .\run-dev.ps1
```

Need Docker Postgres instead of a local install? Set the environment variables in the same PowerShell session before launching the script, e.g.:

```powershell
$env:USE_DOCKER_POSTGRES = '1'
$env:DOCKER_POSTGRES_PASSWORD = 'super-secret'
pwsh -ExecutionPolicy Bypass -File ./run-dev.ps1
```

The PowerShell helper will create (or reuse) the container, auto-select a free port if 5432 is taken, and run `psql` via `docker exec` whenever you don’t have the CLI installed locally.

Both entry points do the same thing: provision Postgres, install dependencies, and keep both apps running until you close the window/press `Ctrl+C`. Define `$env:PG_SUPERPASS` before running if your Postgres superuser needs a password.

If you already have Postgres/Node running remotely you can adjust the environment variables inside `annix-backend/.env` before invoking the scripts.

---

## 3. Manual Workflow (if you prefer not to use the scripts)

1. **Backend**
   ```bash
   cd annix-backend
   yarn install
   yarn migration:run
   yarn start:dev
   ```
   - API listens on `http://localhost:4001`.
   - Swagger UI is available at `http://localhost:4001/swagger`.

2. **Frontend**
   ```bash
   cd annix-frontend
   npm install
   npm run dev
   ```
   - App listens on `http://localhost:3000`.

3. **Quick API smoke test**
   ```bash
   ./test_backend_data.sh
   ```

---

## 4. Cross-Platform Development

### Automatic Lock File Management

This project supports development on both **macOS** and **Windows**. Lock files (`yarn.lock` and `package-lock.json`) contain platform-specific dependencies that are automatically managed.

**What happens automatically:**
- When you `git pull` changes, lock files are regenerated for your platform
- Git hooks ensure you always have the correct binaries for your OS
- No more merge conflicts on platform-specific packages (e.g., `@img/sharp-darwin-arm64` vs `@img/sharp-win32-x64`)

**How it works:**
1. Pull changes normally: `git pull`
2. Post-merge hook runs automatically and regenerates lock files
3. Commit the regenerated files: `git commit -am "Update lock files"`
4. Push your changes: `git push`

**Manual regeneration (if needed):**
```bash
# Frontend
cd annix-frontend && yarn install --check-files

# Backend
cd annix-backend && npm install
```

For more details, see [CROSS_PLATFORM_SETUP.md](./CROSS_PLATFORM_SETUP.md).

---

## 5. Troubleshooting

- **Postgres connection errors** – confirm the `annix_user/annix_password` credentials in `annix-backend/.env` match your local Postgres role and that the instance is listening on `localhost:5432`. Use `pg_isready -h localhost -p 5432` (macOS/Linux) or `psql -h localhost -U annix_user annix_db -c "SELECT 1;"` (Windows) to verify connectivity. If automatic provisioning fails because your Postgres superuser needs a password, export `PG_SUPERPASS` (and `PG_SUPERUSER` if you changed the default) before rerunning the script.
- **Node version warnings** – both apps rely on ES modules and features that require Node 22+. If you cannot install Node 22 system-wide, run the scripts with `NODE_VERSION=<version>` plus `nvm install <version>` beforehand.
- **Port conflicts** – override `PORT` in `annix-backend/.env` and `PORT` in `annix-frontend/.env.local` (create if necessary), then restart the scripts.
- **Log files** – both helper scripts rotate `backend-dev.log` and `frontend-dev.log` on each run. Use `tail -f backend-dev.log` or `Get-Content -Path backend-dev.log -Wait` to inspect past runs.

With the instructions above, everything touched in this assistant session can be committed on a new branch and shared without any additional manual steps.
