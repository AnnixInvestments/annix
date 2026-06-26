import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// #384 regression guard. The shared `RolesGuard` does NOTHING unless the
// controller also declares `@Roles(...)` (class- or handler-level). A controller
// wired with RolesGuard but no @Roles is silently authentication-only — exactly
// the bug #384 fixed product-wide. This architecture test fails CI if anyone
// re-introduces that shape, so the class-vs-handler footgun can't regress.
//
// Scope note: this is a file-level check (RolesGuard referenced ⇒ some @Roles in
// the file). It catches the dangerous "whole controller has no role gate" case.
// "RolesGuard" is unique to the shared guard (the orbit guard is
// AnnixOrbitRoleGuard), so there are no cross-guard false positives.

const SRC_ROOT = join(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", "dist", ".next"]);

function controllerFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) {
        found.push(...controllerFiles(full));
      }
    } else if (entry.endsWith(".controller.ts") && !entry.endsWith(".spec.ts")) {
      found.push(full);
    }
  }
  return found;
}

describe("RBAC enforcement architecture (#384 regression guard)", () => {
  const files = controllerFiles(SRC_ROOT);

  it("finds controllers to scan (sanity)", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("every controller wired with RolesGuard also declares @Roles — else the guard is a silent no-op", () => {
    const rolesGuardControllers = files.filter((file) =>
      /\bRolesGuard\b/.test(readFileSync(file, "utf8")),
    );
    const offenders = rolesGuardControllers.filter(
      (file) => !/@Roles\s*\(/.test(readFileSync(file, "utf8")),
    );

    expect(offenders.map((f) => f.replace(SRC_ROOT, "src"))).toEqual([]);
    // Guard against a vacuous pass: if "RolesGuard" is ever renamed and this scan
    // matches nothing, the invariant would silently stop being enforced.
    expect(rolesGuardControllers.length).toBeGreaterThan(0);
  });
});
