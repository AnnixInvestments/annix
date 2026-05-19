-- Phase 0 data cleanup — AU Industries duplicate company rows
-- Issue: https://github.com/AnnixInvestments/annix/issues/300
-- Run once against annix-prod on 2026-05-19. Recorded here for audit.
--
-- Context: AU Industries (registration 2020/803314/07) had accumulated 5 `companies`
-- rows across 3 apps because every app's onboarding INSERTs a fresh company row
-- instead of reusing an existing one. See issue #300 for the full breakdown.

BEGIN;

-- 1. Delete orphan ComplySA company row (id 8): company details + module
--    subscription only, no comply_sa_profiles / user attached. Verified no other
--    FK references (comply_sa_*, contacts, platform_*, *_profiles all 0 rows).
DELETE FROM comply_sa_company_details   WHERE company_id = 8;
DELETE FROM company_module_subscriptions WHERE company_id = 8;
DELETE FROM companies                    WHERE id = 8;

-- 2. Fix name typo on company id 14: it carries AU's registration + VAT number
--    but was named "Polymer Lining Systems (Pty) Ltd". Confirmed by the owner to
--    be a typo for AU Industries. Reversible — original name recorded above.
UPDATE companies
   SET name = 'AU Industries (Pty) Ltd'
 WHERE id = 14
   AND name = 'Polymer Lining Systems (Pty) Ltd';

COMMIT;

-- DEFERRED (not run — needs an AU Rubber app decision):
--   * rubber_company id 4 ("Polymer Lining Systems (Pty) Ltd", code PL,
--     unified_company_id = 14) — renaming it to "AU Industries" would create a
--     confusing second AU customer alongside rubber_company id 3 (code AU).
--     The correct fix is to MERGE id 4 into id 3, which requires re-pointing any
--     AU Rubber records that reference rubber_company id 4. Tracked in issue #300.
--   * The `contacts` row under company id 5 named "Polymer Lining Systems (Pty) Ltd"
--     carrying AU's registration number — same merge decision applies.
