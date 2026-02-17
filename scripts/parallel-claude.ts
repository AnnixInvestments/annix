#!/usr/bin/env npx ts-node

import { type ChildProcess, execSync, spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface, emitKeypressEvents, type Key } from "node:readline";
import { checkbox, confirm, input, select } from "@inquirer/prompts";
import chalk from "chalk";

const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const log = {
  debug: (message: string) => {
    if (LOG_LEVELS[LOG_LEVEL as keyof typeof LOG_LEVELS] <= LOG_LEVELS.debug) {
      console.log(chalk.dim(message));
    }
  },
  info: (message: string) => {
    if (LOG_LEVELS[LOG_LEVEL as keyof typeof LOG_LEVELS] <= LOG_LEVELS.info) {
      console.log(chalk.green(message));
    }
  },
  warn: (message: string) => {
    if (LOG_LEVELS[LOG_LEVEL as keyof typeof LOG_LEVELS] <= LOG_LEVELS.warn) {
      console.log(chalk.yellow(message));
    }
  },
  error: (message: string) => {
    console.error(chalk.red(message));
  },
  print: (message: string = "") => {
    console.log(message);
  },
};

interface AppAdapter {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  kill(): Promise<void>;
  isRunning(): Promise<boolean>;
}

interface AppAdapterConfig {
  name: string;
  start: string;
  stop: string;
  kill: string;
  readyPattern?: string;
}

interface ParallelClaudeConfig {
  branchPrefix?: string;
  apps?: AppAdapterConfig[];
}

interface Branch {
  name: string;
  isLocal: boolean;
  isRemote: boolean;
  ahead: number;
  behind: number;
  lastCommit: string;
  lastCommitTime: string;
}

interface ProjectConfig {
  name: string;
  path: string;
  worktreeDir?: string;
}

interface ProjectsConfig {
  projects: ProjectConfig[];
  defaultProject?: string;
}

interface Session {
  pid: number;
  name: string;
  branch: string;
  project: string;
  status: "working" | "complete" | "error" | "idle";
  lastActivity: string;
  tty: string | null;
  isOrphaned: boolean;
}

const DEFAULT_ROOT_DIR = join(__dirname, "..");
const PROJECTS_CONFIG_FILE = join(DEFAULT_ROOT_DIR, ".parallel-claude-projects.json");
const APP_LOG_FILE = join(DEFAULT_ROOT_DIR, ".parallel-claude-app.log");
const PARALLEL_CLAUDE_CONFIG_FILE = join(DEFAULT_ROOT_DIR, ".parallel-claude.json");

let currentProject: ProjectConfig = {
  name: "project",
  path: DEFAULT_ROOT_DIR,
  worktreeDir: join(DEFAULT_ROOT_DIR, "..", "project-worktrees"),
};

function rootDir(): string {
  return currentProject.path;
}

function worktreeDir(): string {
  return (
    currentProject.worktreeDir ??
    join(currentProject.path, "..", `${currentProject.name.toLowerCase()}-worktrees`)
  );
}

function loadParallelClaudeConfig(): ParallelClaudeConfig {
  if (!existsSync(PARALLEL_CLAUDE_CONFIG_FILE)) {
    return {};
  }

  try {
    const content = readFileSync(PARALLEL_CLAUDE_CONFIG_FILE, "utf-8");
    return JSON.parse(content) as ParallelClaudeConfig;
  } catch {
    log.error("Failed to load .parallel-claude.json, using defaults");
    return {};
  }
}

function claudeBranchPrefix(): string {
  const config = loadParallelClaudeConfig();
  return config.branchPrefix ?? "claude/";
}

function loadProjectsConfig(): ProjectsConfig {
  if (!existsSync(PROJECTS_CONFIG_FILE)) {
    const projectName = DEFAULT_ROOT_DIR.split("/").pop() ?? "project";
    const defaultConfig: ProjectsConfig = {
      projects: [
        {
          name: projectName,
          path: DEFAULT_ROOT_DIR,
          worktreeDir: join(DEFAULT_ROOT_DIR, "..", `${projectName.toLowerCase()}-worktrees`),
        },
      ],
      defaultProject: projectName,
    };
    saveProjectsConfig(defaultConfig);
    return defaultConfig;
  }

  try {
    const content = readFileSync(PROJECTS_CONFIG_FILE, "utf-8");
    return JSON.parse(content) as ProjectsConfig;
  } catch {
    log.error("Failed to load projects config, using defaults");
    return {
      projects: [
        {
          name: DEFAULT_ROOT_DIR.split("/").pop() ?? "project",
          path: DEFAULT_ROOT_DIR,
        },
      ],
    };
  }
}

