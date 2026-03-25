"use client";

import { ArrowLeft, Check, CheckCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import AmixLogo from "@/app/components/AmixLogo";
import { useToast } from "@/app/components/Toast";
import { useUpgradeSubscription } from "@/app/lib/query/hooks";

type BillingCycle = "monthly" | "annual";

const TIERS = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 199,
    features: [
      "All compliance requirements tracked",
      "Document vault",
      "Email notifications",
      "Document templates",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    id: "professional",
    name: "Professional",
    monthlyPrice: 499,
    features: [
      "Everything in Starter",
      "Advisor dashboard (up to 20 clients)",
      "AI compliance assistant",
      "Tender pack generator",
      "Tax tools & calculators",
    ],
    cta: "Upgrade",
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 999,
    features: [
      "Everything in Professional",
      "API access",
      "Unlimited advisor clients",
      "Priority support",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const FAQS = [
  {
    question: "Can I change plans?",
    answer:
      "Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes, all new accounts start with a 14-day free trial on the Starter plan. No credit card required.",
  },
  {
    question: "How do I cancel?",
    answer:
      "You can cancel your subscription at any time from your Settings page. Your access continues until the end of your current billing period.",
  },
];

function annualPrice(monthly: number): number {
  return monthly * 10;
}

function PricingCard({
  tier,
  billing,
  currentTier,
  onUpgrade,
  upgrading,
  upgraded,
}: {
  tier: (typeof TIERS)[number];
  billing: BillingCycle;
  currentTier: string | null;
  onUpgrade: (tierId: string) => void;
  upgrading: boolean;
  upgraded: boolean;
}) {
  const isCurrent = currentTier === tier.id;
  const price = billing === "annual" ? annualPrice(tier.monthlyPrice) : tier.monthlyPrice;
  const crossedOutPrice = billing === "annual" ? tier.monthlyPrice * 12 : null;

  return (
    <div
      className={`relative bg-slate-800 border rounded-2xl p-6 flex flex-col ${
        tier.highlighted ? "border-teal-500 ring-2 ring-teal-500/20" : "border-slate-700"
      }`}
    >
      {tier.highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-teal-500 text-white text-xs font-semibold rounded-full">
          Most Popular
        </span>
      )}

      <h3 className="text-lg font-bold text-white">{tier.name}</h3>

      <div className="mt-4 mb-6">
        {crossedOutPrice && (
          <span className="text-sm text-slate-500 line-through mr-2">
            R{crossedOutPrice.toLocaleString()}
          </span>
        )}
        <span className="text-3xl font-bold text-white">R{price.toLocaleString()}</span>
        <span className="text-slate-400 text-sm">/{billing === "annual" ? "year" : "month"}</span>
        {billing === "annual" && <p className="text-xs text-teal-400 mt-1">2 months free</p>}
      </div>

      <ul className="space-y-3 flex-1">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
            <Check className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {isCurrent ? (
          <span className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-green-500/10 border border-green-500/30 text-green-400 font-medium rounded-lg text-sm">
            Current Plan
          </span>
        ) : upgraded ? (
          <span className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-green-500/10 border border-green-500/30 text-green-400 font-medium rounded-lg text-sm">
            <CheckCircle className="h-4 w-4" />
            Upgraded
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onUpgrade(tier.id)}
            disabled={upgrading}
            className={`w-full px-4 py-2.5 font-medium rounded-lg text-sm transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 ${
              tier.highlighted
                ? "bg-teal-500 hover:bg-teal-600 text-white"
                : "bg-slate-700 hover:bg-slate-600 text-white"
            }`}
          >
            {upgrading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Upgrading...
              </>
            ) : (
              tier.cta
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-700 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="text-sm font-medium text-white">{question}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {open && <p className="pb-4 text-sm text-slate-400">{answer}</p>}
    </div>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [currentTier] = useState<string | null>("starter");
  const [upgradedTier, setUpgradedTier] = useState<string | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const upgradeMutation = useUpgradeSubscription();
  const { showToast } = useToast();

  function handleUpgrade(tierId: string) {
    setUpgradeError(null);
    upgradeMutation.mutate(tierId, {
      onSuccess: () => {
        setUpgradedTier(tierId);
        showToast("Subscription upgraded successfully", "success");
      },
      onError: (err) => {
        const message = err instanceof Error ? err.message : "Failed to upgrade subscription";
        setUpgradeError(message);
        showToast(message, "error");
      },
    });
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/comply-sa/dashboard" className="flex items-center gap-2">
            <AmixLogo size="sm" showText useSignatureFont />
          </Link>
          <Link
            href="/comply-sa/settings"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white">Choose the right plan for your business</h1>
          <p className="text-slate-400 mt-2">Start free, upgrade when you need more</p>

          <div className="mt-6 inline-flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-full p-1">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                billing === "monthly" ? "bg-teal-500 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                billing === "annual" ? "bg-teal-500 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Annual
            </button>
          </div>
        </div>

        {upgradeError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm text-center">
            {upgradeError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              billing={billing}
              currentTier={currentTier}
              onUpgrade={handleUpgrade}
              upgrading={upgradeMutation.isPending}
              upgraded={upgradedTier === tier.id}
            />
          ))}
        </div>

        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-white mb-4 text-center">
            Frequently Asked Questions
          </h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl px-5">
            {FAQS.map((faq) => (
              <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
