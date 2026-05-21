# Annix Orbit — Customer EE policy pack

A drop-in pack of POPIA-aligned text + retention schedule + customer-facing
notices for designated-employer customers enabling the Employment Equity
disclosure feature. Customers should adapt and have their own employment-law
practitioner sign off before publishing.

**Status:** template, supplied by Annix.
**Customers:** review with your attorney; replace the company name placeholders;
publish on your careers / privacy page.
**Linked DPIA:** `annix-orbit-ee-dpia.md` (must be signed before the feature
is enabled for your tenant).

---

## 1. POPIA notice — careers / privacy page

Insert the following on your careers page footer or in your privacy policy
under "Job applicants":

> ### Employment Equity disclosure
>
> If you apply for a role with `[CUSTOMER LEGAL NAME]` ("the Company"), we
> may invite you to voluntarily disclose your population group, gender,
> disability status, and nationality status. This information is "special
> personal information" under the Protection of Personal Information Act
> 4/2013 (POPIA, s26). We collect it only with your explicit consent and use
> it only for:
>
> 1. Statutory Employment Equity Act 55/1998 reporting (EEA2 and EEA4
>    submissions to the Department of Employment and Labour).
> 2. Independent fairness monitoring of the Company's AI-assisted CV
>    screening, satisfying POPIA s71's transparency obligation for automated
>    decisions.
>
> The Company processes this information on the lawful bases set out in
> POPIA s27(1)(a) (your explicit consent) and s27(2)(b) (necessity for the
> exercise of a duty in law — the EE Act). Annix Pty Ltd acts as the
> Company's POPIA Operator and processes the data only on documented
> instructions of the Company.
>
> Disclosure is voluntary. You may decline to disclose, choose
> "prefer not to say" for any field, withdraw your consent at any time, or
> request a copy / correction / deletion of your data via the candidate
> portal or by contacting the Company's Data Protection Officer at
> `[CUSTOMER DPO EMAIL]`.
>
> The AI candidate ranker does not have access to your demographic
> information; it is stored separately from your CV with stricter access
> controls and is used only for aggregate reporting and fairness audits.
> You may request human review of any automated screening decision affecting
> you.

## 2. Consent text — `cv_assistant_ee_consent_text_versions` body

Insert this text (or your attorney-approved version) as a new row in
`cv_assistant_ee_consent_text_versions` via the admin endpoint or a seeded
INSERT. Pin the new row's `version_label` (e.g. `customer-co-v1-2026`) so
every consent grant references it explicitly.

> **Employment Equity disclosure consent — `[CUSTOMER LEGAL NAME]` v1
> (effective from `[DATE]`)**
>
> By submitting this form, you consent to `[CUSTOMER LEGAL NAME]` (and its
> POPIA Operator, Annix Pty Ltd, registered address `[ADDRESS]`) collecting
> and processing the demographic information you provide in this form for
> two purposes only:
>
> 1. Statutory Employment Equity Act 55/1998 reporting (EEA2, EEA4, and
>    sectoral target tracking under the EE Amendment Act 4/2022).
> 2. Independent fairness monitoring of `[CUSTOMER LEGAL NAME]`'s
>    AI-assisted CV screening process, in line with POPIA s71's
>    transparency obligation for automated decisions.
>
> Your information will be stored separately from your CV and other
> application data, with stricter access controls. The AI candidate ranker
> will not have access to it.
>
> Your information will be retained for 5 years from the date you submit
> this form, then automatically deleted. You may correct or withdraw your
> disclosure at any time via the candidate portal or by emailing
> `[CUSTOMER DPO EMAIL]`. Withdrawal does not affect the lawfulness of
> processing carried out before withdrawal.
>
> You may lodge a complaint with the Information Regulator if you believe
> your POPIA rights have been infringed (`inforeg@justice.gov.za`,
> www.inforegulator.org.za).

Customers may add additional purposes only with the express, additional
consent of the data subject. The two purposes above are the maximum that
the default Annix flow processes for.

## 3. Retention schedule

| Data | Retention | Trigger | Action |
|---|---|---|---|
| EE attribute disclosure rows | 5 years from `consent_granted_at` | The latest of (a) candidacy closure, (b) tombstone date | Hard-delete via scheduled purge cron |
| Tombstoned (withdrawn) rows | 5 years from tombstone date | Tombstone date | Hard-delete |
| Audit log entries (`logEeAttributesAccess` / `logEeAttributesAction` / `logFairnessBreach` / `logRejectionExplanation`) | 7 years | Audit entry creation | Hard-delete |
| Disclosure invite tokens (`cv_assistant_ee_disclosure_invites`) | 90 days after `expires_at` | Token expiry | Hard-delete |

The 5-year retention follows the longer of (EE Act plan duration ≈ 5y, EEA2 /
EEA4 minimum 3y) per the rationale in the DPIA §5.

## 4. Operator agreement boilerplate

Customers should append the following clause to their existing services
agreement with Annix or sign as a standalone POPIA Operator agreement.

> **POPIA Operator obligations — Employment Equity disclosure**
>
> Annix processes Employment Equity disclosure data on behalf of the
> Customer as a POPIA Operator (s1, s21). Annix:
>
> 1. Will process the data only on the Customer's documented instructions
>    as captured in the Annix Orbit feature configuration.
> 2. Will treat the data as confidential and limit access to authorised
>    Annix personnel under written confidentiality undertakings.
> 3. Has implemented appropriate technical and organisational measures
>    including: separate storage, role-based access, append-only audit
>    trail, three-layer architectural firewall, and disparate-impact
>    monitoring (see DPIA §4 for detail).
> 4. Will assist the Customer with data-subject access, correction,
>    erasure, and complaint requests within the timeframes set out in
>    POPIA s23 / s24 / s55.
> 5. Will notify the Customer without undue delay of any security
>    compromise affecting Employment Equity disclosure data, in line with
>    POPIA s22.
> 6. Will not transfer the data outside South Africa without the
>    Customer's prior written consent and an adequacy assessment.
> 7. Will, on termination, return or delete the data at the Customer's
>    election (default: delete after the retention period above).
>
> `[LEGAL REVIEW]` — final wording to be signed off by the Customer's
> attorney + Annix's attorney before first activation.

## 5. Activation checklist

Before flipping `CV_ASSISTANT_EE_COMPLIANCE_ENABLED` to true for a Customer's
tenant, both parties must confirm:

- [ ] DPIA reviewed and counter-signed (DPIA §7, §9).
- [ ] POPIA notice published on the Customer's careers / privacy page.
- [ ] Consent text v-N for the Customer seeded into
      `cv_assistant_ee_consent_text_versions` with effective_from set.
- [ ] Customer DPO email set in `ANNIX_EE_DATA_PROTECTION_OFFICER_EMAIL`
      env var (or per-tenant override agreed).
- [ ] `companies.is_designated_employer` + `companies.eea_reporting_enabled`
      flipped to true on the Customer's company row.
- [ ] HR roles + permissions reviewed; only authorised users have access.
- [ ] Retention purge cron tested in a non-prod environment.
- [ ] Operator agreement clause executed.
