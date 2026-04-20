-- Ops Portal Cutover Verification Script
-- Run this BEFORE and AFTER the cutover to verify data integrity.

-- 1. Company migration status
SELECT 'Companies' as entity,
  (SELECT COUNT(*) FROM stock_control_companies) as legacy_sc,
  (SELECT COUNT(*) FROM companies WHERE legacy_sc_company_id IS NOT NULL) as unified_sc,
  (SELECT COUNT(*) FROM rubber_company) as legacy_ar,
  (SELECT COUNT(*) FROM companies WHERE legacy_rubber_company_id IS NOT NULL) as unified_ar;

-- 2. Contact/Supplier migration status
SELECT 'Contacts' as entity,
  (SELECT COUNT(*) FROM stock_control_supplier) as legacy_sc_suppliers,
  (SELECT COUNT(*) FROM contacts WHERE legacy_sc_supplier_id IS NOT NULL) as unified_sc_suppliers,
  (SELECT COUNT(*) FROM rubber_company WHERE company_type = 'SUPPLIER') as legacy_ar_suppliers,
  (SELECT COUNT(*) FROM contacts WHERE legacy_rubber_company_id IS NOT NULL) as unified_ar_contacts;

-- 3. Module subscriptions
SELECT c.name, cms.module_code, cms.enabled_at
FROM company_module_subscriptions cms
JOIN companies c ON c.id = cms.company_id
WHERE cms.disabled_at IS NULL
ORDER BY c.name, cms.module_code;

-- 4. User access for ops app
SELECT u.email, ar.code as role, a.code as app
FROM user_app_access uaa
JOIN "user" u ON u.id = uaa.user_id
JOIN apps a ON a.id = uaa.app_id
LEFT JOIN app_roles ar ON ar.id = uaa.app_role_id
WHERE a.code = 'ops'
ORDER BY u.email;

-- 5. Ops app roles and permissions
SELECT ar.code as role, COUNT(arp.permission_id) as permission_count
FROM app_roles ar
LEFT JOIN app_role_permissions arp ON arp.role_id = ar.id
WHERE ar.app_id = (SELECT id FROM apps WHERE code = 'ops')
GROUP BY ar.code
ORDER BY ar.display_order;

-- 6. Platform table row counts (should match legacy after migration)
SELECT 'platform_delivery_notes' as tbl, COUNT(*) as cnt FROM platform_delivery_notes
UNION ALL
SELECT 'platform_invoices', COUNT(*) FROM platform_invoices
UNION ALL
SELECT 'platform_certificates', COUNT(*) FROM platform_certificates
UNION ALL
SELECT 'contacts', COUNT(*) FROM contacts;
