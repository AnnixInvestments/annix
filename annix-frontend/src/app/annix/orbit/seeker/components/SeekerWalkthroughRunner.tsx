"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { setSeekerTourActive } from "@/app/lib/annix-orbit/seekerTourSignal";
import { SeekerSpotlight } from "./SeekerSpotlight";
import type { SeekerWalkthroughStep } from "./seekerWalkthroughs";

interface SeekerWalkthroughRunnerProps {
  steps: SeekerWalkthroughStep[];
  onComplete: () => void;
}

const CLICK_EVENT_PREFIX = "click:";

function clickTargetOf(step: SeekerWalkthroughStep): string | null {
  if (step.kind !== "wait-for-event") {
    return null;
  }
  const expected = step.expectedEvent;
  if (!expected?.startsWith(CLICK_EVENT_PREFIX)) {
    return null;
  }
  return expected.slice(CLICK_EVENT_PREFIX.length);
}

export function SeekerWalkthroughRunner(props: SeekerWalkthroughRunnerProps) {
  const steps = props.steps;
  const onComplete = props.onComplete;
  const router = useRouter();
  const pathname = usePathname();
  const [index, setIndex] = useState(0);

  const step = index < steps.length ? steps[index] : null;
  const hasNext = index < steps.length - 1;

  const advance = useCallback(() => {
    setIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    setSeekerTourActive(true);
    return () => setSeekerTourActive(false);
  }, []);

  useEffect(() => {
    if (index >= steps.length) {
      onComplete();
    }
  }, [index, steps.length, onComplete]);

  // Instruction steps that carry a route navigate for the user; navigation
  // steps wait for the user to click the highlighted tab themselves.
  useEffect(() => {
    if (step && step.kind === "instruction" && step.route) {
      router.push(step.route);
    }
  }, [step, router]);

  // navigation step: advance once the user has actually arrived on the route.
  useEffect(() => {
    if (step && step.kind === "navigation" && step.route && pathname === step.route) {
      advance();
    }
  }, [step, pathname, advance]);

  // wait-for-event step: advance when the user clicks the highlighted element.
  useEffect(() => {
    const clickTarget = step ? clickTargetOf(step) : null;
    if (!clickTarget) {
      return;
    }
    const handler = (event: MouseEvent) => {
      const node = event.target;
      if (!(node instanceof Element)) {
        return;
      }
      const tagged = node.closest(`[data-nix-target="${clickTarget}"]`);
      if (tagged) {
        advance();
        return;
      }
      const byId = document.getElementById(clickTarget);
      if (byId?.contains(node)) {
        advance();
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [step, advance]);

  if (!step) {
    return null;
  }

  const waitsForUserAction = step.kind === "navigation" || step.kind === "wait-for-event";
  const ctaLabel = waitsForUserAction ? "Skip" : undefined;

  return (
    <SeekerSpotlight
      key={`${index}-${step.target}`}
      target={step.target}
      label={step.body}
      hasNext={hasNext}
      ctaLabel={ctaLabel}
      onLost={advance}
      onDismiss={advance}
    />
  );
}
