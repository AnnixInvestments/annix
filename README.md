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

## 1. Pre‑installation Checklist

### Common Requirements

- **Node.js 22.21.1** (via [nvm](https://github.com/nvm-sh/nvm), [nvm-windows](https://github.com/coreybutler/nvm-windows), or the installers from [nodejs.org](https://nodejs.org/en/download/current))
- **PostgreSQL 15** plus the `psql` client on your `PATH`
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

## 4. Troubleshooting

- **Postgres connection errors** – confirm the `annix_user/annix_password` credentials in `annix-backend/.env` match your local Postgres role and that the instance is listening on `localhost:5432`. Use `pg_isready -h localhost -p 5432` (macOS/Linux) or `psql -h localhost -U annix_user annix_db -c "SELECT 1;"` (Windows) to verify connectivity. If automatic provisioning fails because your Postgres superuser needs a password, export `PG_SUPERPASS` (and `PG_SUPERUSER` if you changed the default) before rerunning the script.
- **Node version warnings** – both apps rely on ES modules and features that require Node 22+. If you cannot install Node 22 system-wide, run the scripts with `NODE_VERSION=<version>` plus `nvm install <version>` beforehand.
- **Port conflicts** – override `PORT` in `annix-backend/.env` and `PORT` in `annix-frontend/.env.local` (create if necessary), then restart the scripts.
- **Log files** – both helper scripts rotate `backend-dev.log` and `frontend-dev.log` on each run. Use `tail -f backend-dev.log` or `Get-Content -Path backend-dev.log -Wait` to inspect past runs.

With the instructions above, everything touched in this assistant session can be committed on a new branch and shared without any additional manual steps.