function saveProjectsConfig(config: ProjectsConfig): void {
  try {
    writeFileSync(PROJECTS_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch {
    log.error("Failed to save projects config");
  }
}

function addProject(project: ProjectConfig): void {
  const config = loadProjectsConfig();
  const existingIndex = config.projects.findIndex((p) => p.path === project.path);
  if (existingIndex >= 0) {
    config.projects[existingIndex] = project;
  } else {
    config.projects.push(project);
  }
  saveProjectsConfig(config);
}

function setCurrentProject(project: ProjectConfig): void {
  currentProject = project;
}

async function selectProjectForSession(): Promise<ProjectConfig | null> {
  const config = loadProjectsConfig();

  const choices = [
    ...config.projects.map((p) => ({
      name: `${p.name} ${chalk.dim(`(${p.path})`)}`,
      value: p.path,
    })),
    { name: chalk.green("+ Add another project"), value: "add-new" },
    { name: chalk.dim("← Cancel"), value: "cancel" },
  ];

  const selected = await selectWithEscape("Select project for this session:", choices, "cancel");

  if (selected === "cancel") {
    return null;
  }

  if (selected === "add-new") {
    const projectPath = await input({
      message: "Enter full path to project:",
      validate: (val) => {
        if (!val.trim()) return "Path required";
        if (!existsSync(val.trim())) return "Path does not exist";
        if (!existsSync(join(val.trim(), ".git"))) return "Not a git repository";
        return true;
      },
    });

    const trimmedPath = projectPath.trim();
    const defaultName = trimmedPath.split("/").pop() || "Project";

    const projectName = await input({
      message: "Project name:",
      default: defaultName,
      validate: (val) => (val.trim() ? true : "Name required"),
    });

    const worktreeDirPath = await input({
      message: "Worktree directory (leave blank for default):",
      default: join(trimmedPath, "..", `${projectName.trim().toLowerCase()}-worktrees`),
    });

    const newProject: ProjectConfig = {
      name: projectName.trim(),
      path: trimmedPath,
      worktreeDir: worktreeDirPath.trim() || undefined,
    };

    addProject(newProject);
    log.info(`✓ Added project: ${newProject.name}`);

    return newProject;
  }

  const project = config.projects.find((p) => p.path === selected);
  return project ?? null;
}

function exec(cmd: string, options: { cwd?: string; silent?: boolean } = {}): string {
  try {
    return execSync(cmd, {
      cwd: options.cwd ?? rootDir(),
      encoding: "utf-8",
      stdio: options.silent ? "pipe" : ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    if (!options.silent) {
      log.error(`Command failed: ${cmd}`);
      const stderr = (error as { stderr?: string })?.stderr?.toString().trim();
      if (stderr) {
        log.error(stderr);
      }
    }
    return "";
  }
}

class NullAdapter implements AppAdapter {
  readonly name = "null";

  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async kill(): Promise<void> {}
  async isRunning(): Promise<boolean> {
    return false;
  }
}

class NestAdapter implements AppAdapter {
  readonly name = "nest";

  async start(): Promise<void> {
    exec("nest start --watch", { silent: false });
  }

  async stop(): Promise<void> {
    exec('pkill -f "nest.*start" 2>/dev/null || true', { silent: true });
  }

  async kill(): Promise<void> {
    exec('pkill -9 -f "nest.*start" 2>/dev/null || true', { silent: true });
  }

  async isRunning(): Promise<boolean> {
    return exec('pgrep -f "nest.* start" 2>/dev/null', { silent: true }) !== "";
  }
}

class NextAdapter implements AppAdapter {
  readonly name = "next";

  async start(): Promise<void> {
    exec("next dev", { silent: false });
  }

  async stop(): Promise<void> {
    exec('pkill -f "next dev" 2>/dev/null || true', { silent: true });
  }

  async kill(): Promise<void> {
    exec('pkill -9 -f "next dev" 2>/dev/null || true', { silent: true });
  }

  async isRunning(): Promise<boolean> {
    return exec('pgrep -f "next dev" 2>/dev/null', { silent: true }) !== "";
  }
}

class ViteAdapter implements AppAdapter {
  readonly name = "vite";

  async start(): Promise<void> {
    exec("vite", { silent: false });
  }

  async stop(): Promise<void> {
    exec('pkill -f "vite" 2>/dev/null || true', { silent: true });
  }

  async kill(): Promise<void> {
    exec('pkill -9 -f "vite" 2>/dev/null || true', { silent: true });
  }

  async isRunning(): Promise<boolean> {
    return exec('pgrep -f "vite" 2>/dev/null', { silent: true }) !== "";
  }
}

class CommandAdapter implements AppAdapter {
  readonly name: string;
  private startCmd: string;
  private stopCmd: string;
  private killCmd: string;
  private readyPattern: string | null;

  constructor(config: AppAdapterConfig) {
    this.name = config.name;
    this.startCmd = config.start;
    this.stopCmd = config.stop;
    this.killCmd = config.kill;
    this.readyPattern = config.readyPattern ?? null;
  }

  async start(): Promise<void> {
    exec(this.startCmd, { silent: false });
  }

  async stop(): Promise<void> {
    if (this.stopCmd.startsWith("signal:")) {
      const signal = this.stopCmd.replace("signal:", "");
      exec(`pkill -${signal} -f "${this.startCmd}" 2>/dev/null || true`, { silent: true });
    } else {
      exec(this.stopCmd, { silent: true });
    }
  }

  async kill(): Promise<void> {
    if (this.killCmd.startsWith("signal:")) {
      const signal = this.killCmd.replace("signal:", "");
      exec(`pkill -${signal} -f "${this.startCmd}" 2>/dev/null || true`, { silent: true });
    } else {
      exec(this.killCmd, { silent: true });
    }
  }

  async isRunning(): Promise<boolean> {
    if (this.readyPattern) {
      const output = exec(`pgrep -af "${this.startCmd}" 2>/dev/null`, { silent: true });
      return output !== "";
    }
    return exec(`pgrep -f "${this.startCmd}" 2>/dev/null`, { silent: true }) !== "";
  }
}

function buildAdapters(): AppAdapter[] {
  const config = loadParallelClaudeConfig();

  if (config.apps && config.apps.length > 0) {
    return config.apps.map((appConfig) => new CommandAdapter(appConfig));
  }

  const hasRunDevSh = existsSync(join(rootDir(), "run-dev.sh"));
  const hasRunDevPs1 = existsSync(join(rootDir(), "run-dev.ps1"));

  if (hasRunDevSh || hasRunDevPs1) {
    return [new ScriptAdapter()];
  }

  return [new NullAdapter()];
}

let appProcess: ChildProcess | null = null;

class ScriptAdapter implements AppAdapter {
  readonly name = "script";

  async start(): Promise<void> {
    await startAppFromScript();
  }

  async stop(): Promise<void> {
    await stopAppFromScript();
  }

  async kill(): Promise<void> {
    await stopAppFromScript();
  }

  async isRunning(): Promise<boolean> {
    return legacyAppProcessStatus().backend || legacyAppProcessStatus().frontend;
  }
}

function legacyAppProcessStatus(): { backend: boolean; frontend: boolean } {
  const isWindows = process.platform === "win32";

  if (isWindows) {
    const netstat = exec("netstat -ano", { silent: true });
    const lines = netstat.split("\n");
    const backend = lines.some((line) => line.includes(":4001") && line.includes("LISTENING"));
    const frontend = lines.some((line) => line.includes(":3000") && line.includes("LISTENING"));
    return { backend, frontend };
  } else {
    const backend = exec('pgrep -f "nest.* start" 2>/dev/null', { silent: true }) !== "";
    const frontend = exec('pgrep -f "next dev" 2>/dev/null', { silent: true }) !== "";
    return { backend, frontend };
  }
}

function isAnyAdapterRunning(): boolean {
  const status = legacyAppProcessStatus();
  return status.backend || status.frontend;
}

function currentBranch(): string {
  return exec("git branch --show-current");
}

function claudeBranches(): Branch[] {
  const prefix = claudeBranchPrefix();
  const localOutput = exec(
    'git branch --format="%(refname:short)|%(committerdate:relative)|%(subject)"',
  );
  const localBranches = localOutput.split("\n").filter((line) => line.trim());

  return localBranches
    .filter((line) => line.startsWith(prefix))
    .map((line) => {
      const [name, time, subject] = line.split("|");

      const aheadCount = exec(`git rev-list --count main..${name}`, { silent: true });
      const behindCount = exec(`git rev-list --count ${name}..main`, { silent: true });

      return {
        name,
        isLocal: true,
        isRemote: false,
        ahead: parseInt(aheadCount, 10) || 0,
        behind: parseInt(behindCount, 10) || 0,
        lastCommit: subject || "",
        lastCommitTime: time || "",
      };
    });
}

function allBranches(): string[] {
  const output = exec('git branch --format="%(refname:short)"');
  return output.split("\n").filter((line) => line.trim());
}

function formatBranchDisplay(branch: Branch, current: string): string {
  const isCurrent = branch.name === current;
  const marker = isCurrent ? chalk.green("●") : chalk.dim("○");
  const name = isCurrent ? chalk.green(branch.name) : branch.name;

  let status = "";
  if (branch.ahead > 0 && branch.behind > 0) {
    status = chalk.yellow(`↑${branch.ahead} ↓${branch.behind}`);
  } else if (branch.ahead > 0) {
    status = chalk.green(`↑${branch.ahead} ahead`);
  } else if (branch.behind > 0) {
    status = chalk.red(`↓${branch.behind} behind`);
  } else {
    status = chalk.dim("up to date");
  }

  const time = branch.lastCommitTime ? chalk.dim(`(${branch.lastCommitTime})`) : "";

  return `${marker} ${name} ${status} ${time}`;
}

function detectClaudeSessions(): Session[] {
  const seenPids = new Set<number>();

  try {
    const platform = process.platform;

    if (platform === "darwin" || platform === "linux") {
      const output = exec(
        'ps -eo pid,tty,command | grep -E "[c]laude" | grep -v "parallel-claude"',
        { silent: true },
      );
      const lines = output.split("\n").filter((line) => line.trim());

      return lines.reduce<Session[]>((sessions, line) => {
        const match = line.trim().match(/^(\d+)\s+(\S+)\s+(.*)$/);
        if (!match) return sessions;

        const pid = parseInt(match[1], 10);
        const tty = match[2];
        const command = match[3];

        if (seenPids.has(pid)) return sessions;
        if (!command.includes("claude")) return sessions;
        seenPids.add(pid);

        const isOrphaned = tty === "??" || tty === "?";

        let branch = "unknown";
        let cwd = "";
        let project = "unknown";

        const lsofOutput = exec(`lsof -p ${pid} 2>/dev/null | grep cwd | head -1`, {
          silent: true,
        });
        const cwdMatch = lsofOutput.match(/\s(\/\S+)$/);
        if (cwdMatch) {
          cwd = cwdMatch[1];
          const branchOutput = exec(`git -C "${cwd}" branch --show-current 2>/dev/null`, {
            silent: true,
          });
          if (branchOutput) {
            branch = branchOutput;
          }
          const repoRoot = exec(`git -C "${cwd}" rev-parse --show-toplevel 2>/dev/null`, {
            silent: true,
          });
          if (repoRoot) {
            project = repoRoot.split("/").pop() || "unknown";
          }
        }

        return [
          ...sessions,
          {
            pid,
            name: cwd ? cwd.split("/").pop() || "unknown" : `PID ${pid}`,
            branch,
            project,
            status: "working",
            lastActivity: "active",
            tty: isOrphaned ? null : tty,
            isOrphaned,
          },
        ];
      }, []);
    } else if (platform === "win32") {
      const output = exec("tasklist /v /fo csv", { silent: true });
      const lines = output
        .split("\n")
        .filter(
          (line) => line.toLowerCase().includes("claude") && !line.includes("parallel-claude"),
        );

      return lines.reduce<Session[]>((sessions, line) => {
        const match = line.match(/"([^"]+)","(\d+)"/);
        if (!match) return sessions;

        const processName = match[1];
        const pid = parseInt(match[2], 10);
        if (Number.isNaN(pid) || seenPids.has(pid)) return sessions;
        if (!processName.toLowerCase().includes("claude")) return sessions;
        seenPids.add(pid);

        const hasConsole =
          exec(
            `powershell -Command "(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).MainWindowHandle -ne 0"`,
            { silent: true },
          ).trim() === "True";

        return [
          ...sessions,
          {
            pid,
            name: `PID ${pid}`,
            branch: "unknown",
            project: "unknown",
            status: "working",
            lastActivity: "active",
            tty: hasConsole ? "console" : null,
            isOrphaned: !hasConsole,
          },
        ];
      }, []);
    }
  } catch {
    log.error("Session detection failed");
  }

  return [];
}

function killExternalProcess(pid: number, force: boolean = false): boolean {
  try {
    const platform = process.platform;
    if (platform === "win32") {
      try {
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: "pipe" });
      } catch {
        execSync(
          `powershell -Command "Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue"`,
          { stdio: "pipe" },
        );
      }
    } else {
      process.kill(pid, force ? "SIGKILL" : "SIGTERM");
    }
    return true;
  } catch {
    return false;
  }
}

function killMultipleProcesses(
  pids: number[],
  force: boolean = false,
): { killed: number[]; failed: number[] } {
  return pids.reduce<{ killed: number[]; failed: number[] }>(
    (result, pid) => {
      if (killExternalProcess(pid, force)) {
        return { ...result, killed: [...result.killed, pid] };
      }
      return { ...result, failed: [...result.failed, pid] };
    },
    { killed: [], failed: [] },
  );
}

const terminalWidth = () => process.stdout.columns || 80;
const boxContentWidth = () => terminalWidth() - 2;

function printHeader(): void {
  process.stdout.write("\x1b[2J\x1b[H");
  const width = boxContentWidth();
  log.print(chalk.bold.cyan(`┌${"─".repeat(width)}┐`));
  const title = "  Parallel Claude";
  log.print(
    chalk.bold.cyan("│") +
      chalk.bold(title) +
      " ".repeat(width - title.length) +
      chalk.bold.cyan("│"),
  );
  log.print(chalk.bold.cyan(`├${"─".repeat(width)}┤`));
}

function printFooter(): void {
  log.print(chalk.bold.cyan(`└${"─".repeat(boxContentWidth())}┘`));
}

function printSection(title: string): void {
  const width = boxContentWidth();
  const text = `  ${title}`;
  log.print(
    chalk.bold.cyan("│") +
      chalk.bold(text) +
      " ".repeat(width - text.length) +
      chalk.bold.cyan("│"),
  );
}

function printBoxLine(content: string, indent: number = 2): void {
  const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "");
  const cleanContent = stripAnsi(content);
  const width = boxContentWidth();
  const maxWidth = width - indent;

  if (cleanContent.length > maxWidth) {
    const truncated = `${cleanContent.slice(0, maxWidth - 1)}…`;
    log.print(chalk.bold.cyan("│") + " ".repeat(indent) + truncated + chalk.bold.cyan("│"));
  } else {
    const padding = maxWidth - cleanContent.length;
    log.print(
      chalk.bold.cyan("│") +
        " ".repeat(indent) +
        content +
        " ".repeat(padding) +
        chalk.bold.cyan("│"),
    );
  }
}

