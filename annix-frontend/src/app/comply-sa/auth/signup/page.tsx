"use client";

import { keys } from "es-toolkit/compat";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  Shield,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  COMPLIANCE_AREAS,
  EMPLOYEE_COUNT_RANGES,
  INDUSTRIES,
  MASTERS_OFFICES,
  PROVINCES,
} from "@/app/comply-sa/config/onboardingConstants";
import { signup } from "@/app/comply-sa/lib/api";
import AmixLogo from "@/app/components/AmixLogo";

type EntityType = "individual" | "company" | "trust";

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  aiProcessingAccepted: boolean;
  entityType: EntityType | null;
  idNumber: string;
  usePassport: boolean;
  passportNumber: string;
  passportCountry: string;
  sarsTaxReference: string;
  dateOfBirth: string;
  phone: string;
  companyName: string;
  registrationNumber: string;
  employeeCountRange: string;
  businessAddress: string;
  province: string;
  trustName: string;
  trustRegistrationNumber: string;
  mastersOffice: string;
  trusteeCount: string;
  industrySector: string;
  otherIndustry: string;
  complianceAreas: string[];
}

const INITIAL_FORM: FormData = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  termsAccepted: false,
  privacyAccepted: false,
  aiProcessingAccepted: false,
  entityType: null,
  idNumber: "",
  usePassport: false,
  passportNumber: "",
  passportCountry: "",
  sarsTaxReference: "",
  dateOfBirth: "",
  phone: "",
  companyName: "",
  registrationNumber: "",
  employeeCountRange: "",
  businessAddress: "",
  province: "",
  trustName: "",
  trustRegistrationNumber: "",
  mastersOffice: "",
  trusteeCount: "",
  industrySector: "",
  otherIndustry: "",
  complianceAreas: [],
};

const STEP_LABELS = ["Account Basics", "Entity Details", "Industry & Focus"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function dobFromSaId(id: string): string | null {
  if (id.length < 6) {
    return null;
  }
  const yy = parseInt(id.substring(0, 2), 10);
  const mm = id.substring(2, 4);
  const dd = id.substring(4, 6);
  const century = yy >= 0 && yy <= 30 ? "20" : "19";
  return `${century}${id.substring(0, 2)}-${mm}-${dd}`;
}

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p: string) => /\d/.test(p), label: "One digit" },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "One special character" },
];

function validateSaIdNumber(id: string): string | null {
  if (!/^\d{13}$/.test(id)) {
    return "Must be exactly 13 digits";
  }

  const month = parseInt(id.substring(2, 4), 10);
  const day = parseInt(id.substring(4, 6), 10);

  if (month < 1 || month > 12) {
    return "Invalid month in ID number";
  } else if (day < 1 || day > 31) {
    return "Invalid day in ID number";
  } else {
    const digits = id.split("").map(Number);
    const reversed = [...digits].reverse();
    const total = reversed.reduce((sum, digit, i) => {
      if (i % 2 === 1) {
        const doubled = digit * 2;
        return sum + (doubled > 9 ? doubled - 9 : doubled);
      }
      return sum + digit;
    }, 0);

    if (total % 10 !== 0) {
      return "Invalid ID number (checksum failed)";
    } else {
      return null;
    }
  }
}

function fieldClass(hasError: boolean): string {
  const base =
    "w-full bg-slate-900 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-colors";
  return hasError
    ? `${base} border-red-500 focus:border-red-400`
    : `${base} border-slate-600 focus:border-teal-500`;
}

function Tooltip(props: { text: string }) {
  return (
    <span className="group relative ml-1.5 inline-flex align-middle">
      <HelpCircle className="h-3.5 w-3.5 text-slate-500 hover:text-teal-400 cursor-help" />
      <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg bg-slate-700 px-3 py-2 text-xs text-slate-200 shadow-lg pointer-events-none">
        {props.text}
      </span>
    </span>
  );
}

