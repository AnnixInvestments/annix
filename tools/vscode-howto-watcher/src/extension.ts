import { readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

interface GuideInfo {
  absolutePath: string;
  relativePath: string;
  title: string;
  relatedPaths: string[];
  lastUpdated: string | null;
}

const APP_GLOB = path.join("annix-frontend", "src", "app");

const safeReaddir = (dirPath: string): string[] => {
  try {
    return readdirSync(dirPath);
  } catch {
    return [];
  }
};

const parseFrontmatter = (raw: string): Record<string, string | string[]> => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data: Record<string, string | string[]> = {};
  match[1].split(/\r?\n/).forEach((line) => {
    const kv = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (!kv) return;
    const key = kv[1];
    const value = kv[2].trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      data[key] =
        inner.length === 0 ? [] : inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
    }
  });
  return data;
};

const loadGuides = (workspaceRoot: string): GuideInfo[] => {
  const appsDir = path.join(workspaceRoot, APP_GLOB);
  const apps = safeReaddir(appsDir);
  const guides: GuideInfo[] = [];

  apps.forEach((app) => {
    const guidesDir = path.join(appsDir, app, "how-to", "guides");
    safeReaddir(guidesDir)
      .filter((f) => f.endsWith(".md"))
      .forEach((file) => {
        const absolutePath = path.join(guidesDir, file);
        try {
          const raw = readFileSync(absolutePath, "utf8");
          const fm = parseFrontmatter(raw);
          const related = Array.isArray(fm.relatedPaths) ? fm.relatedPaths : [];
          const title = typeof fm.title === "string" ? fm.title : file.replace(/\.md$/, "");
          const lastUpdated = typeof fm.lastUpdated === "string" ? fm.lastUpdated : null;
          guides.push({
            absolutePath,
            relativePath: path.relative(workspaceRoot, absolutePath),
            title,
            relatedPaths: related,
            lastUpdated,
          });
        } catch {
          /* swallow; corrupt frontmatter shouldn't break the extension */
        }
      });
  });

  return guides;
};

const matchingGuides = (guides: GuideInfo[], activePath: string): GuideInfo[] => {
  return guides.filter((g) =>
    g.relatedPaths.some((rp) => activePath === rp || activePath.startsWith(`${rp}/`)),
  );
};

export function activate(context: vscode.ExtensionContext): void {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;

  const workspaceRoot = folder.uri.fsPath;
  let guides = loadGuides(workspaceRoot);

  const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusItem.command = "annix-howto-watcher.openAffected";
  context.subscriptions.push(statusItem);

  const refresh = (): void => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      statusItem.hide();
      return;
    }
    const activeAbs = editor.document.uri.fsPath;
    if (!activeAbs.startsWith(workspaceRoot)) {
      statusItem.hide();
      return;
    }
    const activeRel = path.relative(workspaceRoot, activeAbs);
    const matches = matchingGuides(guides, activeRel);
    if (matches.length === 0) {
      statusItem.hide();
      return;
    }
    statusItem.text = `📖 affects ${matches.length} how-to guide${matches.length === 1 ? "" : "s"}`;
    statusItem.tooltip = matches
      .map((m) => `${m.title} (${m.lastUpdated ?? "no date"})`)
      .join("\n");
    statusItem.show();
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(refresh),
    vscode.workspace.onDidChangeTextDocument(refresh),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.uri.fsPath.includes(`${path.sep}how-to${path.sep}guides${path.sep}`)) {
        guides = loadGuides(workspaceRoot);
      }
      refresh();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("annix-howto-watcher.openAffected", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const activeRel = path.relative(workspaceRoot, editor.document.uri.fsPath);
      const matches = matchingGuides(guides, activeRel);
      if (matches.length === 0) {
        vscode.window.showInformationMessage("No how-to guides affected by this file.");
        return;
      }
      if (matches.length === 1) {
        const doc = await vscode.workspace.openTextDocument(matches[0].absolutePath);
        await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside });
        return;
      }
      const picked = await vscode.window.showQuickPick(
        matches.map((m) => ({ label: m.title, description: m.relativePath, guide: m })),
        { placeHolder: "Open which guide?" },
      );
      if (!picked) return;
      const doc = await vscode.workspace.openTextDocument(picked.guide.absolutePath);
      await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside });
    }),
  );

  refresh();
}

export function deactivate(): void {}
