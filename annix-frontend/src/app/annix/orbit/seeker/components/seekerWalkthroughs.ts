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
        kind: "instruction",
        title: "Pick your provinces",
        body: "Start here: tap **All provinces** and tick one or more provinces where you'd like to work, then tap **Next**.",
        target: "jobs-filter-province",
      },
      {
        kind: "instruction",
        title: "Pick your cities",
        body: "Now tap **All cities** and choose one or more cities in those provinces, then tap **Next**.",
        target: "jobs-filter-city",
      },
      {
        kind: "instruction",
        title: "Choose a category",
        body: "Pick the **category** of work that suits you — this narrows jobs to your field.",
        target: "jobs-filter-category",
      },
      {
        kind: "instruction",
        title: "Run the search",
        body: "Now tap **Search** to apply your filters and refresh the matched jobs below.",
        target: "jobs-filter-search",
      },
      {
        kind: "wait-for-event",
        title: "Open a job and apply",
        body: "Pick a job that fits and tap **View & apply**. Heads-up: this opens the original listing on the company's or job board's website in a new tab — that's where you read the full details and actually submit your application. Once you've applied there, come back to this tab.",
        target: "jobs-apply-card",
        expectedEvent: "click:jobs-apply-card",
      },
      {
        kind: "navigation",
        title: "Track your applications",
        body: "Every job you apply for lands here under **Applications** — tap it to open the tracker.",
        target: "nav-applications",
        route: "/annix/orbit/seeker/applications",
      },
      {
        kind: "instruction",
        title: "Keep statuses up to date",
        body: "Use this status dropdown to move each job along — **Applied → Interviewing → Offer → Accepted**. It's not automatic, so update it yourself as things happen. Tip: choosing **Interviewing** takes you straight to adding that interview to your calendar.",
        target: "application-status",
      },
      {
        kind: "instruction",
        title: "Interviews are the exception",
        body: "The one thing you don't track by hand: when you book an interview under **Interviews**, it's added to your calendar automatically — and you can pick the job straight from your applications there.",
        target: "nav-interviews",
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
        body: "Your interviews live here — tap **Interviews** to open your calendar.",
        target: "nav-interviews",
        route: "/annix/orbit/seeker/calendar",
      },
      {
        kind: "instruction",
        title: "Sync to your phone",
        body: "Tap **Sync to calendar** any time to mirror your interviews to your phone or email calendar — Google, Apple or Outlook.",
        target: "interview-sync-button",
      },
      {
        kind: "wait-for-event",
        title: "Add an interview",
        body: "Now tap **+ Add interview** to open the form.",
        target: "interview-add-button",
        expectedEvent: "click:interview-add-button",
      },
      {
        kind: "instruction",
        title: "Link the job",
        body: "Pick the job you're interviewing for from **From your applications** — it fills in the company and role for you.",
        target: "interview-application-select",
      },
      {
        kind: "instruction",
        title: "Set the time",
        body: "Choose the **date and time** of your interview.",
        target: "interview-date",
      },
      {
        kind: "wait-for-event",
        title: "Save it",
        body: "Tap **Add interview** to save it — it'll appear on your calendar.",
        target: "interview-submit",
        expectedEvent: "click:interview-submit",
      },
      {
        kind: "instruction",
        title: "Remove a booking",
        body: "There it is on your calendar. Since this was just a practice booking, here's how to remove it: click the interview on the calendar and tap **Remove**.",
        target: "interview-calendar",
      },
    ],
  },
  "sync-calendar": {
    key: "sync-calendar",
    label: "Sync your calendar",
    steps: [
      {
        kind: "navigation",
        title: "Open Interviews",
        body: "Your interviews live under **Interviews** — let's get them onto your own calendar.",
        target: "nav-interviews",
        route: "/annix/orbit/seeker/calendar",
      },
      {
        kind: "instruction",
        title: "Sync to your device",
        body: "Tap **Sync to calendar**. Pick **Google**, **Apple** or **Outlook**, or copy the subscribe link — then follow it once on your phone or email. After that, every interview here appears on your own calendar automatically.",
        target: "interview-sync-button",
      },
    ],
  },
  "update-application-status": {
    key: "update-application-status",
    label: "Update an application's status",
    steps: [
      {
        kind: "navigation",
        title: "Open Applications",
        body: "Every job you've applied for is under **Applications** — tap it to open the tracker.",
        target: "nav-applications",
        route: "/annix/orbit/seeker/applications",
      },
      {
        kind: "instruction",
        title: "Set the status",
        body: "Find the job and use its status dropdown to move it along — **Applied → Interviewing → Offer → Accepted**. This is manual, so update it yourself as things happen. Tip: choosing **Interviewing** jumps you straight to adding that interview to your calendar.",
        target: "application-status",
      },
    ],
  },
  "choose-a-plan": {
    key: "choose-a-plan",
    label: "Choose a plan",
    steps: [
      {
        kind: "navigation",
        title: "Open Plans",
        body: "Your subscription options are under **Plans** — tap it to compare them.",
        target: "nav-plans",
        route: "/annix/orbit/seeker/plans",
      },
      {
        kind: "instruction",
        title: "Pick what fits",
        body: "Compare the tiers and choose the one that suits you — a paid plan unlocks more job matches and features. Your current plan is marked here, and you can change it any time.",
        target: "nav-plans",
      },
    ],
  },
};

export function seekerWalkthrough(key: string): SeekerWalkthrough | null {
  const found = SEEKER_WALKTHROUGHS[key];
  return found ? found : null;
}