function ProgressBar(props: { currentStep: number }) {
  const steps = STEP_LABELS.map((label, index) => ({
    label,
    num: index + 1,
    active: index + 1 === props.currentStep,
    completed: index + 1 < props.currentStep,
  }));

  return (
    <div className="mb-8">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isActive = step.active;
          const isCompleted = step.completed;
          return (
            <Fragment key={step.label}>
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isCompleted
                      ? "bg-teal-500 text-white"
                      : isActive
                        ? "border-2 border-teal-500 bg-teal-500/10 text-teal-400"
                        : "bg-slate-700 text-slate-500"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : step.num}
                </div>
                <span
                  className={`text-[10px] mt-1 whitespace-nowrap ${
                    isActive || isCompleted ? "text-teal-400 font-medium" : "text-slate-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 mb-4 ${isCompleted ? "bg-teal-500" : "bg-slate-700"}`}
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function TermsAndConditions(props: { onScrolledToBottom: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      props.onScrolledToBottom();
    }
  }, [props.onScrolledToBottom]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-48 overflow-y-auto bg-slate-950 border border-slate-600 rounded-lg p-4 text-xs text-slate-300 leading-relaxed space-y-3 scrollbar-thin"
    >
      <h3 className="text-sm font-bold text-white">Terms and Conditions</h3>
      <p className="text-slate-400">Version 1.0 &mdash; Effective Date: 24 March 2026</p>

      <p>
        These Terms and Conditions (&quot;Terms&quot;) constitute a legally binding agreement
        between you (&quot;User&quot;, &quot;you&quot;) and Annix Investments (Pty) Ltd
        (Registration No. 2018/472188/07) (&quot;Annix&quot;, &quot;we&quot;, &quot;us&quot;), the
        owner and operator of the Comply SA platform (&quot;the Service&quot;). By creating an
        account and using the Service, you acknowledge that you have read, understood, and agree to
        be bound by these Terms in their entirety.
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">
        1. Nature of the Service &mdash; General Guidance Only
      </h4>
      <p>
        The information, tools, calculators, assessments, and guidance provided through Comply SA
        are intended for{" "}
        <strong className="text-white">general informational and educational purposes only</strong>{" "}
        and do not constitute professional legal, tax, accounting, financial, or compliance advice.
        No professional-client relationship of any kind is created by your use of this Service.
      </p>
      <p>
        In accordance with the Legal Practice Act 28 of 2014 and the Tax Administration Act 28 of
        2011, only admitted attorneys may provide legal advice and only registered tax practitioners
        may provide tax advice for remuneration. Comply SA does not provide such professional
        services.
      </p>
      <p>
        <strong className="text-white">
          You are strongly advised to consult a qualified and registered professional advisor
        </strong>{" "}
        (attorney, chartered accountant, or registered tax practitioner) before making any decisions
        or taking any action based on information obtained through this Service.
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">2. No Warranty of Accuracy</h4>
      <p>
        While Annix uses reasonable efforts to ensure the accuracy and currency of information
        provided through the Service, we make{" "}
        <strong className="text-white">
          no representations or warranties, whether express or implied
        </strong>
        , that any content is accurate, complete, reliable, current, or error-free.
      </p>
      <p>
        Tax rates, thresholds, filing deadlines, regulatory requirements, B-BBEE codes, and all
        other compliance information are subject to change by the relevant authorities without
        notice. The Service may not reflect the most recent amendments, gazettes, or rulings.
        Calculation results produced by tax calculators (VAT, PAYE, UIF, SDL, corporate tax,
        turnover tax) and B-BBEE assessment tools are{" "}
        <strong className="text-white">estimates and approximations only</strong> and must not be
        relied upon for filing, reporting, or compliance purposes without independent verification
        by a qualified professional.
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">
        3. AI-Generated Content Disclaimer
      </h4>
      <p>
        The AI-powered compliance Q&A feature utilises artificial intelligence technology, including
        Google Gemini, to generate responses. AI-generated responses are produced algorithmically
        and{" "}
        <strong className="text-white">
          may contain inaccuracies, omissions, outdated information, or misleading content
        </strong>
        . These responses do not represent the professional opinion of any qualified legal
        practitioner, tax advisor, or accountant, and Annix does not guarantee the accuracy,
        completeness, or suitability of any AI-generated content.
      </p>
      <p>
        You must independently verify all AI-generated information before relying on it for any
        compliance, tax, or legal purpose. User queries submitted to the AI feature are processed by
        Google (Gemini) and may be subject to Google&apos;s privacy policy and data processing
        terms.
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">4. Limitation of Liability</h4>
      <p>
        <strong className="text-white">Your use of Comply SA is entirely at your own risk.</strong>{" "}
        To the maximum extent permitted by applicable South African law:
      </p>
      <p>
        (a) The total aggregate liability of Annix arising out of or in connection with your use of
        the Service, whether in contract, delict (tort), strict liability, or otherwise, shall not
        exceed the greater of (i) the total fees paid by you for the Service during the twelve (12)
        month period immediately preceding the event giving rise to such liability, or (ii) R500
        (five hundred Rand).
      </p>
      <p>
        (b) In no event shall Annix, its directors, officers, employees, or agents be liable for any
        indirect, incidental, special, consequential, or punitive damages, including but not limited
        to: loss of profits, data, business opportunity, or goodwill; penalties, interest, fines, or
        additional assessments imposed by SARS or any other regulatory authority; costs of procuring
        substitute services; or any damages arising from reliance on information, calculations,
        assessments, or guidance provided through the Service &mdash; even if Annix has been advised
        of the possibility of such damages.
      </p>
      <p>
        (c) Nothing in these Terms excludes or limits liability for fraud, intentional misconduct,
        or any liability that cannot be excluded or limited under applicable South African law,
        including the Consumer Protection Act 68 of 2008 where applicable.
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">5. Indemnification</h4>
      <p>
        You agree to indemnify, defend, and hold harmless Annix, its directors, officers, employees,
        and agents from and against any and all claims, demands, losses, liabilities, costs, and
        expenses (including reasonable attorney fees) arising out of or in connection with: (a) your
        use of the Service in a manner inconsistent with these Terms; (b) your reliance on
        information provided through the Service without obtaining independent professional advice;
        (c) any inaccuracy in information you provide to the Service; (d) your violation of any
        applicable law or regulation; or (e) any third-party claim arising from your use of the
        Service.
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">
        6. Privacy and Data Protection (POPIA)
      </h4>
      <p>
        Annix processes your personal information in accordance with the Protection of Personal
        Information Act 4 of 2013 (&quot;POPIA&quot;). By using the Service, you consent to the
        collection and processing of personal information as described herein and in our Privacy
        Policy.
      </p>
      <p>
        We collect and process: user identity information (name, email); company information
        (registration number, tax numbers, financial data); employee aggregate data (for payroll tax
        calculations); B-BBEE ownership and demographic data; and data accessed via third-party
        integrations (e.g. Sage Accounting) that you authorise.
      </p>
      <p>
        B-BBEE assessments involve processing data relating to race, which constitutes special
        personal information under POPIA Sections 26&ndash;33. By using the B-BBEE assessment
        feature, you provide explicit consent for processing this data solely for the purpose of
        B-BBEE level determination and compliance guidance.
      </p>
      <p>
        Your data may be processed by third-party service providers (cloud hosting, AI providers,
        Sage Accounting API) under appropriate contractual safeguards. Data may be stored on servers
        located outside South Africa, subject to adequate levels of data protection.
      </p>
      <p>
        You have the right to access, correct, or request deletion of your personal information,
        object to processing, and lodge a complaint with the Information Regulator of South Africa.
        Contact our Information Officer at{" "}
        <span className="text-teal-400">privacy@annix.co.za</span> to exercise these rights.
      </p>
      <p>
        Data retention: tax-related data is retained for 5 years (Tax Administration Act); company
        records for 7 years (Companies Act 71 of 2008); account data for the duration of your
        account plus 1 year.
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">
        7. Consumer Protection Act Compliance
      </h4>
      <p>
        Where the Consumer Protection Act 68 of 2008 (&quot;CPA&quot;) applies to you as a consumer,
        nothing in these Terms is intended to limit or exclude any rights you may have under the
        CPA.
      </p>
      <p>
        In accordance with Section 44 of the Electronic Communications and Transactions Act 25 of
        2002 (&quot;ECTA&quot;), you may cancel your subscription within 7 (seven) working days of
        creating your account without reason or penalty by contacting us at{" "}
        <span className="text-teal-400">support@annix.co.za</span>. Where direct marketing applies,
        Section 16 of the CPA provides a further 5 (five) business day cooling-off period from the
        date of the relevant transaction.
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">8. Subscription and Payment</h4>
      <p>
        Comply SA offers tiered subscription plans. Free accounts are limited to tracking 5
        compliance requirements. Paid subscriptions are billed monthly and may be cancelled at any
        time with effect from the end of the current billing period. Annix reserves the right to
        modify pricing with 20 business days&apos; written notice. Continued use of the Service
        after a price change constitutes acceptance of the new pricing.
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">9. Third-Party Integrations</h4>
      <p>
        The Service may integrate with third-party services (including Sage Accounting). Annix is
        not responsible for the availability, accuracy, or functionality of third-party services.
        Your use of third-party integrations is subject to the respective third party&apos;s terms
        and conditions. You authorise Annix to access data from connected third-party services
        solely for the purposes of providing the Service.
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">10. Intellectual Property</h4>
      <p>
        All intellectual property rights in the Service, including software, content, design, and
        trademarks, belong to Annix Investments (Pty) Ltd. You are granted a limited, non-exclusive,
        non-transferable, revocable licence to use the Service for its intended purpose. You retain
        ownership of all data you upload or input into the Service.
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">11. Service Availability</h4>
      <p>
        Annix does not guarantee uninterrupted or error-free operation of the Service. The Service
        may be temporarily unavailable due to maintenance, updates, or circumstances beyond our
        reasonable control, including but not limited to load-shedding, internet infrastructure
        disruptions, or force majeure events. Annix shall not be liable for any loss arising from
        such unavailability.
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">12. Amendments</h4>
      <p>
        Annix reserves the right to amend these Terms at any time. Material changes will be
        communicated via email or in-app notification with at least 20 business days&apos; notice.
        Your continued use of the Service after the effective date of any amendment constitutes
        acceptance of the amended Terms. If you do not agree with any amendment, you may terminate
        your account before the amendment takes effect.
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">13. Dispute Resolution</h4>
      <p>
        These Terms shall be governed by and construed in accordance with the laws of the Republic
        of South Africa. The parties agree to first attempt to resolve any dispute arising from or
        in connection with these Terms through good-faith negotiation. If the dispute is not
        resolved within 20 business days, either party may refer it to mediation administered by the
        Arbitration Foundation of Southern Africa (AFSA). If mediation fails, the dispute may be
        referred to the High Court of South Africa, Gauteng Division, Pretoria.
      </p>
      <p>
        Nothing in this clause limits your right as a consumer under the Consumer Protection Act 68
        of 2008 to refer a dispute to a consumer court, the National Consumer Commission, or an
        applicable industry ombud (CPA Section 70).
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">14. Severability</h4>
      <p>
        If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court
        of competent jurisdiction, such invalidity shall not affect the remaining provisions, which
        shall continue in full force and effect.
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">15. ECTA Disclosure (Section 43)</h4>
      <p>
        Full name: Annix Investments (Pty) Ltd | Legal status: Private company (Pty Ltd) |
        Registration: 2018/472188/07 | Physical address: [TO BE CONFIRMED] | Telephone: [TO BE
        CONFIRMED] | Website: <span className="text-teal-400">comply-sa.annix.co.za</span> | Email:
        [TO BE CONFIRMED] | Information Officer: [TO BE CONFIRMED]
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">16. Entire Agreement</h4>
      <p>
        These Terms, together with our Privacy Policy, constitute the entire agreement between you
        and Annix with respect to the use of the Service, and supersede all prior agreements,
        representations, and understandings.
      </p>

      <div className="pt-2 border-t border-slate-700 mt-3">
        <p className="text-slate-500 text-[11px]">
          Scroll to the bottom to proceed. By checking the box below you confirm that you have read,
          understood, and agree to these Terms and Conditions.
        </p>
      </div>
    </div>
  );
}

