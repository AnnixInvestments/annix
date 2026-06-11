"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useTheme } from "@/app/components/ThemeProvider";
import { annixOrbitApiClient, type EarlyAccessSignupPayload } from "@/app/lib/api/annixOrbitApi";
import { useBrandingContext } from "@/app/lib/branding/BrandingProvider";
import { brandHasAsset, brandingFallback, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { useBranding } from "@/app/lib/query/hooks";

const NAVY = "#0A1B3D";
const CARD = "#11244e";
const BENEFITS = [
  "AI Career Score",
  "CV Analysis",
  "Job Matching",
  "Interview Preparation",
  "Career Guidance",
];
const YEARS_OPTIONS = ["", "0–1 years", "2–4 years", "5–9 years", "10+ years"];
const AGE_RANGE_OPTIONS = ["", "18-24", "25-34", "35-44", "45-54", "55+"];
const ETHNIC_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Prefer not to say" },
  { value: "african_black", label: "African / Black" },
  { value: "coloured", label: "Coloured" },
  { value: "indian", label: "Indian" },
  { value: "white", label: "White" },
];
const PAGE_PATH = "/annix/orbit/seeker/register-interest";
const EDGE_FADE = "radial-gradient(135% 150% at 50% 50%, #000 72%, transparent 100%)";