function printEmptyLine(): void {
  log.print(chalk.bold.cyan("│") + " ".repeat(boxContentWidth()) + chalk.bold.cyan("│"));
}

async function switchToBranch(branch: string): Promise<void> {
  log.warn(`\nSwitching to ${branch}...`);

  const result = exec(`git checkout ${branch}`);
  if (result !== undefined) {
    log.info(`✓ Switched to ${branch}`);
  }
}

async function rebaseBranch(branch: string): Promise<boolean> {
  log.warn(`\nRebasing ${branch} onto main...`);

  exec("git fetch origin");

  const current = currentBranch();
  if (current !== branch) {
    exec(`git checkout ${branch}`);
  }

  try {
    execSync("git rebase origin/main", { cwd: rootDir(), stdio: "inherit" });
    log.info(`✓ Rebased ${branch} onto main`);
    return true;
  } catch {
    log.error("✗ Rebase failed. Resolve conflicts and run: git rebase --continue");
    return false;
  }
}

async function mergeBranch(branch: string): Promise<boolean> {
  log.warn(`\nMerging ${branch} to main (fast-forward)...`);

  exec("git checkout main");
  exec("git fetch origin");

  try {
    execSync("git rebase origin/main", { cwd: rootDir(), stdio: "inherit" });
  } catch {
    log.error("✗ Failed to sync main with origin. Resolve conflicts first.");
    return false;
  }

  try {
    execSync(`git merge --ff-only ${branch}`, { cwd: rootDir(), stdio: "inherit" });
    log.info(`✓ Merged ${branch} to main`);
    return true;
  } catch {
    log.error("✗ Fast-forward merge failed. Branch may need rebasing first.");
    return false;
  }
}

async function pullChanges(): Promise<void> {
  const branch = currentBranch();
  const adapters = buildAdapters();
  const appWasRunning =
    appProcess !== null || (await Promise.all(adapters.map((a) => a.isRunning()))).some(Boolean);

  const headBefore = exec("git rev-parse HEAD", { silent: true });

  log.warn(`\nPulling changes for ${branch}...`);
  exec("git fetch origin");

  const hasChanges = exec("git status --porcelain", { silent: true }) !== "";
  let stashed = false;

  if (hasChanges) {
    log.info("Stashing local changes...");
    try {
      execSync('git stash push -m "parallel-claude auto-stash"', { cwd: rootDir(), stdio: "pipe" });
      stashed = true;
    } catch {
      log.error("✗ Failed to stash changes");
      await confirm({ message: "Press Enter to continue...", default: true });
      return;
    }
  }

  try {
    execSync(`git pull --rebase origin ${branch}`, { cwd: rootDir(), stdio: "inherit" });
    log.info(`✓ Pulled latest changes for ${branch}`);
  } catch (error) {
    const errorMsg = (error as { stderr?: Buffer })?.stderr?.toString() || "";
    log.error(`✗ Pull failed${errorMsg ? `: ${errorMsg.trim()}` : ""}`);
    if (stashed) {
      log.info("Restoring stashed changes...");
      exec("git stash pop", { silent: true });
    }
    await confirm({ message: "Press Enter to continue...", default: true });
    return;
  }

  if (stashed) {
    log.info("Restoring stashed changes...");
    try {
      execSync("git stash pop", { cwd: rootDir(), stdio: "pipe" });
      log.info("✓ Local changes restored");
    } catch {
      log.warn('⚠ Could not auto-restore stashed changes. Run "git stash pop" manually.');
      await confirm({ message: "Press Enter to continue...", default: true });
    }
  }

  const headAfter = exec("git rev-parse HEAD", { silent: true });
  if (headBefore === headAfter) {
    log.info("Already up to date.");
    return;
  }

  const changedFiles = exec(`git diff --name-only ${headBefore}..${headAfter}`, { silent: true });

  const depsChanged =
    changedFiles.includes("package.json") || changedFiles.includes("pnpm-lock.yaml");
  if (depsChanged) {
    log.warn("Dependencies changed. Running pnpm install...");
    try {
      execSync("pnpm install", { cwd: rootDir(), stdio: "inherit" });
      log.info("✓ Dependencies installed");
    } catch {
      log.error("✗ Failed to install dependencies");
    }
  }

  if (appWasRunning) {
    const appStillRunning = (await Promise.all(adapters.map((a) => a.isRunning()))).some(Boolean);

    if (!appStillRunning) {
      log.warn("App stopped after pull.");
      const restart = await confirm({
        message: "Restart the app?",
        default: true,
      });
      if (restart) {
        await startApp();
      }
    }
  }
}

async function deleteBranch(branch: string): Promise<void> {
  const worktreeList = exec("git worktree list --porcelain", { silent: true });
  const worktreeMatch = worktreeList.match(
    new RegExp(
      `worktree ([^\\n]+)\\n[^\\n]*\\nbranch refs/heads/${branch.replace("/", "\\/")}`,
      "m",
    ),
  );
  const worktreePath = worktreeMatch ? worktreeMatch[1] : null;

  if (worktreePath) {
    log.warn(`Branch ${branch} is linked to worktree at ${worktreePath}`);
    const removeWorktree = await confirm({
      message: "Remove worktree first?",
      default: true,
    });

    if (removeWorktree) {
      try {
        execSync(`git worktree remove "${worktreePath}" --force`, {
          cwd: rootDir(),
          stdio: "inherit",
        });
        log.info("✓ Worktree removed");
      } catch {
        log.error(
          `Failed to remove worktree. Delete it manually: git worktree remove "${worktreePath}" --force`,
        );
        return;
      }
    } else {
      log.warn("Cannot delete branch while worktree exists.");
      return;
    }
  }

  const deleteLocal = await confirm({
    message: `Delete local branch ${branch}?`,
    default: true,
  });

  if (deleteLocal) {
    try {
      execSync(`git branch -D ${branch}`, { cwd: rootDir(), stdio: "inherit" });
      log.info(`✓ Deleted local branch ${branch}`);
    } catch {
      log.error(`Failed to delete local branch ${branch}`);
      return;
    }
  }

  const hasRemote = exec(`git ls-remote --heads origin ${branch}`, { silent: true });
  if (hasRemote) {
    const deleteRemote = await confirm({
      message: `Delete remote branch ${branch}?`,
      default: true,
    });

    if (deleteRemote) {
      exec(`git push origin --delete ${branch}`);
      log.info(`✓ Deleted remote branch ${branch}`);
    }
  }
}

enum AppStatus {
  Stopped = "stopped",
  Starting = "starting",
  Running = "running",
  Error = "error",
}

let _appStatus: AppStatus = AppStatus.Stopped;
let appErrorMessage: string | null = null;

function appStatusValue(): AppStatus {
  return _appStatus;
}

function setAppStatus(status: AppStatus): void {
  _appStatus = status;
}

interface ManagedSession {
  id: string;
  name: string;
  process: ChildProcess;
  branch: string;
  project: ProjectConfig;
  worktreePath?: string;
  startTime: Date;
  status: "running" | "stopped";
  headless: boolean;
  task?: string;
}

const managedSessions: Map<string, ManagedSession> = new Map();
let sessionCounter = 0;

function killExistingProcesses(): void {
  log.info("Stopping any existing dev processes...");

  const isWindows = process.platform === "win32";

  if (isWindows) {
    const killScript = join(rootDir(), "kill-dev.ps1");
    if (existsSync(killScript)) {
      exec(`powershell -ExecutionPolicy Bypass -File "${killScript}"`, { silent: true });
    }
  } else {
    const killScript = join(rootDir(), "kill-dev.sh");
    if (existsSync(killScript)) {
      exec(`bash "${killScript}"`, { silent: true });
    }
  }
}

function projectHasAppScripts(): boolean {
  const config = loadParallelClaudeConfig();

  if (config.apps && config.apps.length > 0) {
    return true;
  }

  const isWindows = process.platform === "win32";
  const script = isWindows ? "run-dev.ps1" : "run-dev.sh";
  return existsSync(join(rootDir(), script));
}