function WhyInfoModal(props: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full relative">
        <button
          type="button"
          onClick={props.onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold text-white mb-3">Why Do We Need This Information?</h3>
        <div className="text-sm text-slate-300 space-y-3">
          <p>
            Under the Protection of Personal Information Act (POPIA), we are committed to
            transparency about how your data is used.
          </p>
          <p>We collect entity details, industry, and compliance preferences to:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>
              Generate your personalised compliance dashboard with only the rules and deadlines that
              apply to you
            </li>
            <li>Calculate accurate tax obligations, B-BBEE levels, and regulatory requirements</li>
            <li>Send timely reminders before deadlines approach</li>
            <li>Surface industry-specific licensing and regulatory updates</li>
          </ul>
          <p className="text-slate-500 text-xs">
            Your data is encrypted in transit and at rest and is never shared with third parties for
            marketing. Contact <span className="text-teal-400">privacy@annix.co.za</span> to
            exercise your POPIA rights.
          </p>
        </div>
      </div>
    </div>
  );
}

function SuccessModal(props: {
  entityType: EntityType | null;
  industry: string;
  onContinue: () => void;
}) {
  const entityLabel =
    props.entityType === "individual"
      ? "Individual profile"
      : props.entityType === "trust"
        ? "Trust"
        : "Company";
  const propsIndustry = props.industry;
  const industryLabel = propsIndustry || "selected";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-teal-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Welcome to Annix Comply SA!</h2>
        <p className="text-slate-300 text-sm mb-4">
          Your personalised South African compliance dashboard is ready. Based on your{" "}
          <strong className="text-teal-400">{entityLabel}</strong> in the{" "}
          <strong className="text-teal-400">{industryLabel}</strong> sector, here are your top 3
          urgent actions:
        </p>
        <div className="text-left bg-slate-900 rounded-lg p-4 mb-6 space-y-3">
          {[
            "Consider linking your SARS eFiling profile for automated deadline tracking",
            "Upload your B-BBEE certificate or sworn affidavit if available",
            "Review your personalised POPIA compliance checklist",
          ].map((action, i) => (
            <div key={action} className="flex items-start gap-3">
              <span className="bg-teal-500/20 text-teal-400 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="text-sm text-slate-300">{action}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={props.onContinue}
          className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          Continue to Dashboard
        </button>
      </div>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  const handleScrolledToBottom = useCallback(() => {
    setHasScrolledTerms(true);
  }, []);

  const updateField = useCallback((field: keyof FormData, value: FormData[keyof FormData]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
    setError(null);
  }, []);

  function handleEntityTypeChange(type: EntityType) {
    setForm((prev) => ({
      ...prev,
      entityType: type,
      complianceAreas:
        type === "trust" && !prev.complianceAreas.includes("Trust / Fiduciary Duties")
          ? [...prev.complianceAreas, "Trust / Fiduciary Duties"]
          : prev.complianceAreas,
    }));
    setFieldErrors({});
  }

  function toggleComplianceArea(area: string) {
    setForm((prev) => ({
      ...prev,
      complianceAreas: prev.complianceAreas.includes(area)
        ? prev.complianceAreas.filter((a) => a !== area)
        : [...prev.complianceAreas, area],
    }));
  }

  function validateStep1(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) {
      errs.name = "Full name is required";
    }
    if (!form.email.trim()) {
      errs.email = "Email is required";
    } else if (!EMAIL_REGEX.test(form.email)) {
      errs.email = "Please enter a valid email address";
    }
    if (!form.password) {
      errs.password = "Password is required";
    } else {
      const failedRules = PASSWORD_RULES.filter((rule) => !rule.test(form.password));
      if (failedRules.length > 0) {
        errs.password = `Missing: ${failedRules.map((r) => r.label.toLowerCase()).join(", ")}`;
      }
    }
    if (!form.confirmPassword) {
      errs.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }
    if (!form.termsAccepted) {
      errs.termsAccepted = "You must accept the Terms and Conditions";
    }
    if (!form.privacyAccepted) {
      errs.privacyAccepted = "You must consent to data processing";
    }
    if (!form.aiProcessingAccepted) {
      errs.aiProcessingAccepted = "You must acknowledge AI processing";
    }
    return errs;
  }

  function validateStep2(): Record<string, string> {
    const errs: Record<string, string> = {};

    if (form.entityType === null) {
      errs.entityType = "Please select an entity type";
    } else if (form.entityType === "individual") {
      if (!form.usePassport) {
        if (!form.idNumber.trim()) {
          errs.idNumber = "SA ID Number is required";
        } else {
          const idError = validateSaIdNumber(form.idNumber);
          if (idError !== null) {
            errs.idNumber = idError;
          }
        }
      } else {
        if (!form.passportNumber.trim()) {
          errs.passportNumber = "Passport number is required";
        }
        if (!form.passportCountry.trim()) {
          errs.passportCountry = "Country is required";
        }
      }
      if (form.usePassport && !form.dateOfBirth) {
        errs.dateOfBirth = "Date of birth is required";
      }
      if (!form.phone.trim()) {
        errs.phone = "Mobile phone number is required";
      }
    } else if (form.entityType === "company") {
      if (!form.companyName.trim()) {
        errs.companyName = "Company name is required";
      }
      if (!form.employeeCountRange) {
        errs.employeeCountRange = "Number of employees is required";
      }
    } else if (form.entityType === "trust") {
      if (!form.trustName.trim()) {
        errs.trustName = "Trust name is required";
      }
      if (!form.trustRegistrationNumber.trim()) {
        errs.trustRegistrationNumber = "Trust registration number is required";
      }
      if (!form.mastersOffice) {
        errs.mastersOffice = "Master\u2019s Office is required";
      }
      if (!form.trusteeCount.trim()) {
        errs.trusteeCount = "Number of trustees is required";
      } else if (parseInt(form.trusteeCount, 10) < 1) {
        errs.trusteeCount = "Must have at least 1 trustee";
      }
    }

    return errs;
  }

  function validateStep3(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!form.industrySector) {
      errs.industrySector = "Please select an industry";
    } else if (form.industrySector === "Other" && !form.otherIndustry.trim()) {
      errs.otherIndustry = "Please specify your industry";
    }
    if (form.complianceAreas.length === 0) {
      errs.complianceAreas = "Please select at least one compliance area";
    }
    return errs;
  }

  function handleNext() {
    const errs = currentStep === 1 ? validateStep1() : validateStep2();
    if (keys(errs).length > 0) {
      setFieldErrors(errs);
    } else {
      setFieldErrors({});
      setCurrentStep((s) => s + 1);
    }
  }

  function handleBack() {
    setFieldErrors({});
    setCurrentStep((s) => s - 1);
  }

  function buildPayload(profileComplete: boolean) {
    const industry = form.industrySector === "Other" ? form.otherIndustry : form.industrySector;
    const companyName = form.companyName;
    const registrationNumber = form.registrationNumber;
    const idNumber = form.idNumber;
    const passportNumber = form.passportNumber;
    const passportCountry = form.passportCountry;
    const sarsTaxReference = form.sarsTaxReference;
    const dateOfBirth = form.dateOfBirth;
    const phone = form.phone;
    const trustName = form.trustName;
    const trustRegistrationNumber = form.trustRegistrationNumber;
    const mastersOffice = form.mastersOffice;
    const trusteeCount = form.trusteeCount;
    const employeeCountRange = form.employeeCountRange;
    const businessAddress = form.businessAddress;
    const province = form.province;
    return {
      name: form.name,
      email: form.email,
      password: form.password,
      termsAccepted: form.termsAccepted,
      entityType: form.entityType,
      companyName: companyName || null,
      registrationNumber: registrationNumber || null,
      idNumber: !form.usePassport ? idNumber || null : null,
      passportNumber: form.usePassport ? passportNumber || null : null,
      passportCountry: form.usePassport ? passportCountry || null : null,
      sarsTaxReference: sarsTaxReference || null,
      dateOfBirth: !form.usePassport ? dobFromSaId(form.idNumber) : dateOfBirth || null,
      phone: phone || null,
      trustName: trustName || null,
      trustRegistrationNumber: trustRegistrationNumber || null,
      mastersOffice: mastersOffice || null,
      trusteeCount: trusteeCount ? parseInt(trusteeCount, 10) : null,
      employeeCountRange: employeeCountRange || null,
      businessAddress: businessAddress || null,
      province: province || null,
      industrySector: industry || null,
      complianceAreas: form.complianceAreas.length > 0 ? form.complianceAreas : null,
      profileComplete,
    };
  }

  async function handleSubmit() {
    const errs = validateStep3();
    if (keys(errs).length > 0) {
      setFieldErrors(errs);
    } else {
      setError(null);
      setLoading(true);
      try {
        await signup(buildPayload(true));
        setShowSuccessModal(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Signup failed");
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleSaveAndContinue() {
    const step1Errs = validateStep1();
    if (keys(step1Errs).length > 0) {
      setCurrentStep(1);
      setFieldErrors(step1Errs);
    } else {
      setError(null);
      setLoading(true);
      try {
        await signup(buildPayload(false));
        router.push("/comply-sa/onboarding");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Signup failed");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl" ref={formRef}>
        <div className="text-center mb-6">
          <Link href="/comply-sa" className="inline-flex items-center gap-2 mb-4">
            <AmixLogo size="sm" showText useSignatureFont />
          </Link>
          <h1 className="text-2xl font-bold text-white">
            Start Your South African Compliance Journey
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
            Tell us who you are so we can show you the exact rules, deadlines, and checklists that
            apply to your company, trust, or personal situation.
          </p>
        </div>

        <ProgressBar currentStep={currentStep} />

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 sm:p-8">
          {error && (
            <div
              role="alert"
              className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm"
            >
              {error}
            </div>
          )}

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (currentStep < 3) {
                handleNext();
              } else {
                handleSubmit();
              }
            }}
          >
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    aria-invalid={!!fieldErrors.name}
                    className={fieldClass(!!fieldErrors.name)}
                    placeholder="John Smith"
                  />
                  {fieldErrors.name && (
                    <p className="text-red-400 text-xs mt-1">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-300 mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    aria-invalid={!!fieldErrors.email}
                    className={fieldClass(!!fieldErrors.email)}
                    placeholder="you@example.com"
                  />
                  {fieldErrors.email && (
                    <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-300 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      aria-invalid={!!fieldErrors.password}
                      className={`${fieldClass(!!fieldErrors.password)} pr-11`}
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4.5 w-4.5" />
                      ) : (
                        <Eye className="h-4.5 w-4.5" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>
                  )}
                  {form.password.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                      {PASSWORD_RULES.map((rule) => (
                        <span
                          key={rule.label}
                          className={`text-[10px] ${rule.test(form.password) ? "text-teal-400" : "text-slate-500"}`}
                        >
                          {rule.test(form.password) ? "\u2713" : "\u2022"} {rule.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-slate-300 mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(e) => updateField("confirmPassword", e.target.value)}
                      aria-invalid={!!fieldErrors.confirmPassword}
                      className={`${fieldClass(!!fieldErrors.confirmPassword)} pr-11`}
                      placeholder="Re-enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4.5 w-4.5" />
                      ) : (
                        <Eye className="h-4.5 w-4.5" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Terms and Conditions
                  </label>
                  <TermsAndConditions onScrolledToBottom={handleScrolledToBottom} />
                  {!hasScrolledTerms && (
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Please scroll through the full Terms and Conditions above to continue.
                    </p>
                  )}

                  <div
                    className={`space-y-2.5 mt-3 ${!hasScrolledTerms ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.termsAccepted}
                        onChange={(e) => updateField("termsAccepted", e.target.checked)}
                        disabled={!hasScrolledTerms}
                        className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500 focus:ring-offset-0 accent-teal-500"
                      />
                      <span className="text-xs text-slate-300 leading-relaxed">
                        I agree to the{" "}
                        <Link
                          href="/comply-sa/privacy"
                          target="_blank"
                          className="text-teal-400 underline hover:text-teal-300"
                        >
                          Terms of Service and Privacy Policy
                        </Link>
                      </span>
                    </label>
                    {fieldErrors.termsAccepted && (
                      <p className="text-red-400 text-xs ml-6">{fieldErrors.termsAccepted}</p>
                    )}

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.privacyAccepted}
                        onChange={(e) => updateField("privacyAccepted", e.target.checked)}
                        disabled={!hasScrolledTerms}
                        className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500 focus:ring-offset-0 accent-teal-500"
                      />
                      <span className="text-xs text-slate-300 leading-relaxed">
                        I consent to the processing of personal and special personal information
                        (including B-BBEE demographic data) as described in the Privacy Policy, in
                        accordance with POPIA Sections 11 and 27
                      </span>
                    </label>
                    {fieldErrors.privacyAccepted && (
                      <p className="text-red-400 text-xs ml-6">{fieldErrors.privacyAccepted}</p>
                    )}

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.aiProcessingAccepted}
                        onChange={(e) => updateField("aiProcessingAccepted", e.target.checked)}
                        disabled={!hasScrolledTerms}
                        className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500 focus:ring-offset-0 accent-teal-500"
                      />
                      <span className="text-xs text-slate-300 leading-relaxed">
                        I acknowledge that compliance Q&A queries may be processed by third-party AI
                        providers (including Google Gemini) and that AI-generated responses are not
                        professional advice
                      </span>
                    </label>
                    {fieldErrors.aiProcessingAccepted && (
                      <p className="text-red-400 text-xs ml-6">
                        {fieldErrors.aiProcessingAccepted}
                      </p>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2">
                    We process your information in line with the Protection of Personal Information
                    Act (POPIA) to deliver accurate compliance guidance only.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">Select Your Entity Type</h2>
                  <p className="text-sm text-slate-400 mb-4">
                    Choose the type that best describes your registration.
                  </p>
                  {fieldErrors.entityType && (
                    <p className="text-red-400 text-xs mb-3">{fieldErrors.entityType}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(
                      [
                        {
                          type: "individual" as EntityType,
                          icon: User,
                          label: "Individual",
                        },
                        {
                          type: "company" as EntityType,
                          icon: Building2,
                          label: "Company / CC / Pty Ltd",
                        },
                        { type: "trust" as EntityType, icon: Shield, label: "Trust" },
                      ] as const
                    ).map((opt) => {
                      const Icon = opt.icon;
                      const selected = form.entityType === opt.type;
                      return (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => handleEntityTypeChange(opt.type)}
                          className={`p-4 border rounded-xl text-center transition-all ${
                            selected
                              ? "border-teal-500 bg-teal-500/10 ring-1 ring-teal-500/30"
                              : "border-slate-600 bg-slate-900 hover:border-slate-500"
                          }`}
                        >
                          <Icon
                            className={`h-8 w-8 mx-auto mb-2 ${selected ? "text-teal-400" : "text-slate-400"}`}
                          />
                          <span
                            className={`text-sm font-medium ${selected ? "text-teal-400" : "text-slate-300"}`}
                          >
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {form.entityType === "individual" && (
                  <div className="space-y-4 pt-2 border-t border-slate-700">
                    <div>
                      <div className="flex items-center gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="idType"
                            checked={!form.usePassport}
                            onChange={() => updateField("usePassport", false)}
                            className="accent-teal-500"
                          />
                          <span className="text-sm text-slate-300">SA ID Number</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="idType"
                            checked={form.usePassport}
                            onChange={() => updateField("usePassport", true)}
                            className="accent-teal-500"
                          />
                          <span className="text-sm text-slate-300">Passport Number</span>
                        </label>
                      </div>

                      {!form.usePassport ? (
                        <div>
                          <label
                            htmlFor="idNumber"
                            className="block text-sm font-medium text-slate-300 mb-1.5"
                          >
                            South African ID Number
                            <Tooltip text="Used to pre-fill tax and labour compliance requirements" />
                          </label>
                          <input
                            id="idNumber"
                            type="text"
                            maxLength={13}
                            value={form.idNumber}
                            onChange={(e) =>
                              updateField("idNumber", e.target.value.replace(/\D/g, ""))
                            }
                            aria-invalid={!!fieldErrors.idNumber}
                            className={fieldClass(!!fieldErrors.idNumber)}
                            placeholder="YYMMDD NNNNNNN"
                          />
                          {fieldErrors.idNumber && (
                            <p className="text-red-400 text-xs mt-1">{fieldErrors.idNumber}</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label
                              htmlFor="passportNumber"
                              className="block text-sm font-medium text-slate-300 mb-1.5"
                            >
                              Passport Number
                            </label>
                            <input
                              id="passportNumber"
                              type="text"
                              value={form.passportNumber}
                              onChange={(e) => updateField("passportNumber", e.target.value)}
                              aria-invalid={!!fieldErrors.passportNumber}
                              className={fieldClass(!!fieldErrors.passportNumber)}
                              placeholder="A12345678"
                            />
                            {fieldErrors.passportNumber && (
                              <p className="text-red-400 text-xs mt-1">
                                {fieldErrors.passportNumber}
                              </p>
                            )}
                          </div>
                          <div>
                            <label
                              htmlFor="passportCountry"
                              className="block text-sm font-medium text-slate-300 mb-1.5"
                            >
                              Country of Issue
                            </label>
                            <input
                              id="passportCountry"
                              type="text"
                              value={form.passportCountry}
                              onChange={(e) => updateField("passportCountry", e.target.value)}
                              aria-invalid={!!fieldErrors.passportCountry}
                              className={fieldClass(!!fieldErrors.passportCountry)}
                              placeholder="South Africa"
                            />
                            {fieldErrors.passportCountry && (
                              <p className="text-red-400 text-xs mt-1">
                                {fieldErrors.passportCountry}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="sarsTaxReference"
                        className="block text-sm font-medium text-slate-300 mb-1.5"
                      >
                        SARS Tax Reference Number{" "}
                        <span className="text-slate-500">(optional but recommended)</span>
                      </label>
                      <input
                        id="sarsTaxReference"
                        type="text"
                        value={form.sarsTaxReference}
                        onChange={(e) => updateField("sarsTaxReference", e.target.value)}
                        className={fieldClass(false)}
                        placeholder="1234567890"
                      />
                    </div>

                    {!form.usePassport && form.idNumber.length >= 6 && (
                      <p className="text-xs text-slate-400">
                        Date of birth (derived from ID):{" "}
                        <span className="text-teal-400 font-medium">
                          {dobFromSaId(form.idNumber) || "\u2014"}
                        </span>
                      </p>
                    )}

                    {form.usePassport && (
                      <div>
                        <label
                          htmlFor="dateOfBirth"
                          className="block text-sm font-medium text-slate-300 mb-1.5"
                        >
                          Date of Birth
                        </label>
                        <input
                          id="dateOfBirth"
                          type="date"
                          value={form.dateOfBirth}
                          onChange={(e) => updateField("dateOfBirth", e.target.value)}
                          aria-invalid={!!fieldErrors.dateOfBirth}
                          className={fieldClass(!!fieldErrors.dateOfBirth)}
                        />
                        {fieldErrors.dateOfBirth && (
                          <p className="text-red-400 text-xs mt-1">{fieldErrors.dateOfBirth}</p>
                        )}
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-slate-300 mb-1.5"
                      >
                        Mobile Phone Number
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        aria-invalid={!!fieldErrors.phone}
                        className={fieldClass(!!fieldErrors.phone)}
                        placeholder="082 123 4567"
                      />
                      {fieldErrors.phone && (
                        <p className="text-red-400 text-xs mt-1">{fieldErrors.phone}</p>
                      )}
                    </div>
                  </div>
                )}

                {form.entityType === "company" && (
                  <div className="space-y-4 pt-2 border-t border-slate-700">
                    <div>
                      <label
                        htmlFor="companyName"
                        className="block text-sm font-medium text-slate-300 mb-1.5"
                      >
                        Legal Company Name
                      </label>
                      <input
                        id="companyName"
                        type="text"
                        value={form.companyName}
                        onChange={(e) => updateField("companyName", e.target.value)}
                        aria-invalid={!!fieldErrors.companyName}
                        className={fieldClass(!!fieldErrors.companyName)}
                        placeholder="Acme Pty Ltd"
                      />
                      {fieldErrors.companyName && (
                        <p className="text-red-400 text-xs mt-1">{fieldErrors.companyName}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="registrationNumber"
                        className="block text-sm font-medium text-slate-300 mb-1.5"
                      >
                        CIPC Registration Number <span className="text-slate-500">(optional)</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="registrationNumber"
                          type="text"
                          value={form.registrationNumber}
                          onChange={(e) => updateField("registrationNumber", e.target.value)}
                          className={`${fieldClass(false)} flex-1`}
                          placeholder="2024/123456/07"
                        />
                        <button
                          type="button"
                          disabled
                          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-500 cursor-not-allowed whitespace-nowrap opacity-60"
                        >
                          Verify &middot; Coming soon
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Format: YYYY/NNNNNN/NN</p>
                    </div>

                    <div>
                      <label
                        htmlFor="employeeCountRange"
                        className="block text-sm font-medium text-slate-300 mb-1.5"
                      >
                        Number of Employees
                      </label>
                      <select
                        id="employeeCountRange"
                        value={form.employeeCountRange}
                        onChange={(e) => updateField("employeeCountRange", e.target.value)}
                        aria-invalid={!!fieldErrors.employeeCountRange}
                        className={fieldClass(!!fieldErrors.employeeCountRange)}
                      >
                        <option value="">Select range...</option>
                        {EMPLOYEE_COUNT_RANGES.map((range) => (
                          <option key={range.value} value={range.value}>
                            {range.label}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.employeeCountRange && (
                        <p className="text-red-400 text-xs mt-1">
                          {fieldErrors.employeeCountRange}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="businessAddress"
                        className="block text-sm font-medium text-slate-300 mb-1.5"
                      >
                        Registered Business Address{" "}
                        <span className="text-slate-500">(optional)</span>
                      </label>
                      <input
                        id="businessAddress"
                        type="text"
                        value={form.businessAddress}
                        onChange={(e) => updateField("businessAddress", e.target.value)}
                        className={fieldClass(false)}
                        placeholder="123 Main Street, Sandton"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="province"
                        className="block text-sm font-medium text-slate-300 mb-1.5"
                      >
                        Province <span className="text-slate-500">(optional)</span>
                      </label>
                      <select
                        id="province"
                        value={form.province}
                        onChange={(e) => updateField("province", e.target.value)}
                        className={fieldClass(false)}
                      >
                        <option value="">Select province...</option>
                        {PROVINCES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {form.entityType === "trust" && (
                  <div className="space-y-4 pt-2 border-t border-slate-700">
                    <div>
                      <label
                        htmlFor="trustName"
                        className="block text-sm font-medium text-slate-300 mb-1.5"
                      >
                        Trust Name
                      </label>
                      <input
                        id="trustName"
                        type="text"
                        value={form.trustName}
                        onChange={(e) => updateField("trustName", e.target.value)}
                        aria-invalid={!!fieldErrors.trustName}
                        className={fieldClass(!!fieldErrors.trustName)}
                        placeholder="Smith Family Trust"
                      />
                      {fieldErrors.trustName && (
                        <p className="text-red-400 text-xs mt-1">{fieldErrors.trustName}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="trustRegistrationNumber"
                        className="block text-sm font-medium text-slate-300 mb-1.5"
                      >
                        Trust Registration Number
                        <Tooltip text="This lets us surface trust-specific fiduciary duties, tax filings, and deed requirements" />
                      </label>
                      <input
                        id="trustRegistrationNumber"
                        type="text"
                        value={form.trustRegistrationNumber}
                        onChange={(e) => updateField("trustRegistrationNumber", e.target.value)}
                        aria-invalid={!!fieldErrors.trustRegistrationNumber}
                        className={fieldClass(!!fieldErrors.trustRegistrationNumber)}
                        placeholder="IT 1234/2024"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Format: IT NNNN/YYYY or NT NNNN/YYYY
                      </p>
                      {fieldErrors.trustRegistrationNumber && (
                        <p className="text-red-400 text-xs mt-1">
                          {fieldErrors.trustRegistrationNumber}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="mastersOffice"
                        className="block text-sm font-medium text-slate-300 mb-1.5"
                      >
                        Master&apos;s Office Where Registered
                      </label>
                      <select
                        id="mastersOffice"
                        value={form.mastersOffice}
                        onChange={(e) => updateField("mastersOffice", e.target.value)}
                        aria-invalid={!!fieldErrors.mastersOffice}
                        className={fieldClass(!!fieldErrors.mastersOffice)}
                      >
                        <option value="">Select office...</option>
                        {MASTERS_OFFICES.map((office) => (
                          <option key={office} value={office}>
                            {office}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.mastersOffice && (
                        <p className="text-red-400 text-xs mt-1">{fieldErrors.mastersOffice}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="trusteeCount"
                        className="block text-sm font-medium text-slate-300 mb-1.5"
                      >
                        Number of Trustees
                      </label>
                      <input
                        id="trusteeCount"
                        type="number"
                        min={1}
                        value={form.trusteeCount}
                        onChange={(e) => updateField("trusteeCount", e.target.value)}
                        aria-invalid={!!fieldErrors.trusteeCount}
                        className={fieldClass(!!fieldErrors.trusteeCount)}
                        placeholder="3"
                      />
                      {fieldErrors.trusteeCount && (
                        <p className="text-red-400 text-xs mt-1">{fieldErrors.trusteeCount}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="industrySector"
                    className="block text-sm font-medium text-slate-300 mb-1.5"
                  >
                    Industry Sector
                  </label>
                  <select
                    id="industrySector"
                    value={form.industrySector}
                    onChange={(e) => updateField("industrySector", e.target.value)}
                    aria-invalid={!!fieldErrors.industrySector}
                    className={fieldClass(!!fieldErrors.industrySector)}
                  >
                    <option value="">Select your industry...</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                    <option value="Other">Other (please specify)</option>
                  </select>
                  {fieldErrors.industrySector && (
                    <p className="text-red-400 text-xs mt-1">{fieldErrors.industrySector}</p>
                  )}
                </div>

                {form.industrySector === "Other" && (
                  <div>
                    <label
                      htmlFor="otherIndustry"
                      className="block text-sm font-medium text-slate-300 mb-1.5"
                    >
                      Specify Your Industry
                    </label>
                    <input
                      id="otherIndustry"
                      type="text"
                      value={form.otherIndustry}
                      onChange={(e) => updateField("otherIndustry", e.target.value)}
                      aria-invalid={!!fieldErrors.otherIndustry}
                      className={fieldClass(!!fieldErrors.otherIndustry)}
                      placeholder="e.g. Renewable Energy"
                    />
                    {fieldErrors.otherIndustry && (
                      <p className="text-red-400 text-xs mt-1">{fieldErrors.otherIndustry}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Compliance Areas of Interest
                    <Tooltip text="Select what matters to you — we will generate your personalised compliance dashboard immediately after registration." />
                  </label>
                  {fieldErrors.complianceAreas && (
                    <p className="text-red-400 text-xs mb-2">{fieldErrors.complianceAreas}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {COMPLIANCE_AREAS.map((area) => (
                      <label
                        key={area}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={form.complianceAreas.includes(area)}
                          onChange={() => toggleComplianceArea(area)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-teal-500 accent-teal-500"
                        />
                        <span className="text-xs text-slate-300 leading-relaxed">{area}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-8">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-5 py-2.5 border border-slate-600 text-slate-300 rounded-lg hover:border-slate-500 hover:text-white transition-colors text-sm"
                >
                  Back
                </button>
              )}
              <div className="flex-1" />
              {currentStep < 3 ? (
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors text-sm flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
                >
                  {loading ? "Creating account..." : "Create Account & Get My Compliance Checklist"}
                </button>
              )}
            </div>

            {currentStep > 1 && (
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={handleSaveAndContinue}
                  disabled={loading}
                  className="text-sm text-slate-400 hover:text-teal-400 underline disabled:opacity-50"
                >
                  Save & Continue Later
                </button>
              </div>
            )}
          </form>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                href="/comply-sa/auth/login"
                className="text-teal-400 hover:text-teal-300 font-medium"
              >
                Sign in
              </Link>
            </p>
            <button
              type="button"
              onClick={() => setShowWhyModal(true)}
              className="text-xs text-slate-500 hover:text-teal-400 underline"
            >
              Why do we need this info?
            </button>
          </div>
        </div>
      </div>

      {showSuccessModal && (
        <SuccessModal
          entityType={form.entityType}
          industry={form.industrySector === "Other" ? form.otherIndustry : form.industrySector}
          onContinue={() => router.push("/comply-sa/onboarding")}
        />
      )}
      {showWhyModal && <WhyInfoModal onClose={() => setShowWhyModal(false)} />}
    </div>
  );
}
