# Windows Dev Setup (Parallels or native Windows)

How to get the Annix stack running locally on a Windows machine, pointed at a remote
MongoDB environment (production / staging / test) via the dev swarm. Written after
getting a fresh Parallels Windows VM working; follow it top to bottom.

> No secrets live in this file. The connection strings and the Fly token come from the
> **Secure Documents** area in the admin portal (document **FLY_DEPLOYMENT_TECHNICAL_DOCS**,
> "Secret Things" folder). Never paste tokens or connection strings into the repo.

## 0. Machine resources (Parallels VMs especially)

The full stack runs a NestJS backend (`nest start --watch`) and a Next.js frontend
(`next dev`) at the same time, both with watch-mode compilers.

- **RAM: 12 GB minimum, 16 GB recommended.** On 8 GB the first compile thrashes swap and
  takes ~5 minutes instead of seconds. In Parallels: shut the VM down, **Configure >
  Hardware > CPU & Memory**, raise memory (keep it under ~half the Mac's physical RAM).
- **CPU: 4 cores minimum**, more is better.
- **Put the repo on the VM's own disk** (e.g. `C:\dev\annix`), never on a Parallels
  shared folder (`\\Mac\...`, `Z:` etc.). Compiling off a shared folder is very slow.

## 1. Prerequisites

- **Node** via nvm-windows (the matching version in `.nvmrc` / `package.json` engines).
- **pnpm** via corepack: `corepack enable`.
- **Git**, and **GitHub CLI** (`gh`) if you'll push.
- **PowerShell 7+** recommended (Windows PowerShell 5.1 also works).
- **Microsoft Visual C++ Redistributable (x64)** - needed by native toolchain binaries
  (Biome ships a native `biome.exe`). An established dev machine already has it; only a
  brand-new Windows install is likely to be missing it. See troubleshooting if Biome fails
  to load. Install with `winget install --id Microsoft.VCRedist.2015+.x64 -e`.
- **Python 3** - the git hooks' timing helper (`timer.sh`) calls `python3` for millisecond
  timestamps when GNU `gdate` is absent (which it is on Windows). Without it, `git push`
  dies immediately with "Python was not found". Install with
  `winget install --id Python.Python.3.12 -e`. On **Windows-on-ARM** (Parallels on Apple
  Silicon), winget installs ARM64 Python that ships only `python.exe`; create the alias the
  hook expects with: `Copy-Item "$env:LOCALAPPDATA\Programs\Python\Python312-arm64\python.exe" "$env:LOCALAPPDATA\Programs\Python\Python312-arm64\python3.exe"`.
  Verify `python3 --version` prints a version (if it still shows the Store stub, disable the
  `python`/`python3` App Execution Aliases in Settings, or put the Python dir ahead of
  `WindowsApps` on PATH).

## 2. Clone and install

```powershell
git clone <repo-url> C:\dev\annix
cd C:\dev\annix
pnpm install
```

## 3. Install and authenticate flyctl

The swarm pulls each environment's secrets straight off the running Fly machine, so you
need `flyctl` installed and authenticated.

```powershell
# install (adds fly to PATH for NEW terminals)
iwr https://fly.io/install.ps1 -useb | iex
```

Then authenticate. Either:

- **Interactive:** open a new terminal and run `fly auth login`, or
- **Token (non-interactive):** copy `FLY_API_TOKEN` from the FLY_DEPLOYMENT_TECHNICAL_DOCS
  secure document and, in the same terminal you'll run setup from:

  ```powershell
  $env:FLY_API_TOKEN = "<token from secure docs>"
  $env:PATH = "$env:USERPROFILE\.fly\bin;$env:PATH"
  fly auth whoami   # should print a token identity, org 'annix'
  ```

## 4. Generate the environment profile

The swarm config (`.claude-swarm/config.json`) defines three profiles: `production`,
`staging`, `test`. Each one fetches its secrets from the matching Fly app
(`annix-app`, `annix-app-staging`, `annix-app-test`).

```powershell
# fly must be on PATH (and FLY_API_TOKEN set if you used the token route)
pnpm env:setup production    # or staging / test
```

This writes `annix-backend/configs/production.env` (gitignored). Re-run it whenever the
remote secrets rotate. List generated profiles with `pnpm env:list`.

> Which environment? `staging` (cluster refreshed daily from prod) is the safe default for
> local work. `production` is LIVE customer data; local code reads **and writes** it.

## 5. Keep `annix-backend/.env` free of DB / secret vars

`annix-backend/src/load-env.ts` calls dotenv with `override: true`, so anything in
`annix-backend/.env` **overrides** the profile the swarm injects. If `.env` carries
`DATABASE_DRIVER` / `MONGODB_URI` / secrets, your `--profile` choice is silently ignored.

Keep `.env` empty (or comment-only) so the profile wins. There is no `.env` on the Fly
apps, which is why this only bites locally. (`.env` and `.env.backup` are gitignored.)

## 6. Start the stack with a profile

```powershell
npx claude-swarm start --profile production     # or: restart --profile <env>
```

The first start does a full compile and can take a few minutes on a fresh checkout
(the backend ready-timeout is set to 6 minutes for this reason). Watch the logs:

- Backend: `logs/backend.log`  ·  Frontend: `logs/frontend.log`  ·  Combined: `logs/annix.log`
- Success looks like: `[NestApplication] Nest application successfully started` and
  `MongooseModule dependencies initialized` (Mongo, not TypeORM).
- Health check: `curl http://localhost:4001/health` returns `ok`.

Other swarm commands: `npx claude-swarm status | stop | restart | logs`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ECONNREFUSED 10.211.55.2:55432` and `[TypeOrmModule] Unable to connect` at runtime, even with `DATABASE_DRIVER=mongo` | Stale compiled `dist/` from before the Mongo migration, run by the watch compiler because its incremental cache looked up-to-date | Stop the backend, delete `annix-backend\dist`, restart. It recompiles fresh and picks up the Mongo path. |
| Backend gets killed ~3 minutes into startup | Swarm `readyTimeoutMs` shorter than the first compile on a slow machine | Already raised to 360000 in `.claude-swarm/config.json`; raise further if needed. |
| First compile takes ~5 minutes; machine sluggish | VM is RAM-starved (8 GB) and swapping | Raise VM memory (section 0). |
| `pnpm env:setup` says "No secrets fetched ... authenticate with fly auth login" | `fly` not on PATH or not authenticated | Re-do section 3 in the same terminal you run setup from. |
| Backend connects to the wrong database | DB vars in `annix-backend/.env` overriding the profile | Empty `.env` (section 5). |
| Biome fails with `node.exe: error while loading shared libraries` / exit 127, blocking the pre-commit and pre-push hooks (`node` and `pnpm` themselves work fine) | The native `biome.exe` can't load because the Microsoft VC++ Redistributable is missing - only happens on a brand-new Windows install | `winget install --id Microsoft.VCRedist.2015+.x64 -e`. Confirm `npx @biomejs/biome --version` then prints a version. |
| `git push` fails instantly with "Python was not found" and no build output | The pre-push `timer.sh` calls `python3`, which is missing (or only the Store stub exists) | Install Python 3 and ensure `python3` resolves (see Prerequisites). On ARM, add the `python3.exe` copy. |

## Notes

- Do not run `pnpm build` / `nest start` / `next dev` directly while the swarm is active;
  it manages the dev servers and stray builds corrupt the caches.
- `fly secrets list` only shows secret names, not values. The swarm reads real values via
  `fly ssh console -a <app> -C "printenv <VAR>"`, which is why the Fly machine must be up
  and you must be authenticated.