async function startAppFromScript(): Promise<void> {
  killExistingProcesses();

  const isWindows = process.platform === "win32";
  log.info(
    isWindows
      ? "\nStarting development server in new tab..."
      : "\nStarting development server in background...",
  );

  setAppStatus(AppStatus.Starting);
  appErrorMessage = null;

  if (existsSync(APP_LOG_FILE)) {
    unlinkSync(APP_LOG_FILE);
  }

  if (isWindows) {
    const scriptPath = join(rootDir(), "run-dev.ps1");
    const hasWindowsTerminal = exec("where wt", { silent: true }) !== "";

    if (hasWindowsTerminal) {
      const wtCmd = `wt -w -1 new-tab --title "App Dev Server" -d "${rootDir()}" powershell -ExecutionPolicy Bypass -NoProfile -File "${scriptPath}"`;
      appProcess = spawn(wtCmd, [], {
        cwd: rootDir(),
        stdio: "ignore",
        detached: true,
        shell: true,
        env: process.env,
      });
    } else {
      appProcess = spawn(
        "powershell",
        ["-ExecutionPolicy", "Bypass", "-NoProfile", "-File", scriptPath],
        {
          cwd: rootDir(),
          stdio: "ignore",
          detached: true,
          env: process.env,
        },
      );
    }
  } else {
    const logFd = openSync(APP_LOG_FILE, "w");
    appProcess = spawn("bash", ["./run-dev.sh"], {
      cwd: rootDir(),
      stdio: ["ignore", logFd, logFd],
      detached: true,
    });
  }

  appProcess.unref();
  appProcess.on("exit", (code) => {
    appProcess = null;
    if (appStatusValue() === AppStatus.Starting || appStatusValue() === AppStatus.Running) {
      if (code !== 0 && code !== null) {
        setAppStatus(AppStatus.Error);
        appErrorMessage = `Process exited with code ${code}`;
        log.error(`App failed: ${appErrorMessage}`);
      } else {
        setAppStatus(AppStatus.Stopped);
      }
    }
  });

  appProcess.on("error", (err) => {
    setAppStatus(AppStatus.Error);
    appErrorMessage = err.message;
    log.error(`App failed to start: ${err.message}`);
  });

  const maxWaitMs = 120000;
  const pollIntervalMs = 2000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    const status = legacyAppProcessStatus();

    if (status.backend && status.frontend) {
      setAppStatus(AppStatus.Running);
      return;
    }

    if (appStatusValue() === AppStatus.Error) {
      return;
    }
  }

  setAppStatus(AppStatus.Error);
  appErrorMessage = "Timed out waiting for app";
}

async function startAppWithAdapters(): Promise<void> {
  const config = loadParallelClaudeConfig();
  if (!config.apps || config.apps.length === 0) {
    await startAppFromScript();
    return;
  }

  setAppStatus(AppStatus.Starting);
  appErrorMessage = null;

  const adapters = config.apps.map((appConfig) => new CommandAdapter(appConfig));

  if (existsSync(APP_LOG_FILE)) {
    unlinkSync(APP_LOG_FILE);
  }

  const logFd = openSync(APP_LOG_FILE, "w");

  const adapterProcesses = adapters.map((adapter) => {
    const proc = spawn("sh", ["-c", (adapter as CommandAdapter)["startCmd"]], {
      cwd: rootDir(),
      stdio: ["ignore", logFd, logFd],
      detached: true,
    });

    proc.on("exit", (code) => {
      if (appStatusValue() === AppStatus.Starting || appStatusValue() === AppStatus.Running) {
        if (code !== 0 && code !== null) {
          setAppStatus(AppStatus.Error);
          appErrorMessage = `${adapter.name} exited with code ${code}`;
          log.error(`App failed: ${appErrorMessage}`);
        } else {
          setAppStatus(AppStatus.Stopped);
        }
      }
    });

    proc.on("error", (err) => {
      setAppStatus(AppStatus.Error);
      appErrorMessage = err.message;
      log.error(`${adapter.name} failed to start: ${err.message}`);
    });

    proc.unref();
    return proc;
  });

  appProcess = adapterProcesses[0] ?? null;

  const maxWaitMs = 120000;
  const pollIntervalMs = 2000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    const runningStates = await Promise.all(adapters.map((a) => a.isRunning()));
    if (runningStates.every(Boolean)) {
      setAppStatus(AppStatus.Running);
      return;
    }

    if (appStatusValue() === AppStatus.Error) {
      return;
    }
  }

  setAppStatus(AppStatus.Error);
  appErrorMessage = "Timed out waiting for app";
}

async function startApp(): Promise<void> {
  if (!projectHasAppScripts()) {
    log.warn("This project does not have app scripts or adapter config.");
    return;
  }

  const config = loadParallelClaudeConfig();
  if (config.apps && config.apps.length > 0) {
    await startAppWithAdapters();
  } else {
    await startAppFromScript();
  }
}

async function stopAppFromScript(): Promise<void> {
  log.info("\nStopping development server...");

  setAppStatus(AppStatus.Stopped);
  appErrorMessage = null;

  killExistingProcesses();

  if (appProcess) {
    appProcess.kill("SIGTERM");
    appProcess = null;
  }

  log.info("✓ App stopped.");
}

async function stopApp(): Promise<void> {
  log.info("\nStopping development server...");

  setAppStatus(AppStatus.Stopped);
  appErrorMessage = null;

  const config = loadParallelClaudeConfig();
  if (config.apps && config.apps.length > 0) {
    const adapters = config.apps.map((appConfig) => new CommandAdapter(appConfig));
    await Promise.all(adapters.map((a) => a.stop()));
  } else {
    killExistingProcesses();
  }

  if (appProcess) {
    appProcess.kill("SIGTERM");
    appProcess = null;
  }

  log.info("✓ App stopped.");
}

function readAppLogs(maxLines: number): string[] {
  if (!existsSync(APP_LOG_FILE)) {
    return ["[No log file found. Start the app first.]"];
  }

  try {
    const content = readFileSync(APP_LOG_FILE, "utf-8");
    return content.split("\n").slice(-maxLines);
  } catch {
    return ["[Unable to read log file]"];
  }
}

function appLogsExist(): boolean {
  return existsSync(APP_LOG_FILE);
}

async function showAppLogs(): Promise<void> {
  if (!appLogsExist()) {
    log.warn("\nNo log file found. Start the app first.");
    await confirm({ message: "Press Enter to continue...", default: true });
    return;
  }

  const renderLogView = () => {
    const width = terminalWidth();
    const contentWidth = width - 2;
    const termHeight = process.stdout.rows || 24;
    const contentHeight = termHeight - 4;

    const lines = readAppLogs(contentHeight);

    process.stdout.write("\x1b[2J\x1b[H");

    const title = "  App Logs (live)";
    log.print(chalk.bold.cyan(`┌${"─".repeat(contentWidth)}┐`));
    log.print(
      chalk.bold.cyan("│") +
        chalk.bold(title) +
        " ".repeat(contentWidth - title.length) +
        chalk.bold.cyan("│"),
    );
    log.print(chalk.bold.cyan(`├${"─".repeat(contentWidth)}┤`));

    const displayLines =
      lines.length < contentHeight
        ? [...Array(contentHeight - lines.length).fill(""), ...lines]
        : lines;

    displayLines.forEach((line) => {
      const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "");
      const cleanLine = stripAnsi(line);
      const maxLen = contentWidth - 2;
      const truncated =
        cleanLine.length > maxLen ? `${cleanLine.slice(0, maxLen - 1)}…` : cleanLine;
      const padding = Math.max(0, maxLen - truncated.length);
      log.print(
        `${chalk.bold.cyan("│")}  ${truncated}${" ".repeat(padding)}${chalk.bold.cyan("│")}`,
      );
    });

    log.print(chalk.bold.cyan(`├${"─".repeat(contentWidth)}┤`));
    const footerText = "  Press any key to return to menu";
    log.print(
      chalk.bold.cyan("│") +
        chalk.yellow(footerText) +
        " ".repeat(contentWidth - footerText.length) +
        chalk.bold.cyan("│"),
    );
    log.print(chalk.bold.cyan(`└${"─".repeat(contentWidth)}┘`));
  };

  renderLogView();

  const intervalId = setInterval(renderLogView, 1000);

  await new Promise<void>((resolve) => {
    const handler = () => {
      clearInterval(intervalId);
      process.stdin.removeListener("data", handler);
      if (process.stdin.isTTY && process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
      resolve();
    };

    if (process.stdin.isTTY && process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once("data", handler);
    } else {
      clearInterval(intervalId);
      resolve();
    }
  });

  process.stdout.write("\x1b[2J\x1b[H");
}

async function showBranchMenu(): Promise<void> {
  const branches = claudeBranches();
  const current = currentBranch();
  const prefix = claudeBranchPrefix();

  if (branches.length === 0) {
    log.warn(`\nNo ${prefix}* branches found.`);
    log.info("Claude branches are used for parallel development work.\n");

    const action = await select({
      message: "What would you like to do?",
      choices: [
        { name: `➕ Create a new ${prefix}* branch`, value: "create" },
        { name: chalk.dim("← Back"), value: "back" },
      ],
      pageSize: 20,
    });

    if (action === "create") {
      const branchName = await input({
        message: `Branch name (will be prefixed with ${prefix}):`,
        validate: (val) => (val.trim() ? true : "Branch name required"),
      });

      const fullBranchName = `${prefix}${branchName.trim()}`;
      exec(`git checkout -b ${fullBranchName}`);
      log.info(`✓ Created and switched to ${fullBranchName}`);
    }
    return;
  }

  const choices = branches.map((branch) => ({
    name: formatBranchDisplay(branch, current),
    value: branch.name,
  }));

  choices.push(
    { name: `➕ Create new ${prefix}* branch`, value: "create" },
    { name: chalk.dim("← Back"), value: "back" },
  );

  const selected = await select({
    message: "Select a branch:",
    choices,
    pageSize: 20,
  });

  if (selected === "back") return;

  if (selected === "create") {
    const branchName = await input({
      message: `Branch name (will be prefixed with ${prefix}):`,
      validate: (val) => (val.trim() ? true : "Branch name required"),
    });

    const fullBranchName = `${prefix}${branchName.trim()}`;
    exec(`git checkout -b ${fullBranchName}`);
    log.info(`✓ Created and switched to ${fullBranchName}`);
    return;
  }

  await branchActions(selected);
}

