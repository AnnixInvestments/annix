import { MigrationInterface, QueryRunner } from "typeorm";

interface RequirementSeed {
  code: string;
  name: string;
  description: string;
  regulator: string;
  category: string;
  frequency: string;
  applicable_conditions: Record<string, unknown>;
  penalty_description: string;
  checklist_steps: string[];
  tier: number;
}

const INDUSTRY_REQUIREMENTS: RequirementSeed[] = [
  // ──────────────────────────────────────────────────────────
  // MINING & QUARRYING
  // ──────────────────────────────────────────────────────────
  {
    code: "MINE-MHSA-001",
    name: "Mine Health and Safety Act Compliance",
    description:
      "Comply with the Mine Health and Safety Act 29 of 1996 (MHSA). All mining operations must conduct risk assessments, appoint safety officers, maintain health and safety programmes, and report incidents to the DMRE Chief Inspector of Mines.",
    regulator: "Department of Mineral Resources and Energy (DMRE)",
    category: "safety",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Mining & Quarrying"] },
    penalty_description:
      "Criminal prosecution, mine closure orders, fines up to R2 million per incident, imprisonment up to 2 years",
    checklist_steps: [
      "Appoint competent persons for health and safety (Section 7-8)",
      "Conduct annual risk assessment and maintain risk register",
      "Prepare and submit mandatory Code of Practice documents",
      "Ensure Occupational Medical Practitioner (OMP) is appointed (Section 13)",
      "Maintain incident and accident register",
      "Submit annual health and safety report to DMRE",
    ],
    tier: 1,
  },
  {
    code: "MINE-SLP-001",
    name: "Social and Labour Plan (SLP)",
    description:
      "Mining right holders must have an approved Social and Labour Plan addressing community development, human resource development, mine community housing and skills development. Required under Mineral and Petroleum Resources Development Act (MPRDA).",
    regulator: "Department of Mineral Resources and Energy (DMRE)",
    category: "licence",
    frequency: "five-yearly",
    applicable_conditions: { industry_in: ["Mining & Quarrying"] },
    penalty_description: "Suspension or cancellation of mining right, compliance orders",
    checklist_steps: [
      "Develop or update Social and Labour Plan",
      "Submit SLP to DMRE Regional Manager for approval",
      "Implement community development projects as committed",
      "Report annually on SLP implementation progress",
      "Review and renew SLP every 5 years",
    ],
    tier: 1,
  },
  {
    code: "MINE-CHARTER-001",
    name: "Mining Charter Compliance",
    description:
      "Comply with Broad-Based Socio-Economic Empowerment Charter for the Mining and Minerals Industry (Mining Charter III, 2018). Covers ownership, procurement, human resource development, mine community development, and housing and living conditions.",
    regulator: "Department of Mineral Resources and Energy (DMRE)",
    category: "corporate",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Mining & Quarrying"] },
    penalty_description: "Non-renewal of mining rights, compliance notices",
    checklist_steps: [
      "Verify BEE ownership element meets Mining Charter targets",
      "Ensure procurement spend meets minimum thresholds for HDP-owned companies",
      "Report on human resource development spend (5% of payroll)",
      "Submit Mining Charter compliance report to DMRE",
    ],
    tier: 1,
  },
  {
    code: "MINE-EIA-001",
    name: "Environmental Management Programme (EMPr)",
    description:
      "Maintain approved Environmental Management Programme as required under NEMA and MPRDA. Includes environmental impact monitoring, rehabilitation plans, and financial provisioning for mine closure.",
    regulator: "Department of Mineral Resources and Energy (DMRE)",
    category: "environmental",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Mining & Quarrying"] },
    penalty_description: "Fines up to R10 million, criminal prosecution, mine closure orders",
    checklist_steps: [
      "Maintain and update Environmental Management Programme",
      "Conduct annual environmental performance assessment",
      "Review financial provision for rehabilitation and closure",
      "Submit environmental monitoring reports to DMRE",
      "Ensure water use licence compliance (DWS)",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // CONSTRUCTION & BUILDING
  // ──────────────────────────────────────────────────────────
  {
    code: "CON-CIDB-001",
    name: "CIDB Contractor Registration",
    description:
      "Register with the Construction Industry Development Board (CIDB) as required by the CIDB Act 38 of 2000. Grading determines the maximum tender value a contractor may compete for. Valid for 3 years.",
    regulator: "Construction Industry Development Board (CIDB)",
    category: "licence",
    frequency: "triennial",
    applicable_conditions: { industry_in: ["Construction & Building"] },
    penalty_description:
      "Cannot tender for public sector projects, fine up to R100,000 or imprisonment",
    checklist_steps: [
      "Register on CIDB portal (www.cidb.org.za)",
      "Submit financial capability evidence for desired grading",
      "Submit works capability evidence (completed project records)",
      "Obtain CIDB grading certificate",
      "Renew registration every 3 years before expiry",
    ],
    tier: 1,
  },
  {
    code: "CON-NHBRC-001",
    name: "NHBRC Home Builder Registration",
    description:
      "Register with the National Home Builders Registration Council if building residential homes, as required by the Housing Consumers Protection Measures Act 95 of 1998. Includes technical assessment and annual membership.",
    regulator: "National Home Builders Registration Council (NHBRC)",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Construction & Building"] },
    penalty_description:
      "Fine up to R25,000 or imprisonment up to 1 year, building work declared unlawful",
    checklist_steps: [
      "Apply for NHBRC registration",
      "Pass technical competency assessment",
      "Demonstrate financial capability",
      "Enrol each new home building project with NHBRC",
      "Pay annual membership fee (R526.32)",
    ],
    tier: 1,
  },
  {
    code: "CON-REGS-001",
    name: "Construction Regulations 2014 Compliance",
    description:
      "Comply with Construction Regulations 2014 under the Occupational Health and Safety Act. Requires appointment of construction health and safety agents, risk assessments, fall protection plans, and notification of construction work to the Department of Employment and Labour.",
    regulator: "Department of Employment and Labour",
    category: "safety",
    frequency: "per-project",
    applicable_conditions: { industry_in: ["Construction & Building"] },
    penalty_description:
      "Stop-work orders, criminal prosecution, fines, imprisonment up to 2 years",
    checklist_steps: [
      "Appoint construction work health and safety agent where required",
      "Prepare health and safety specification for each project",
      "Submit notification of construction work to DoEL (projects >30 days or >300m2)",
      "Maintain fall protection plan",
      "Ensure all workers have valid medical certificates of fitness",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // FINANCIAL SERVICES & INSURANCE
  // ──────────────────────────────────────────────────────────
  {
    code: "FIN-FAIS-001",
    name: "FAIS Licence (Financial Services Provider)",
    description:
      "Obtain and maintain a licence as a Financial Services Provider under the Financial Advisory and Intermediary Services Act 37 of 2002. Covers fit and proper requirements, compliance officer appointment, and ongoing reporting to the FSCA.",
    regulator: "Financial Sector Conduct Authority (FSCA)",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Financial Services & Insurance"] },
    penalty_description:
      "Fines up to R10 million, debarment, criminal prosecution, licence revocation",
    checklist_steps: [
      "Ensure all key individuals meet fit and proper requirements",
      "Appoint FSCA-approved compliance officer",
      "Submit annual compliance report to FSCA",
      "Maintain professional indemnity insurance",
      "Ensure all representatives are registered on FSCA register",
      "Complete annual regulatory examinations where required",
    ],
    tier: 1,
  },
  {
    code: "FIN-FICA-001",
    name: "FICA Anti-Money Laundering Compliance",
    description:
      "Comply with the Financial Intelligence Centre Act 38 of 2001. Accountable institutions must implement a Risk Management and Compliance Programme (RMCP), conduct customer due diligence, and file reports with the FIC.",
    regulator: "Financial Intelligence Centre (FIC)",
    category: "regulatory",
    frequency: "annual",
    applicable_conditions: {
      industry_in: [
        "Financial Services & Insurance",
        "Real Estate & Property",
        "Legal Services",
        "Professional Services (Accounting & Auditing)",
        "Gambling & Gaming",
      ],
    },
    penalty_description:
      "Administrative sanctions up to R50 million, criminal prosecution, imprisonment up to 15 years",
    checklist_steps: [
      "Register as accountable institution on FIC goAML system",
      "Develop and maintain Risk Management and Compliance Programme (RMCP)",
      "Implement customer due diligence (CDD) and enhanced due diligence (EDD) procedures",
      "File Cash Threshold Reports (CTRs) for transactions above R49,999.99",
      "File Suspicious Transaction Reports (STRs) where applicable",
      "Submit annual Risk and Compliance Return to FIC",
      "Train all staff on AML/CFT obligations",
    ],
    tier: 1,
  },
  {
    code: "FIN-CONDUCT-001",
    name: "General Code of Conduct for FSPs",
    description:
      "Comply with the General Code of Conduct for Authorised Financial Services Providers under FAIS. Covers advice processes, record-keeping, conflict of interest management, and fair treatment of clients (TCF).",
    regulator: "Financial Sector Conduct Authority (FSCA)",
    category: "regulatory",
    frequency: "ongoing",
    applicable_conditions: { industry_in: ["Financial Services & Insurance"] },
    penalty_description: "FSCA enforcement action, debarment, licence suspension",
    checklist_steps: [
      "Maintain records of all advice and intermediary services rendered",
      "Implement conflict of interest management policy",
      "Ensure compliance with Treating Customers Fairly (TCF) outcomes",
      "Maintain complaints management procedure",
      "Review and update compliance manual annually",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // HEALTHCARE & MEDICAL
  // ──────────────────────────────────────────────────────────
  {
    code: "HEALTH-HPCSA-001",
    name: "HPCSA Professional Registration",
    description:
      "All healthcare professionals (doctors, dentists, psychologists, physiotherapists, etc.) must register with the Health Professions Council of South Africa under the Health Professions Act 56 of 1974. Annual renewal required.",
    regulator: "Health Professions Council of South Africa (HPCSA)",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Healthcare & Medical"] },
    penalty_description:
      "Illegal practice, criminal prosecution, fines, imprisonment, striking off the register",
    checklist_steps: [
      "Register all healthcare professionals with relevant HPCSA board",
      "Pay annual registration fees before deadline",
      "Maintain continuing professional development (CPD) points",
      "Comply with ethical rules and scope of practice regulations",
      "Report any changes in practice details to HPCSA",
    ],
    tier: 1,
  },
  {
    code: "HEALTH-FACILITY-001",
    name: "Healthcare Facility Licence",
    description:
      "Private healthcare facilities must be licensed by the relevant provincial Department of Health under the National Health Act 61 of 2003 and provincial health legislation. Covers hospitals, clinics, day theatres, and nursing homes.",
    regulator: "Provincial Department of Health",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Healthcare & Medical"] },
    penalty_description: "Facility closure, criminal prosecution, fines",
    checklist_steps: [
      "Apply for or renew healthcare facility licence",
      "Ensure facility meets prescribed norms and standards",
      "Maintain infection prevention and control protocols",
      "Comply with National Core Standards for health establishments",
      "Submit annual compliance reports to provincial DoH",
    ],
    tier: 1,
  },
  {
    code: "HEALTH-SANC-001",
    name: "SANC Nursing Registration",
    description:
      "Nursing professionals must register with the South African Nursing Council under the Nursing Act 33 of 2005. Covers nurses, midwives, and nursing auxiliaries.",
    regulator: "South African Nursing Council (SANC)",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Healthcare & Medical"] },
    penalty_description: "Removal from register, criminal prosecution for practising unregistered",
    checklist_steps: [
      "Register all nursing staff with SANC",
      "Pay annual registration fees",
      "Maintain CPD compliance",
      "Report any misconduct or impairment",
    ],
    tier: 2,
  },

  // ──────────────────────────────────────────────────────────
  // PRIVATE SECURITY
  // ──────────────────────────────────────────────────────────
  {
    code: "SEC-PSIRA-001",
    name: "PSIRA Registration",
    description:
      "All private security businesses and officers must register with the Private Security Industry Regulatory Authority under the Private Security Industry Regulation Act 56 of 2001. Annual renewal and compliance audits required.",
    regulator: "Private Security Industry Regulatory Authority (PSIRA)",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Private Security"] },
    penalty_description: "Fine up to R1 million, imprisonment up to 24 months, business closure",
    checklist_steps: [
      "Register security business with PSIRA (R7,900 for 2025/26)",
      "Ensure all security officers hold valid PSIRA registration",
      "Comply with minimum training standards (Grades A-E)",
      "Maintain prescribed firearm competency certificates where applicable",
      "Submit annual compliance report",
      "Comply with PSIRA Code of Conduct",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // REAL ESTATE & PROPERTY
  // ──────────────────────────────────────────────────────────
  {
    code: "PROP-PPRA-001",
    name: "Property Practitioner Registration (PPRA)",
    description:
      "Register as a property practitioner with the Property Practitioners Regulatory Authority under the Property Practitioners Act 22 of 2019. Requires Fidelity Fund Certificate (FFC) valid at time of each transaction. Covers estate agents, auctioneers, mortgage originators.",
    regulator: "Property Practitioners Regulatory Authority (PPRA)",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Real Estate & Property"] },
    penalty_description:
      "Cannot earn commission, transactions voidable, criminal prosecution, fine up to R1 million",
    checklist_steps: [
      "Register all property practitioners with PPRA",
      "Obtain valid Fidelity Fund Certificate (FFC) annually (R780/year)",
      "Ensure all candidate practitioners are under mentorship",
      "Pass Professional Designation Exam (PDE) where required",
      "Maintain trust account compliance (separate audited account)",
      "Complete 6 mandatory practical training courses",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // TELECOMMUNICATIONS
  // ──────────────────────────────────────────────────────────
  {
    code: "TELE-ICASA-001",
    name: "ICASA Licence and Type Approval",
    description:
      "Telecommunications operators and equipment importers must be licensed by ICASA under the Electronic Communications Act 36 of 2005. Equipment using radio spectrum requires ICASA type approval certification.",
    regulator: "Independent Communications Authority of South Africa (ICASA)",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Telecommunications"] },
    penalty_description: "Equipment seizure, fines, licence revocation",
    checklist_steps: [
      "Obtain ICASA Electronic Communications Service licence",
      "Register as Supplier of Equipment on ICASA database",
      "Obtain type approval for all radio frequency equipment",
      "Comply with spectrum assignment conditions",
      "Submit annual compliance reports to ICASA",
    ],
    tier: 1,
  },
  {
    code: "TELE-RICA-001",
    name: "RICA Compliance",
    description:
      "Comply with the Regulation of Interception of Communications and Provision of Communication-Related Information Act 70 of 2002 (RICA). Telecommunications service providers must register SIM cards and maintain subscriber records.",
    regulator: "Independent Communications Authority of South Africa (ICASA)",
    category: "regulatory",
    frequency: "ongoing",
    applicable_conditions: { industry_in: ["Telecommunications"] },
    penalty_description: "Fines up to R2 million, imprisonment up to 2 years",
    checklist_steps: [
      "Implement RICA registration processes at all points of sale",
      "Maintain subscriber registration database",
      "Respond to lawful interception directives within prescribed timeframes",
      "Ensure all existing SIM cards are RICA registered",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // AGRICULTURE & FARMING
  // ──────────────────────────────────────────────────────────
  {
    code: "AGR-ACT36-001",
    name: "Agricultural Remedies and Stock Remedies Compliance",
    description:
      "Comply with the Fertilizers, Farm Feeds, Agricultural Remedies and Stock Remedies Act 36 of 1947. Sellers and users of agricultural chemicals, pesticides, and stock remedies must be registered. Restricted stock remedies require veterinary oversight.",
    regulator: "Department of Agriculture, Land Reform and Rural Development (DALRRD)",
    category: "regulatory",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Agriculture & Farming"] },
    penalty_description: "Fines, product seizure, criminal prosecution",
    checklist_steps: [
      "Register as dealer of agricultural remedies/stock remedies where applicable",
      "Ensure all products used are registered under Act 36",
      "Maintain records of all chemical applications and stock remedy use",
      "Comply with restricted product handling requirements",
      "Ensure proper storage and labelling of chemical products",
    ],
    tier: 1,
  },
  {
    code: "AGR-WATER-001",
    name: "Water Use Licence (Agriculture)",
    description:
      "Agricultural water users must register and obtain a water use licence under the National Water Act 36 of 1998. Covers irrigation, animal watering, and aquaculture.",
    regulator: "Department of Water and Sanitation (DWS)",
    category: "licence",
    frequency: "per-licence-period",
    applicable_conditions: { industry_in: ["Agriculture & Farming", "Fishing & Aquaculture"] },
    penalty_description:
      "Fines up to R10 million, criminal prosecution, water supply disconnection",
    checklist_steps: [
      "Register all water uses with DWS",
      "Apply for water use licence if exceeding Schedule 1 limits",
      "Comply with licence conditions and water metering requirements",
      "Submit annual water use monitoring reports",
    ],
    tier: 1,
  },
  {
    code: "AGR-ANIMAL-001",
    name: "Animal Diseases Act Compliance",
    description:
      "Comply with the Animal Diseases Act 35 of 1984. Farmers must report notifiable diseases, comply with movement permits, and maintain animal identification systems.",
    regulator: "Department of Agriculture, Land Reform and Rural Development (DALRRD)",
    category: "regulatory",
    frequency: "ongoing",
    applicable_conditions: { industry_in: ["Agriculture & Farming"] },
    penalty_description: "Fines, quarantine orders, stock destruction",
    checklist_steps: [
      "Register livestock brands with DALRRD",
      "Obtain movement permits before transporting animals",
      "Report all notifiable diseases within 24 hours",
      "Comply with vaccination requirements for controlled diseases",
      "Maintain animal health records",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // ACCOMMODATION & HOSPITALITY / TOURISM
  // ──────────────────────────────────────────────────────────
  {
    code: "HOSP-TGCSA-001",
    name: "Tourism Grading (TGCSA)",
    description:
      "Accommodation establishments should register for star grading with the Tourism Grading Council of South Africa (TGCSA), the official quality assurance body for tourism products. Covers hotels, guest houses, B&Bs, lodges, self-catering, and camping sites.",
    regulator: "Tourism Grading Council of South Africa (TGCSA)",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Accommodation & Hospitality", "Tourism & Travel"] },
    penalty_description: "Loss of grading, removal from official tourism channels and marketing",
    checklist_steps: [
      "Register on TGCSA portal (tqit.southafrica.net)",
      "Schedule grading assessment visit",
      "Meet minimum requirements for desired star rating",
      "Maintain guest safety and hygiene standards",
      "Renew grading annually",
    ],
    tier: 1,
  },
  {
    code: "HOSP-HEALTH-001",
    name: "Certificate of Acceptability (Food Premises)",
    description:
      "Food premises in hospitality must hold a Certificate of Acceptability under Regulation R638 of the Foodstuffs, Cosmetics and Disinfectants Act 54 of 1972. Issued by the local municipality environmental health department.",
    regulator: "Municipal Environmental Health Department",
    category: "licence",
    frequency: "annual",
    applicable_conditions: {
      industry_in: [
        "Accommodation & Hospitality",
        "Food & Beverage Manufacturing",
        "Retail & Wholesale Trade",
      ],
    },
    penalty_description: "Business closure, fines, criminal prosecution",
    checklist_steps: [
      "Apply for Certificate of Acceptability at local municipality",
      "Ensure premises meet hygiene and safety standards (R638 regulations)",
      "Ensure food handlers have valid health certificates",
      "Maintain pest control records",
      "Display certificate prominently on premises",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // LIQUOR & ALCOHOL
  // ──────────────────────────────────────────────────────────
  {
    code: "LIQ-LICENCE-001",
    name: "Liquor Licence",
    description:
      "Obtain a liquor licence from the relevant provincial liquor authority under the National Liquor Act 59 of 2003 and applicable provincial liquor legislation. Required for any business selling or manufacturing alcohol.",
    regulator: "Provincial Liquor Authority / National Liquor Authority (NLA)",
    category: "licence",
    frequency: "annual",
    applicable_conditions: {
      industry_in: ["Liquor & Alcohol", "Accommodation & Hospitality"],
    },
    penalty_description:
      "Fines up to R1 million, imprisonment up to 5 years, business closure, licence revocation",
    checklist_steps: [
      "Apply for appropriate licence type (on-consumption, off-consumption, manufacturing, distribution)",
      "Obtain zoning approval from local municipality",
      "Obtain SAPS clearance certificate",
      "Pay application and annual renewal fees",
      "Display licence prominently on premises",
      "Comply with trading hours and conditions",
      "Do not sell to minors or visibly intoxicated persons",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // TRANSPORT, FREIGHT & LOGISTICS
  // ──────────────────────────────────────────────────────────
  {
    code: "TRANS-PERMIT-001",
    name: "Operating Licence / Permit (Road Transport)",
    description:
      "Commercial transport operators must hold an operating licence issued by the relevant Provincial Regulatory Entity under the National Land Transport Act 5 of 2009. Covers public passenger transport, goods haulage, and tour operators.",
    regulator: "Provincial Regulatory Entity (PRE) / NPTR",
    category: "licence",
    frequency: "per-licence-period",
    applicable_conditions: { industry_in: ["Transport, Freight & Logistics", "Tourism & Travel"] },
    penalty_description: "Vehicle impoundment, fines up to R100,000, imprisonment",
    checklist_steps: [
      "Apply for operating licence from Provincial Regulatory Entity",
      "Ensure all vehicles are roadworthy (annual CoF - Certificate of Fitness)",
      "Maintain vehicle maintenance records",
      "Comply with cross-border road transport permit requirements where applicable",
      "Ensure drivers hold valid Professional Driving Permits (PrDP)",
    ],
    tier: 1,
  },
  {
    code: "TRANS-DANGEROUS-001",
    name: "Dangerous Goods Transport Compliance",
    description:
      "Operators transporting dangerous goods must comply with SANS 10228/10229/10231 and the National Road Traffic Act regulations. Requires trained drivers, proper vehicle marking, and emergency procedures.",
    regulator: "Road Traffic Management Corporation (RTMC)",
    category: "safety",
    frequency: "annual",
    applicable_conditions: {
      industry_in: [
        "Transport, Freight & Logistics",
        "Chemical & Petrochemical",
        "Mining & Quarrying",
      ],
    },
    penalty_description: "Fines, vehicle impoundment, criminal prosecution",
    checklist_steps: [
      "Ensure drivers hold dangerous goods driver permit (DGP)",
      "Comply with SANS 10228 classification and labelling",
      "Equip vehicles with prescribed safety equipment and placards",
      "Maintain Transport Emergency Card (TREMCARD) in each vehicle",
      "Appoint dangerous goods safety advisor",
    ],
    tier: 2,
  },

  // ──────────────────────────────────────────────────────────
  // ENERGY & UTILITIES
  // ──────────────────────────────────────────────────────────
  {
    code: "ENERGY-NERSA-001",
    name: "NERSA Generation / Distribution Licence",
    description:
      "Electricity generators and distributors must be licensed by the National Energy Regulator of South Africa under the Electricity Regulation Act 4 of 2006. Covers generation above 1MW, distribution, and trading.",
    regulator: "National Energy Regulator of South Africa (NERSA)",
    category: "licence",
    frequency: "per-licence-period",
    applicable_conditions: { industry_in: ["Energy & Utilities"] },
    penalty_description: "Fines up to R5 million, licence revocation, criminal prosecution",
    checklist_steps: [
      "Apply for generation or distribution licence from NERSA",
      "Comply with licence conditions and tariff regulations",
      "Submit annual performance and financial reports to NERSA",
      "Register with system operator where applicable",
      "Comply with grid code requirements",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // ENVIRONMENTAL & WASTE MANAGEMENT
  // ──────────────────────────────────────────────────────────
  {
    code: "WASTE-WML-001",
    name: "Waste Management Licence",
    description:
      "Obtain a Waste Management Licence under the National Environmental Management: Waste Act 59 of 2008 for listed waste management activities (storage, treatment, recycling, disposal). Category A requires basic assessment; Category B requires full EIA.",
    regulator: "Department of Forestry, Fisheries and the Environment (DFFE)",
    category: "licence",
    frequency: "per-licence-period",
    applicable_conditions: { industry_in: ["Environmental & Waste Management"] },
    penalty_description: "Fines up to R10 million, imprisonment up to 10 years, site closure",
    checklist_steps: [
      "Identify listed waste management activities applicable to operations",
      "Conduct Basic Assessment (Category A) or full EIA (Category B)",
      "Apply for Waste Management Licence from competent authority",
      "Comply with licence conditions and monitoring requirements",
      "Submit annual waste management monitoring reports",
      "Maintain waste manifest system for all hazardous waste",
    ],
    tier: 1,
  },
  {
    code: "WASTE-NEMA-001",
    name: "Environmental Authorisation (NEMA)",
    description:
      "Obtain Environmental Authorisation under NEMA EIA Regulations for listed activities that may significantly impact the environment. Required before commencing with construction, operation, or decommissioning of listed activities.",
    regulator: "Department of Forestry, Fisheries and the Environment (DFFE)",
    category: "environmental",
    frequency: "per-project",
    applicable_conditions: {
      industry_in: [
        "Environmental & Waste Management",
        "Mining & Quarrying",
        "Chemical & Petrochemical",
        "Manufacturing (General)",
        "Energy & Utilities",
      ],
    },
    penalty_description: "Fines up to R10 million, imprisonment up to 10 years, demolition orders",
    checklist_steps: [
      "Determine if activity is listed under NEMA EIA Regulations",
      "Appoint registered Environmental Assessment Practitioner (EAP)",
      "Conduct Basic Assessment or full Scoping and EIA process",
      "Submit application to competent authority",
      "Comply with conditions of Environmental Authorisation",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // FOOD & BEVERAGE MANUFACTURING
  // ──────────────────────────────────────────────────────────
  {
    code: "FOOD-SAFETY-001",
    name: "Foodstuffs, Cosmetics and Disinfectants Act Compliance",
    description:
      "Comply with the Foodstuffs, Cosmetics and Disinfectants Act 54 of 1972. Food manufacturers and processors must ensure products are safe, properly labelled (R146 labelling regulations), and produced in premises with a Certificate of Acceptability.",
    regulator: "Department of Health / Municipal Environmental Health",
    category: "regulatory",
    frequency: "ongoing",
    applicable_conditions: { industry_in: ["Food & Beverage Manufacturing"] },
    penalty_description: "Product recalls, fines, criminal prosecution, business closure",
    checklist_steps: [
      "Obtain and maintain Certificate of Acceptability for premises",
      "Implement food safety management system (HACCP recommended)",
      "Ensure all labelling complies with R146 regulations",
      "Conduct regular microbiological and chemical testing",
      "Maintain traceability records for all products",
      "Train all food handlers on food safety practices",
    ],
    tier: 1,
  },
  {
    code: "FOOD-NRCS-001",
    name: "NRCS Compulsory Specification Compliance (Food)",
    description:
      "Certain food products must comply with compulsory specifications administered by the National Regulator for Compulsory Specifications (NRCS) under the NRCS Act 5 of 2008. Covers canned meat, canned fish, frozen fish, dairy, and other regulated products.",
    regulator: "National Regulator for Compulsory Specifications (NRCS)",
    category: "regulatory",
    frequency: "ongoing",
    applicable_conditions: { industry_in: ["Food & Beverage Manufacturing"] },
    penalty_description: "Product seizure, import prohibition, fines, criminal prosecution",
    checklist_steps: [
      "Identify which products fall under NRCS compulsory specifications",
      "Obtain Letter of Authority (LoA) from NRCS for regulated products",
      "Submit test reports from accredited laboratories",
      "Comply with NRCS inspection and audit requirements",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // MANUFACTURING (GENERAL)
  // ──────────────────────────────────────────────────────────
  {
    code: "MFG-NRCS-001",
    name: "NRCS Compulsory Specification (Manufactured Goods)",
    description:
      "Manufacturers and importers of products falling under compulsory specifications must obtain a Letter of Authority (LoA) from the NRCS. Covers electrical products, automotive components, building materials, and other regulated goods.",
    regulator: "National Regulator for Compulsory Specifications (NRCS)",
    category: "regulatory",
    frequency: "annual",
    applicable_conditions: {
      industry_in: ["Manufacturing (General)", "Automotive", "Textile, Clothing & Footwear"],
    },
    penalty_description:
      "Product seizure, import prohibition, fines up to R200,000 or imprisonment",
    checklist_steps: [
      "Identify products subject to compulsory specifications",
      "Register as manufacturer or importer with NRCS",
      "Obtain test reports from SANAS-accredited laboratory",
      "Apply for and maintain Letter of Authority (LoA)",
      "Comply with NRCS audit and inspection requirements",
    ],
    tier: 1,
  },
  {
    code: "MFG-AEL-001",
    name: "Atmospheric Emission Licence (AEL)",
    description:
      "Manufacturing facilities with listed activities under the National Environmental Management: Air Quality Act 39 of 2004 must hold an Atmospheric Emission Licence from the relevant municipal or provincial authority.",
    regulator: "Metropolitan / District Municipality or Provincial Authority",
    category: "environmental",
    frequency: "per-licence-period",
    applicable_conditions: {
      industry_in: [
        "Manufacturing (General)",
        "Chemical & Petrochemical",
        "Mining & Quarrying",
        "Energy & Utilities",
      ],
    },
    penalty_description: "Fines up to R10 million, imprisonment up to 10 years, facility closure",
    checklist_steps: [
      "Determine if operations include listed activities under NEM:AQA",
      "Apply for Atmospheric Emission Licence",
      "Install prescribed emission monitoring equipment",
      "Submit emission monitoring reports as per licence conditions",
      "Comply with emission limits and standards",
    ],
    tier: 2,
  },

  // ──────────────────────────────────────────────────────────
  // PHARMACEUTICAL & BIOTECH
  // ──────────────────────────────────────────────────────────
  {
    code: "PHARMA-SAHPRA-001",
    name: "SAHPRA Licence and Product Registration",
    description:
      "Manufacturers, importers, exporters, and wholesalers of medicines, medical devices, and health products must be licensed by the South African Health Products Regulatory Authority under the Medicines and Related Substances Act 101 of 1965.",
    regulator: "South African Health Products Regulatory Authority (SAHPRA)",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Pharmaceutical & Biotech"] },
    penalty_description:
      "Fines up to R10 million, imprisonment up to 10 years, product seizure, licence revocation",
    checklist_steps: [
      "Obtain SAHPRA manufacturing/import/wholesale licence (Section 22C)",
      "Register all products with SAHPRA before marketing",
      "Comply with Good Manufacturing Practice (GMP) requirements",
      "Maintain pharmacovigilance system for adverse event reporting",
      "Submit annual licence renewal and compliance reports",
      "Ensure Responsible Pharmacist is appointed",
    ],
    tier: 1,
  },
  {
    code: "PHARMA-SAPC-001",
    name: "Pharmacy Council Registration",
    description:
      "Pharmacies and pharmacists must register with the South African Pharmacy Council under the Pharmacy Act 53 of 1974. Covers community pharmacies, hospital pharmacies, and pharmaceutical wholesalers.",
    regulator: "South African Pharmacy Council (SAPC)",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Pharmaceutical & Biotech", "Healthcare & Medical"] },
    penalty_description: "Closure of pharmacy, criminal prosecution, deregistration",
    checklist_steps: [
      "Register pharmacy with SAPC",
      "Ensure all pharmacists hold valid SAPC registration",
      "Maintain CPD compliance for all pharmacists",
      "Comply with Good Pharmacy Practice (GPP) standards",
      "Pay annual registration fees",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // EDUCATION & TRAINING
  // ──────────────────────────────────────────────────────────
  {
    code: "EDU-DHET-001",
    name: "Private Higher Education Institution Registration",
    description:
      "Private institutions offering higher education must register with the Department of Higher Education and Training under the Higher Education Act 101 of 1997. Programmes must be accredited by the Council on Higher Education (CHE).",
    regulator: "Department of Higher Education and Training (DHET) / CHE",
    category: "licence",
    frequency: "per-registration-period",
    applicable_conditions: { industry_in: ["Education & Training"] },
    penalty_description: "Closure, criminal prosecution, fine up to R500,000",
    checklist_steps: [
      "Apply for registration as private higher education institution with DHET",
      "Submit programmes for accreditation by CHE/HEQC",
      "Maintain quality management system",
      "Submit annual reports and statistical returns to DHET",
      "Comply with conditions of registration",
    ],
    tier: 1,
  },
  {
    code: "EDU-UMALUSI-001",
    name: "Umalusi Accreditation (Schools & FET Colleges)",
    description:
      "Private schools offering the National Curriculum and private FET colleges must be accredited by Umalusi, the Council for Quality Assurance in General and Further Education and Training, under the GENFETQA Act 58 of 2001.",
    regulator: "Umalusi / Provincial Department of Education",
    category: "licence",
    frequency: "per-accreditation-cycle",
    applicable_conditions: { industry_in: ["Education & Training"] },
    penalty_description: "Deregistration, results not recognised, closure",
    checklist_steps: [
      "Register with provincial Department of Education",
      "Apply for Umalusi accreditation for assessment bodies",
      "Maintain curriculum and assessment standards",
      "Submit to Umalusi monitoring and evaluation visits",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // CHILDCARE & EARLY CHILDHOOD DEVELOPMENT
  // ──────────────────────────────────────────────────────────
  {
    code: "ECD-REG-001",
    name: "ECD Centre Registration (Partial Care Facility)",
    description:
      "Early Childhood Development centres caring for 7 or more children must register as partial care facilities under the Children's Act 38 of 2005. Registration is with the provincial Department of Basic Education (since April 2022).",
    regulator: "Provincial Department of Basic Education (DBE)",
    category: "licence",
    frequency: "per-registration-period",
    applicable_conditions: { industry_in: ["Childcare & Early Childhood Development"] },
    penalty_description: "Closure, criminal prosecution, fine up to R30,000",
    checklist_steps: [
      "Apply for partial care facility registration with provincial DBE",
      "Obtain municipal health clearance certificate",
      "Obtain zoning/land use approval from municipality",
      "Meet minimum norms and standards for ECD facilities",
      "Ensure staff-to-child ratios comply with regulations",
      "Maintain fire safety certificate",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // LEGAL SERVICES
  // ──────────────────────────────────────────────────────────
  {
    code: "LEGAL-LPC-001",
    name: "Legal Practice Council Registration",
    description:
      "All legal practitioners (attorneys and advocates) must be enrolled and registered with the Legal Practice Council under the Legal Practice Act 28 of 2014. Law firms must hold a Fidelity Fund Certificate.",
    regulator: "Legal Practice Council (LPC)",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Legal Services"] },
    penalty_description:
      "Struck off the roll, criminal prosecution for practising without registration, fines",
    checklist_steps: [
      "Ensure all practitioners are enrolled with LPC",
      "Obtain annual Fidelity Fund Certificate for the firm",
      "Maintain trust account compliance (regular audits)",
      "Comply with CPD requirements",
      "Submit annual trust account audit report",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // PROFESSIONAL SERVICES (ACCOUNTING)
  // ──────────────────────────────────────────────────────────
  {
    code: "AUDIT-IRBA-001",
    name: "IRBA Registered Auditor Registration",
    description:
      "Audit firms and individual auditors must register with the Independent Regulatory Board for Auditors under the Auditing Profession Act 26 of 2005. Annual registration and compliance with auditing standards required.",
    regulator: "Independent Regulatory Board for Auditors (IRBA)",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Professional Services (Accounting & Auditing)"] },
    penalty_description:
      "Deregistration, fines up to R10 million, criminal prosecution, reputation damage",
    checklist_steps: [
      "Register firm and individual auditors with IRBA",
      "Pay annual registration fees (R15,165 for 2025/26)",
      "Comply with International Standards on Auditing (ISAs)",
      "Undergo IRBA quality assurance inspection",
      "Maintain CPD compliance",
      "Comply with IRBA Code of Professional Conduct",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // PROFESSIONAL SERVICES (ARCHITECTURE)
  // ──────────────────────────────────────────────────────────
  {
    code: "ARCH-SACAP-001",
    name: "SACAP Professional Registration",
    description:
      "Architects and related professionals must register with the South African Council for the Architectural Profession under the Architectural Profession Act 44 of 2000. It is illegal to provide architectural services without SACAP registration.",
    regulator: "South African Council for the Architectural Profession (SACAP)",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Professional Services (Architecture)"] },
    penalty_description: "Criminal prosecution, fines, cannot practise legally",
    checklist_steps: [
      "Register all architectural professionals with SACAP",
      "Pay annual registration fees",
      "Maintain CPD compliance",
      "Comply with SACAP Code of Professional Conduct",
      "Ensure professional indemnity insurance is in place",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // PROFESSIONAL SERVICES (ENGINEERING)
  // ──────────────────────────────────────────────────────────
  {
    code: "ENG-ECSA-001",
    name: "ECSA Professional Registration",
    description:
      "Engineers, engineering technologists, and technicians must register with the Engineering Council of South Africa under the Engineering Profession Act 46 of 2000. Statutory requirement for practising engineering.",
    regulator: "Engineering Council of South Africa (ECSA)",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Professional Services (Engineering)"] },
    penalty_description: "Criminal prosecution, fines, cannot sign off engineering work",
    checklist_steps: [
      "Register all engineering professionals with ECSA",
      "Pay annual registration fees",
      "Maintain CPD compliance (25 credits per year minimum)",
      "Comply with ECSA Code of Professional Conduct",
      "Maintain professional indemnity insurance",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // IT & TECHNOLOGY
  // ──────────────────────────────────────────────────────────
  {
    code: "IT-ECTA-001",
    name: "ECTA E-Commerce Compliance",
    description:
      "Online businesses must comply with the Electronic Communications and Transactions Act 25 of 2002. Requires disclosure of full business details, cooling-off rights, and data protection measures on all websites and apps.",
    regulator: "Department of Communications and Digital Technologies (DCDT)",
    category: "regulatory",
    frequency: "ongoing",
    applicable_conditions: { industry_in: ["IT & Technology"] },
    penalty_description: "Fines, consumer claims, transactions voidable",
    checklist_steps: [
      "Display full ECTA Section 43 information on website/app",
      "Implement 5-business-day cooling-off period for online sales",
      "Publish clear T&Cs, privacy policy, and returns policy",
      "Ensure secure payment processing (PCI-DSS compliance)",
      "Maintain electronic transaction records",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // GAMBLING & GAMING
  // ──────────────────────────────────────────────────────────
  {
    code: "GAMB-NGB-001",
    name: "Gambling Licence",
    description:
      "All gambling operators must be licensed by the relevant Provincial Gambling Board under the National Gambling Act 7 of 2004. Covers casinos, bingo, limited payout machines, bookmakers, and totalisator operators.",
    regulator: "National Gambling Board (NGB) / Provincial Gambling Boards",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Gambling & Gaming"] },
    penalty_description:
      "Criminal prosecution, fines up to R10 million, imprisonment up to 10 years, licence revocation",
    checklist_steps: [
      "Apply for gambling licence from Provincial Gambling Board",
      "Undergo probity investigation for all key persons",
      "Implement responsible gambling measures",
      "Comply with prescribed levies and taxes",
      "Submit monthly/quarterly operational reports to gambling board",
      "Comply with FICA as accountable institution",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // VETERINARY SERVICES
  // ──────────────────────────────────────────────────────────
  {
    code: "VET-SAVC-001",
    name: "SAVC Veterinary Registration",
    description:
      "Veterinarians and para-veterinary professionals must register with the South African Veterinary Council under the Veterinary and Para-Veterinary Professions Act 19 of 1982. Veterinary facilities must also be registered and meet minimum standards.",
    regulator: "South African Veterinary Council (SAVC)",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Veterinary Services"] },
    penalty_description:
      "Criminal prosecution for practising unregistered, fines, suspension from register",
    checklist_steps: [
      "Register all veterinary professionals with SAVC",
      "Register veterinary facility with SAVC (Rules 18-35)",
      "Pay annual registration fees",
      "Maintain CPD compliance",
      "Comply with SAVC minimum facility standards",
      "Maintain controlled substance (Schedule 5-7) registers",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // FISHING & AQUACULTURE
  // ──────────────────────────────────────────────────────────
  {
    code: "FISH-PERMIT-001",
    name: "Fishing Rights and Permits",
    description:
      "Commercial fishing operators must hold fishing rights or permits under the Marine Living Resources Act 18 of 1998. Covers all commercial fishing, mariculture, and aquaculture operations.",
    regulator: "Department of Forestry, Fisheries and the Environment (DFFE)",
    category: "licence",
    frequency: "per-rights-period",
    applicable_conditions: { industry_in: ["Fishing & Aquaculture"] },
    penalty_description: "Vessel seizure, catch confiscation, fines up to R2 million, imprisonment",
    checklist_steps: [
      "Apply for fishing rights or permits from DFFE",
      "Comply with Total Allowable Catch (TAC) limits",
      "Maintain catch logbooks and submit returns",
      "Ensure vessels comply with safety and inspection requirements",
      "Comply with Marine Protected Area regulations where applicable",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // FORESTRY & TIMBER
  // ──────────────────────────────────────────────────────────
  {
    code: "FOR-LICENCE-001",
    name: "Forestry Licence (National Forests Act)",
    description:
      "Commercial forestry operations must comply with the National Forests Act 84 of 1998. Licences required for activities in or affecting natural forests, protected trees, and stream flow reduction activities.",
    regulator: "Department of Forestry, Fisheries and the Environment (DFFE)",
    category: "licence",
    frequency: "per-licence-period",
    applicable_conditions: { industry_in: ["Forestry & Timber"] },
    penalty_description: "Fines up to R5 million, imprisonment up to 3 years",
    checklist_steps: [
      "Obtain licence for stream flow reduction activity (SFRA) if applicable",
      "Comply with protected tree species regulations",
      "Maintain sustainable forestry management plan",
      "Submit forestry returns and statistics as required",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // DEFENCE & FIREARMS
  // ──────────────────────────────────────────────────────────
  {
    code: "DEF-FCA-001",
    name: "Firearms Dealer Licence / NCACC Registration",
    description:
      "Dealers in firearms must be licensed under the Firearms Control Act 60 of 2000. Defence-related businesses must register with the National Conventional Arms Control Committee (NCACC) under the National Conventional Arms Control Act 41 of 2002.",
    regulator: "SAPS Central Firearms Registry / NCACC",
    category: "licence",
    frequency: "per-licence-period",
    applicable_conditions: { industry_in: ["Defence & Firearms"] },
    penalty_description: "Imprisonment up to 25 years, fines, licence revocation, asset forfeiture",
    checklist_steps: [
      "Obtain dealer's licence from SAPS CFR",
      "Register with NCACC for manufacture/trade of conventional arms",
      "Maintain firearm register and submit returns to SAPS",
      "Ensure secure storage meeting SAPS requirements",
      "Comply with end-user certificate requirements for exports",
      "Submit quarterly returns to NCACC",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // MEDIA, FILM & ENTERTAINMENT
  // ──────────────────────────────────────────────────────────
  {
    code: "MEDIA-FPB-001",
    name: "Film and Publication Board Classification",
    description:
      "All films, games, and certain publications distributed in South Africa must be classified by the Film and Publication Board under the Films and Publications Act 65 of 1996. Online content distributors must register.",
    regulator: "Film and Publication Board (FPB)",
    category: "regulatory",
    frequency: "per-submission",
    applicable_conditions: { industry_in: ["Media, Film & Entertainment"] },
    penalty_description: "Fines up to R5 million, imprisonment up to 5 years",
    checklist_steps: [
      "Register as content distributor with FPB where required",
      "Submit all films and games for classification before distribution",
      "Display FPB classification ratings on all distributed content",
      "Comply with online content regulation requirements",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // NON-PROFIT & NGO
  // ──────────────────────────────────────────────────────────
  {
    code: "NPO-REG-001",
    name: "NPO Registration and Compliance",
    description:
      "Non-profit organisations must register with the NPO Directorate under the Nonprofit Organisations Act 71 of 1997. Requires submission of annual narrative and financial reports.",
    regulator: "NPO Directorate, Department of Social Development",
    category: "corporate",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Non-Profit & NGO", "Social Services & Welfare"] },
    penalty_description: "Deregistration, loss of tax exemption, compliance notices",
    checklist_steps: [
      "Register organisation with NPO Directorate",
      "Submit annual narrative report within 9 months of financial year-end",
      "Submit annual financial statements",
      "Notify NPO Directorate of any changes to constitution or office bearers",
      "Apply for Section 18A tax-exempt status with SARS if applicable",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // IMPORT & EXPORT TRADING
  // ──────────────────────────────────────────────────────────
  {
    code: "TRADE-CUSTOMS-001",
    name: "SARS Customs Registration and Compliance",
    description:
      "Importers and exporters must register with SARS Customs under the Customs and Excise Act 91 of 1964. Requires customs declarations, tariff classification, and compliance with import/export permits and ITAC requirements.",
    regulator: "SARS Customs / International Trade Administration Commission (ITAC)",
    category: "regulatory",
    frequency: "ongoing",
    applicable_conditions: {
      industry_in: ["Import & Export Trading"],
      imports_exports: true,
    },
    penalty_description:
      "Goods seizure, fines up to 3x duty value, criminal prosecution, deregistration",
    checklist_steps: [
      "Register as importer/exporter with SARS Customs",
      "Ensure correct tariff classification for all goods",
      "Obtain import/export permits from ITAC where required",
      "Comply with rules of origin for preferential trade agreements",
      "Maintain records of all customs transactions for 5 years",
      "Submit accurate customs declarations (DA500/DA65)",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // CHEMICAL & PETROCHEMICAL
  // ──────────────────────────────────────────────────────────
  {
    code: "CHEM-MHI-001",
    name: "Major Hazard Installation Compliance",
    description:
      "Facilities storing or processing hazardous substances above threshold quantities must comply with the Major Hazard Installation Regulations under the OHS Act. Requires risk assessment, emergency plans, and local authority approval.",
    regulator: "Department of Employment and Labour / Local Authority",
    category: "safety",
    frequency: "triennial",
    applicable_conditions: {
      industry_in: ["Chemical & Petrochemical", "Manufacturing (General)"],
    },
    penalty_description: "Facility closure, criminal prosecution, imprisonment",
    checklist_steps: [
      "Conduct Major Hazard Installation (MHI) risk assessment",
      "Submit MHI report to local authority for approval",
      "Develop on-site and off-site emergency plans",
      "Notify local authority and DoEL of MHI status",
      "Review and update MHI assessment every 3 years",
      "Conduct annual emergency drill",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // FUNERAL SERVICES
  // ──────────────────────────────────────────────────────────
  {
    code: "FUN-REG-001",
    name: "Funeral Parlour Registration",
    description:
      "Funeral parlours must comply with provincial regulations and municipal by-laws. Requires municipal health approval, compliance with National Health Act regulations for handling of human remains, and proper mortuary facilities.",
    regulator: "Provincial Department of Health / Municipality",
    category: "licence",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Funeral Services"] },
    penalty_description: "Business closure, criminal prosecution, fines",
    checklist_steps: [
      "Register with provincial Department of Health",
      "Obtain municipal health approval for mortuary facilities",
      "Ensure compliance with regulations for transportation of human remains",
      "Maintain proper cold storage facilities",
      "Comply with municipal zoning requirements",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // BEAUTY, WELLNESS & PERSONAL CARE
  // ──────────────────────────────────────────────────────────
  {
    code: "BEAUTY-HEALTH-001",
    name: "Health and Hygiene Compliance (Personal Care)",
    description:
      "Beauty salons, spas, and personal care establishments must comply with municipal health by-laws and the National Health Act regulations. Covers sterilisation standards, waste disposal, and practitioner qualifications.",
    regulator: "Municipal Environmental Health Department",
    category: "safety",
    frequency: "annual",
    applicable_conditions: { industry_in: ["Beauty, Wellness & Personal Care"] },
    penalty_description: "Business closure, fines, compliance notices",
    checklist_steps: [
      "Obtain municipal health certificate for premises",
      "Implement sterilisation and infection control protocols",
      "Ensure proper waste disposal for sharps and chemical waste",
      "Maintain records of equipment sterilisation",
      "Ensure practitioners hold relevant qualifications",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // AUTOMOTIVE
  // ──────────────────────────────────────────────────────────
  {
    code: "AUTO-NRCS-001",
    name: "Automotive Compulsory Specifications (NRCS)",
    description:
      "Motor vehicle manufacturers and importers must comply with NRCS compulsory specifications for automotive components and vehicles. Includes safety standards (VC8053), emissions standards, and component homologation.",
    regulator: "National Regulator for Compulsory Specifications (NRCS)",
    category: "regulatory",
    frequency: "per-product",
    applicable_conditions: { industry_in: ["Automotive"] },
    penalty_description: "Import prohibition, product recalls, fines, criminal prosecution",
    checklist_steps: [
      "Obtain NRCS Letter of Authority for all regulated products",
      "Comply with VC8053 vehicle safety standards",
      "Submit homologation test reports for new vehicle models",
      "Maintain compliance with emissions standards",
      "Comply with APDP (Automotive Production and Development Programme) if applicable",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // RETAIL & WHOLESALE TRADE
  // ──────────────────────────────────────────────────────────
  {
    code: "RETAIL-CPA-001",
    name: "Consumer Protection Act Compliance",
    description:
      "Retailers must comply with the Consumer Protection Act 68 of 2008. Covers product labelling, fair marketing, cooling-off periods, returns policies, and product liability. National Consumer Commission enforces compliance.",
    regulator: "National Consumer Commission (NCC)",
    category: "regulatory",
    frequency: "ongoing",
    applicable_conditions: { industry_in: ["Retail & Wholesale Trade"] },
    penalty_description: "Fines up to R1 million or 10% of annual turnover, compliance notices",
    checklist_steps: [
      "Ensure all products comply with labelling requirements",
      "Implement returns policy consistent with CPA (6-month warranty)",
      "Train staff on consumer rights under CPA",
      "Maintain complaints handling procedure",
      "Comply with direct marketing opt-out requirements",
    ],
    tier: 1,
  },

  // ──────────────────────────────────────────────────────────
  // TEXTILE, CLOTHING & FOOTWEAR
  // ──────────────────────────────────────────────────────────
  {
    code: "TEXT-LABEL-001",
    name: "Textile Labelling Compliance",
    description:
      "Textile and clothing products must comply with compulsory labelling specifications under the NRCS Act. Fibre content labelling, care labelling, and country of origin must be accurate and displayed correctly.",
    regulator: "National Regulator for Compulsory Specifications (NRCS)",
    category: "regulatory",
    frequency: "ongoing",
    applicable_conditions: { industry_in: ["Textile, Clothing & Footwear"] },
    penalty_description: "Product seizure, fines, import prohibition",
    checklist_steps: [
      "Ensure all textile products carry correct fibre content labels",
      "Comply with care labelling standards (SANS 1636)",
      "Display accurate country of origin",
      "Obtain NRCS Letter of Authority for imported textiles",
    ],
    tier: 1,
  },
];

export class ComplySaSeedIndustryRequirements1808000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const req of INDUSTRY_REQUIREMENTS) {
      await queryRunner.query(
        `INSERT INTO comply_sa_compliance_requirements
         (code, name, description, regulator, category, frequency, applicable_conditions, penalty_description, checklist_steps, tier)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           regulator = EXCLUDED.regulator,
           category = EXCLUDED.category,
           frequency = EXCLUDED.frequency,
           applicable_conditions = EXCLUDED.applicable_conditions,
           penalty_description = EXCLUDED.penalty_description,
           checklist_steps = EXCLUDED.checklist_steps,
           tier = EXCLUDED.tier`,
        [
          req.code,
          req.name,
          req.description,
          req.regulator,
          req.category,
          req.frequency,
          JSON.stringify(req.applicable_conditions),
          req.penalty_description,
          JSON.stringify(req.checklist_steps),
          req.tier,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const codes = INDUSTRY_REQUIREMENTS.map((r) => `'${r.code}'`).join(", ");
    await queryRunner.query(
      `DELETE FROM comply_sa_compliance_requirements WHERE code IN (${codes})`,
    );
  }
}