function RegisterInterestContent() {
  const ctx = useBrandingContext();
  const branding = ctx || brandingFallback("annix-orbit");
  const logoIcon = resolveBrandAssetUrl("logoIcon", branding);

  const { resolvedTheme } = useTheme();
  const variant = resolvedTheme === "light" ? "light" : "dark";

  const annixBrandingQuery = useBranding("annix-investments");
  const annixData = annixBrandingQuery.data;
  const annixBranding = annixData || brandingFallback("annix-investments");

  const heroTopLight = brandHasAsset("heroTop", annixBranding, "light");
  const heroTopDark = annixBranding.assetsDark.heroTop;
  const hasHeroTop = heroTopLight || heroTopDark;
  const heroTopUrl = hasHeroTop ? resolveBrandAssetUrl("heroTop", annixBranding, variant) : null;
  const heroTopHeight = annixBranding.heroTopHeightPct;
  const heroTopStop = 100 - annixBranding.heroTopFadePct;

  const heroBottomLight = brandHasAsset("heroBottom", annixBranding, "light");
  const heroBottomDark = annixBranding.assetsDark.heroBottom;
  const hasHeroBottom = heroBottomLight || heroBottomDark;
  const heroBottomUrl = hasHeroBottom
    ? resolveBrandAssetUrl("heroBottom", annixBranding, variant)
    : null;
  const heroBottomHeight = annixBranding.heroBottomHeightPct;
  const heroBottomStop = 100 - annixBranding.heroBottomFadePct;

  const orbitLockupUrl = resolveBrandAssetUrl("logoLockup", branding, variant);

  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const campaign = searchParams.get("campaign");
  const referredBy = searchParams.get("ref");

  const countQuery = useQuery({
    queryKey: ["orbit-early-access-count"],
    queryFn: () => annixOrbitApiClient.earlyAccessCount(),
  });
  const countData = countQuery.data;
  const waiting = countData ? countData.total : 0;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [ethnicBackground, setEthnicBackground] = useState("");
  const [consent, setConsent] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [queueTotal, setQueueTotal] = useState(0);
  const [referredFriends, setReferredFriends] = useState(0);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: EarlyAccessSignupPayload) =>
      annixOrbitApiClient.submitEarlyAccess(payload),
    onSuccess: (result) => {
      setReferralCode(result.referralCode);
      setQueuePosition(result.position);
      setQueueTotal(result.totalSignups);
      setReferredFriends(result.referralCount);
    },
  });

  const errorText = mutation.isError ? "Something went wrong — please try again." : null;
  const canSubmit =
    consent &&
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    email.trim() !== "" &&
    mobileNumber.trim() !== "" &&
    !mutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    const payload: EarlyAccessSignupPayload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      mobileNumber: mobileNumber.trim(),
      currentRole: currentRole.trim() || undefined,
      industry: industry.trim() || undefined,
      yearsExperience: yearsExperience || undefined,
      ageRange: ageRange || undefined,
      ethnicBackground: ethnicBackground || undefined,
      consentToContact: consent,
      source: source || undefined,
      campaign: campaign || undefined,
      referredBy: referredBy || undefined,
    };
    mutation.mutate(payload);
  };

  const referralLink =
    referralCode && typeof window !== "undefined"
      ? `${window.location.origin}${PAGE_PATH}?ref=${referralCode}`
      : "";

  const handleCopy = () => {
    if (!referralLink) {
      return;
    }
    navigator.clipboard.writeText(referralLink).then(() => setCopied(true));
  };

  const inputClass =
    "w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-[var(--brand-accent,#FF8A00)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent,#FF8A00)]";
  const labelClass = "block text-sm font-medium text-white/80 mb-1";

  const heroLayers = (
    <>
      {heroTopUrl ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-0"
          style={{
            height: `${heroTopHeight}vh`,
            backgroundImage: `linear-gradient(to bottom, transparent ${heroTopStop}%, ${NAVY}), url('${heroTopUrl}')`,
            backgroundRepeat: "no-repeat, no-repeat",
            backgroundPosition: "center top, center top",
            backgroundSize: "cover, cover",
          }}
        />
      ) : null}
      {heroBottomUrl ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0"
          style={{
            height: `${heroBottomHeight}vh`,
            backgroundImage: `linear-gradient(to top, transparent ${heroBottomStop}%, ${NAVY}), url('${heroBottomUrl}')`,
            backgroundRepeat: "no-repeat, no-repeat",
            backgroundPosition: "center bottom, center bottom",
            backgroundSize: "cover, 100% 100%",
          }}
        />
      ) : null}
    </>
  );

  if (referralCode) {
    return (
      <div
        className="relative overflow-hidden min-h-screen px-4 py-16 flex items-center justify-center"
        style={{ backgroundColor: NAVY }}
      >
        {heroLayers}
        <div
          className="relative z-10 max-w-lg w-full rounded-2xl p-8 text-center"
          style={{ backgroundColor: CARD }}
        >
          <div
            className="inline-flex w-16 h-16 rounded-2xl mb-5 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url('${logoIcon}')` }}
          />
          <h1 className="text-2xl font-bold text-white mb-2">You're on the list 🎉</h1>
          <div className="mb-4">
            <p className="text-sm text-white/60">Your place in the queue</p>
            <p className="text-4xl font-bold" style={{ color: "var(--brand-accent, #FF8A00)" }}>
              #{queuePosition ?? "—"}
              <span className="text-lg font-medium text-white/50"> of {queueTotal}</span>
            </p>
          </div>
          <p className="text-white/70 mb-4">
            Your spot moves up every time a friend joins with your link — the top referrers get
            first access when Orbit Seeker launches.
            {referredFriends > 0
              ? ` You've already brought in ${referredFriends} ${referredFriends === 1 ? "friend" : "friends"}.`
              : ""}
          </p>
          <div className="rounded-lg bg-white/5 border border-white/10 p-3 mb-3 break-all text-sm text-white/80">
            {referralLink}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="w-full rounded-lg py-3 font-semibold text-[#0A1B3D]"
            style={{ backgroundColor: "var(--brand-accent, #FF8A00)" }}
          >
            {copied ? "Link copied!" : "Copy your invite link"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden min-h-screen px-4 py-12"
      style={{ backgroundColor: NAVY }}
    >
      {heroLayers}
      <div className="relative z-10 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <div className="text-white">
          <div className="flex items-center gap-2 mb-6">
            <div
              role="img"
              aria-label="Annix Orbit icon"
              className="bg-contain bg-center bg-no-repeat flex-shrink-0"
              style={{
                width: "6.5rem",
                height: "6.5rem",
                borderRadius: "1.25rem",
                backgroundImage: `url('${logoIcon}')`,
                maskImage: EDGE_FADE,
                WebkitMaskImage: EDGE_FADE,
              }}
            />
            <div
              role="img"
              aria-label="Annix Orbit"
              className="bg-cover bg-center bg-no-repeat"
              style={{
                height: "6.5rem",
                width: "400px",
                maxWidth: "55vw",
                borderRadius: "1.25rem",
                backgroundImage: `url('${orbitLockupUrl}')`,
                maskImage: EDGE_FADE,
                WebkitMaskImage: EDGE_FADE,
              }}
            />
          </div>
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-3"
            style={{ color: "var(--brand-accent, #FF8A00)" }}
          >
            Launching soon
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Get Early Access to Annix Orbit Seeker
          </h1>
          <p className="text-lg text-white/70 mb-8">
            Upload your CV. Receive your AI Career Score. Discover better opportunities.
          </p>
          <ul className="space-y-2 mb-8">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 text-white/85">
                <span style={{ color: "var(--brand-accent, #FF8A00)" }}>✓</span>
                {benefit}
              </li>
            ))}
          </ul>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm text-white/80">
            <span className="font-bold" style={{ color: "var(--brand-accent, #FF8A00)" }}>
              {waiting}
            </span>
            South Africans waiting for early access
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 sm:p-8"
          style={{ backgroundColor: CARD }}
        >
          <h2 className="text-xl font-bold text-white mb-1">Join the Early Access List</h2>
          <p className="text-sm text-white/60 mb-5">Be first in line when we launch.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass} htmlFor="ea-first">
                First name
              </label>
              <input
                id="ea-first"
                className={inputClass}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="ea-last">
                Surname
              </label>
              <input
                id="ea-last"
                className={inputClass}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="mb-4">
            <label className={labelClass} htmlFor="ea-email">
              Email
            </label>
            <input
              id="ea-email"
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className={labelClass} htmlFor="ea-mobile">
              Mobile number
            </label>
            <input
              id="ea-mobile"
              className={inputClass}
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass} htmlFor="ea-role">
                Current job title <span className="text-white/40">(optional)</span>
              </label>
              <input
                id="ea-role"
                className={inputClass}
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="ea-industry">
                Industry <span className="text-white/40">(optional)</span>
              </label>
              <input
                id="ea-industry"
                className={inputClass}
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-5">
            <label className={labelClass} htmlFor="ea-years">
              Years experience <span className="text-white/40">(optional)</span>
            </label>
            <select
              id="ea-years"
              className={inputClass}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
            >
              {YEARS_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-[#0A1B3D]">
                  {opt === "" ? "Select…" : opt}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            <div>
              <label className={labelClass} htmlFor="ea-age">
                Age range <span className="text-white/40">(optional)</span>
              </label>
              <select
                id="ea-age"
                className={inputClass}
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
              >
                {AGE_RANGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-[#0A1B3D]">
                    {opt === "" ? "Prefer not to say" : opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="ea-ethnic">
                Background <span className="text-white/40">(optional)</span>
              </label>
              <select
                id="ea-ethnic"
                className={inputClass}
                value={ethnicBackground}
                onChange={(e) => setEthnicBackground(e.target.value)}
              >
                {ETHNIC_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#0A1B3D]">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-white/40 mb-5">
            Age &amp; background are optional and used only to make sure our early-access testing is
            fair and representative (Employment Equity).
          </p>

          <label className="flex items-start gap-3 mb-5 text-sm text-white/75 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 flex-shrink-0"
            />
            <span>
              I agree to be contacted about Annix Orbit Seeker early access, career tools, job
              opportunities and related updates.
            </span>
          </label>

          {errorText ? <p className="text-sm text-red-300 mb-3">{errorText}</p> : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg py-3 font-semibold text-[#0A1B3D] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--brand-accent, #FF8A00)" }}
          >
            {mutation.isPending ? "Joining…" : "Get Early Access"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RegisterInterestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: NAVY }} />}>
      <RegisterInterestContent />
    </Suspense>
  );
}