async function branchActions(branch: string): Promise<void> {
  const action = await select({
    message: `Actions for ${branch}:`,
    choices: [
      { name: "Switch to this branch", value: "switch" },
      { name: "Start app to test", value: "test" },
      { name: "Rebase onto main", value: "rebase" },
      { name: "Approve (rebase + merge + delete)", value: "approve" },
      { name: "Delete branch", value: "delete" },
      { name: chalk.dim("← Back"), value: "back" },
    ],
    pageSize: 20,
  });

  switch (action) {
    case "switch":
      await switchToBranch(branch);
      break;
    case "test":
      await switchToBranch(branch);
      await startApp();
      break;
    case "rebase":
      await rebaseBranch(branch);
      break;
    case "approve":
      await approveBranch(branch);
      break;
    case "delete":
      await deleteBranch(branch);
      break;
    default:
      break;
  }
}

async function approveBranch(branch: string): Promise<void> {
  log.info(`\n=== Approving ${branch} ===\n`);

  const confirmed = await confirm({
    message: `This will:\n  1. Rebase ${branch} onto main\n  2. Fast-forward merge to main\n  3. Delete the branch\n\nContinue?`,
    default: false,
  });

  if (!confirmed) {
    log.warn("Cancelled.");
    return;
  }

  const rebased = await rebaseBranch(branch);
  if (!rebased) {
    log.error("Approval stopped due to rebase failure.");
    return;
  }

  const merged = await mergeBranch(branch);
  if (!merged) {
    log.error("Approval stopped due to merge failure.");
    return;
  }

  await deleteBranch(branch);

  log.info(`\n✓ Branch ${branch} approved and merged to main!`);

  const push = await confirm({
    message: "Push main to origin?",
    default: true,
  });

  if (push) {
    log.warn("Pushing to origin...");
    execSync("git push origin main", { cwd: rootDir(), stdio: "inherit" });
    log.info("✓ Pushed to origin.");
  }
}

interface SpawnOptions {
  branch?: string;
  createBranch?: boolean;
  headless?: boolean;
  task?: string;
}

async function spawnClaudeSession(options: SpawnOptions = {}): Promise<void> {
  const { branch, createBranch = false, headless = false, task } = options;

  sessionCounter++;
  const sessionId = `session-${sessionCounter}`;
  const modeLabel = headless ? "headless" : "interactive";
  const sessionName = `Claude ${sessionCounter} (${modeLabel})`;

  const branchName = branch ?? "main";
  const useWorktree = branch && branch !== "main";

  let worktreePath: string | undefined;
  let sessionDir = rootDir();

  if (useWorktree) {
    const prefix = claudeBranchPrefix();
    const worktreeName = branch.replace(prefix, "").replace(/[^a-z0-9-]/gi, "-");
    worktreePath = join(worktreeDir(), worktreeName);
    sessionDir = worktreePath;

    if (!existsSync(worktreeDir())) {
      mkdirSync(worktreeDir(), { recursive: true });
    }

    const existingWorktrees = exec("git worktree list --porcelain", { silent: true });
    const worktreeExists = existingWorktrees.includes(worktreePath);

    if (!worktreeExists) {
      log.info(`Creating worktree at ${worktreePath}...`);
      if (createBranch) {
        exec(`git worktree add "${worktreePath}" -b ${branch}`, { silent: false });
      } else {
        exec(`git worktree add "${worktreePath}" ${branch}`, { silent: false });
      }

      if (!existsSync(worktreePath)) {
        log.error(`Failed to create worktree at ${worktreePath}`);
        return;
      }
    } else {
      log.info(`Using existing worktree at ${worktreePath}`);
    }
  }

  log.warn(`\nStarting new Claude Code session on ${branchName} (${modeLabel})...`);
  if (task) {
    log.info(`Task: ${task.slice(0, 60)}${task.length > 60 ? "..." : ""}`);
  }

  const isWindows = process.platform === "win32";

  let taskFile: string | null = null;
  if (task) {
    const tempDir = mkdtempSync(join(tmpdir(), "claude-task-"));
    taskFile = join(tempDir, "task.txt");
    writeFileSync(taskFile, task, "utf-8");
  }

  let claudeCmd = "claude";
  if (headless) {
    if (taskFile) {
      claudeCmd = `cat '${taskFile}' | claude --dangerously-skip-permissions`;
    } else {
      claudeCmd = "claude --dangerously-skip-permissions";
    }
  } else if (taskFile) {
    claudeCmd = `cat '${taskFile}' | claude`;
  }

  let sessionProcess: ChildProcess;

  if (isWindows) {
    let winCmd = "claude";
    if (headless) {
      winCmd = taskFile
        ? `claude --dangerously-skip-permissions < "${taskFile}"`
        : "claude --dangerously-skip-permissions";
    } else if (taskFile) {
      winCmd = `type "${taskFile}" | claude`;
    }

    const hasWindowsTerminal = exec("where wt", { silent: true }) !== "";

    if (hasWindowsTerminal) {
      const claudePath = exec("where claude.cmd", { silent: true }).split("\n")[0].trim();
      const fullWinCmd = winCmd.replace(/^claude/, `"${claudePath}"`);
      const wtCmd = `wt -w -1 new-tab --title "Claude ${sessionCounter}" -d "${sessionDir}" ${fullWinCmd}`;
      sessionProcess = spawn(wtCmd, [], {
        cwd: rootDir(),
        detached: true,
        stdio: "ignore",
        shell: true,
      });
    } else {
      sessionProcess = spawn("cmd", ["/c", "start", "cmd", "/k", winCmd], {
        cwd: sessionDir,
        detached: true,
        stdio: "ignore",
      });
    }
  } else {
    const terminalApp = process.env.TERM_PROGRAM === "iTerm.app" ? "iTerm" : "Terminal";
    const shellCmd = `cd "${sessionDir}" && ${claudeCmd}`;

    const escapeForAppleScript = (cmd: string) => cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const escapedShellCmd = escapeForAppleScript(shellCmd);

    if (terminalApp === "iTerm") {
      try {
        execSync(
          `osascript <<EOF
tell application "iTerm"
  tell current window
    create tab with default profile
    tell current session
      write text "${escapedShellCmd}"
    end tell
  end tell
end tell
EOF`,
          { cwd: rootDir(), stdio: "inherit" },
        );
      } catch (e) {
        log.error("Failed to open iTerm tab. Trying new window...");
        try {
          execSync(
            `osascript <<EOF
tell application "iTerm"
  activate
  create window with default profile
  tell current session of current window
    write text "${escapedShellCmd}"
  end tell
end tell
EOF`,
            { cwd: rootDir(), stdio: "inherit" },
          );
        } catch {
          log.error("Failed to open iTerm. Trying Terminal...");
          execSync(`osascript -e 'tell application "Terminal" to do script "${escapedShellCmd}"'`, {
            cwd: rootDir(),
            stdio: "inherit",
          });
        }
      }
    } else {
      execSync(
        `osascript -e 'tell application "Terminal" to do script "${escapedShellCmd}" in front window'`,
        { cwd: rootDir(), stdio: "inherit" },
      );
    }

    sessionProcess = spawn("echo", ["Session started in new terminal"], {
      cwd: rootDir(),
      detached: true,
      stdio: "ignore",
    });
  }

  sessionProcess.unref();

  const session: ManagedSession = {
    id: sessionId,
    name: sessionName,
    process: sessionProcess,
    branch: branchName,
    project: currentProject,
    worktreePath,
    startTime: new Date(),
    status: "running",
    headless,
    task,
  };

  managedSessions.set(sessionId, session);

  log.info(`✓ ${sessionName} started on branch ${branchName}`);
  if (headless) {
    log.warn("  ⚠️  Headless mode: Claude will auto-accept all actions");
  }
}

async function terminateSession(sessionId: string): Promise<void> {
  const session = managedSessions.get(sessionId);
  if (!session) {
    log.error("Session not found.");
    return;
  }

  const confirmed = await confirm({
    message: `Terminate ${session.name} on branch ${session.branch}?`,
    default: false,
  });

  if (!confirmed) {
    log.warn("Cancelled.");
    return;
  }

  try {
    if (session.process.pid) {
      process.kill(session.process.pid, "SIGTERM");
    }
    session.status = "stopped";
    log.info(`✓ ${session.name} terminated.`);
  } catch {
    log.warn("Note: Session may need to be closed manually in its terminal.");
  }

  if (session.worktreePath) {
    const removeWorktree = await confirm({
      message: `Remove worktree at ${session.worktreePath}?`,
      default: true,
    });

    if (removeWorktree) {
      try {
        exec(`git worktree remove "${session.worktreePath}" --force`, { silent: false });
        log.info("✓ Worktree removed.");
      } catch {
        log.warn(
          `Could not remove worktree. Remove manually with: git worktree remove "${session.worktreePath}"`,
        );
      }
    }
  }

  managedSessions.delete(sessionId);
}

