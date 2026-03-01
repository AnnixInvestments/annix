import { execSync } from "node:child_process";

const port = process.argv[2];
if (!port) {
  process.exit(0);
}

try {
  if (process.platform === "win32") {
    execSync(
      `powershell -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
      { stdio: "ignore" },
    );
  } else {
    execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: "ignore" });
  }
} catch {}
