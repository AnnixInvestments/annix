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
  "first-run": {
    key: "first-run",
    label: "Get started",
    steps: [
      {
        kind: "instruction",
        title: "Welcome to Annix Orbit",
        body: "Welcome! Here's a quick tour. First stop — your **CV**. Upload it here and Nix matches you to jobs from it, and can even polish it for you.",
        target: "cv-section",
        route: "/annix/orbit/seeker/profile",
      },
      {
        kind: "instruction",
        title: "Let Nix polish your CV",
        body: "With your CV in, tap **Click Here to Improve my CV** and Nix rewrites it recruiter-ready. Review the changes, then tap **Use this CV** to adopt it — that's what Nix matches you to jobs with.",
        target: "nix-section",
      },
      {
        kind: "instruction",
        title: "Verify your identity",
        body: "Upload a photo of your ID or passport here. Nix checks the name matches your CV — **verified profiles stand out to employers**. Only the name, number and dates are kept; the image is deleted once it's checked.",
        target: "identity-section",
      },
      {
        kind: "instruction",
        title: "Add your qualifications",
        body: "Upload your **qualifications and certificates** here. They back up your CV and help Nix match you to roles that ask for them.",
        target: "qualifications",
      },
      {
        kind: "instruction",
        title: "Complete your Work Profile",
        body: "Next, fill in your **Work Profile** — experience, role, salary and availability. This is what employers match against.",
        target: "work-profile-section",
      },
      {
        kind: "instruction",
        title: "Pick your plan",
        body: "Choose your plan under **Plans** — Explorer is free, and higher tiers unlock sharper matching and more **Nix Job Finds**. It's all free while Annix Orbit is in testing.",
        target: "nav-plans",
      },
      {
        kind: "instruction",
        title: "Browse matched jobs",
        body: "Once your CV's in, **Browse Jobs** shows roles matched to you. Filter by province, city and category, then apply.",
        target: "nav-jobs",
      },
      {
        kind: "instruction",
        title: "Track your applications",
        body: "Every job you apply to is tracked here under **Applications**, so you always know where each one stands.",
        target: "nav-applications",
      },
      {
        kind: "instruction",
        title: "Manage your interviews",
        body: "Book and manage interviews under **Interviews** — they sync straight to your phone or email calendar.",
        target: "nav-interviews",
      },
      {
        kind: "instruction",
        title: "Nix is always here",
        body: "That's the tour! Need a hand with any step, tap **Ask Nix** and I'll walk you through it. Good luck with the search!",
        target: "ask-nix-button",
      },
    ],
  },
  "use-this-cv": {
    key: "use-this-cv",
    label: "Use your improved CV",
    steps: [
      {
        kind: "instruction",
        title: "Use your new CV",
        body: "Nix has rebuilt your CV. Review the changes above, then tap **Use this CV** to adopt it — Nix starts matching you to jobs with this version.",
        target: "nix-adopt-cv",
      },
    ],
  },
  "plans-onboarding": {
    key: "plans-onboarding",
    label: "Choosing your plan",
    steps: [
      {
        kind: "instruction",
        title: "Your plans",
        body: "These are your plans. **Explorer** is free, and higher plans unlock sharper matching and more **Nix Job Finds**. It's all free while Annix Orbit is in testing.",
        target: "seeker-plans-tiers",
      },
      {
        kind: "instruction",
        title: "Change any time",
        body: "Not sure yet? Pick any plan now — you can change it any time from the **Plans** tab. No commitment.",
        target: "nav-plans",
      },
      {
        kind: "instruction",
        title: "Finish setup",
        body: "When you're ready, tap here to finish setup and head to your **dashboard**.",
        target: "seeker-plans-finish",
      },
    ],
  },
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
        title: "Pick the date",
        body: "Choose the **date** of your interview.",
        target: "interview-date",
      },
      {
        kind: "instruction",
        title: "Set the time",
        body: "Set the **start time** — and the **end time** too if you know how long it'll run.",
        target: "interview-time",
      },
      {
        kind: "instruction",
        title: "Add the location",
        body: "Add where it's happening: tap **Find on map** to search a business name or start typing an address, or paste a video-call link for an online interview.",
        target: "interview-location",
      },
      {
        kind: "instruction",
        title: "Jot any notes",
        body: "Optional, but handy: add a **contact person, reference number or what to bring** in Notes.",
        target: "interview-notes",
      },
      {
        kind: "wait-for-event",
        title: "Save it",
        body: "Now tap **Add interview** to save it — it'll appear on your calendar.",
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