async function pullChangesFromBranch(branch: string): Promise<void> {
  if (branch === "main") {
    log.warn("Cannot pull from main to main.");
    return;
  }

  const mainWorktreeBranch = exec("git branch --show-current", { cwd: rootDir(), silent: true });
  if (mainWorktreeBranch !== "main") {
    log.warn(`Main worktree is on ${mainWorktreeBranch}, not main. Cannot pull changes.`);
    return;
  }

  log.info(`\nChecking for commits on ${branch}...`);

  const commitsOutput = exec(`git log main..${branch} --oneline`, { silent: true });

  if (!commitsOutput) {
    log.warn("No new commits found on this branch yet.");
    log.info("Ask the Claude session to commit its changes first.");
    await confirm({ message: "Press Enter to continue...", default: true });
    return;
  }

  const commits = commitsOutput.split("\n").filter((line) => line.trim());
  log.print(`\n${chalk.bold(`Commits on ${branch}:`)}`);
  commits.forEach((commit) => {
    log.print(`  ${chalk.cyan(commit)}`);
  });
  log.print("");

  const pullChoice = await selectWithEscape(
    "What would you like to do?",
    [
      { name: "Cherry-pick all commits to main (for testing)", value: "cherry-pick-all" },
      { name: "Cherry-pick latest commit only", value: "cherry-pick-latest" },
      { name: chalk.dim("← Cancel"), value: "cancel" },
    ],
    "cancel",
  );

  if (pullChoice === "cancel") return;

  const latestCommit = commits[0].split(" ")[0];
  const oldestCommit = commits[commits.length - 1].split(" ")[0];

  const cherryPickWithRetry = async (commitRange: string): Promise<boolean> => {
    try {
      execSync(`git cherry-pick -X theirs ${commitRange}`, { cwd: rootDir(), stdio: "inherit" });
      return true;
    } catch {
      log.error("Cherry-pick failed.");

      const abortChoice = await selectWithEscape(
        "What would you like to do?",
        [
          { name: "Abort and return to menu", value: "abort" },
          { name: "Leave as-is for manual resolution", value: "manual" },
        ],
        "abort",
      );

      if (abortChoice === "abort") {
        try {
          execSync("git cherry-pick --abort", { cwd: rootDir(), stdio: "pipe" });
          log.info("Cherry-pick aborted.");
        } catch {
          log.warn("Cherry-pick already aborted or no cherry-pick in progress.");
        }
      } else {
        log.info('Resolve conflicts manually, then run "git cherry-pick --continue".');
      }
      return false;
    }
  };

  let success = false;
  if (pullChoice === "cherry-pick-all") {
    const commitRange = commits.length === 1 ? latestCommit : `${oldestCommit}^..${latestCommit}`;
    success = await cherryPickWithRetry(commitRange);
    if (success) {
      log.info(`✓ Cherry-picked ${commits.length} commit(s) to main for testing.`);
    }
  } else {
    success = await cherryPickWithRetry(latestCommit);
    if (success) {
      log.info("✓ Cherry-picked latest commit to main for testing.");
    }
  }

  if (success) {
    log.print("");
    log.info("Changes are now on main. Test them locally.");
    log.info("If they work: push when ready.");
    log.info('If they don\'t work: run "git reset --hard HEAD~1" to undo.');
  }

  await confirm({ message: "Press Enter to continue...", default: true });
}

async function showSessionsMenu(): Promise<void> {
  while (true) {
    const detectedSessions = detectClaudeSessions();
    const managed = Array.from(managedSessions.values());

    const attachedSessions = detectedSessions.filter((s) => !s.isOrphaned);
    const orphanedSessions = detectedSessions.filter((s) => s.isOrphaned);

    log.print(`\n${chalk.bold("=== Claude Sessions ===")}\n`);

    log.print(chalk.bold("Managed Sessions:"));
    if (managed.length === 0) {
      log.print(chalk.dim("  No sessions started from this manager."));
    } else {
      managed.forEach((session) => {
        const runtime = Math.round((Date.now() - session.startTime.getTime()) / 60000);
        const statusColor = session.status === "running" ? chalk.green : chalk.dim;
        const modeIcon = session.headless ? "⚡" : "🛡️";
        const projectLabel = chalk.bold(session.project.name);
        const taskPreview = session.task
          ? chalk.dim(` "${session.task.slice(0, 40)}${session.task.length > 40 ? "..." : ""}"`)
          : "";
        log.print(
          `  ${statusColor("●")} ${modeIcon} ${projectLabel} ${chalk.cyan(session.branch)} [${runtime}m]${taskPreview}`,
        );
      });
    }

    log.print(`\n${chalk.bold("Active Sessions (attached to terminal):")}`);
    if (attachedSessions.length === 0) {
      log.print(chalk.dim("  No active sessions detected."));
    } else {
      attachedSessions.forEach((session) => {
        const projectDisplay =
          session.project !== "unknown"
            ? chalk.bold(session.project)
            : chalk.dim("unknown project");
        const branchDisplay =
          session.branch !== "unknown" ? chalk.cyan(session.branch) : chalk.dim("unknown branch");
        const ttyDisplay = session.tty ? chalk.dim(` [${session.tty}]`) : "";
        log.print(
          `  ${chalk.green("●")} ${projectDisplay} on ${branchDisplay} (PID ${session.pid})${ttyDisplay}`,
        );
      });
    }

    log.print(`\n${chalk.bold("Orphaned Sessions (detached from terminal):")}`);
    if (orphanedSessions.length === 0) {
      log.print(chalk.dim("  No orphaned sessions detected."));
    } else {
      orphanedSessions.forEach((session) => {
        const projectDisplay =
          session.project !== "unknown"
            ? chalk.bold(session.project)
            : chalk.dim("unknown project");
        const branchDisplay =
          session.branch !== "unknown" ? chalk.cyan(session.branch) : chalk.dim("unknown branch");
        log.print(
          `  ${chalk.red("●")} ${projectDisplay} on ${branchDisplay} (PID ${session.pid}) ${chalk.red("[orphaned]")}`,
        );
      });
    }

    log.print("");

    const existingBranches = claudeBranches();
    const branchesWithCommits = existingBranches.filter((b) => b.ahead > 0);

    const choices = [{ name: "➕ Start new session", value: "new" }];

    if (branchesWithCommits.length > 0) {
      choices.push({ name: "Pull changes for testing", value: "pull-changes" });
    }

    if (orphanedSessions.length > 0) {
      choices.push({
        name: `Kill all orphaned sessions (${orphanedSessions.length})`,
        value: "kill-orphaned",
      });
    }

    if (detectedSessions.length > 0) {
      choices.push({ name: "Select sessions to kill", value: "kill-select" });
    }

    if (managed.length > 0) {
      choices.push({ name: "Terminate a managed session", value: "terminate" });
    }

    choices.push({ name: chalk.dim("← Back"), value: "back" });

    const action = await selectWithEscape("Session actions:", choices, "back");

    if (action === "back") return;

    if (action === "kill-orphaned") {
      const killMethod = await selectWithEscape(
        "How to kill orphaned sessions?",
        [
          { name: "Graceful (SIGTERM) - allows cleanup", value: "graceful" },
          { name: "Force (SIGKILL) - immediate termination", value: "force" },
          { name: chalk.dim("← Cancel"), value: "cancel" },
        ],
        "cancel",
      );

      if (killMethod === "cancel") continue;

      const confirmed = await confirm({
        message: `Kill ${orphanedSessions.length} orphaned session(s)? This cannot be undone.`,
        default: false,
      });

      if (confirmed) {
        const pids = orphanedSessions.map((s) => s.pid);
        const force = killMethod === "force";
        const result = killMultipleProcesses(pids, force);
        if (result.killed.length > 0) {
          log.info(`Killed ${result.killed.length} orphaned session(s).`);
        }
        if (result.failed.length > 0) {
          log.warn(
            `Failed to kill ${result.failed.length} session(s): PIDs ${result.failed.join(", ")}`,
          );
          if (!force) {
            log.info('Tip: Try "Force (SIGKILL)" if graceful termination fails.');
          }
        }
      }
      continue;
    }

    if (action === "kill-select") {
      const allSessions = [...attachedSessions, ...orphanedSessions];
      const sessionChoices = allSessions.map((s) => {
        const projectDisplay = s.project !== "unknown" ? s.project : "unknown project";
        const branchDisplay = s.branch !== "unknown" ? s.branch : "unknown branch";
        const statusLabel = s.isOrphaned ? chalk.red("[orphaned]") : chalk.green("[active]");
        return {
          name: `${projectDisplay} on ${branchDisplay} (PID ${s.pid}) ${statusLabel}`,
          value: s.pid,
          checked: s.isOrphaned,
        };
      });

      if (sessionChoices.length === 0) {
        log.warn("No sessions to kill.");
        continue;
      }

      const selectedPids = await checkbox({
        message: "Select sessions to kill (space to toggle, enter to confirm):",
        choices: sessionChoices,
        pageSize: 20,
      });

      if (selectedPids.length === 0) {
        log.warn("No sessions selected.");
        continue;
      }

      const killMethod = await selectWithEscape(
        "How to kill selected sessions?",
        [
          { name: "Graceful (SIGTERM) - allows cleanup", value: "graceful" },
          { name: "Force (SIGKILL) - immediate termination", value: "force" },
          { name: chalk.dim("← Cancel"), value: "cancel" },
        ],
        "cancel",
      );

      if (killMethod === "cancel") continue;

      const confirmed = await confirm({
        message: `Kill ${selectedPids.length} selected session(s)? This cannot be undone.`,
        default: false,
      });

      if (confirmed) {
        const force = killMethod === "force";
        const result = killMultipleProcesses(selectedPids, force);
        if (result.killed.length > 0) {
          log.info(`Killed ${result.killed.length} session(s).`);
        }
        if (result.failed.length > 0) {
          log.warn(
            `Failed to kill ${result.failed.length} session(s): PIDs ${result.failed.join(", ")}`,
          );
          if (!force) {
            log.info('Tip: Try "Force (SIGKILL)" if graceful termination fails.');
          }
        }
      }
      continue;
    }

    if (action === "pull-changes") {
      const branchChoices = branchesWithCommits.map((b) => ({
        name: `${b.name} (${b.ahead} commit${b.ahead > 1 ? "s" : ""} ahead)`,
        value: b.name,
      }));
      branchChoices.push({ name: chalk.dim("← Cancel"), value: "cancel" });

      const selectedBranch = await selectWithEscape(
        "Pull changes from which branch?",
        branchChoices,
        "cancel",
      );

      if (selectedBranch !== "cancel") {
        await pullChangesFromBranch(selectedBranch);
      }
      continue;
    }

    if (action === "new") {
      const selectedProject = await selectProjectForSession();
      if (!selectedProject) continue;

      setCurrentProject(selectedProject);
      log.info(`Working in: ${selectedProject.name}`);

      const prefix = claudeBranchPrefix();

      const startType = await selectWithEscape(
        "How would you like to start?",
        [
          { name: "Quick start on main (Recommended)", value: "main" },
          { name: "Start with GitHub issue", value: "issue" },
          { name: "Start on specific branch", value: "branch" },
          { name: chalk.dim("← Cancel"), value: "cancel" },
        ],
        "cancel",
      );

      if (startType === "cancel") continue;

      let selectedBranch: string | undefined;
      let task: string | undefined;
      let createNewBranch = false;

      if (startType === "issue") {
        log.info("\nFetching open GitHub issues...");
        const issuesJson = exec("gh issue list --state open --json number,title", {
          silent: true,
        });

        if (!issuesJson) {
          log.error("Could not fetch GitHub issues. Is gh CLI configured?");
          continue;
        }

        let issues: Array<{ number: number; title: string }> = [];
        try {
          issues = JSON.parse(issuesJson);
        } catch {
          log.error("Could not parse GitHub issues.");
          continue;
        }

        if (issues.length === 0) {
          log.warn("No open issues found.");
          continue;
        }

        const issueChoices = [
          ...issues.map((i) => ({ name: `#${i.number} ${i.title}`, value: String(i.number) })),
          { name: chalk.dim("← Cancel"), value: "cancel" },
        ];

        const selectedIssue = await selectWithEscape("Select an issue:", issueChoices, "cancel");

        if (selectedIssue === "cancel") continue;

        const issueJson = exec(`gh issue view ${selectedIssue} --json title,body`, {
          silent: true,
        });
        if (issueJson) {
          try {
            const issue = JSON.parse(issueJson);
            task = `GitHub Issue #${selectedIssue}: ${issue.title}\n\n${issue.body}`;
            log.info(`Selected: ${issue.title}`);
          } catch {
            task = `Work on GitHub issue #${selectedIssue}`;
          }
        }

        const existingBranches = claudeBranches();
        const branchChoiceOptions = [
          { name: "Main directory (no isolation)", value: "main" },
          { name: "New worktree (isolated directory with new branch)", value: "create" },
        ];

        if (existingBranches.length > 0) {
          branchChoiceOptions.push({ name: "Existing worktree/branch", value: "existing" });
        }

        branchChoiceOptions.push({ name: chalk.dim("← Cancel"), value: "cancel" });

        const branchChoice = await selectWithEscape(
          "Where should this session work?",
          branchChoiceOptions,
          "cancel",
        );

        if (branchChoice === "cancel") continue;

        if (branchChoice === "create") {
          const issueData = JSON.parse(issueJson || "{}");
          const suggestedName = (issueData.title || `issue-${selectedIssue}`)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 40);

          const branchName = await input({
            message: `Branch name (will be prefixed with ${prefix}):`,
            default: suggestedName,
            validate: (val) => (val.trim() ? true : "Branch name required"),
          });

          selectedBranch = `${prefix}${branchName.trim()}`;
          createNewBranch = true;
        } else if (branchChoice === "existing") {
          const existingBranchChoices = [
            ...existingBranches.map((b) => ({ name: b.name, value: b.name })),
            { name: chalk.dim("← Cancel"), value: "cancel" },
          ];

          selectedBranch = await selectWithEscape(
            "Select existing branch:",
            existingBranchChoices,
            "cancel",
          );

          if (selectedBranch === "cancel") continue;
        } else {
          selectedBranch = "main";
        }
      } else if (startType === "branch") {
        const branches = claudeBranches();
        const allBranchesList = allBranches();

        const branchChoices = [
          { name: chalk.green("+ Create new worktree with new branch"), value: "create-new" },
          ...branches.map((b) => ({ name: `${b.name} (claude branch)`, value: b.name })),
          ...allBranchesList
            .filter((b) => !b.startsWith(prefix) && b !== "main")
            .map((b) => ({ name: b, value: b })),
          { name: chalk.dim("← Cancel"), value: "cancel" },
        ];

        selectedBranch = await selectWithEscape(
          "Select branch (will use/create worktree):",
          branchChoices,
          "cancel",
        );

        if (selectedBranch === "cancel") continue;

        if (selectedBranch === "create-new") {
          const branchName = await input({
            message: `Branch name (will be prefixed with ${prefix}):`,
            validate: (val) => (val.trim() ? true : "Branch name required"),
          });
          selectedBranch = `${prefix}${branchName.trim()}`;
          createNewBranch = true;
        }

        const taskInput = await input({
          message: "Task description (optional, press Enter to skip):",
        });
        if (taskInput.trim()) {
          task = taskInput.trim();
        }
      } else {
        selectedBranch = "main";
      }

      const mode = await selectWithEscape(
        "Session mode:",
        [
          { name: "Interactive - prompts for confirmation (Recommended)", value: "interactive" },
          { name: "Headless - auto-accepts all actions", value: "headless" },
          { name: chalk.dim("← Cancel"), value: "cancel" },
        ],
        "cancel",
      );

      if (mode === "cancel") continue;

      const headless = mode === "headless";

      if (headless && !task) {
        task = await input({
          message: "Task for headless session:",
          validate: (val) => (val.trim() ? true : "Task required for headless mode"),
        });
      }

      await spawnClaudeSession({
        branch: selectedBranch,
        createBranch: createNewBranch,
        headless,
        task,
      });
    } else if (action === "terminate") {
      const sessionChoices = managed.map((s) => ({
        name: `${s.name} on ${s.branch}`,
        value: s.id,
      }));
      sessionChoices.push({ name: chalk.dim("← Cancel"), value: "cancel" });

      const selectedSession = await selectWithEscape(
        "Select session to terminate:",
        sessionChoices,
        "cancel",
      );

      if (selectedSession !== "cancel") {
        await terminateSession(selectedSession);
      }
    }
  }
}

