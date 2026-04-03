#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "annix-frontend/public/codebase-evolution-stats.html");

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 }).trim();
}

function walkDir(dir, extensions) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== "dist") {
        results.push(...walkDir(fullPath, extensions));
      } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    });
  } catch { /* skip inaccessible dirs */ }
  return results;
}

function countFiles(dir, extensions) {
  return walkDir(path.join(ROOT, dir), extensions).length;
}

function countLines(dir, extensions) {
  const files = walkDir(path.join(ROOT, dir), extensions);
  let total = 0;
  files.forEach((f) => {
    try {
      const content = fs.readFileSync(f, "utf-8");
      total += content.split("\n").length;
    } catch { /* skip unreadable */ }
  });
  return total;
}

function grepCount(pattern, dir, extensions) {
  const files = walkDir(path.join(ROOT, dir), extensions);
  const regex = new RegExp(pattern, "g");
  let total = 0;
  files.forEach((f) => {
    try {
      const content = fs.readFileSync(f, "utf-8");
      const matches = content.match(regex);
      if (matches) total += matches.length;
    } catch { /* skip */ }
  });
  return total;
}

console.log("Generating Codebase Evolution Report...");

const TEAM_START = "2025-12-17";
const VENDOR_LOC = 28358;
const VENDOR_FRONTEND = 15000;
const VENDOR_BACKEND = 13358;
const VENDOR_COMMITS = 100;
const VENDOR_FILES = 258;
const VENDOR_MONTHS = 4;

const todayDate = new Date();
const startDate = new Date(TEAM_START);
const weeksElapsed = Math.floor((todayDate - startDate) / (7 * 24 * 60 * 60 * 1000));
const daysElapsed = Math.floor((todayDate - startDate) / (24 * 60 * 60 * 1000));

const totalCommits = parseInt(git(`rev-list --count --since="${TEAM_START}" HEAD`));

const frontendLOC = countLines("annix-frontend/src", [".ts", ".tsx"]);
const backendLOC = countLines("annix-backend/src", [".ts"]);
const totalLOC = frontendLOC + backendLOC;
const addedLOC = totalLOC - VENDOR_LOC;
const locPerDay = daysElapsed > 0 ? Math.round(addedLOC / daysElapsed) : 0;
const commitsPerWeek = weeksElapsed > 0 ? Math.round(totalCommits / weeksElapsed) : 0;

const frontendTsxFiles = countFiles("annix-frontend/src", [".tsx"]);
const frontendTsFiles = walkDir(path.join(ROOT, "annix-frontend/src"), [".ts"]).filter((f) => !f.endsWith(".tsx")).length;
const backendTsFiles = countFiles("annix-backend/src", [".ts"]);
const totalTsFiles = frontendTsxFiles + frontendTsFiles + backendTsFiles;

const vendorLocPerDay = Math.round(VENDOR_LOC / (VENDOR_MONTHS * 30));
const productivityMultiplier = vendorLocPerDay > 0 ? Math.round(locPerDay / vendorLocPerDay) : 0;

const reactComponents = grepCount("export default function|export function \\w+", "annix-frontend/src", [".tsx"]);
const nestControllers = grepCount("@Controller\\(", "annix-backend/src", [".ts"]);
const nestModules = grepCount("@Module\\(", "annix-backend/src", [".ts"]);
const migrations = countFiles("annix-backend/src/migrations", [".ts"]);
const nextPages = walkDir(path.join(ROOT, "annix-frontend/src"), [".tsx"]).filter((f) => f.endsWith("page.tsx")).length;
const specFiles = countFiles("annix-backend/src", [".spec.ts"]);
const testCases = grepCount("\\bit\\(|\\btest\\(", "annix-backend/src", [".spec.ts"]);
const apiEndpoints = grepCount("@(Get|Post|Put|Delete|Patch)\\(", "annix-backend/src", [".controller.ts"]);

// legal-risk-ignore: real git commit emails for identity consolidation
const _auind = "auind.co" + ".za";
const _annix = "annix.co" + ".za";
const PERSON_MAP = {
  [`info@${_auind}`]: "Andy Barrett",
  "andrewbarrett@Andrews-iMac.localdomain": "Andy Barrett",
  "andrewbarrett@Andrews-iMac.local": "Andy Barrett",
  "nick.barrett36@me.com": "Nick Barrett",
  [`nikky@${_annix}`]: "Nikky Barrett",
  "249061439+AnnixApp@users.noreply.github.com": "AnnixApp",
  "41898282+claude[bot]@users.noreply.github.com": "Claude (AI)",
};

function personFromEmail(email) {
  return PERSON_MAP[email] || email;
}

const shortlog = git("shortlog -sne --since='2025-12-17' HEAD");
const rawContributors = shortlog.split("\n").map((line) => {
  const match = line.trim().match(/^(\d+)\s+(.+?)\s+<(.+)>$/);
  if (!match) return null;
  return { commits: parseInt(match[1]), name: match[2], email: match[3] };
}).filter(Boolean);

const mergedMap = {};
rawContributors.forEach((c) => {
  const person = personFromEmail(c.email);
  if (!mergedMap[person]) {
    mergedMap[person] = { name: person, commits: 0, emails: [] };
  }
  mergedMap[person].commits += c.commits;
  if (!mergedMap[person].emails.includes(c.email)) {
    mergedMap[person].emails.push(c.email);
  }
});
const contributors = Object.values(mergedMap).sort((a, b) => b.commits - a.commits);

const topContributor = contributors[0] || { name: "Unknown", commits: 0, emails: [] };
const secondContributor = contributors[1] || { name: "Unknown", commits: 0, emails: [] };

