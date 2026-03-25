import Link from "next/link";
import AmixLogo from "@/app/components/AmixLogo";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-900 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/comply-sa" className="inline-flex items-center gap-2">
            <AmixLogo size="sm" showText useSignatureFont />
          </Link>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-sm text-slate-300 leading-relaxed space-y-6">
          <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
          <p className="text-slate-400">Version 1.0 &mdash; Effective Date: 24 March 2026</p>

          <p>
            This Privacy Policy explains how Annix Investments (Pty) Ltd (Registration No.
            2018/472188/07) (&quot;Annix&quot;, &quot;we&quot;, &quot;us&quot;), the responsible
            party as defined in the Protection of Personal Information Act 4 of 2013
            (&quot;POPIA&quot;), collects, uses, stores, and protects your personal information when
            you use the Comply SA platform (&quot;the Service&quot;).
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-teal-400">
              1. Responsible Party & Information Officer
            </h2>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-700">
                <tr>
                  <td className="py-2 text-slate-400 w-48">Responsible party</td>
                  <td className="py-2">Annix Investments (Pty) Ltd</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Registration number</td>
                  <td className="py-2">2018/472188/07</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Physical address</td>
                  <td className="py-2 text-amber-400">[TO BE CONFIRMED]</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Telephone</td>
                  <td className="py-2 text-amber-400">[TO BE CONFIRMED]</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Information Officer</td>
                  <td className="py-2 text-amber-400">[TO BE CONFIRMED]</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Information Officer email</td>
                  <td className="py-2 text-amber-400">[TO BE CONFIRMED]</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">General enquiries</td>
                  <td className="py-2 text-amber-400">[TO BE CONFIRMED]</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-teal-400">2. Categories of Data Subjects</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Individual users registering for personal compliance guidance</li>
              <li>
                Directors, owners, and employees of registered companies and close corporations
              </li>
              <li>Trustees and beneficiaries of trusts</li>
              <li>Professional advisors (accountants, attorneys) managing client compliance</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-teal-400">
              3. Personal Information We Collect & Processing Purposes
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-700">
                <thead>
                  <tr className="bg-slate-900">
                    <th className="text-left p-2 border-b border-slate-700 text-slate-400">
                      Category
                    </th>
                    <th className="text-left p-2 border-b border-slate-700 text-slate-400">
                      Data collected
                    </th>
                    <th className="text-left p-2 border-b border-slate-700 text-slate-400">
                      Purpose
                    </th>
                    <th className="text-left p-2 border-b border-slate-700 text-slate-400">
                      Legal basis (POPIA)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  <tr>
                    <td className="p-2">Identity</td>
                    <td className="p-2">Full name, email address</td>
                    <td className="p-2">Account creation, authentication, communication</td>
                    <td className="p-2">Contract (S.11(1)(b))</td>
                  </tr>
                  <tr>
                    <td className="p-2">Identity verification</td>
                    <td className="p-2">
                      SA ID number, passport number &amp; country, date of birth
                    </td>
                    <td className="p-2">Pre-filling tax and labour compliance requirements</td>
                    <td className="p-2">Consent (S.11(1)(a))</td>
                  </tr>
                  <tr>
                    <td className="p-2">Tax</td>
                    <td className="p-2">SARS tax reference number</td>
                    <td className="p-2">
                      Linking tax obligations and generating compliance calendar
                    </td>
                    <td className="p-2">Consent (S.11(1)(a))</td>
                  </tr>
                  <tr>
                    <td className="p-2">Contact</td>
                    <td className="p-2">Mobile phone number</td>
                    <td className="p-2">Compliance deadline notifications (SMS/WhatsApp)</td>
                    <td className="p-2">Consent (S.11(1)(a))</td>
                  </tr>
                  <tr>
                    <td className="p-2">Company</td>
                    <td className="p-2">
                      Company name, CIPC registration number, employee count, annual turnover,
                      province, business address, industry sector, VAT number
                    </td>
                    <td className="p-2">
                      Determining applicable compliance requirements, tax thresholds, and B-BBEE
                      categorisation
                    </td>
                    <td className="p-2">Contract (S.11(1)(b))</td>
                  </tr>
                  <tr>
                    <td className="p-2">Trust</td>
                    <td className="p-2">
                      Trust name, registration number, Master&apos;s Office, number of trustees
                    </td>
                    <td className="p-2">Trust-specific fiduciary duty tracking and tax filing</td>
                    <td className="p-2">Contract (S.11(1)(b))</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-amber-400">
                      Special personal information
                    </td>
                    <td className="p-2">B-BBEE ownership and demographic data (race)</td>
                    <td className="p-2">B-BBEE level determination and scorecard assessment</td>
                    <td className="p-2">Explicit consent (S.27(1)(a))</td>
                  </tr>
                  <tr>
                    <td className="p-2">Usage &amp; AI queries</td>
                    <td className="p-2">Compliance Q&A queries, feature usage, session data</td>
                    <td className="p-2">AI-powered compliance guidance, service improvement</td>
                    <td className="p-2">Consent (S.11(1)(a))</td>
                  </tr>
                  <tr>
                    <td className="p-2">Financial (via Sage)</td>
                    <td className="p-2">
                      Transaction data, invoices, bank transactions accessed via Sage Accounting API
                    </td>
                    <td className="p-2">Automated compliance monitoring and tax calculations</td>
                    <td className="p-2">Consent (S.11(1)(a))</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-teal-400">
              4. Special Personal Information (POPIA Sections 26&ndash;33)
            </h2>
            <p>
              B-BBEE assessments require processing data relating to race, which constitutes special
              personal information under POPIA. We collect this data{" "}
              <strong className="text-white">only with your explicit, separate consent</strong> and
              process it solely for the purpose of B-BBEE level determination and compliance
              guidance. You may withdraw this consent at any time by contacting{" "}
              <span className="text-teal-400">privacy@annix.co.za</span>, after which B-BBEE
              assessment features will be unavailable to you.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-teal-400">5. Third-Party Recipients</h2>
            <p>Your personal information may be shared with the following third parties:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-700">
                <thead>
                  <tr className="bg-slate-900">
                    <th className="text-left p-2 border-b border-slate-700 text-slate-400">
                      Recipient
                    </th>
                    <th className="text-left p-2 border-b border-slate-700 text-slate-400">
                      Purpose
                    </th>
                    <th className="text-left p-2 border-b border-slate-700 text-slate-400">
                      Location
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  <tr>
                    <td className="p-2">Google (Gemini AI)</td>
                    <td className="p-2">
                      Processing compliance Q&A queries via the AI chat feature
                    </td>
                    <td className="p-2">United States / Global</td>
                  </tr>
                  <tr>
                    <td className="p-2">Amazon Web Services (AWS)</td>
                    <td className="p-2">Cloud hosting, file storage (S3), database hosting</td>
                    <td className="p-2">South Africa (Cape Town, af-south-1)</td>
                  </tr>
                  <tr>
                    <td className="p-2">Fly.io</td>
                    <td className="p-2">Application hosting and deployment</td>
                    <td className="p-2">Johannesburg, South Africa</td>
                  </tr>
                  <tr>
                    <td className="p-2">Sage Accounting</td>
                    <td className="p-2">
                      Financial data integration (only when you connect your Sage account)
                    </td>
                    <td className="p-2">South Africa</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-slate-400">
              Where data is transferred outside South Africa, we ensure adequate levels of
              protection through contractual safeguards and the recipient&apos;s adherence to
              equivalent data protection standards, as required by POPIA Section 72.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-teal-400">6. Security Measures</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>
                Sensitive personal information (ID numbers, passport numbers, tax reference numbers,
                dates of birth) is encrypted at rest using AES-256-GCM
              </li>
              <li>All data in transit is encrypted via TLS 1.2+</li>
              <li>Passwords are hashed using bcrypt with a cost factor of 12</li>
              <li>
                Password policy requires minimum 8 characters including uppercase, lowercase, digit,
                and special character
              </li>
              <li>API endpoints are rate-limited to prevent brute-force attacks</li>
              <li>Authentication tokens are stored in HTTP-only, secure, same-site cookies</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-teal-400">7. Data Retention</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>
                <strong className="text-slate-300">Tax-related data:</strong> 5 years from the
                relevant tax year (Tax Administration Act 28 of 2011, Section 29)
              </li>
              <li>
                <strong className="text-slate-300">Company records:</strong> 7 years (Companies Act
                71 of 2008, Section 24)
              </li>
              <li>
                <strong className="text-slate-300">Account data:</strong> Duration of your account
                plus 1 year following deletion
              </li>
              <li>
                <strong className="text-slate-300">AI chat logs:</strong> 90 days, then
                de-identified for service improvement
              </li>
            </ul>
            <p className="text-slate-400">
              After the applicable retention period, personal information is securely destroyed or
              de-identified in accordance with POPIA Section 14.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-teal-400">8. Your Rights Under POPIA</h2>
            <p>As a data subject, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>
                <strong className="text-slate-300">Access</strong> &mdash; Request confirmation of
                whether we hold your personal information and obtain a copy (Section 23)
              </li>
              <li>
                <strong className="text-slate-300">Correction</strong> &mdash; Request correction or
                deletion of inaccurate, irrelevant, or excessive personal information (Section 24)
              </li>
              <li>
                <strong className="text-slate-300">Deletion</strong> &mdash; Request destruction of
                your personal information when it is no longer needed (Section 24)
              </li>
              <li>
                <strong className="text-slate-300">Object</strong> &mdash; Object to the processing
                of your personal information on reasonable grounds (Section 11(3))
              </li>
              <li>
                <strong className="text-slate-300">Withdraw consent</strong> &mdash; Withdraw any
                previously given consent, noting this may affect the availability of certain
                features
              </li>
              <li>
                <strong className="text-slate-300">Complain</strong> &mdash; Lodge a complaint with
                the Information Regulator of South Africa
              </li>
            </ul>
            <p>
              To exercise any of these rights, contact our Information Officer at{" "}
              <span className="text-teal-400">privacy@annix.co.za</span>. We will respond within 30
              days as required by POPIA.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-teal-400">
              9. Information Regulator Contact Details
            </h2>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-700">
                <tr>
                  <td className="py-2 text-slate-400 w-48">Name</td>
                  <td className="py-2">The Information Regulator (South Africa)</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Phone</td>
                  <td className="py-2">012 406 4818</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Email</td>
                  <td className="py-2">inforeg@justice.gov.za</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Website</td>
                  <td className="py-2">https://inforegulator.org.za</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-teal-400">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be
              communicated via email or in-app notification with at least 20 business days&apos;
              notice. The effective date at the top of this page will be updated accordingly. Your
              continued use of the Service after a change takes effect constitutes acceptance of the
              revised policy.
            </p>
          </section>

          <div className="pt-4 border-t border-slate-700 text-slate-500 text-xs">
            <p>Last updated: 24 March 2026</p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/comply-sa/auth/signup" className="text-sm text-teal-400 hover:text-teal-300">
            &larr; Back to registration
          </Link>
        </div>
      </div>
    </div>
  );
}