async function showStatus(): Promise<void> {
  const branches = claudeBranches();
  const current = currentBranch();
  const managed = Array.from(managedSessions.values());

  printHeader();

  printSection("Current branch");
  printBoxLine(chalk.green(current));
  printEmptyLine();

  printSection("Claude branches");
  if (branches.length === 0) {
    const prefix = claudeBranchPrefix();
    printBoxLine(chalk.dim(`No ${prefix}* branches`));
  } else {
    branches.forEach((branch) => {
      const display = formatBranchDisplay(branch, current);
      printBoxLine(display);
    });
  }
  printEmptyLine();

  printSection("Sessions");
  if (managed.length === 0) {
    printBoxLine(chalk.dim("No managed sessions"));
  } else {
    managed.forEach((session) => {
      const runtime = Math.round((Date.now() - session.startTime.getTime()) / 60000);
      const statusIcon = session.status === "running" ? chalk.green("●") : chalk.dim("○");
      const issueMatch = session.task?.match(/GitHub Issue #(\d+)/);
      const issueLabel = issueMatch ? `${chalk.yellow(`#${issueMatch[1]}`)} ` : "";
      const worktreeIcon = session.worktreePath ? chalk.cyan("⎔ ") : "";
      const line = `${statusIcon} ${worktreeIcon}${issueLabel}${session.name} on ${session.branch} [${runtime}m]`;
      printBoxLine(line);
    });
  }
  printEmptyLine();

  if (projectHasAppScripts()) {
    printSection("App");
    let appStatusText = "";
    let appStatusColor = chalk.dim;
    let appStatusIcon = "○";

    const processStatus = legacyAppProcessStatus();
    const backendRunning = processStatus.backend;
    const frontendRunning = processStatus.frontend;
    const appRunning = appProcess !== null || backendRunning || frontendRunning;

    if (appStatusValue() === AppStatus.Error) {
      appStatusText = `Error: ${appErrorMessage ?? "Check logs"} (use [l] to view, [a] to retry)`;
      appStatusColor = chalk.red;
      appStatusIcon = "✗";
    } else if (!appRunning && appStatusValue() !== AppStatus.Starting) {
      if (appLogsExist()) {
        try {
          const logLines = readAppLogs(50);
          const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "");
          const cleanLog = stripAnsi(logLines.join("\n"));

          if (
            cleanLog.includes("ELIFECYCLE") ||
            cleanLog.includes("failed") ||
            cleanLog.includes("Error")
          ) {
            setAppStatus(AppStatus.Error);
            appStatusText = "Error: App crashed (use [l] to view, [a] to retry)";
            appStatusColor = chalk.red;
            appStatusIcon = "✗";
          } else {
            appStatusText = "Stopped (use [a] to start)";
            appStatusColor = chalk.dim;
            appStatusIcon = "○";
          }
        } catch {
          appStatusText = "Stopped (use [a] to start)";
          appStatusColor = chalk.dim;
          appStatusIcon = "○";
        }
      } else {
        appStatusText = "Stopped (use [a] to start)";
        appStatusColor = chalk.dim;
        appStatusIcon = "○";
      }
    } else if (backendRunning && frontendRunning) {
      setAppStatus(AppStatus.Running);
      appStatusText = "Ready (use [x] to stop)";
      appStatusColor = chalk.green;
      appStatusIcon = "●";
    } else if (backendRunning) {
      appStatusText = "Backend ready, frontend starting... (use [x] to stop)";
      appStatusColor = chalk.yellow;
      appStatusIcon = "◐";
    } else if (frontendRunning) {
      appStatusText = "Frontend ready, backend starting... (use [x] to stop)";
      appStatusColor = chalk.yellow;
      appStatusIcon = "◐";
    } else {
      let state = "Starting...";
      if (appLogsExist()) {
        try {
          const logLines = readAppLogs(50);
          const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "");
          const cleanLog = stripAnsi(logLines.join("\n"));

          if (cleanLog.includes("Compiling")) {
            state = "Compiling...";
          }
        } catch {
          log.warn("Could not read app logs.");
        }
      }
      appStatusText = `${state} (use [x] to stop)`;
      appStatusColor = chalk.yellow;
      appStatusIcon = "◐";
    }

    const statusLine = `${appStatusColor(appStatusIcon)} ${appStatusText}`;
    printBoxLine(statusLine);
  }

  printFooter();
  log.print("");
}