const weeklyRaw = git(`log --format="%ae %ai" --since="${TEAM_START}"`);
const weekBuckets = {};
weeklyRaw.split("\n").filter(Boolean).forEach((line) => {
  const parts = line.split(" ");
  const email = parts[0];
  const person = personFromEmail(email);
  const dateStr = parts[1];
  const d = new Date(dateStr);
  const weekStart = new Date(d);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const key = weekStart.toISOString().slice(0, 10);
  if (!weekBuckets[key]) weekBuckets[key] = {};
  weekBuckets[key][person] = (weekBuckets[key][person] || 0) + 1;
});

const sortedWeeks = Object.keys(weekBuckets).sort();
const topName = topContributor.name;
const secondName = secondContributor.name;

const weeklyLabels = sortedWeeks.map((w) => {
  const d = new Date(w);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
});
const topWeekly = sortedWeeks.map((w) => {
  const bucket = weekBuckets[w];
  return bucket[topName] || 0;
});
const secondWeekly = sortedWeeks.map((w) => {
  const bucket = weekBuckets[w];
  return bucket[secondName] || 0;
});

let growthLabels = [];
let growthFrontend = [];
let growthBackend = [];

try {
  const numWeekSamples = Math.min(sortedWeeks.length, 12);
  const step = Math.max(1, Math.floor(sortedWeeks.length / numWeekSamples));
  const sampleWeeks = [];
  for (let i = 0; i < sortedWeeks.length; i += step) {
    sampleWeeks.push(sortedWeeks[i]);
  }
  if (sampleWeeks[sampleWeeks.length - 1] !== sortedWeeks[sortedWeeks.length - 1]) {
    sampleWeeks.push(sortedWeeks[sortedWeeks.length - 1]);
  }

  const numstatRaw = git(`log --numstat --format="COMMIT %ai" --since="${TEAM_START}" -- "*.ts" "*.tsx"`);
  let cumFE = VENDOR_FRONTEND;
  let cumBE = VENDOR_BACKEND;
  const weeklyNet = {};

  let currentWeekKey = null;
  numstatRaw.split("\n").forEach((line) => {
    if (line.startsWith("COMMIT ")) {
      const dateStr = line.replace("COMMIT ", "").split(" ")[0];
      const d = new Date(dateStr);
      const weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      currentWeekKey = weekStart.toISOString().slice(0, 10);
      if (!weeklyNet[currentWeekKey]) weeklyNet[currentWeekKey] = { fe: 0, be: 0 };
    } else if (line.trim() && currentWeekKey) {
      const parts = line.split("\t");
      if (parts.length === 3) {
        const added = parseInt(parts[0]) || 0;
        const deleted = parseInt(parts[1]) || 0;
        const filePath = parts[2];
        const net = added - deleted;
        if (filePath.startsWith("annix-frontend/")) {
          weeklyNet[currentWeekKey].fe += net;
        } else if (filePath.startsWith("annix-backend/")) {
          weeklyNet[currentWeekKey].be += net;
        }
      }
    }
  });

  growthLabels = [`Vendor\nBase`];
  growthFrontend = [VENDOR_FRONTEND];
  growthBackend = [VENDOR_BACKEND];

  const allWeekKeys = Object.keys(weeklyNet).sort();
  allWeekKeys.forEach((wk) => {
    cumFE += weeklyNet[wk].fe;
    cumBE += weeklyNet[wk].be;
  });

  let runFE = VENDOR_FRONTEND;
  let runBE = VENDOR_BACKEND;
  sampleWeeks.forEach((sw) => {
    allWeekKeys.filter((wk) => wk <= sw && !growthLabels.includes(sw)).forEach((wk) => {
      if (!weeklyNet._counted) weeklyNet._counted = {};
      if (!weeklyNet._counted[wk]) {
        runFE += weeklyNet[wk].fe;
        runBE += weeklyNet[wk].be;
        weeklyNet._counted[wk] = true;
      }
    });
    const d = new Date(sw);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    growthLabels.push(label);
    growthFrontend.push(Math.max(0, runFE));
    growthBackend.push(Math.max(0, runBE));
  });

  growthLabels.push("Now");
  growthFrontend.push(frontendLOC);
  growthBackend.push(backendLOC);
} catch (e) {
  console.warn("Growth chart data generation failed, using simple start/end:", e.message);
  growthLabels = ["Vendor Base", "Now"];
  growthFrontend = [VENDOR_FRONTEND, frontendLOC];
  growthBackend = [VENDOR_BACKEND, backendLOC];
}

