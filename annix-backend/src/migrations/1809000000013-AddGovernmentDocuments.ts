import { MigrationInterface, QueryRunner } from "typeorm";

const SEED_DOCUMENTS = [
  {
    category: "company",
    categoryLabel: "Company & Corporate Law",
    department: "the dtic / CIPC",
    departmentUrl: "https://www.cipc.co.za/",
    sortOrder: 0,
    name: "Companies Act, 2008 (Act No. 71 of 2008) (PDF)",
    description: "Primary legislation governing company registration, governance, and compliance",
    sourceUrl: "https://www.thedtic.gov.za/wp-content/uploads/companies_act.pdf",
  },
  {
    category: "company",
    categoryLabel: "Company & Corporate Law",
    department: "the dtic / CIPC",
    departmentUrl: "https://www.cipc.co.za/",
    sortOrder: 1,
    name: "Companies Act Notebook (Plain-English Guide) (PDF)",
    description: "Simplified guide to the Companies Act for businesses",
    sourceUrl: "https://www.thedtic.gov.za/wp-content/uploads/Companies_Act_Notebook.pdf",
  },
  {
    category: "company",
    categoryLabel: "Company & Corporate Law",
    department: "the dtic / CIPC",
    departmentUrl: "https://www.cipc.co.za/",
    sortOrder: 2,
    name: "Companies Amendment Act 16 of 2024",
    description: "Latest amendments including beneficial ownership requirements",
    sourceUrl: "https://www.gov.za/documents/companies-amendment-act-16-2024-16-jan-2025-0000",
  },
  {
    category: "company",
    categoryLabel: "Company & Corporate Law",
    department: "the dtic / CIPC",
    departmentUrl: "https://www.cipc.co.za/",
    sortOrder: 3,
    name: "Close Corporations Act 69 of 1984",
    description: "Governs existing close corporations (no new registrations permitted)",
    sourceUrl: "https://www.gov.za/documents/close-corporations-act",
  },
  {
    category: "company",
    categoryLabel: "Company & Corporate Law",
    department: "the dtic / CIPC",
    departmentUrl: "https://www.cipc.co.za/",
    sortOrder: 4,
    name: "National Credit Act, 2005 (Act No. 34 of 2005) (PDF)",
    description: "Credit industry regulation, consumer credit rights, and lending practices",
    sourceUrl: "https://www.thedtic.gov.za/wp-content/uploads/credit_act.pdf",
  },
  {
    category: "company",
    categoryLabel: "Company & Corporate Law",
    department: "the dtic / CIPC",
    departmentUrl: "https://www.cipc.co.za/",
    sortOrder: 5,
    name: "Legal Metrology Act, 2014 (Act No. 9 of 2014) (PDF)",
    description: "Trade measurement standards and metrology compliance",
    sourceUrl: "https://www.thedtic.gov.za/wp-content/uploads/Legal_Metrology_Act-1.pdf",
  },
  {
    category: "company",
    categoryLabel: "Company & Corporate Law",
    department: "the dtic / CIPC",
    departmentUrl: "https://www.cipc.co.za/",
    sortOrder: 6,
    name: "Special Economic Zone (SEZ) Act, 2014 (Act No. 16 of 2014) (PDF)",
    description: "Framework for special economic zones, incentives, and qualifying criteria",
    sourceUrl: "https://www.thedtic.gov.za/wp-content/uploads/SEZ_Act-1.pdf",
  },
  {
    category: "company",
    categoryLabel: "Company & Corporate Law",
    department: "the dtic / CIPC",
    departmentUrl: "https://www.cipc.co.za/",
    sortOrder: 7,
    name: "National Regulator for Compulsory Specifications Act, 2008 (PDF)",
    description: "Standards compliance, compulsory specifications, and product regulation",
    sourceUrl: "https://www.thedtic.gov.za/wp-content/uploads/national_regulator_act.pdf",
  },
  {
    category: "company",
    categoryLabel: "Company & Corporate Law",
    department: "the dtic / CIPC",
    departmentUrl: "https://www.cipc.co.za/",
    sortOrder: 8,
    name: "CIPC Notices & Gazettes",
    description: "Individual company and IP notices published by CIPC",
    sourceUrl: "https://www.cipc.co.za/?page_id=5045",
  },

  {
    category: "ip",
    categoryLabel: "Intellectual Property",
    department: "the dtic (Department of Trade, Industry and Competition)",
    departmentUrl: "https://www.thedtic.gov.za/legislation/legislation-and-business-regulation/",
    sortOrder: 0,
    name: "Copyright Act, 1978 (Act No. 98 of 1978) (PDF)",
    description: "Copyright protection for literary, musical, artistic, and other works",
    sourceUrl: "https://www.thedtic.gov.za/wp-content/uploads/copyright_act.pdf",
  },
  {
    category: "ip",
    categoryLabel: "Intellectual Property",
    department: "the dtic (Department of Trade, Industry and Competition)",
    departmentUrl: "https://www.thedtic.gov.za/legislation/legislation-and-business-regulation/",
    sortOrder: 1,
    name: "Designs Act, 1993 (Act No. 195 of 1993) (PDF)",
    description: "Registration and protection of aesthetic and functional designs",
    sourceUrl: "https://www.thedtic.gov.za/wp-content/uploads/designs_act.pdf",
  },
  {
    category: "ip",
    categoryLabel: "Intellectual Property",
    department: "the dtic (Department of Trade, Industry and Competition)",
    departmentUrl: "https://www.thedtic.gov.za/legislation/legislation-and-business-regulation/",
    sortOrder: 2,
    name: "Patents Act, 1978 (Act No. 57 of 1978) (PDF)",
    description: "Patent application, registration, and protection of inventions",
    sourceUrl: "https://www.thedtic.gov.za/wp-content/uploads/patent_act.pdf",
  },
  {
    category: "ip",
    categoryLabel: "Intellectual Property",
    department: "the dtic (Department of Trade, Industry and Competition)",
    departmentUrl: "https://www.thedtic.gov.za/legislation/legislation-and-business-regulation/",
    sortOrder: 3,
    name: "Intellectual Property Laws Amendment Act, 2013 (PDF)",
    description:
      "Amendments extending IP protection to indigenous cultural expressions and knowledge",
    sourceUrl: "https://www.thedtic.gov.za/wp-content/uploads/IP_amendment_act2013.pdf",
  },
  {
    category: "ip",
    categoryLabel: "Intellectual Property",
    department: "the dtic (Department of Trade, Industry and Competition)",
    departmentUrl: "https://www.thedtic.gov.za/legislation/legislation-and-business-regulation/",
    sortOrder: 4,
    name: "Intellectual Property Law Rationalisation Act, 1996 (PDF)",
    description: "Consolidation and rationalisation of IP legislation in South Africa",
    sourceUrl: "https://www.thedtic.gov.za/wp-content/uploads/intellectual_property_act.pdf",
  },

  {
    category: "tax",
    categoryLabel: "Tax & Revenue",
    department: "SARS (South African Revenue Service)",
    departmentUrl: "https://www.sars.gov.za/businesses-and-employers/small-businesses-taxpayers/",
    sortOrder: 0,
    name: "Income Tax Act 58 of 1962",
    description: "Primary income tax legislation for individuals, companies, and trusts",
    sourceUrl: "https://www.gov.za/documents/income-tax-act-26-may-2015-1207",
  },
  {
    category: "tax",
    categoryLabel: "Tax & Revenue",
    department: "SARS (South African Revenue Service)",
    departmentUrl: "https://www.sars.gov.za/businesses-and-employers/small-businesses-taxpayers/",
    sortOrder: 1,
    name: "Value-Added Tax Act 89 of 1991",
    description: "VAT registration, collection, and compliance requirements",
    sourceUrl: "https://www.gov.za/documents/value-added-tax-act",
  },
  {
    category: "tax",
    categoryLabel: "Tax & Revenue",
    department: "SARS (South African Revenue Service)",
    departmentUrl: "https://www.sars.gov.za/businesses-and-employers/small-businesses-taxpayers/",
    sortOrder: 2,
    name: "Tax Administration Act 28 of 2011",
    description: "Tax administration procedures, penalties, disputes, and taxpayer rights",
    sourceUrl: "https://www.gov.za/documents/tax-administration-act",
  },
  {
    category: "tax",
    categoryLabel: "Tax & Revenue",
    department: "SARS (South African Revenue Service)",
    departmentUrl: "https://www.sars.gov.za/businesses-and-employers/small-businesses-taxpayers/",
    sortOrder: 3,
    name: "Tax Guide for Small Businesses (2024/2025) (PDF)",
    description: "Comprehensive SARS guide covering tax obligations for small businesses",
    sourceUrl:
      "https://www.sars.gov.za/wp-content/uploads/Ops/Guides/Legal-Pub-Guide-Gen09-Tax-Guide-for-Small-Businesses.pdf",
  },
  {
    category: "tax",
    categoryLabel: "Tax & Revenue",
    department: "SARS (South African Revenue Service)",
    departmentUrl: "https://www.sars.gov.za/businesses-and-employers/small-businesses-taxpayers/",
    sortOrder: 4,
    name: "Tax Guide for Micro Businesses (Issue 3) (PDF)",
    description: "Simplified SARS guide for turnover tax and micro business compliance",
    sourceUrl:
      "https://www.sars.gov.za/wp-content/uploads/Ops/Guides/Legal-Pub-Guide-TT01-Tax-Guide-for-Micro-Businesses.pdf",
  },
  {
    category: "tax",
    categoryLabel: "Tax & Revenue",
    department: "SARS (South African Revenue Service)",
    departmentUrl: "https://www.sars.gov.za/businesses-and-employers/small-businesses-taxpayers/",
    sortOrder: 5,
    name: "SARS RSS Feeds",
    description: "Subscribe to SARS news and compliance announcement updates",
    sourceUrl: "https://www.sars.gov.za/about/rss-feeds/",
  },

  {
    category: "labour",
    categoryLabel: "Labour & Employment",
    department: "Department of Employment and Labour",
    departmentUrl: "https://www.labour.gov.za/DocumentCenter/Pages/Acts.aspx",
    sortOrder: 0,
    name: "Basic Conditions of Employment Act, 1997 (PDF)",
    description: "Working hours, leave, remuneration, and employment conditions",
    sourceUrl:
      "https://www.labour.gov.za/DocumentCenter/Acts/Basic%20Conditions%20of%20Employment/Act%20-%20Basic%20Conditions%20of%20Employment.pdf",
  },
  {
    category: "labour",
    categoryLabel: "Labour & Employment",
    department: "Department of Employment and Labour",
    departmentUrl: "https://www.labour.gov.za/DocumentCenter/Pages/Acts.aspx",
    sortOrder: 1,
    name: "Labour Relations Act, 1995 (PDF)",
    description: "Labour rights, collective bargaining, dispute resolution, and unfair dismissal",
    sourceUrl:
      "https://www.labour.gov.za/DocumentCenter/Acts/Labour%20Relations/Labour%20Relations%20Act.pdf",
  },
  {
    category: "labour",
    categoryLabel: "Labour & Employment",
    department: "Department of Employment and Labour",
    departmentUrl: "https://www.labour.gov.za/DocumentCenter/Pages/Acts.aspx",
    sortOrder: 2,
    name: "Employment Equity Act, 1998 (PDF)",
    description: "Workplace equity, affirmative action, and EE reporting requirements",
    sourceUrl:
      "https://www.labour.gov.za/DocumentCenter/Acts/Employment%20Equity/Act%20-%20Employment%20Equity%201998.pdf",
  },
  {
    category: "labour",
    categoryLabel: "Labour & Employment",
    department: "Department of Employment and Labour",
    departmentUrl: "https://www.labour.gov.za/DocumentCenter/Pages/Acts.aspx",
    sortOrder: 3,
    name: "Employment Services Act, 2014 (PDF)",
    description:
      "Public employment services, private employment agencies, and work-seeker registration",
    sourceUrl:
      "https://www.labour.gov.za/DocumentCenter/Acts/Public%20Employment%20Services/Employment%20Services%20Act%202014.pdf",
  },
  {
    category: "labour",
    categoryLabel: "Labour & Employment",
    department: "Department of Employment and Labour",
    departmentUrl: "https://www.labour.gov.za/DocumentCenter/Pages/Acts.aspx",
    sortOrder: 4,
    name: "Unemployment Insurance Contributions Act, 2002 (Amended) (PDF)",
    description: "UIF contributions, rates, and employer obligations",
    sourceUrl:
      "https://www.labour.gov.za/DocumentCenter/Acts/UIF/Amended%20Act%20-%20Unemployment%20Insurance%20Contributions.pdf",
  },
  {
    category: "labour",
    categoryLabel: "Labour & Employment",
    department: "Department of Employment and Labour",
    departmentUrl: "https://www.labour.gov.za/DocumentCenter/Pages/Acts.aspx",
    sortOrder: 5,
    name: "COIDA Service Booklet (PDF)",
    description: "Compensation for Occupational Injuries and Diseases Act guide and procedures",
    sourceUrl:
      "https://www.labour.gov.za/DocumentCenter/Publications/Compensation%20for%20Occupational%20Injuries%20and%20Diseases/COIDA_SERVICE_BOOK_VERSION_23.pdf",
  },
  {
    category: "labour",
    categoryLabel: "Labour & Employment",
    department: "Department of Employment and Labour",
    departmentUrl: "https://www.labour.gov.za/DocumentCenter/Pages/Acts.aspx",
    sortOrder: 6,
    name: "Skills Development Act 97 of 1998",
    description: "Skills levies, SETAs, and workplace skills development obligations",
    sourceUrl: "https://www.gov.za/documents/skills-development-act",
  },
  {
    category: "labour",
    categoryLabel: "Labour & Employment",
    department: "Department of Employment and Labour",
    departmentUrl: "https://www.labour.gov.za/DocumentCenter/Pages/Acts.aspx",
    sortOrder: 7,
    name: "Unemployment Insurance Act 63 of 2001",
    description: "UIF benefits, claims, and eligibility requirements",
    sourceUrl: "https://www.gov.za/documents/unemployment-insurance-act",
  },
  {
    category: "labour",
    categoryLabel: "Labour & Employment",
    department: "Department of Employment and Labour",
    departmentUrl: "https://www.labour.gov.za/DocumentCenter/Pages/Acts.aspx",
    sortOrder: 8,
    name: "Code of Good Practice on the Arrangement of Working Time (PDF)",
    description: "Guidelines on shift work, night work, overtime, and rest periods",
    sourceUrl:
      "https://www.labour.gov.za/DocumentCenter/Code%20of%20Good%20Practice/Basic%20Condition/Code%20of%20Good%20Practice%20on%20the%20Arrangement%20of%20Working%20Time.PDF",
  },
  {
    category: "labour",
    categoryLabel: "Labour & Employment",
    department: "Department of Employment and Labour",
    departmentUrl: "https://www.labour.gov.za/DocumentCenter/Pages/Acts.aspx",
    sortOrder: 9,
    name: "Code of Good Practice on Prevention and Elimination of Harassment (PDF)",
    description: "Workplace harassment prevention, policies, and procedures",
    sourceUrl:
      "https://www.labour.gov.za/DocumentCenter/Code%20of%20Good%20Practice/Employment%20Equity/Code%20of%20Good%20Practice%20on%20the%20Prevention%20and%20Elimination%20of%20Harassment%20in%20the%20Workplace.pdf",
  },

  {
    category: "bbbee",
    categoryLabel: "B-BBEE",
    department: "the dtic / B-BBEE Commission",
    departmentUrl: "https://www.bbbeecommission.co.za/",
    sortOrder: 0,
    name: "B-BBEE Amendment Act, 2003 (PDF)",
    description: "Broad-Based Black Economic Empowerment Amendment Act full text",
    sourceUrl: "https://www.thedtic.gov.za/wp-content/uploads/BEE-Amendment_ACT2013-1.pdf",
  },
  {
    category: "bbbee",
    categoryLabel: "B-BBEE",
    department: "the dtic / B-BBEE Commission",
    departmentUrl: "https://www.bbbeecommission.co.za/",
    sortOrder: 1,
    name: "B-BBEE Act 53 of 2003 (as amended)",
    description: "B-BBEE framework and scorecard requirements",
    sourceUrl: "https://www.gov.za/documents/broad-based-black-economic-empowerment-act",
  },
  {
    category: "bbbee",
    categoryLabel: "B-BBEE",
    department: "the dtic / B-BBEE Commission",
    departmentUrl: "https://www.bbbeecommission.co.za/",
    sortOrder: 2,
    name: "B-BBEE Codes of Good Practice (Amended 2019)",
    description: "Generic and sector codes for B-BBEE scorecard measurement",
    sourceUrl:
      "https://www.gov.za/documents/broad-based-black-economic-empowerment-act-issue-codes-good-practice",
  },
  {
    category: "bbbee",
    categoryLabel: "B-BBEE",
    department: "the dtic / B-BBEE Commission",
    departmentUrl: "https://www.bbbeecommission.co.za/",
    sortOrder: 3,
    name: "Compliance Reporting Matrix / Template (PDF)",
    description: "B-BBEE Commission compliance reporting template for entities",
    sourceUrl:
      "https://www.bbbeecommission.co.za/wp-content/uploads/2019/07/COMPLIANCE-REPORTING-TEMPLATE-Nov17_1.pdf",
  },
  {
    category: "bbbee",
    categoryLabel: "B-BBEE",
    department: "the dtic / B-BBEE Commission",
    departmentUrl: "https://www.bbbeecommission.co.za/",
    sortOrder: 4,
    name: "FORM BBBEE 1 – Compliance Report: Government / Public Entities (PDF)",
    description: "Section 13G(1) compliance report for spheres of government and public entities",
    sourceUrl:
      "https://www.bbbeecommission.co.za/wp-content/uploads/2017/06/FORM-BBBEE-1-Compliance-Report-13G1.pdf",
  },
  {
    category: "bbbee",
    categoryLabel: "B-BBEE",
    department: "the dtic / B-BBEE Commission",
    departmentUrl: "https://www.bbbeecommission.co.za/",
    sortOrder: 5,
    name: "FORM BBBEE 1 – Compliance Report: JSE-listed Companies (PDF)",
    description: "Section 13G(2) compliance report for JSE-listed companies",
    sourceUrl:
      "https://www.bbbeecommission.co.za/wp-content/uploads/2018/07/FORM-BBBEE-1-Compliance-Report-13G2-JSE-2.pdf",
  },
  {
    category: "bbbee",
    categoryLabel: "B-BBEE",
    department: "the dtic / B-BBEE Commission",
    departmentUrl: "https://www.bbbeecommission.co.za/",
    sortOrder: 6,
    name: "FORM BBBEE 2 – Compliance Report: SETAs (PDF)",
    description: "Section 13G(3) compliance report for Sector Education and Training Authorities",
    sourceUrl:
      "https://www.bbbeecommission.co.za/wp-content/uploads/2017/06/FORM-BBBEE-2-Compliance-Report-13G3.pdf",
  },
  {
    category: "bbbee",
    categoryLabel: "B-BBEE",
    department: "the dtic / B-BBEE Commission",
    departmentUrl: "https://www.bbbeecommission.co.za/",
    sortOrder: 7,
    name: "FORM BBBEE 3 – Notice of Non-Compliance (PDF)",
    description: "Official non-compliance notification form",
    sourceUrl:
      "https://www.bbbeecommission.co.za/wp-content/uploads/2017/06/FORM-BBBEE-3-Notice-of-Non-Compliance.pdf",
  },
  {
    category: "bbbee",
    categoryLabel: "B-BBEE",
    department: "the dtic / B-BBEE Commission",
    departmentUrl: "https://www.bbbeecommission.co.za/",
    sortOrder: 8,
    name: "FORM BBBEE 4 – Notice for Rejection of Report (PDF)",
    description: "Report rejection notification form",
    sourceUrl:
      "https://www.bbbeecommission.co.za/wp-content/uploads/2017/06/FORM-BBBEE-4-Notice-for-Rejection-of-Report.pdf",
  },
  {
    category: "bbbee",
    categoryLabel: "B-BBEE",
    department: "the dtic / B-BBEE Commission",
    departmentUrl: "https://www.bbbeecommission.co.za/",
    sortOrder: 9,
    name: "FORM BBBEE 5 – Notice of Compliance (PDF)",
    description: "Official compliance confirmation notification form",
    sourceUrl:
      "https://www.bbbeecommission.co.za/wp-content/uploads/2017/06/FORM-BBBEE-5-Notice-of-Compliance.pdf",
  },
  {
    category: "bbbee",
    categoryLabel: "B-BBEE",
    department: "the dtic / B-BBEE Commission",
    departmentUrl: "https://www.bbbeecommission.co.za/",
    sortOrder: 10,
    name: "FORM BBBEE 6 – Restricted / Confidential Information (PDF)",
    description: "Application for restricted or confidential treatment of information",
    sourceUrl:
      "https://www.bbbeecommission.co.za/wp-content/uploads/2017/06/FORM-BBBEE-6-Restricted-Confidential-Information.pdf",
  },
  {
    category: "bbbee",
    categoryLabel: "B-BBEE",
    department: "the dtic / B-BBEE Commission",
    departmentUrl: "https://www.bbbeecommission.co.za/",
    sortOrder: 11,
    name: "FORM BBBEE 7 – Complaint Form (PDF)",
    description: "Lodge a B-BBEE compliance complaint with the Commission",
    sourceUrl:
      "https://www.bbbeecommission.co.za/wp-content/uploads/2017/06/FORM-BBBEE-7-Complaint-Form.pdf",
  },
  {
    category: "bbbee",
    categoryLabel: "B-BBEE",
    department: "the dtic / B-BBEE Commission",
    departmentUrl: "https://www.bbbeecommission.co.za/",
    sortOrder: 12,
    name: "FORM BBBEE 8 – Request for Additional Information (PDF)",
    description: "Commission request for additional information from reporting entities",
    sourceUrl:
      "https://www.bbbeecommission.co.za/wp-content/uploads/2017/06/FORM-BBBEE-8-Request-for-Additional-Information.pdf",
  },

  {
    category: "consumer",
    categoryLabel: "Consumer & Trade",
    department: "the dtic / National Consumer Commission",
    departmentUrl: "https://www.thedtic.gov.za/legislation/legislation-and-business-regulation/",
    sortOrder: 0,
    name: "Consumer Protection Act, 2008 (Act No. 68 of 2008) (PDF)",
    description: "Consumer rights, product liability, and fair business practices",
    sourceUrl: "https://www.thedtic.gov.za/wp-content/uploads/consumer_protection.pdf",
  },
  {
    category: "consumer",
    categoryLabel: "Consumer & Trade",
    department: "the dtic / National Consumer Commission",
    departmentUrl: "https://www.thedtic.gov.za/legislation/legislation-and-business-regulation/",
    sortOrder: 1,
    name: "Consumer Protection Brochure (PDF)",
    description: "Plain-English summary of consumer rights and business obligations",
    sourceUrl: "https://www.thedtic.gov.za/wp-content/uploads/CP_Brochure.pdf",
  },
  {
    category: "consumer",
    categoryLabel: "Consumer & Trade",
    department: "the dtic / National Consumer Commission",
    departmentUrl: "https://www.thedtic.gov.za/legislation/legislation-and-business-regulation/",
    sortOrder: 2,
    name: "Competition Act 89 of 1998",
    description: "Anti-competitive practices, mergers, and market regulation",
    sourceUrl: "https://www.gov.za/documents/competition-act",
  },

  {
    category: "ohs",
    categoryLabel: "Health & Safety",
    department: "Department of Employment and Labour",
    departmentUrl: "https://www.labour.gov.za/DocumentCenter/Pages/Acts.aspx",
    sortOrder: 0,
    name: "Occupational Health and Safety Act 85 of 1993",
    description: "Workplace health and safety obligations, incident reporting, and compliance",
    sourceUrl: "https://www.gov.za/documents/occupational-health-and-safety-act",
  },
  {
    category: "ohs",
    categoryLabel: "Health & Safety",
    department: "Department of Employment and Labour",
    departmentUrl: "https://www.labour.gov.za/DocumentCenter/Pages/Acts.aspx",
    sortOrder: 1,
    name: "Compensation for Occupational Injuries and Diseases Act 130 of 1993",
    description: "COIDA registration, worker compensation, and employer levies",
    sourceUrl: "https://www.gov.za/documents/compensation-occupational-injuries-and-diseases-act",
  },
  {
    category: "ohs",
    categoryLabel: "Health & Safety",
    department: "Department of Employment and Labour",
    departmentUrl: "https://www.labour.gov.za/DocumentCenter/Pages/Acts.aspx",
    sortOrder: 2,
    name: "OHS Regulations & Codes of Practice",
    description: "Full collection of OHS Act regulations, codes, and supporting documents",
    sourceUrl: "https://www.labour.gov.za/DocumentCenter/Pages/Acts.aspx",
  },

  {
    category: "privacy",
    categoryLabel: "Data Privacy",
    department: "Information Regulator South Africa",
    departmentUrl: "https://inforegulator.org.za/",
    sortOrder: 0,
    name: "Protection of Personal Information Act 4 of 2013 (POPIA)",
    description: "Data protection, privacy, and processing of personal information",
    sourceUrl: "https://www.gov.za/documents/protection-personal-information-act",
  },
  {
    category: "privacy",
    categoryLabel: "Data Privacy",
    department: "Information Regulator South Africa",
    departmentUrl: "https://inforegulator.org.za/",
    sortOrder: 1,
    name: "Promotion of Access to Information Act 2 of 2000 (PAIA)",
    description:
      "Access to information held by public and private bodies, PAIA manual requirements",
    sourceUrl: "https://www.gov.za/documents/promotion-access-information-act",
  },
  {
    category: "privacy",
    categoryLabel: "Data Privacy",
    department: "Information Regulator South Africa",
    departmentUrl: "https://inforegulator.org.za/",
    sortOrder: 2,
    name: "Information Regulator Compliance Resources",
    description: "POPIA compliance guides, notices, and enforcement actions",
    sourceUrl: "https://inforegulator.org.za/",
  },

  {
    category: "financial",
    categoryLabel: "Financial Regulation",
    department: "National Treasury",
    departmentUrl: "https://www.treasury.gov.za/legislation/",
    sortOrder: 0,
    name: "National Treasury Acts & Regulations",
    description: "Financial legislation, PFMA, MFMA, and regulatory frameworks",
    sourceUrl: "https://www.treasury.gov.za/legislation/",
  },
  {
    category: "financial",
    categoryLabel: "Financial Regulation",
    department: "National Treasury",
    departmentUrl: "https://www.treasury.gov.za/legislation/",
    sortOrder: 1,
    name: "SABS Standards & Technical Regulations",
    description: "South African Bureau of Standards compulsory specifications and standards",
    sourceUrl: "https://www.sabs.co.za/",
  },
];