interface MenuChoice {
  name: string;
  value: string;
  key: string;
}

async function selectWithEscape<T extends string>(
  message: string,
  choices: Array<{ name: string; value: T }>,
  _cancelValue: T = "cancel" as T,
): Promise<T> {
  const result = await select({ message, choices, pageSize: 20 });
  return result as T;
}

function renderMenu(message: string, choices: MenuChoice[], selectedIndex: number): void {
  const lines = choices.length + 1;
  process.stdout.write(`\x1b[${lines}A`);
  process.stdout.write("\x1b[0J");

  log.print(
    chalk.bold.green("?") +
      " " +
      chalk.bold(message) +
      " " +
      chalk.dim("(use arrow keys, enter, or shortcut)"),
  );

  choices.forEach((choice, index) => {
    const isSelected = index === selectedIndex;
    const prefix = isSelected ? chalk.cyan("❯ ") : "  ";
    const text = isSelected ? chalk.cyan(choice.name) : choice.name;
    log.print(prefix + text);
  });
}

async function selectWithShortcuts(
  message: string,
  choices: MenuChoice[],
  _autoRefreshMs?: number,
): Promise<string> {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    const keyMap = new Map(choices.map((c, i) => [c.key.toLowerCase(), i]));

    log.print(
      chalk.bold.green("?") +
        " " +
        chalk.bold(message) +
        " " +
        chalk.dim("(use arrow keys, enter, or shortcut)"),
    );
    choices.forEach((choice, index) => {
      const isSelected = index === selectedIndex;
      const prefix = isSelected ? chalk.cyan("❯ ") : "  ";
      const text = isSelected ? chalk.cyan(choice.name) : choice.name;
      log.print(prefix + text);
    });

    if (!process.stdin.isTTY) {
      resolve(choices[0].value);
      return;
    }

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    emitKeypressEvents(process.stdin, rl);
    process.stdin.setRawMode(true);

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.removeAllListeners("keypress");
      rl.close();
    };

    const handler = (_str: string | undefined, key: Key) => {
      if (!key) return;

      if (key.name === "up") {
        selectedIndex = (selectedIndex - 1 + choices.length) % choices.length;
        renderMenu(message, choices, selectedIndex);
        return;
      }

      if (key.name === "down") {
        selectedIndex = (selectedIndex + 1) % choices.length;
        renderMenu(message, choices, selectedIndex);
        return;
      }

      if (key.name === "return") {
        cleanup();
        log.print("");
        resolve(choices[selectedIndex].value);
        return;
      }

      if (key.name === "escape") {
        cleanup();
        log.print("");
        const backChoice = choices.find((c) => c.value === "back" || c.value === "quit");
        resolve(backChoice?.value ?? "back");
        return;
      }

      if (key.ctrl && key.name === "c") {
        cleanup();
        process.exit(0);
      }

      const pressed = (key.name ?? key.sequence ?? "").toLowerCase();
      const matchIndex = keyMap.get(pressed);
      if (matchIndex !== undefined) {
        cleanup();
        log.print("");
        resolve(choices[matchIndex].value);
        return;
      }
    };

    process.stdin.on("keypress", handler);
  });
}

async function mainMenu(): Promise<void> {
  while (true) {
    await showStatus();

    const sessionCount = managedSessions.size;
    const sessionInfo = sessionCount > 0 ? ` (${sessionCount} running)` : "";

    const padLabel = (text: string, width: number) =>
      text + " ".repeat(Math.max(0, width - text.length));

    const hasAppScripts = projectHasAppScripts();

    const choices: MenuChoice[] = [
      {
        name: `${padLabel("Manage branches", 28)}${chalk.cyan("[b]")}`,
        value: "branches",
        key: "b",
      },
      {
        name: `${padLabel(`Manage sessions${sessionInfo}`, 28)}${chalk.cyan("[s]")}`,
        value: "sessions",
        key: "s",
      },
      {
        name: `${padLabel("Pull changes", 28)}${chalk.cyan("[p]")}`,
        value: "pull",
        key: "p",
      },
    ];

    if (hasAppScripts) {
      const isWindows = process.platform === "win32";
      choices.push({
        name: `${padLabel("Start app", 28)}${chalk.cyan("[a]")}`,
        value: "start",
        key: "a",
      });
      if (!isWindows) {
        choices.push({
          name: `${padLabel("View app logs", 28)}${chalk.cyan("[l]")}`,
          value: "logs",
          key: "l",
        });
      }
      choices.push({
        name: `${padLabel("Stop app", 28)}${chalk.cyan("[x]")}`,
        value: "stop",
        key: "x",
      });
    }

    choices.push({
      name: `${padLabel("Refresh", 28)}${chalk.cyan("[r]")}`,
      value: "refresh",
      key: "r",
    });

    if (process.platform === "win32") {
      choices.push({
        name: `${padLabel("Create desktop shortcut", 28)}${chalk.cyan("[d]")}`,
        value: "shortcut",
        key: "d",
      });
    }

    choices.push({
      name: chalk.dim(`${padLabel("Quit", 28)}[q]`),
      value: "quit",
      key: "q",
    });

    const action = await selectWithShortcuts("What would you like to do?", choices, 5000);

    switch (action) {
      case "branches":
        await showBranchMenu();
        break;
      case "sessions":
        await showSessionsMenu();
        break;
      case "pull":
        await pullChanges();
        break;
      case "start":
        await startApp();
        break;
      case "logs":
        if (process.platform === "win32") {
          log.info('\nOn Windows, app logs are visible in the "App Dev Server" tab.\n');
          await confirm({ message: "Press Enter to continue...", default: true });
        } else {
          await showAppLogs();
        }
        break;
      case "stop":
        await stopApp();
        break;
      case "refresh":
        break;
      case "shortcut":
        await createDesktopShortcut();
        break;
      case "quit":
        if (appProcess || isAnyAdapterRunning()) {
          const confirmQuit = await confirm({
            message: "App is still running. Stop it before quitting?",
            default: true,
          });
          if (confirmQuit) {
            await stopApp();
          }
        }
        log.debug("\nGoodbye!");
        process.exit(0);
        break;
      default:
        break;
    }
  }
}

async function createDesktopShortcut(): Promise<void> {
  if (process.platform !== "win32") {
    log.warn("Desktop shortcuts are only supported on Windows.");
    return;
  }

  const desktop = join(homedir(), "Desktop");
  const launcherPath = join(desktop, "ParallelClaude.ps1");
  const shortcutPath = join(desktop, "Parallel Claude.lnk");
  const tempScript = join(tmpdir(), "create-shortcut.ps1");

  const launcherContent = `Set-Location "${rootDir()}"
npx ts-node --transpile-only scripts/parallel-claude.ts
`;

  writeFileSync(launcherPath, launcherContent);

  const shortcutScript = [
    "$WshShell = New-Object -ComObject WScript.Shell",
    `$Shortcut = $WshShell.CreateShortcut("${shortcutPath}")`,
    '$Shortcut.TargetPath = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"',
    `$Shortcut.Arguments = '-NoExit -File "${launcherPath}"'`,
    `$Shortcut.WorkingDirectory = "${rootDir()}"`,
    "$Shortcut.Save()",
  ].join("\n");

  writeFileSync(tempScript, shortcutScript);

  try {
    execSync(`powershell -ExecutionPolicy Bypass -File "${tempScript}"`, { stdio: "pipe" });
    log.info(chalk.green("\n✓ Desktop shortcut created!"));
    log.info('  Right-click it and select "Pin to taskbar" for quick access.\n');
  } catch (err) {
    log.error(`Failed to create desktop shortcut: ${(err as Error).message}`);
  }

  await confirm({ message: "Press Enter to continue...", default: true });
}

async function main(): Promise<void> {
  log.info("\n  Parallel Claude\n");

  const isGitRepo = existsSync(join(DEFAULT_ROOT_DIR, ".git"));
  if (!isGitRepo) {
    log.error("Error: Not a git repository.");
    process.exit(1);
  }

  const projectsConfig = loadProjectsConfig();
  if (projectsConfig.defaultProject) {
    const defaultProject = projectsConfig.projects.find(
      (p) => p.name === projectsConfig.defaultProject,
    );
    if (defaultProject) {
      setCurrentProject(defaultProject);
    }
  } else if (projectsConfig.projects.length > 0) {
    const firstProject = projectsConfig.projects[0];
    if (firstProject) {
      setCurrentProject(firstProject);
    }
  }

  await mainMenu();
}

main().catch((error) => {
  log.error(`Error: ${error.message}`);
  process.exit(1);
});
