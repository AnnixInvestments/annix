import Link from "next/link";
import { EE_DISCLOSURE_POLICY } from "../config/ee-disclosure-policy";

export function EeDisclosurePrivacyNotice() {
  const policyVersion = EE_DISCLOSURE_POLICY.policyVersion;
  const retentionYears = EE_DISCLOSURE_POLICY.retentionYears;
  const eeaReturnMinimumYears = EE_DISCLOSURE_POLICY.eeaReturnMinimumYears;
  const eePlanRetentionBasis = EE_DISCLOSURE_POLICY.eePlanRetentionBasis;

  return (
    <div className="p-6 max-w-3xl mx-auto prose prose-sm">
      <h1>Employment Equity disclosure — privacy notice</h1>
      <p>
        This page explains what happens to the demographic information you share via the{" "}
        <Link href="/annix/orbit/seeker/ee-attributes">Employment Equity disclosure form</Link>, and
        the rights you have over it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Population group (race), gender, disability status, and nationality status.</li>
        <li>Whether you'd like to discuss reasonable accommodation, and any free-text notes.</li>
        <li>
          The date and time you submitted, and which version of the consent text you agreed to.
        </li>
      </ul>
      <p>
        These fields are{" "}
        <strong>
          "special personal information" under the Protection of Personal Information Act
        </strong>{" "}
        (POPIA, s26). We collect them only with your explicit, voluntary consent.
      </p>

      <h2>What we use it for</h2>
      <ol>
        <li>
          <strong>Employment Equity Act reporting (EEA2 / EEA4).</strong> Designated employers in
          South Africa must report aggregate workforce demographics annually. Your disclosure
          contributes to those aggregate counts.
        </li>
        <li>
          <strong>Fairness monitoring of automated screening (POPIA s71).</strong> We run a monthly
          check that the AI candidate ranker is not producing disparate outcomes by demographic.
          Your disclosure contributes to those aggregate fairness metrics.
        </li>
      </ol>
      <p>
        We do <strong>not</strong> use this data for: marketing, profiling, advertising, sale to
        third parties, or any decision the AI ranker makes about your CV. The ranker is
        architecturally prevented from reading these fields.
      </p>

      <h2>Where it is stored and who can see it</h2>
      <ul>
        <li>
          Stored in a separate database table from your CV and application data, with stricter
          access controls.
        </li>
        <li>
          Read-access is limited to: your account (this page), the hiring company's HR users with a
          legitimate purpose, and aggregated fairness / reporting jobs that never expose row-level
          data.
        </li>
        <li>
          Every read and every change is recorded in an audit log so we can show you who accessed
          what and when, on request.
        </li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        Retention follows the longer of the two statutes: the Employment Equity Act expects records
        for {eePlanRetentionBasis} (typically {retentionYears} years), and EEA2 / EEA4 returns
        require at least {eeaReturnMinimumYears} years. POPIA s14 then requires deletion when no
        longer necessary. In practice we retain disclosures for {retentionYears} years from the
        consent date, then automatically purge.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>
          <strong>Access</strong> (POPIA s23) — view your current disclosure on the disclosure page;
          export everything via the data-export endpoint on the seeker portal.
        </li>
        <li>
          <strong>Correction</strong> (POPIA s24) — submit an updated disclosure at any time; the
          new submission tombstones the old one but the historical record is preserved (append-only,
          by design).
        </li>
        <li>
          <strong>Withdrawal / deletion</strong> — the "Withdraw disclosure" button tombstones your
          disclosure on every job you've applied to. Re-disclose at any time. Full account deletion
          (via the seeker portal) deletes all disclosures and the underlying candidacies.
        </li>
        <li>
          <strong>Lodge a complaint</strong> with the Information Regulator if you believe your
          POPIA rights have been infringed.
        </li>
      </ul>

      <h2>Voluntariness</h2>
      <p>
        Disclosure is voluntary. Choosing "prefer not to say" for any field, or not disclosing at
        all, will not affect how your application is screened. The AI ranker does not see this data
        either way.
      </p>

      <p className="text-xs text-gray-500">
        This is a short, plain-language summary. The full POPIA notice from the hiring company will
        be on their careers page or in their privacy policy. For the version of the consent text you
        agreed to, see the version label shown on your disclosure page. Privacy notice version{" "}
        {policyVersion}.
      </p>
    </div>
  );
}
