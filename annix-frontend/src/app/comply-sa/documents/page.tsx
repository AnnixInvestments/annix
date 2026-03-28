"use client";

import {
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useComplySaDocuments,
  useComplySaRequirements,
  useDeleteDocument,
  useUploadDocument,
} from "@/app/lib/query/hooks";

type Document = {
  id: string;
  name: string;
  requirementId: string | null;
  requirementName: string | null;
  uploadedAt: string;
  size: number;
  url: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ComplianceDocument = {
  name: string;
  description: string;
  url: string;
};

type ComplianceCategory = {
  key: string;
  label: string;
  department: string;
  departmentUrl: string;
  color: string;
  documents: ComplianceDocument[];
};

const COMPLIANCE_CATEGORIES: ComplianceCategory[] = [
  {
    key: "company",
    label: "Company & Corporate Law",
    department: "the dtic / CIPC",
    departmentUrl: "https://www.cipc.co.za/",
    color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    documents: [
      {
        name: "Companies Act, 2008 (Act No. 71 of 2008) (PDF)",
        description:
          "Primary legislation governing company registration, governance, and compliance",
        url: "https://www.thedtic.gov.za/wp-content/uploads/companies_act.pdf",
      },
      {
        name: "Companies Act Notebook (Plain-English Guide) (PDF)",
        description: "Simplified guide to the Companies Act for businesses",
        url: "https://www.thedtic.gov.za/wp-content/uploads/Companies_Act_Notebook.pdf",
      },
      {
        name: "Companies Amendment Act 16 of 2024",
        description: "Latest amendments including beneficial ownership requirements",
        url: "https://www.gov.za/documents/companies-amendment-act-16-2024-16-jan-2025-0000",
      },
      {
        name: "Close Corporations Act 69 of 1984",
        description: "Governs existing close corporations (no new registrations permitted)",
        url: "https://www.gov.za/documents/close-corporations-act",
      },
      {
        name: "National Credit Act, 2005 (Act No. 34 of 2005) (PDF)",
        description: "Credit industry regulation, consumer credit rights, and lending practices",
        url: "https://www.thedtic.gov.za/wp-content/uploads/credit_act.pdf",
      },
      {
        name: "Legal Metrology Act, 2014 (Act No. 9 of 2014) (PDF)",
        description: "Trade measurement standards and metrology compliance",
        url: "https://www.thedtic.gov.za/wp-content/uploads/Legal_Metrology_Act-1.pdf",
      },
      {
        name: "Special Economic Zone (SEZ) Act, 2014 (Act No. 16 of 2014) (PDF)",
        description: "Framework for special economic zones, incentives, and qualifying criteria",
        url: "https://www.thedtic.gov.za/wp-content/uploads/SEZ_Act-1.pdf",
      },
      {
        name: "National Regulator for Compulsory Specifications Act, 2008 (PDF)",
        description: "Standards compliance, compulsory specifications, and product regulation",
        url: "https://www.thedtic.gov.za/wp-content/uploads/national_regulator_act.pdf",
      },
      {
        name: "CIPC Notices & Gazettes",
        description: "Individual company and IP notices published by CIPC",
        url: "https://www.cipc.co.za/?page_id=5045",
      },
    ],
  },
  {
    key: "ip",
    label: "Intellectual Property",
    department: "the dtic (Department of Trade, Industry and Competition)",
    departmentUrl: "https://www.thedtic.gov.za/legislation/legislation-and-business-regulation/",
    color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
    documents: [
      {
        name: "Copyright Act, 1978 (Act No. 98 of 1978) (PDF)",
        description: "Copyright protection for literary, musical, artistic, and other works",
        url: "https://www.thedtic.gov.za/wp-content/uploads/copyright_act.pdf",
      },
      {
        name: "Designs Act, 1993 (Act No. 195 of 1993) (PDF)",
        description: "Registration and protection of aesthetic and functional designs",
        url: "https://www.thedtic.gov.za/wp-content/uploads/designs_act.pdf",
      },
      {
        name: "Patents Act, 1978 (Act No. 57 of 1978) (PDF)",
        description: "Patent application, registration, and protection of inventions",
        url: "https://www.thedtic.gov.za/wp-content/uploads/patent_act.pdf",
      },
      {
        name: "Intellectual Property Laws Amendment Act, 2013 (PDF)",
        description:
          "Amendments extending IP protection to indigenous cultural expressions and knowledge",
        url: "https://www.thedtic.gov.za/wp-content/uploads/IP_amendment_act2013.pdf",
      },
      {
        name: "Intellectual Property Law Rationalisation Act, 1996 (PDF)",
        description: "Consolidation and rationalisation of IP legislation in South Africa",
        url: "https://www.thedtic.gov.za/wp-content/uploads/intellectual_property_act.pdf",
      },
    ],
  },
  {
    key: "tax",
    label: "Tax & Revenue",
    department: "SARS (South African Revenue Service)",
    departmentUrl: "https://www.sars.gov.za/businesses-and-employers/small-businesses-taxpayers/",
    color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    documents: [
      {
        name: "Income Tax Act 58 of 1962",
        description: "Primary income tax legislation for individuals, companies, and trusts",
        url: "https://www.gov.za/documents/income-tax-act-26-may-2015-1207",
      },
      {
        name: "Value-Added Tax Act 89 of 1991",
        description: "VAT registration, collection, and compliance requirements",
        url: "https://www.gov.za/documents/value-added-tax-act",
      },
      {
        name: "Tax Administration Act 28 of 2011",
        description: "Tax administration procedures, penalties, disputes, and taxpayer rights",
        url: "https://www.gov.za/documents/tax-administration-act",
      },
      {
        name: "Tax Guide for Small Businesses (2024/2025) (PDF)",
        description: "Comprehensive SARS guide covering tax obligations for small businesses",
        url: "https://www.sars.gov.za/wp-content/uploads/Ops/Guides/Legal-Pub-Guide-Gen09-Tax-Guide-for-Small-Businesses.pdf",
      },
      {
        name: "Tax Guide for Micro Businesses (Issue 3) (PDF)",
        description: "Simplified SARS guide for turnover tax and micro business compliance",
        url: "https://www.sars.gov.za/wp-content/uploads/Ops/Guides/Legal-Pub-Guide-TT01-Tax-Guide-for-Micro-Businesses.pdf",
      },
      {
        name: "SARS RSS Feeds",
        description: "Subscribe to SARS news and compliance announcement updates",
        url: "https://www.sars.gov.za/about/rss-feeds/",
      },
    ],
  },
  {
    key: "labour",
    label: "Labour & Employment",
    department: "Department of Employment and Labour",
    departmentUrl: "https://www.labour.gov.za/DocumentCenter/Pages/Acts.aspx",
    color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    documents: [
      {
        name: "Basic Conditions of Employment Act, 1997 (PDF)",
        description: "Working hours, leave, remuneration, and employment conditions",
        url: "https://www.labour.gov.za/DocumentCenter/Acts/Basic%20Conditions%20of%20Employment/Act%20-%20Basic%20Conditions%20of%20Employment.pdf",
      },
      {
        name: "Labour Relations Act, 1995 (PDF)",
        description:
          "Labour rights, collective bargaining, dispute resolution, and unfair dismissal",
        url: "https://www.labour.gov.za/DocumentCenter/Acts/Labour%20Relations/Labour%20Relations%20Act.pdf",
      },
      {
        name: "Employment Equity Act, 1998 (PDF)",
        description: "Workplace equity, affirmative action, and EE reporting requirements",
        url: "https://www.labour.gov.za/DocumentCenter/Acts/Employment%20Equity/Act%20-%20Employment%20Equity%201998.pdf",
      },
      {
        name: "Employment Services Act, 2014 (PDF)",
        description:
          "Public employment services, private employment agencies, and work-seeker registration",
        url: "https://www.labour.gov.za/DocumentCenter/Acts/Public%20Employment%20Services/Employment%20Services%20Act%202014.pdf",
      },
      {
        name: "Unemployment Insurance Contributions Act, 2002 (Amended) (PDF)",
        description: "UIF contributions, rates, and employer obligations",
        url: "https://www.labour.gov.za/DocumentCenter/Acts/UIF/Amended%20Act%20-%20Unemployment%20Insurance%20Contributions.pdf",
      },
      {
        name: "COIDA Service Booklet (PDF)",
        description: "Compensation for Occupational Injuries and Diseases Act guide and procedures",
        url: "https://www.labour.gov.za/DocumentCenter/Publications/Compensation%20for%20Occupational%20Injuries%20and%20Diseases/COIDA_SERVICE_BOOK_VERSION_23.pdf",
      },
      {
        name: "Skills Development Act 97 of 1998",
        description: "Skills levies, SETAs, and workplace skills development obligations",
        url: "https://www.gov.za/documents/skills-development-act",
      },
      {
        name: "Unemployment Insurance Act 63 of 2001",
        description: "UIF benefits, claims, and eligibility requirements",
        url: "https://www.gov.za/documents/unemployment-insurance-act",
      },
      {
        name: "Code of Good Practice on the Arrangement of Working Time (PDF)",
        description: "Guidelines on shift work, night work, overtime, and rest periods",
        url: "https://www.labour.gov.za/DocumentCenter/Code%20of%20Good%20Practice/Basic%20Condition/Code%20of%20Good%20Practice%20on%20the%20Arrangement%20of%20Working%20Time.PDF",
      },
      {
        name: "Code of Good Practice on Prevention and Elimination of Harassment (PDF)",
        description: "Workplace harassment prevention, policies, and procedures",
        url: "https://www.labour.gov.za/DocumentCenter/Code%20of%20Good%20Practice/Employment%20Equity/Code%20of%20Good%20Practice%20on%20the%20Prevention%20and%20Elimination%20of%20Harassment%20in%20the%20Workplace.pdf",
      },
    ],
  },
  {
    key: "bbbee",
    label: "B-BBEE",
    department: "the dtic / B-BBEE Commission",
    departmentUrl: "https://www.bbbeecommission.co.za/",
    color: "text-green-400 border-green-500/30 bg-green-500/10",
    documents: [
      {
        name: "B-BBEE Amendment Act, 2003 (PDF)",
        description: "Broad-Based Black Economic Empowerment Amendment Act full text",
        url: "https://www.thedtic.gov.za/wp-content/uploads/BEE-Amendment_ACT2013-1.pdf",
      },
      {
        name: "B-BBEE Act 53 of 2003 (as amended)",
        description: "B-BBEE framework and scorecard requirements",
        url: "https://www.gov.za/documents/broad-based-black-economic-empowerment-act",
      },
      {
        name: "B-BBEE Codes of Good Practice (Amended 2019)",
        description: "Generic and sector codes for B-BBEE scorecard measurement",
        url: "https://www.gov.za/documents/broad-based-black-economic-empowerment-act-issue-codes-good-practice",
      },
      {
        name: "Compliance Reporting Matrix / Template (PDF)",
        description: "B-BBEE Commission compliance reporting template for entities",
        url: "https://www.bbbeecommission.co.za/wp-content/uploads/2019/07/COMPLIANCE-REPORTING-TEMPLATE-Nov17_1.pdf",
      },
      {
        name: "FORM BBBEE 1 \u2013 Compliance Report: Government / Public Entities (PDF)",
        description:
          "Section 13G(1) compliance report for spheres of government and public entities",
        url: "https://www.bbbeecommission.co.za/wp-content/uploads/2017/06/FORM-BBBEE-1-Compliance-Report-13G1.pdf",
      },
      {
        name: "FORM BBBEE 1 \u2013 Compliance Report: JSE-listed Companies (PDF)",
        description: "Section 13G(2) compliance report for JSE-listed companies",
        url: "https://www.bbbeecommission.co.za/wp-content/uploads/2018/07/FORM-BBBEE-1-Compliance-Report-13G2-JSE-2.pdf",
      },
      {
        name: "FORM BBBEE 2 \u2013 Compliance Report: SETAs (PDF)",
        description:
          "Section 13G(3) compliance report for Sector Education and Training Authorities",
        url: "https://www.bbbeecommission.co.za/wp-content/uploads/2017/06/FORM-BBBEE-2-Compliance-Report-13G3.pdf",
      },
      {
        name: "FORM BBBEE 3 \u2013 Notice of Non-Compliance (PDF)",
        description: "Official non-compliance notification form",
        url: "https://www.bbbeecommission.co.za/wp-content/uploads/2017/06/FORM-BBBEE-3-Notice-of-Non-Compliance.pdf",
      },
      {
        name: "FORM BBBEE 4 \u2013 Notice for Rejection of Report (PDF)",
        description: "Report rejection notification form",
        url: "https://www.bbbeecommission.co.za/wp-content/uploads/2017/06/FORM-BBBEE-4-Notice-for-Rejection-of-Report.pdf",
      },
      {
        name: "FORM BBBEE 5 \u2013 Notice of Compliance (PDF)",
        description: "Official compliance confirmation notification form",
        url: "https://www.bbbeecommission.co.za/wp-content/uploads/2017/06/FORM-BBBEE-5-Notice-of-Compliance.pdf",
      },
      {
        name: "FORM BBBEE 6 \u2013 Restricted / Confidential Information (PDF)",
        description: "Application for restricted or confidential treatment of information",
        url: "https://www.bbbeecommission.co.za/wp-content/uploads/2017/06/FORM-BBBEE-6-Restricted-Confidential-Information.pdf",
      },
      {
        name: "FORM BBBEE 7 \u2013 Complaint Form (PDF)",
        description: "Lodge a B-BBEE compliance complaint with the Commission",
        url: "https://www.bbbeecommission.co.za/wp-content/uploads/2017/06/FORM-BBBEE-7-Complaint-Form.pdf",
      },
      {
        name: "FORM BBBEE 8 \u2013 Request for Additional Information (PDF)",
        description: "Commission request for additional information from reporting entities",
        url: "https://www.bbbeecommission.co.za/wp-content/uploads/2017/06/FORM-BBBEE-8-Request-for-Additional-Information.pdf",
      },
    ],
  },
  {
    key: "consumer",
    label: "Consumer & Trade",
    department: "the dtic / National Consumer Commission",
    departmentUrl: "https://www.thedtic.gov.za/legislation/legislation-and-business-regulation/",
    color: "text-orange-400 border-orange-500/30 bg-orange-500/10",
    documents: [
      {
        name: "Consumer Protection Act, 2008 (Act No. 68 of 2008) (PDF)",
        description: "Consumer rights, product liability, and fair business practices",
        url: "https://www.thedtic.gov.za/wp-content/uploads/consumer_protection.pdf",
      },
      {
        name: "Consumer Protection Brochure (PDF)",
        description: "Plain-English summary of consumer rights and business obligations",
        url: "https://www.thedtic.gov.za/wp-content/uploads/CP_Brochure.pdf",
      },
      {
        name: "Competition Act 89 of 1998",
        description: "Anti-competitive practices, mergers, and market regulation",
        url: "https://www.gov.za/documents/competition-act",
      },
    ],
  },
  {
    key: "ohs",
    label: "Health & Safety",
    department: "Department of Employment and Labour",
    departmentUrl: "https://www.labour.gov.za/DocumentCenter/Pages/Acts.aspx",
    color: "text-red-400 border-red-500/30 bg-red-500/10",
    documents: [
      {
        name: "Occupational Health and Safety Act 85 of 1993",
        description: "Workplace health and safety obligations, incident reporting, and compliance",
        url: "https://www.gov.za/documents/occupational-health-and-safety-act",
      },
      {
        name: "Compensation for Occupational Injuries and Diseases Act 130 of 1993",
        description: "COIDA registration, worker compensation, and employer levies",
        url: "https://www.gov.za/documents/compensation-occupational-injuries-and-diseases-act",
      },
      {
        name: "OHS Regulations & Codes of Practice",
        description: "Full collection of OHS Act regulations, codes, and supporting documents",
        url: "https://www.labour.gov.za/DocumentCenter/Pages/Acts.aspx",
      },
    ],
  },
  {
    key: "privacy",
    label: "Data Privacy",
    department: "Information Regulator South Africa",
    departmentUrl: "https://inforegulator.org.za/",
    color: "text-teal-400 border-teal-500/30 bg-teal-500/10",
    documents: [
      {
        name: "Protection of Personal Information Act 4 of 2013 (POPIA)",
        description: "Data protection, privacy, and processing of personal information",
        url: "https://www.gov.za/documents/protection-personal-information-act",
      },
      {
        name: "Promotion of Access to Information Act 2 of 2000 (PAIA)",
        description:
          "Access to information held by public and private bodies, PAIA manual requirements",
        url: "https://www.gov.za/documents/promotion-access-information-act",
      },
      {
        name: "Information Regulator Compliance Resources",
        description: "POPIA compliance guides, notices, and enforcement actions",
        url: "https://inforegulator.org.za/",
      },
    ],
  },
  {
    key: "financial",
    label: "Financial Regulation",
    department: "National Treasury",
    departmentUrl: "https://www.treasury.gov.za/legislation/",
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    documents: [
      {
        name: "National Treasury Acts & Regulations",
        description: "Financial legislation, PFMA, MFMA, and regulatory frameworks",
        url: "https://www.treasury.gov.za/legislation/",
      },
      {
        name: "SABS Standards & Technical Regulations",
        description: "South African Bureau of Standards compulsory specifications and standards",
        url: "https://www.sabs.co.za/",
      },
    ],
  },
];

function CategoryAccordion(props: {
  category: ComplianceCategory;
  expanded: boolean;
  onToggle: () => void;
}) {
  const category = props.category;
  const expanded = props.expanded;
  const onToggle = props.onToggle;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${category.color}`}
          >
            {category.label}
          </span>
          <span className="text-sm text-slate-400">{category.documents.length} documents</span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-700">
          <div className="px-5 py-3 bg-slate-700/20">
            <a
              href={category.departmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 transition-colors"
            >
              <Globe className="h-3 w-3" />
              {category.department}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="divide-y divide-slate-700">
            {category.documents.map((doc) => (
              <a
                key={doc.url}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 px-5 py-3 hover:bg-slate-700/30 transition-colors group"
              >
                <FileText className="h-4 w-4 text-slate-500 group-hover:text-teal-400 mt-0.5 shrink-0 transition-colors" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-white group-hover:text-teal-300 transition-colors">
                    {doc.name}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">{doc.description}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-slate-600 group-hover:text-teal-400 mt-0.5 shrink-0 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GovernmentDocumentsTab() {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  function toggleCategory(key: string) {
    setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function expandAll() {
    const allExpanded = COMPLIANCE_CATEGORIES.reduce(
      (acc, cat) => ({ ...acc, [cat.key]: true }),
      {} as Record<string, boolean>,
    );
    setExpandedCategories(allExpanded);
  }

  function collapseAll() {
    setExpandedCategories({});
  }

  const allExpanded = COMPLIANCE_CATEGORIES.every((cat) => expandedCategories[cat.key]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="https://www.gov.za/documents"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors"
          >
            <Globe className="h-4 w-4" />
            SA Gov Documents
            <ExternalLink className="h-3 w-3" />
          </a>
          <span className="text-slate-600">|</span>
          <a
            href="https://www.gov.za/documents/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors"
          >
            Latest Updates
            <ExternalLink className="h-3 w-3" />
          </a>
          <span className="text-slate-600">|</span>
          <a
            href="https://www.gpwonline.co.za/egazettes/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors"
          >
            Government Gazette
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <button
          type="button"
          onClick={allExpanded ? collapseAll : expandAll}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {COMPLIANCE_CATEGORIES.map((category) => (
        <CategoryAccordion
          key={category.key}
          category={category}
          expanded={expandedCategories[category.key] || false}
          onToggle={() => toggleCategory(category.key)}
        />
      ))}
    </div>
  );
}

const ITEMS_PER_PAGE = 20;

type DocumentsTab = "vault" | "government";

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<DocumentsTab>("vault");
  const { data: docs, isLoading: docsLoading, error: docsError } = useComplySaDocuments();
  const { data: reqs, isLoading: reqsLoading } = useComplySaRequirements();
  const { showToast } = useToast();
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const [filterReqId, setFilterReqId] = useState<string>("all");
  const [dragOver, setDragOver] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = docsLoading || reqsLoading;

  function handleUpload(file: File) {
    const reqId = filterReqId !== "all" ? filterReqId : undefined;
    uploadMutation.mutate(
      { file, requirementId: reqId },
      {
        onSuccess: () => showToast("Document uploaded successfully", "success"),
        onError: (error) => showToast(error.message || "Failed to upload document", "error"),
      },
    );
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => showToast("Document deleted", "success"),
      onError: (error) => showToast(error.message || "Failed to delete document", "error"),
    });
  }

  const docsList = Array.isArray(docs) ? docs : [];
  const reqsList = Array.isArray(reqs) ? reqs : [];
  const filteredDocs =
    filterReqId === "all"
      ? docsList
      : docsList.filter((d: Document) => d.requirementId === filterReqId);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-slate-700 rounded-xl" />
        <div className="h-8 bg-slate-700 rounded w-48" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-14 bg-slate-700 rounded-xl" />
        ))}
      </div>
    );
  }

  const error = docsError ?? uploadMutation.error ?? deleteMutation.error;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Documents</h1>

      <div className="border-b border-slate-700">
        <div className="flex -mb-px">
          <button
            type="button"
            onClick={() => setActiveTab("vault")}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === "vault"
                ? "border-teal-400 text-teal-400"
                : "border-transparent text-slate-400 hover:text-white hover:border-slate-600"
            }`}
          >
            Document Vault
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("government")}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === "government"
                ? "border-teal-400 text-teal-400"
                : "border-transparent text-slate-400 hover:text-white hover:border-slate-600"
            }`}
          >
            Government Compliance Documents
          </button>
        </div>
      </div>

      {activeTab === "government" ? (
        <GovernmentDocumentsTab />
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
              {error.message}
            </div>
          )}

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver ? "border-teal-500 bg-teal-500/5" : "border-slate-600 hover:border-slate-500"
            }`}
          >
            <Upload
              className={`h-10 w-10 mx-auto mb-3 ${dragOver ? "text-teal-400" : "text-slate-500"}`}
            />
            <p className="text-sm text-slate-400 mb-3">
              {uploadMutation.isPending
                ? "Uploading..."
                : "Drag and drop a file here, or click to browse"}
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Choose File
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
          </div>

          <div className="flex items-center gap-3">
            <Search className="h-4 w-4 text-slate-400" />
            <select
              value={filterReqId}
              onChange={(e) => {
                setFilterReqId(e.target.value);
                setVisibleCount(ITEMS_PER_PAGE);
              }}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
            >
              <option value="all">All requirements</option>
              {reqsList.map((req: { id: string; name: string }) => (
                <option key={req.id} value={req.id}>
                  {req.name}
                </option>
              ))}
            </select>
          </div>

          {filteredDocs.length > 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left">
                      <th className="px-4 py-3 font-medium text-slate-400">Name</th>
                      <th className="px-4 py-3 font-medium text-slate-400 hidden sm:table-cell">
                        Requirement
                      </th>
                      <th className="px-4 py-3 font-medium text-slate-400 hidden md:table-cell">
                        Uploaded
                      </th>
                      <th className="px-4 py-3 font-medium text-slate-400 hidden md:table-cell">
                        Size
                      </th>
                      <th className="px-4 py-3 font-medium text-slate-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredDocs.slice(0, visibleCount).map((doc: Document) => (
                      <tr key={doc.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="text-white truncate max-w-[200px]">{doc.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                          {doc.requirementName ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                          {formatDateZA(doc.uploadedAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                          {formatFileSize(doc.size)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={doc.url}
                              download
                              className="text-slate-400 hover:text-white transition-colors"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDelete(doc.id)}
                              className="text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {visibleCount < filteredDocs.length && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                  className="w-full py-3 text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors"
                >
                  Show more ({filteredDocs.length - visibleCount} remaining)
                </button>
              )}
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
              <FolderOpen className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No documents uploaded yet</p>
              <p className="text-slate-500 text-xs mt-1">
                Upload your compliance documents to keep them organized
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