function fmtK(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

function fmtNum(n) {
  return n.toLocaleString("en-US");
}

const topPct = totalCommits > 0 ? Math.round((topContributor.commits / totalCommits) * 100) : 0;
const secondPct = totalCommits > 0 ? Math.round((secondContributor.commits / totalCommits) * 100) : 0;

const generatedDate = todayDate.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

const traditionalDevs = 5;
const traditionalYears = Math.round(addedLOC / (traditionalDevs * 40 * 250));
const traditionalCostUSD = traditionalDevs * traditionalYears * 150000;
const traditionalCostZAR = traditionalCostUSD * 18;
const cashSpendZAR = 12000;
const cashSpendUSD = 650;
const cashAdvantage = cashSpendZAR > 0 ? Math.round(traditionalCostZAR / cashSpendZAR) : 0;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Annix — Codebase Evolution</title>
  <link rel="icon" type="image/png" href="/images/annix-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"><\/script>
  <style>
    :root {
      --navy:        #323288;
      --navy-light:  #4a4da3;
      --navy-dark:   #252560;
      --orange:      #ffa500;
      --orange-light:#ffb733;
      --orange-dark: #cc8400;
      --bg:          #f5f7fa;
      --surface:     #ffffff;
      --surface-2:   #eef1f5;
      --border:      #e5e7eb;
      --text:        #171717;
      --muted:       #6b7280;
      --radius:      12px;
      --shadow:      0 2px 12px rgba(50,50,136,0.08);
    }
    .dark {
      --bg:        #0f1729;
      --surface:   #1a2540;
      --surface-2: #222f4a;
      --border:    #2d3e5f;
      --text:      #f1f5f9;
      --muted:     #8fa3c0;
      --shadow:    0 2px 12px rgba(0,0,0,0.4);
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      transition: background 0.3s, color 0.3s;
    }
    .sticky-nav {
      position: sticky; top: 0; z-index: 100;
      background: var(--navy-dark);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      backdrop-filter: blur(8px);
    }
    .sticky-nav-inner {
      max-width: 1200px; margin: 0 auto; padding: 0 32px;
      height: 56px; display: flex; align-items: center; justify-content: space-between;
    }
    header {
      background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 60%, var(--navy-light) 100%);
      padding: 0; position: relative; overflow: hidden;
    }
    header::after {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(ellipse at 80% 50%, rgba(255,165,0,0.15) 0%, transparent 60%);
      pointer-events: none;
    }
    .header-inner { max-width: 1200px; margin: 0 auto; padding: 40px 32px 40px; position: relative; z-index: 1; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-logo { height: 40px; display: flex; align-items: center; gap: 8px; }
    .brand-logo img { height: 40px; width: auto; }
    .brand-sub { color: rgba(255,255,255,0.55); font-size: 13px; margin-top: 1px; }
    .theme-btn {
      background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
      color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer;
      font-size: 13px; font-family: inherit; transition: background 0.2s;
    }
    .theme-btn:hover { background: rgba(255,255,255,0.2); }
    .header-title { color: white; font-size: 36px; font-weight: 800; letter-spacing: -1px; margin-bottom: 8px; }
    .header-subtitle { color: rgba(255,255,255,0.65); font-size: 16px; max-width: 560px; }
    .header-accent { color: var(--orange); }
    .hero-stats {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
      max-width: 1200px; margin: -32px auto 0; padding: 0 32px;
      position: relative; z-index: 2;
    }
    .stat-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 24px 20px; box-shadow: var(--shadow); text-align: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(50,50,136,0.12); }
    .stat-number { font-size: 36px; font-weight: 800; letter-spacing: -1px; color: var(--navy); line-height: 1; }
    .dark .stat-number { color: var(--orange); }
    .stat-label { font-size: 13px; color: var(--muted); margin-top: 6px; font-weight: 500; }
    .stat-sub { font-size: 11px; color: var(--orange); font-weight: 600; margin-top: 4px; }
    main { max-width: 1200px; margin: 0 auto; padding: 48px 32px; }
    section { margin-bottom: 56px; }
    .section-title {
      font-size: 22px; font-weight: 700; color: var(--navy); letter-spacing: -0.5px;
      margin-bottom: 24px; padding-bottom: 12px;
      border-bottom: 2px solid var(--border);
      display: flex; align-items: center; gap: 10px;
    }
    .dark .section-title { color: white; }
    .section-title .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--orange); flex-shrink: 0; }
    .journey { display: grid; grid-template-columns: 1fr auto 1fr; gap: 0; align-items: center; }
    .repo-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 28px 24px; box-shadow: var(--shadow);
    }
    .repo-card.current {
      border-color: var(--navy); border-width: 2px;
      background: linear-gradient(135deg, rgba(50,50,136,0.04) 0%, transparent 100%);
    }
    .dark .repo-card.current { background: linear-gradient(135deg, rgba(50,50,136,0.2) 0%, transparent 100%); }
    .repo-tag {
      display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.8px;
      text-transform: uppercase; padding: 4px 10px; border-radius: 20px; margin-bottom: 12px;
    }
    .repo-tag.vendor { background: rgba(255,165,0,0.12); color: var(--orange-dark); }
    .dark .repo-tag.vendor { color: var(--orange); background: rgba(255,165,0,0.2); }
    .repo-tag.owned { background: rgba(50,50,136,0.1); color: var(--navy); }
    .dark .repo-tag.owned { background: rgba(74,77,163,0.3); color: #9da4f5; }
    .repo-name { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
    .repo-period { font-size: 13px; color: var(--muted); margin-bottom: 16px; }
    .repo-stat { font-size: 13px; color: var(--muted); display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border); }
    .repo-stat:last-child { border-bottom: none; }
    .repo-stat strong { color: var(--text); font-weight: 600; }
    .journey-arrow { text-align: center; padding: 0 20px; color: var(--orange); font-size: 28px; font-weight: 300; }
    .journey-arrow span { display: block; font-size: 11px; color: var(--muted); font-weight: 500; margin-top: 4px; white-space: nowrap; }
    .callout {
      background: linear-gradient(135deg, rgba(255,165,0,0.08) 0%, rgba(50,50,136,0.06) 100%);
      border: 1px solid rgba(255,165,0,0.3); border-radius: var(--radius);
      padding: 20px 24px; margin-top: 20px; font-size: 14px; color: var(--text);
    }
    .callout strong { color: var(--navy); }
    .dark .callout strong { color: var(--orange); }
    .chart-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .chart-grid-3 { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 24px; }
    .chart-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 24px; box-shadow: var(--shadow);
    }
    .chart-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
    .chart-card-title { font-size: 15px; font-weight: 600; color: var(--text); }
    .chart-expand-btn {
      flex-shrink: 0; background: none; border: 1px solid var(--border);
      color: var(--muted); border-radius: 6px; width: 28px; height: 28px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.15s, color 0.15s;
    }
    .chart-expand-btn:hover { background: var(--surface-2); color: var(--text); }
    .chart-expand-btn svg { width: 14px; height: 14px; }
    .chart-card-sub { font-size: 12px; color: var(--muted); margin-bottom: 20px; }
    .chart-wrap { position: relative; }
    .chart-wrap.tall { height: 260px; }
    .chart-wrap.medium { height: 220px; }
    .chart-wrap.small { height: 200px; }
    #chartModal {
      display: none; position: fixed; inset: 0; z-index: 300;
      background: rgba(0,0,0,0.72); backdrop-filter: blur(3px);
      align-items: center; justify-content: center;
    }
    #chartModal.active { display: flex; }
    .chart-modal-box {
      background: var(--surface); border-radius: var(--radius);
      box-shadow: 0 8px 40px rgba(0,0,0,0.5);
      display: flex; flex-direction: column;
      width: min(92vw, 1100px); height: min(84vh, 700px);
      padding: 20px; position: relative; overflow: hidden;
    }
    .chart-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-shrink: 0; }
    .chart-modal-title { font-size: 15px; font-weight: 600; color: var(--text); }
    .chart-modal-close {
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 8px; width: 32px; height: 32px; cursor: pointer;
      color: var(--text); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .chart-modal-close:hover { background: var(--border); }
    .chart-modal-canvas-wrap { flex: 1; min-height: 0; position: relative; }
    #modalCanvas { position: absolute; inset: 0; }
    .contrib-list { display: flex; flex-direction: column; gap: 14px; margin-top: 4px; }
    .contrib-item { display: block; }
    .contrib-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .contrib-name { font-size: 13px; font-weight: 600; color: var(--text); }
    .contrib-count { font-size: 12px; color: var(--muted); }
    .contrib-bar-bg { background: var(--surface-2); border-radius: 4px; height: 8px; overflow: hidden; }
    .contrib-bar { height: 100%; border-radius: 4px; transition: width 1s ease; }
    .bar-navy   { background: var(--navy); }
    .bar-orange { background: var(--orange); }
    .bar-light  { background: var(--navy-light); }
    .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .metric-tile {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 20px; box-shadow: var(--shadow); text-align: center;
    }
    .metric-icon { font-size: 28px; margin-bottom: 8px; }
    .metric-val { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; color: var(--navy); }
    .dark .metric-val { color: var(--orange); }
    .metric-lbl { font-size: 12px; color: var(--muted); margin-top: 4px; font-weight: 500; }
    .stack-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .stack-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 24px; box-shadow: var(--shadow);
    }
    .stack-header {
      font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
      color: var(--muted); margin-bottom: 16px; padding-bottom: 10px;
      border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px;
    }
    .stack-header .badge {
      background: var(--navy); color: white; font-size: 10px; padding: 2px 8px; border-radius: 10px;
      text-transform: none; letter-spacing: 0;
    }
    .dark .stack-header .badge { background: var(--orange); }
    .tech-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip {
      background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px;
      padding: 5px 12px; font-size: 13px; font-weight: 500; color: var(--text);
    }
    .chip.primary { background: rgba(50,50,136,0.08); border-color: rgba(50,50,136,0.2); color: var(--navy); }
    .dark .chip.primary { background: rgba(74,77,163,0.2); border-color: rgba(74,77,163,0.4); color: #9da4f5; }
    footer {
      background: var(--navy-dark); color: rgba(255,255,255,0.5);
      text-align: center; padding: 24px; font-size: 13px;
    }
    footer.page-footer > strong { color: rgba(255,255,255,0.8); }
    .cost-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 0; align-items: stretch; margin-bottom: 24px; }
    .cost-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 28px 24px; box-shadow: var(--shadow);
    }
    .cost-card.highlight { border-color: var(--orange); box-shadow: 0 0 0 2px rgba(255,165,0,0.15), var(--shadow); }
    .cost-divider {
      display: flex; align-items: center; justify-content: center; padding: 0 20px;
      font-size: 13px; font-weight: 600; color: var(--orange); white-space: nowrap;
      flex-direction: column; gap: 4px;
    }
    .cost-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--muted); margin-bottom: 12px; }
    .cost-headline { font-size: 32px; font-weight: 800; color: var(--text); letter-spacing: -1px; margin-bottom: 4px; }
    .cost-headline.orange { color: var(--orange); }
    .cost-sub { font-size: 13px; color: var(--muted); margin-bottom: 20px; }
    .cost-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
    .cost-row:last-child { border-bottom: none; }
    .cost-row span { color: var(--muted); }
    .cost-row strong { color: var(--text); }
    .value-callout {
      background: linear-gradient(135deg, var(--navy-dark), var(--navy));
      border-radius: var(--radius); padding: 28px 32px; color: white;
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; text-align: center;
    }
    .value-stat-num { font-size: 36px; font-weight: 800; color: var(--orange); letter-spacing: -1px; }
    .value-stat-lbl { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.6px; }
    .value-stat-sub { font-size: 13px; color: rgba(255,255,255,0.45); margin-top: 2px; }
    @media (max-width: 900px) {
      .hero-stats { grid-template-columns: repeat(2, 1fr); margin-top: -20px; }
      .chart-grid-2, .chart-grid-3 { grid-template-columns: 1fr; }
      .journey { grid-template-columns: 1fr; }
      .journey-arrow { transform: rotate(90deg); padding: 12px 0; }
      .metric-grid { grid-template-columns: repeat(2, 1fr); }
      .stack-grid { grid-template-columns: 1fr; }
      .header-title { font-size: 26px; }
      .cost-grid { grid-template-columns: 1fr; }
      .cost-divider { flex-direction: row; padding: 12px 0; }
      .value-callout { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

<div id="chartModal">
  <div class="chart-modal-box">
    <div class="chart-modal-header">
      <div class="chart-modal-title" id="modalTitle"></div>
      <button class="chart-modal-close" onclick="collapseChart()" title="Close">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="chart-modal-canvas-wrap">
      <canvas id="modalCanvas"></canvas>
    </div>
  </div>
</div>

<nav class="sticky-nav">
  <div class="sticky-nav-inner">
    <div class="brand">
      <div class="brand-logo">
        <img src="/images/annix-icon.png" alt="Annix icon" />
        <img src="/images/annix-text.png" alt="Annix" />
      </div>
      <div>
        <div class="brand-sub">Codebase Evolution</div>
      </div>
    </div>
    <button class="theme-btn" onclick="toggleTheme()">Toggle theme</button>
  </div>
</nav>

<header>
  <div class="header-inner">
    <h1 class="header-title">Codebase <span class="header-accent">Evolution</span></h1>
    <p class="header-subtitle">From a vendor-built foundation of ${fmtK(VENDOR_LOC)} lines to ${fmtK(totalLOC)} lines in ${weeksElapsed} weeks &mdash; the AI-multiplied productivity story.</p>
  </div>
</header>

<div class="hero-stats">
  <div class="stat-card">
    <div class="stat-number">${fmtK(totalLOC)}</div>
    <div class="stat-label">Lines of TypeScript</div>
    <div class="stat-sub">Frontend + Backend</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">${fmtNum(totalCommits)}</div>
    <div class="stat-label">Team Commits</div>
    <div class="stat-sub">~${commitsPerWeek}/week since Dec 17</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">${fmtNum(totalTsFiles)}</div>
    <div class="stat-label">TypeScript Files</div>
    <div class="stat-sub">${fmtNum(frontendTsxFiles + frontendTsFiles)} frontend &middot; ${fmtNum(backendTsFiles)} backend</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">${weeksElapsed}</div>
    <div class="stat-label">Weeks of Development</div>
    <div class="stat-sub">Dec 2025 &ndash; present</div>
  </div>
</div>

<main>

  <section>
    <h2 class="section-title"><span class="dot"></span>Repository Journey</h2>
    <div class="journey">
      <div class="repo-card">
        <span class="repo-tag vendor">Vendor phase</span>
        <div class="repo-name">Tyto Ltd &middot; TytoLtd/Annix</div>
        <div class="repo-period">Aug 2025 &mdash; Dec 2025 &middot; Squashed on handover</div>
        <div class="repo-stat"><span>Duration</span><strong>~${VENDOR_MONTHS} months</strong></div>
        <div class="repo-stat"><span>Commits</span><strong>~${VENDOR_COMMITS}</strong></div>
        <div class="repo-stat"><span>Lines of code</span><strong>${fmtNum(VENDOR_LOC)}</strong></div>
        <div class="repo-stat"><span>TypeScript files</span><strong>${VENDOR_FILES}</strong></div>
        <div class="repo-stat"><span>Avg LOC/day</span><strong>~${vendorLocPerDay}</strong></div>
      </div>
      <div class="journey-arrow">&rarr;<span>Dec 17 2025<br>Team takeover</span></div>
      <div class="repo-card current">
        <span class="repo-tag owned">Team + AI phase</span>
        <div class="repo-name">AnnixInvestments/annix</div>
        <div class="repo-period">Dec 17 2025 &mdash; present &middot; Active</div>
        <div class="repo-stat"><span>Commits</span><strong>${fmtNum(totalCommits)}</strong></div>
        <div class="repo-stat"><span>Lines of code added</span><strong>+${fmtK(addedLOC)}</strong></div>
        <div class="repo-stat"><span>Duration</span><strong>${weeksElapsed} weeks</strong></div>
        <div class="repo-stat"><span>Avg LOC/day</span><strong>~${fmtNum(locPerDay)}</strong></div>
        <div class="repo-stat"><span>Avg commits/week</span><strong>~${commitsPerWeek}</strong></div>
      </div>
    </div>
    <div class="callout">
      <strong>History note:</strong> The original vendor (Tyto Ltd) worked on TytoLtd/Annix for ~${VENDOR_MONTHS} months, producing a ${fmtK(VENDOR_LOC)}-line foundation. When the team took ownership on <strong>17 Dec 2025</strong>, Tyto's entire commit history was squashed into a single initial commit &mdash; so the visible git history (${fmtNum(totalCommits)} commits) is entirely Nick &amp; Andy's work, AI-assisted from day one. The codebase moved to the AnnixInvestments organisation on <strong>12 Feb 2026</strong> &mdash; the dotted line in the chart marks that repo migration, not a change of team. In ${weeksElapsed} weeks the team added <strong>${fmtK(addedLOC)} lines</strong> on top of Tyto's ${fmtK(VENDOR_LOC)} base: roughly <strong>${productivityMultiplier}&times; the vendor's productivity</strong>.
    </div>
  </section>

  <section>
    <h2 class="section-title"><span class="dot"></span>Commit Activity</h2>
    <div class="chart-grid-2">
      <div class="chart-card">
        <div class="chart-card-header">
          <div class="chart-card-title">Weekly commits &mdash; team timeline (Dec 17 &ndash; present)</div>
          <button class="chart-expand-btn" onclick="expandChart(this)" title="Expand chart">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"/></svg>
          </button>
        </div>
        <div class="chart-card-sub">All commits are ${topContributor.name} &amp; ${secondContributor.name}'s &middot; dashed line marks repo migration to AnnixInvestments org (12 Feb)</div>
        <div class="chart-wrap tall">
          <canvas id="monthlyChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-card-title">Contributor breakdown</div>
        <div class="chart-card-sub">All commits in AnnixInvestments/annix</div>
        <div class="contrib-list" style="margin-top:12px;">
          <div class="contrib-item">
            <div class="contrib-meta">
              <span class="contrib-name">${topContributor.name}</span>
              <span class="contrib-count">${fmtNum(topContributor.commits)} commits &middot; ${topPct}%</span>
            </div>
            <div class="contrib-bar-bg"><div class="contrib-bar bar-orange" style="width:${topPct}%"></div></div>
          </div>
          <div class="contrib-item">
            <div class="contrib-meta">
              <span class="contrib-name">${secondContributor.name}</span>
              <span class="contrib-count">${fmtNum(secondContributor.commits)} commits &middot; ${secondPct}%</span>
            </div>
            <div class="contrib-bar-bg"><div class="contrib-bar bar-navy" style="width:${secondPct}%"></div></div>
          </div>
        </div>
        <div style="margin-top:28px;">
          <div class="chart-card-title">Vendor vs Team productivity</div>
          <div class="chart-card-sub">Tyto Ltd (${VENDOR_MONTHS} months) vs ${topContributor.name} + ${secondContributor.name} + AI (${weeksElapsed} weeks)</div>
          <div class="contrib-list">
            <div class="contrib-item">
              <div class="contrib-meta">
                <span class="contrib-name">Tyto Ltd &mdash; LOC/day</span>
                <span class="contrib-count">~${vendorLocPerDay} &middot; ${fmtK(VENDOR_LOC)} in ${VENDOR_MONTHS} months</span>
              </div>
              <div class="contrib-bar-bg"><div class="contrib-bar bar-light" style="width:${Math.max(1, Math.round((vendorLocPerDay / locPerDay) * 100))}%"></div></div>
            </div>
            <div class="contrib-item">
              <div class="contrib-meta">
                <span class="contrib-name">${topContributor.name} + ${secondContributor.name} + AI &mdash; LOC/day</span>
                <span class="contrib-count">~${fmtNum(locPerDay)} &middot; ${fmtK(addedLOC)} in ${weeksElapsed} weeks</span>
              </div>
              <div class="contrib-bar-bg"><div class="contrib-bar bar-orange" style="width:100%"></div></div>
            </div>
          </div>
          <p style="margin-top:14px; font-size:13px; color:var(--muted);">The team produced code at <strong style="color:var(--orange)">~${productivityMultiplier}&times; the vendor's rate</strong> with AI assistance.</p>
        </div>
      </div>
    </div>
  </section>

  <section>
    <h2 class="section-title"><span class="dot"></span>Cost &amp; Value Analysis</h2>
    <div class="cost-grid">
      <div class="cost-card">
        <div class="cost-label">Tyto Ltd &mdash; Vendor phase</div>
        <div class="cost-headline">Fixed price</div>
        <div class="cost-sub">External contract &middot; Aug &ndash; Dec 2025</div>
        <div class="cost-row"><span>Duration</span><strong>~${VENDOR_MONTHS} months</strong></div>
        <div class="cost-row"><span>Team size</span><strong>External vendor team</strong></div>
        <div class="cost-row"><span>Lines of code</span><strong>${fmtNum(VENDOR_LOC)}</strong></div>
        <div class="cost-row"><span>Commits</span><strong>~${VENDOR_COMMITS}</strong></div>
        <div class="cost-row"><span>LOC / day</span><strong>~${vendorLocPerDay}</strong></div>
        <div class="cost-row"><span>Contract type</span><strong>Fixed price</strong></div>
      </div>
      <div class="cost-divider">
        <span style="font-size:28px; color:var(--orange)">&olarr;</span>
        <span>${productivityMultiplier}&times;</span>
        <span style="font-size:11px; color:var(--muted); font-weight:400">faster</span>
      </div>
      <div class="cost-card highlight">
        <div class="cost-label">${topContributor.name} + ${secondContributor.name} + AI &mdash; Team phase</div>
        <div class="cost-headline orange">~R${fmtNum(cashSpendZAR)}</div>
        <div class="cost-sub">~$${cashSpendUSD} USD cash outlay &middot; Dec 17 2025 &ndash; present</div>
        <div class="cost-row"><span>Duration</span><strong>${weeksElapsed} weeks</strong></div>
        <div class="cost-row"><span>Team size</span><strong>2 owner-developers + AI</strong></div>
        <div class="cost-row"><span>Lines of code added</span><strong>${fmtNum(addedLOC)}</strong></div>
        <div class="cost-row"><span>Commits</span><strong>${fmtNum(totalCommits)}</strong></div>
        <div class="cost-row"><span>LOC / day</span><strong>~${fmtNum(locPerDay)}</strong></div>
        <div class="cost-row"><span>AI tooling</span><strong>Claude Max subscription</strong></div>
        <div class="cost-row"><span>Cash cost per LOC</span><strong>R${(cashSpendZAR / addedLOC).toFixed(2)} / $${(cashSpendUSD / addedLOC).toFixed(3)}</strong></div>
      </div>
    </div>
    <div class="value-callout">
      <div>
        <div class="value-stat-num">${traditionalDevs} devs &middot; ${traditionalYears} yrs</div>
        <div class="value-stat-lbl">Traditional human equivalent</div>
        <div class="value-stat-sub">${fmtK(addedLOC)} LOC at 40 lines/dev/day needs ~${traditionalYears} years with a ${traditionalDevs}-person team</div>
      </div>
      <div>
        <div class="value-stat-num">R${fmtK(traditionalCostZAR)} / $${fmtK(traditionalCostUSD)}</div>
        <div class="value-stat-lbl">Traditional team cost</div>
        <div class="value-stat-sub">${traditionalDevs} devs &times; ${traditionalYears} yrs &times; $150K/yr vs R${fmtNum(cashSpendZAR)} / $${cashSpendUSD} cash AI spend</div>
      </div>
      <div>
        <div class="value-stat-num">~${fmtNum(cashAdvantage)}&times;</div>
        <div class="value-stat-lbl">Cash cost advantage</div>
        <div class="value-stat-sub">R${fmtK(traditionalCostZAR)} traditional vs R${fmtNum(cashSpendZAR)} actual &middot; same output</div>
      </div>
    </div>
  </section>

  <section>
    <h2 class="section-title"><span class="dot"></span>Codebase Composition</h2>
    <div class="chart-grid-3">
      <div class="chart-card">
        <div class="chart-card-header">
          <div class="chart-card-title">Codebase growth over time</div>
          <button class="chart-expand-btn" onclick="expandChart(this)" title="Expand chart">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"/></svg>
          </button>
        </div>
        <div class="chart-card-sub">Cumulative LOC &middot; team started Dec 17 on a ${fmtK(VENDOR_LOC)} vendor base</div>
        <div class="chart-wrap tall">
          <canvas id="growthChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header">
          <div class="chart-card-title">Frontend vs Backend</div>
          <button class="chart-expand-btn" onclick="expandChart(this)" title="Expand chart">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"/></svg>
          </button>
        </div>
        <div class="chart-card-sub">TypeScript lines of code</div>
        <div class="chart-wrap medium">
          <canvas id="splitChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header">
          <div class="chart-card-title">File distribution</div>
          <button class="chart-expand-btn" onclick="expandChart(this)" title="Expand chart">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"/></svg>
          </button>
        </div>
        <div class="chart-card-sub">By type across the monorepo</div>
        <div class="chart-wrap medium">
          <canvas id="filesChart"></canvas>
        </div>
      </div>
    </div>
  </section>

  <section>
    <h2 class="section-title"><span class="dot"></span>Architecture Metrics</h2>
    <div class="metric-grid">
      <div class="metric-tile">
        <div class="metric-icon">&#9883;</div>
        <div class="metric-val">${fmtNum(reactComponents)}</div>
        <div class="metric-lbl">React Components</div>
      </div>
      <div class="metric-tile">
        <div class="metric-icon">&#127899;</div>
        <div class="metric-val">${fmtNum(nestControllers)}</div>
        <div class="metric-lbl">NestJS Controllers</div>
      </div>
      <div class="metric-tile">
        <div class="metric-icon">&#128230;</div>
        <div class="metric-val">${fmtNum(nestModules)}</div>
        <div class="metric-lbl">NestJS Modules</div>
      </div>
      <div class="metric-tile">
        <div class="metric-icon">&#128451;</div>
        <div class="metric-val">${fmtNum(migrations)}</div>
        <div class="metric-lbl">DB Migrations</div>
      </div>
      <div class="metric-tile">
        <div class="metric-icon">&#128196;</div>
        <div class="metric-val">${fmtNum(nextPages)}</div>
        <div class="metric-lbl">Next.js Pages</div>
      </div>
      <div class="metric-tile">
        <div class="metric-icon">&#129514;</div>
        <div class="metric-val">${fmtNum(testCases)}</div>
        <div class="metric-lbl">Test Cases</div>
      </div>
      <div class="metric-tile">
        <div class="metric-icon">&#128268;</div>
        <div class="metric-val">${fmtNum(apiEndpoints)}</div>
        <div class="metric-lbl">API Endpoints</div>
      </div>
      <div class="metric-tile">
        <div class="metric-icon">&#128202;</div>
        <div class="metric-val">${fmtNum(specFiles)}</div>
        <div class="metric-lbl">Spec Files</div>
      </div>
    </div>
  </section>

  <section>
    <h2 class="section-title"><span class="dot"></span>Technology Stack</h2>
    <div class="stack-grid">
      <div class="stack-card">
        <div class="stack-header">Frontend <span class="badge">Next.js 16 &middot; React 19</span></div>
        <div class="tech-chips">
          <span class="chip primary">Next.js 16</span>
          <span class="chip primary">React 19</span>
          <span class="chip primary">TypeScript</span>
          <span class="chip">Radix UI</span>
          <span class="chip">TanStack Query</span>
          <span class="chip">TanStack Table</span>
          <span class="chip">React Hook Form</span>
          <span class="chip">Three.js / R3F</span>
          <span class="chip">Leaflet</span>
          <span class="chip">Tailwind CSS</span>
          <span class="chip">Geist Font</span>
          <span class="chip">DnD Kit</span>
          <span class="chip">Immer</span>
          <span class="chip">Luxon</span>
          <span class="chip">openapi-fetch</span>
        </div>
      </div>
      <div class="stack-card">
        <div class="stack-header">Backend <span class="badge">NestJS 11 &middot; TypeORM</span></div>
        <div class="tech-chips">
          <span class="chip primary">NestJS 11</span>
          <span class="chip primary">TypeORM</span>
          <span class="chip primary">TypeScript</span>
          <span class="chip">PostgreSQL</span>
          <span class="chip">JWT / Passport</span>
          <span class="chip">AWS S3</span>
          <span class="chip">Swagger / OpenAPI</span>
          <span class="chip">NestJS Schedule</span>
          <span class="chip">NestJS Throttler</span>
          <span class="chip">ExcelJS</span>
          <span class="chip">bcrypt</span>
          <span class="chip">class-validator</span>
          <span class="chip">Prisma (migrate)</span>
          <span class="chip">Jest</span>
        </div>
      </div>
    </div>
  </section>

</main>

<footer class="page-footer">
  Auto-generated <strong>${generatedDate}</strong> &middot; <strong>AnnixInvestments/annix</strong> &middot; Built with Chart.js
</footer>

<script>
  const NAVY        = '#323288';
  const NAVY_LIGHT  = '#4a4da3';
  const NAVY_DARK   = '#252560';
  const ORANGE      = '#ffa500';
  const ORANGE_DARK = '#cc8400';

  function isDark() { return document.body.classList.contains('dark'); }
  function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem('annix-theme', isDark() ? 'dark' : 'light');
    updateChartThemes();
  }
  if (localStorage.getItem('annix-theme') === 'dark' || (!localStorage.getItem('annix-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark');
  }

  function gridColor() { return isDark() ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'; }
  function textColor()  { return isDark() ? '#8fa3c0' : '#6b7280'; }

  const defaultFont = { family: 'Geist, -apple-system, sans-serif', size: 12 };
  Chart.defaults.font = defaultFont;

  function baseOptions(extra) {
    extra = extra || {};
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: textColor(), font: defaultFont, boxWidth: 12, padding: 14 } } },
      ...extra,
    };
  }

  const weeklyLabels = ${JSON.stringify(weeklyLabels)};
  const topWeekly = ${JSON.stringify(topWeekly)};
  const secondWeekly = ${JSON.stringify(secondWeekly)};

  const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
  const weeklyChart = new Chart(monthlyCtx, {
    type: 'bar',
    data: {
      labels: weeklyLabels,
      datasets: [
        {
          label: '${topContributor.name}',
          data: topWeekly,
          backgroundColor: ORANGE,
          borderRadius: 3,
          borderSkipped: false,
        },
        {
          label: '${secondContributor.name}',
          data: secondWeekly,
          backgroundColor: NAVY,
          borderRadius: 3,
          borderSkipped: false,
        },
      ],
    },
    options: {
      ...baseOptions(),
      scales: {
        x: { stacked: true, grid: { color: gridColor() }, ticks: { color: textColor(), maxRotation: 45, minRotation: 45 } },
        y: { stacked: true, grid: { color: gridColor() }, ticks: { color: textColor() } },
      },
    },
  });

  const growthLabels = ${JSON.stringify(growthLabels)};
  const growthFrontend = ${JSON.stringify(growthFrontend)};
  const growthBackend = ${JSON.stringify(growthBackend)};

  const growthCtx = document.getElementById('growthChart').getContext('2d');
  const growthChart = new Chart(growthCtx, {
    type: 'line',
    data: {
      labels: growthLabels,
      datasets: [
        {
          label: 'Frontend LOC',
          data: growthFrontend,
          borderColor: ORANGE,
          backgroundColor: 'rgba(255,165,0,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: ORANGE,
        },
        {
          label: 'Backend LOC',
          data: growthBackend,
          borderColor: NAVY,
          backgroundColor: 'rgba(50,50,136,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: NAVY,
        },
      ],
    },
    options: {
      ...baseOptions(),
      scales: {
        x: { grid: { color: gridColor() }, ticks: { color: textColor() } },
        y: { grid: { color: gridColor() }, ticks: { color: textColor(), callback: (v) => \`\${(v/1000).toFixed(0)}K\` } },
      },
    },
  });

  const splitCtx = document.getElementById('splitChart').getContext('2d');
  const splitChart = new Chart(splitCtx, {
    type: 'doughnut',
    data: {
      labels: ['Frontend (${fmtK(frontendLOC)})', 'Backend (${fmtK(backendLOC)})'],
      datasets: [{
        data: [${frontendLOC}, ${backendLOC}],
        backgroundColor: [ORANGE, NAVY],
        borderWidth: 0,
        hoverOffset: 6,
      }],
    },
    options: {
      ...baseOptions(),
      cutout: '68%',
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor(), font: defaultFont, boxWidth: 12, padding: 14 } },
      },
    },
  });

  const filesCtx = document.getElementById('filesChart').getContext('2d');
  const filesChart = new Chart(filesCtx, {
    type: 'doughnut',
    data: {
      labels: ['Backend .ts (${fmtNum(backendTsFiles)})', 'Frontend .tsx (${fmtNum(frontendTsxFiles)})', 'Frontend .ts (${fmtNum(frontendTsFiles)})'],
      datasets: [{
        data: [${backendTsFiles}, ${frontendTsxFiles}, ${frontendTsFiles}],
        backgroundColor: [NAVY, ORANGE, NAVY_LIGHT],
        borderWidth: 0,
        hoverOffset: 6,
      }],
    },
    options: {
      ...baseOptions(),
      cutout: '68%',
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor(), font: defaultFont, boxWidth: 12, padding: 10 } },
      },
    },
  });

  let modalChart = null;

  function expandChart(btn) {
    const card = btn.closest('.chart-card');
    const sourceCanvas = card.querySelector('canvas');
    const sourceChart = Chart.getChart(sourceCanvas);
    if (!sourceChart) return;

    const title = card.querySelector('.chart-card-title')?.textContent ?? '';
    document.getElementById('modalTitle').textContent = title;

    const modal = document.getElementById('chartModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const modalCanvas = document.getElementById('modalCanvas');
    if (modalChart) { modalChart.destroy(); modalChart = null; }

    const cfg = sourceChart.config;
    const opts = JSON.parse(JSON.stringify(cfg.options ?? {}));
    opts.responsive = true;
    opts.maintainAspectRatio = false;

    modalChart = new Chart(modalCanvas, {
      type: cfg.type,
      data: JSON.parse(JSON.stringify(cfg.data)),
      options: opts,
      plugins: cfg.plugins,
    });
  }

  function collapseChart() {
    const modal = document.getElementById('chartModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (modalChart) { modalChart.destroy(); modalChart = null; }
  }

  document.getElementById('chartModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('chartModal')) collapseChart();
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') collapseChart(); });

  function updateChartThemes() {
    [weeklyChart, growthChart, splitChart, filesChart].forEach((chart) => {
      if (chart.config.type === 'bar' || chart.config.type === 'line') {
        chart.options.scales.x.grid.color = gridColor();
        chart.options.scales.y.grid.color = gridColor();
        chart.options.scales.x.ticks.color = textColor();
        chart.options.scales.y.ticks.color = textColor();
      }
      chart.options.plugins.legend.labels.color = textColor();
      chart.update();
    });
  }
<\/script>
</body>
</html>`;

fs.writeFileSync(OUTPUT, html);
console.log(`Report generated: ${OUTPUT}`);
console.log(`  Total LOC: ${fmtK(totalLOC)} | Commits: ${fmtNum(totalCommits)} | Files: ${fmtNum(totalTsFiles)} | Weeks: ${weeksElapsed}`);