function escapeSQL(value: string): string {
  return value.replace(/'/g, "''");
}

export class AddGovernmentDocuments1809000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "comply_sa_government_documents" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT NOT NULL,
        "category" VARCHAR(50) NOT NULL,
        "category_label" VARCHAR(100) NOT NULL,
        "department" VARCHAR(200),
        "department_url" VARCHAR(500),
        "source_url" VARCHAR(1000) NOT NULL,
        "file_path" VARCHAR(500),
        "synced" BOOLEAN NOT NULL DEFAULT FALSE,
        "size_bytes" BIGINT,
        "mime_type" VARCHAR(100),
        "sort_order" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_comply_sa_gov_docs_category"
      ON "comply_sa_government_documents" ("category", "sort_order")
    `);

    const values = SEED_DOCUMENTS.map(
      (doc) =>
        `('${escapeSQL(doc.name)}', '${escapeSQL(doc.description)}', '${escapeSQL(doc.category)}', '${escapeSQL(doc.categoryLabel)}', '${escapeSQL(doc.department)}', '${escapeSQL(doc.departmentUrl)}', '${escapeSQL(doc.sourceUrl)}', ${doc.sortOrder})`,
    ).join(",\n      ");

    await queryRunner.query(`
      INSERT INTO "comply_sa_government_documents"
        ("name", "description", "category", "category_label", "department", "department_url", "source_url", "sort_order")
      VALUES
      ${values}
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "comply_sa_government_documents"`);
  }
}
