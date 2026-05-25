"use client";

import type {
  IdentityReconciliationReport,
  SsoPrivilegeConflict,
  SsoStandaloneIdentity,
} from "@/app/lib/api/adminApi";
import { fromISO } from "@/app/lib/datetime";
import { useSsoIdentityReconciliation } from "@/app/lib/query/hooks";

function formatGeneratedAt(raw: string): string {
  const dt = fromISO(raw);
  if (!dt.isValid) {
    return raw;
  }
  return dt.toFormat("yyyy-LL-dd HH:mm");
}

function SummaryCard(props: { label: string; value: number; tone?: string }) {
  const toneProp = props.tone;
  const tone = toneProp || "text-gray-900 dark:text-white";
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
        {props.label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${tone}`}>{props.value}</div>
    </div>
  );
}

function StandaloneTable(props: { rows: SsoStandaloneIdentity[]; emptyLabel: string }) {
  const rows = props.rows;
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{props.emptyLabel}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
            <th className="px-3 py-2">Standalone ID</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Core user ID</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const coreUserId = row.coreUserId === null ? "—" : String(row.coreUserId);
            return (
              <tr
                key={`${row.standaloneId}-${row.email}`}
                className="border-t border-gray-100 dark:border-gray-700"
              >
                <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.standaloneId}</td>
                <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.email}</td>
                <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{coreUserId}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PrivilegeConflictTable(props: { rows: SsoPrivilegeConflict[] }) {
  const rows = props.rows;
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No emails with differing roles across apps.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((conflict) => (
        <div
          key={conflict.email}
          className="rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-3"
        >
          <div className="font-medium text-gray-900 dark:text-white">{conflict.email}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {conflict.perApp.map((entry) => {
              const role = entry.role === null ? "<none>" : entry.role;
              return (
                <span
                  key={`${conflict.email}-${entry.app}`}
                  className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                >
                  <span className="font-semibold">{entry.app}</span>
                  <span className="text-gray-400">·</span>
                  <span>{role}</span>
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Section(props: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{props.title}</h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{props.subtitle}</p>
      </div>
      {props.children}
    </section>
  );
}

function ReportBody(props: { report: IdentityReconciliationReport }) {
  const report = props.report;
  const coverage = report.coverage;
  const annixRepGap = report.annixRepGap;
  const teacherAssistant = report.teacherAssistant;
  const unbridgedLegacy = report.unbridgedLegacy;
  const sameEmailDifferentPrivilege = report.sameEmailDifferentPrivilege;

  return (
    <div className="space-y-6">
      <Section
        title="1. Coverage"
        subtitle="Distinct core users, UserAppAccess rows per app, and profile rows per portal."
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <SummaryCard label="Distinct core users" value={coverage.totalCoreUsers} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              UserAppAccess rows per app
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-2">App</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2 text-right">Access rows</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.accessByApp.map((row) => (
                    <tr key={row.appCode} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.appName}</td>
                      <td className="px-3 py-2">
                        <code className="text-xs text-gray-500 dark:text-gray-400">
                          {row.appCode}
                        </code>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200">
                        {row.accessCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Profile rows per portal
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-2">Portal</th>
                    <th className="px-3 py-2">Table</th>
                    <th className="px-3 py-2 text-right">Profiles</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.profilesByPortal.map((row) => (
                    <tr key={row.table} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.portal}</td>
                      <td className="px-3 py-2">
                        <code className="text-xs text-gray-500 dark:text-gray-400">
                          {row.table}
                        </code>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200">
                        {row.profileCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="2. Annix Rep gap"
        subtitle="RepProfiles that have no UserAppAccess row for the 'annix-rep' app — they cannot be granted Rep access via the unified RBAC model yet."
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SummaryCard
            label="Missing access"
            value={annixRepGap.missingAccessCount}
            tone="text-red-600 dark:text-red-400"
          />
          <SummaryCard label="Total RepProfiles" value={annixRepGap.totalRepProfiles} />
        </div>
        {annixRepGap.sample.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Every RepProfile already has an annix-rep access row.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                  <th className="px-3 py-2">Core user ID</th>
                  <th className="px-3 py-2">Email</th>
                </tr>
              </thead>
              <tbody>
                {annixRepGap.sample.map((row) => (
                  <tr
                    key={`${row.userId}-${row.email}`}
                    className="border-t border-gray-100 dark:border-gray-700"
                  >
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.userId}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title="3. Teacher Assistant standalone identities"
        subtitle="The teacher_assistant_users table has its own email + password and no FK to core User. Unlinked duplicates are the same human with two identities (the SSO risk); fully standalone rows need migrating."
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SummaryCard label="Total standalone" value={teacherAssistant.totalStandaloneUsers} />
          <SummaryCard
            label="Unlinked duplicates"
            value={teacherAssistant.unlinkedDuplicateCount}
            tone="text-red-600 dark:text-red-400"
          />
          <SummaryCard
            label="Fully standalone"
            value={teacherAssistant.fullyStandaloneCount}
            tone="text-amber-600 dark:text-amber-400"
          />
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Unlinked duplicates (email matches a core user)
            </h3>
            <StandaloneTable
              rows={teacherAssistant.unlinkedDuplicateSample}
              emptyLabel="No unlinked duplicates."
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Fully standalone (no matching core user)
            </h3>
            <StandaloneTable
              rows={teacherAssistant.fullyStandaloneSample}
              emptyLabel="No fully standalone users."
            />
          </div>
        </div>
      </Section>

      <Section
        title="4. Unbridged legacy users"
        subtitle="Rows in the legacy stock_control_users and cv_assistant_users tables whose email has no matching core User."
      >
        <div className="space-y-4">
          {unbridgedLegacy.tables.map((legacyTable) => (
            <div key={legacyTable.table}>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  <code className="text-xs">{legacyTable.table}</code>
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {legacyTable.unbridgedCount} unbridged of {legacyTable.totalRows} rows
                </span>
              </div>
              <StandaloneTable
                rows={legacyTable.sample}
                emptyLabel="No unbridged rows on this table."
              />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="5. Same email, different privilege"
        subtitle="Emails present across 2+ apps where the effective role differs between apps — the privilege-confusion / escalation risk to resolve before SSO unifies these identities."
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SummaryCard
            label="Conflicting emails"
            value={sameEmailDifferentPrivilege.conflictCount}
            tone="text-amber-600 dark:text-amber-400"
          />
        </div>
        <PrivilegeConflictTable rows={sameEmailDifferentPrivilege.sample} />
      </Section>
    </div>
  );
}

export default function SsoReconciliationPage() {
  const { data, isLoading, error } = useSsoIdentityReconciliation();
  const errorMessage = error instanceof Error ? error.message : null;
  const generatedAt = data ? formatGeneratedAt(data.generatedAt) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          SSO identity reconciliation
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Read-only snapshot of cross-app identity unification ahead of single sign-on. Nothing here
          changes authentication, authorization, or data — it only reports the current state and the
          risks.
        </p>
        {generatedAt && (
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Computed {generatedAt}</p>
        )}
      </div>

      {isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-sm text-gray-500 dark:text-gray-400">
          Computing reconciliation report…
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4 text-sm text-red-700 dark:text-red-300">
          Could not load the reconciliation report. Please try again.
        </div>
      )}

      {data && <ReportBody report={data} />}
    </div>
  );
}
