// Predefined Seeker guided tours (#365 Phase 3).
// Built on the backend WalkthroughStep step model
// (annix-backend/src/nix/capabilities/walkthrough-definition.interface.ts):
// kind = instruction | navigation | wait-for-event, plus a `target`
// (data-nix-target / element id) for the seeker spotlight to point at.
//
// The shared RFQ guided engine (useGuidedMode / GuidedHighlight) is bound to the
// RFQ wizard store, so these run through the seeker's own SeekerWalkthroughRunner
// + SeekerSpotlight — the same SVG-mask coachmark pattern, decoupled from RFQ.

export type SeekerWalkthroughStepKind = "instruction" | "navigation" | "wait-for-event";

export interface SeekerWalkthroughStep {
  kind: SeekerWalkthroughStepKind;
  title: string;
  body: string;
  target: string;
  route?: string;
  expectedEvent?: string;
}

export interface SeekerWalkthrough {
  key: string;
  label: string;
  steps: SeekerWalkthroughStep[];
}

const SEEKER_WALKTHROUGHS: Record<string, SeekerWalkthrough> = {
  "apply-for-a-job": {
    key: "apply-for-a-job",
    label: "Apply for a job",
    steps: [
      {
        kind: "navigation",
        title: "Browse Jobs",
        body: "Let's find you a job — tap **Browse Jobs** to see roles matched to your CV.",
        target: "nav-jobs",
        route: "/annix/orbit/seeker/jobs",
      },
      {
        kind: "wait-for-event",
        title: "Open a job",
        body: "Tap any job card to open it and read the details.",
        target: "jobs-apply-card",
        expectedEvent: "click:jobs-apply-card",
      },
      {
        kind: "instruction",
        title: "Apply and track",
        body: "On the job, tap **Apply** to send your application. It then shows up under **Applications** so you can track its progress.",
        target: "nav-applications",
      },
    ],
  },
  "finish-your-profile": {
    key: "finish-your-profile",
    label: "Finish your profile",
    steps: [
      {
        kind: "navigation",
        title: "Open Profile",
        body: "Let's strengthen your profile — tap **Profile**.",
        target: "nav-profile",
        route: "/annix/orbit/seeker/profile",
      },
      {
        kind: "instruction",
        title: "Upload your CV",
        body: "Upload your CV here. Nix uses it to match you to jobs and can polish it for you.",
        target: "cv-section",
      },
      {
        kind: "instruction",
        title: "Complete your Work Profile",
        body: "Then complete your **Work Profile** — your experience, role, salary and availability. This is what employers match against.",
        target: "work-profile-section",
      },
    ],
  },
  "book-an-interview": {
    key: "book-an-interview",
    label: "Book an interview",
    steps: [
      {
        kind: "navigation",
        title: "Open Interviews",
        body: "Your interview invites live here — tap **Interviews**.",
        target: "nav-interviews",
        route: "/annix/orbit/seeker/calendar",
      },
      {
        kind: "instruction",
        title: "Pick a time",
        body: "When an employer invites you, you'll see it here. Pick a time slot that suits you and confirm — we'll add travel-time advice so you're never late.",
        target: "nav-interviews",
      },
    ],
  },
};

export function seekerWalkthrough(key: string): SeekerWalkthrough | null {
  const found = SEEKER_WALKTHROUGHS[key];
  return found ? found : null;
}
