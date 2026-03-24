"use client";

import { Eye, EyeOff, Shield, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { signup } from "@/app/comply-sa/lib/api";

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
      className="h-64 overflow-y-auto bg-slate-950 border border-slate-600 rounded-lg p-4 text-xs text-slate-300 leading-relaxed space-y-3 scrollbar-thin"
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
        The AI-powered compliance Q&A feature utilises artificial intelligence technology (including
        third-party AI providers) to generate responses. AI-generated responses are produced
        algorithmically and{" "}
        <strong className="text-white">
          may contain inaccuracies, omissions, outdated information, or misleading content
        </strong>
        . These responses do not represent the professional opinion of any qualified legal
        practitioner, tax advisor, or accountant, and Annix does not guarantee the accuracy,
        completeness, or suitability of any AI-generated content.
      </p>
      <p>
        You must independently verify all AI-generated information before relying on it for any
        compliance, tax, or legal purpose. User queries submitted to the AI feature may be processed
        by third-party AI service providers subject to their respective privacy policies.
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">4. Limitation of Liability</h4>
      <p>
        <strong className="text-white">Your use of Comply SA is entirely at your own risk.</strong>{" "}
        To the maximum extent permitted by applicable South African law:
      </p>
      <p>
        (a) The total aggregate liability of Annix arising out of or in connection with your use of
        the Service, whether in contract, delict (tort), strict liability, or otherwise, shall not
        exceed the total fees paid by you for the Service during the twelve (12) month period
        immediately preceding the event giving rise to such liability.
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
        In accordance with Section 16 of the CPA and Section 44 of the Electronic Communications and
        Transactions Act 25 of 2002 (&quot;ECTA&quot;), you may cancel your subscription within 5
        (five) business days of creating your account without reason or penalty by contacting us at{" "}
        <span className="text-teal-400">support@annix.co.za</span>.
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

      <h4 className="text-sm font-semibold text-teal-400 pt-1">
        13. Governing Law and Jurisdiction
      </h4>
      <p>
        These Terms shall be governed by and construed in accordance with the laws of the Republic
        of South Africa. The parties submit to the exclusive jurisdiction of the High Court of South
        Africa, Gauteng Division, Pretoria, for any disputes arising from or in connection with
        these Terms.
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">14. Severability</h4>
      <p>
        If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court
        of competent jurisdiction, such invalidity shall not affect the remaining provisions, which
        shall continue in full force and effect.
      </p>

      <h4 className="text-sm font-semibold text-teal-400 pt-1">15. ECTA Disclosure (Section 43)</h4>
      <p>
        Full name: Annix Investments (Pty) Ltd | Registration: 2018/472188/07 | Physical address:
        Pretoria, Gauteng, South Africa | Email:{" "}
        <span className="text-teal-400">support@annix.co.za</span> | Information Officer:{" "}
        <span className="text-teal-400">privacy@annix.co.za</span>
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

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleScrolledToBottom = useCallback(() => {
    setHasScrolledTerms(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!termsAccepted) {
      setError("You must accept the Terms and Conditions to create an account");
      return;
    }

    setLoading(true);

    try {
      await signup({
        name,
        email,
        password,
        companyName,
        registrationNumber: registrationNumber || null,
        termsAccepted,
      });
      router.push("/comply-sa/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/comply-sa" className="inline-flex items-center gap-2">
            <Shield className="h-8 w-8 text-teal-400" />
            <span className="text-xl font-bold text-white">Comply SA</span>
          </Link>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">Create Your Account</h1>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                placeholder="you@company.co.za"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 pr-11 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                placeholder="Acme Pty Ltd"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                CIPC Registration Number <span className="text-slate-500">(optional)</span>
              </label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                placeholder="2024/123456/07"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Terms and Conditions
              </label>
              <TermsAndConditions onScrolledToBottom={handleScrolledToBottom} />

              <label
                className={`flex items-start gap-2.5 mt-3 cursor-pointer ${!hasScrolledTerms ? "opacity-50 pointer-events-none" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={!hasScrolledTerms}
                  className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500 focus:ring-offset-0 accent-teal-500"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  I have read and agree to the{" "}
                  <strong className="text-teal-400">Terms and Conditions</strong>, including the
                  limitation of liability, non-reliance, and privacy provisions.
                </span>
              </label>

              {!hasScrolledTerms && (
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Please scroll through the full Terms and Conditions above to continue.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !termsAccepted}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Already have an account?{" "}
            <Link
              href="/comply-sa/auth/login"
              className="text-teal-400 hover:text-teal-300 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
