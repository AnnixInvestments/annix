# Nix shared module — target architecture

> Output of issue #262 Phase 0 discovery. Captures current state, target shape, and the migration path.

## TL;DR

- The "shared module" foundation **already exists**: `annix-backend/src/nix/` (NestJS) and `annix-frontend/src/app/lib/nix/` (React).
- Cross-app surface is **partly migrated, partly direct-coupled**: `NixAssistant` is layout-mounted in `admin`/`customer`/`supplier` portals; not yet in `au-rubber`/`stock-control`/`cv-assistant`/`comply-sa`/`annix-rep`/`teacher-assistant`.
- 7 backend modules **direct-inject `AiChatService`** (30+ services), bypassing any per-app capability registration. The `NixExtractionProfileRegistry` registry pattern from #251 only has 1 handler today (`RfqPipingProfileHandler`).
- The work is less "build from scratch" and more **extend the registry pattern, remove forwardRef cycles, onboard the apps that bypass it, add walkthrough engine**.

## Current state

### Backend — `annix-backend/src/nix/`
Module already exports the right primitives:
- `NixService`, `NixChatService`, `NixChatItemService`, `NixItemParserService`, `NixValidationService`
- `AiChatService`, `AiExtractionService`
- `NixExtractionProfileRegistry` (registry from #251) with `IExtractionProfileHandler` interface
- Entities: `NixChatSession`, `NixChatMessage`, `NixExtraction`, `NixExtractionSession`, `NixClarification`, `NixLearning`, `NixUserPreference`

**Smell — `NixModule` `forwardRef`s upward into app modules**: `RfqModule`, `CustomerModule`, `SupplierModule`, `AdminModule`, `SecureDocumentsModule`. The shared module should be a leaf. App modules should depend on Nix, not the other way around.

**Smell — `AiChatService` direct injection is widespread**: 30+ services across 7 modules (`stock-control` 13, `cv-assistant` 5, `rubber-lining` 5, `stock-management` 4, `teacher-assistant` 3, `comply-sa` 2, `feedback` 1) reach directly into `nix/ai-providers/ai-chat.service.ts` rather than register a capability with the Nix module. There's no single "what can App X do via Nix?" registry.

**Smell — `claude-chat.provider.ts` and `claude.provider.ts` still present** despite CLAUDE.md "Gemini only" rule. These are legacy fallbacks; should be removed.

### Frontend — `annix-frontend/src/app/lib/nix/`
Shared component home already exists:
- Chat surface: `NixAssistant` (avatar + panel toggle wrapper), `NixChatPanel` (draggable/resizable), `NixFloatingAvatar`
- Extraction popups: `NixAiPopup`, `NixProcessingPopup`, `NixClarificationPopup`, `NixDocumentAnnotator`, `NixRegistrationVerifier`
- Draft review: `NixDraftReview` (multi-app — used by comply-sa, annix-rep, stock-control)
- Hook: `useNix` (in `lib/query/hooks/nix/`)
- Shared progress-modal context: `useExtractionProgress`, `useAdaptiveExtractionProgress` — already DRY across CV, AU Rubber, SC, RFQ, Teacher Assistant

**Coverage gaps:** `NixAssistant` is mounted at layout level only in `admin`, `customer`, `supplier`. Five other apps (`au-rubber`, `stock-control`, `cv-assistant`, `comply-sa`, `annix-rep`, `teacher-assistant`) don't expose the shared chat panel — they have app-specific Nix surfaces (CV's `NixWizardPanel`, AU Rubber's per-page `NixProcessingPopup`, stock-control's `NixDraftReview`) but no global chat.

**Duplicate cluster flagged:** four near-identical `NixProcessingPopup` mounts in AU Rubber portal pages (delivery-notes × customers/suppliers + tax-invoices × customers/suppliers).

### How-to guides — walkthrough source material

| App | Guide count | Notes |
|---|---|---|
| Stock Control | 34 | Mature; walkthrough-ready |
| CV Assistant | 2 | "Posting a job with Nix", "Running EE report" |
| Teacher Assistant | 1 | "Getting started" |
| AU Rubber, Admin, Comply SA, Annix Rep, Customer, Supplier | 0 | Walkthrough mode for these apps requires writing guides first |

## Target architecture

### Backend leaf-module shape

```
NixModule (shared, leaf)
├── exports: NixCoreService, NixChatService, AiChatService, NixCapabilityRegistry, NixGuideLoader
├── interfaces: INixCapability (extends today's IExtractionProfileHandler)
└── no forwardRef into app modules

App module (e.g. RfqModule)
├── imports: NixModule
├── declares: RfqExtractionCapability, RfqWalkthroughCapability
└── on bootstrap: NixCapabilityRegistry.register(this.capabilities)
```

The existing `IExtractionProfileHandler` is already 80% of `INixCapability`. Phase 1 just **extends it** with optional `walkthrough?: WalkthroughDefinition` and `chatIntents?: string[]` fields. No greenfield interface.

### `NixCapabilityRegistry` — registration shape (Phase 1 target)

```ts
interface INixCapability {
  readonly key: string;                       // e.g. "rfq.extract-boq"
  readonly appCode: string;                   // e.g. "rfq"
  readonly label: string;
  readonly description: string;
  readonly intents: string[];                 // user phrasing this capability handles
  readonly guideSlug?: string;                // links to how-to/guides/<slug>.md
  readonly handler?: ICapabilityHandler;      // existing extraction handler shape
  readonly walkthrough?: IWalkthroughDef;     // step-list for /walkthrough mode
  systemPrompt?(ctx: PromptContext): string | undefined;
}
```

Each app module registers capabilities into the registry on bootstrap. Nix routes user intent → matching capability. Same registry powers both extraction and walkthrough.

### Frontend per-app context

```tsx
<NixAppProvider appCode="rfq" capabilities={rfqCapabilities}>
  {children}
</NixAppProvider>
```

Each app's portal layout wraps in `NixAppProvider`. The shared `<NixAssistant />` reads from the provider and presents the right intents, guide list, and capability hints to the user.

### Walkthrough engine (Phase 4)

State persists in existing `NixChatSession` entity (extend with `walkthroughState?: { capabilityKey, guideSlug, step, totals }` JSON column). Engine reads steps from `NixGuideLoader` (parses `how-to/guides/<slug>.md` front-matter + step content) and emits one step per turn. `WalkthroughEngine` is chat-surface-agnostic so future voice/phone interfaces can reuse it.

## Migration path

1. **Phase 1** — extend `IExtractionProfileHandler` → `INixCapability`, add `NixCapabilityRegistry` with `register()/listForApp()/findByIntent()`. Don't break existing `RfqPipingProfileHandler`.
2. **Phase 1.5** — break the upward forwardRef cycles by inverting dependencies (each app module imports NixModule; remove RfqModule/CustomerModule/SupplierModule/AdminModule/SecureDocumentsModule from NixModule's imports). Move whatever NixModule currently uses from those modules into the app modules' capability handlers.
3. **Phase 1.6** — delete `claude.provider.ts` and `claude-chat.provider.ts`. Per CLAUDE.md "Gemini only", these are dead code.
4. **Phase 2** — add `NixAppProvider` to `lib/nix/`. Migrate one pilot app behind a feature flag (recommendation below). Verify parity. Remove the pilot's old per-app Nix wiring.
5. **Phase 3** — onboard the remaining apps. Order is "smallest Nix surface first" so each migration is a small, reviewable PR.
6. **Phase 4** — walkthrough engine + intent detection + step persistence. Pilot on Stock Control (34 guides, mature). Add walkthrough capabilities to each app's registration set as guides are written.
7. **Phase 5** — cross-app router. Depends on #259 (StockControlUser → StockControlProfile migration) so RBAC across apps is in one place.
8. **Phase 6** — performance pass + cleanup + docs.

## Pilot recommendation

**Teacher Assistant** — and the rationale:

- Newest app (May 2026), tiny surface area
- Has 3 backend services that direct-inject `AiChatService` (`assignment-generator`, `objective-suggester`, `section-filler`) — perfect to convert into 3 `INixCapability` handlers
- Has 1 how-to guide ("Getting started") — minimal scope to wire the guide loader
- No layout-level `NixAssistant` today — adding it tests the full provider/registration/render flow
- Rolling back is cheap: it's not yet load-bearing for any customer

**Second choice — Comply SA**: similar tiny footprint (2 services), no chat surface today, but no how-to guides yet so walkthrough mode tests would need fixture guides.

## Out-of-scope notes

- **Voice / phone Nix** is explicitly out for #262 — but the walkthrough engine should be authored chat-surface-agnostic so a future voice path can reuse it.
- **Nix extraction module** stays separate from chat for now. Default position: keep `nix/` as the umbrella with `nix/extraction/` and `nix/chat/` sub-namespaces if that helps clarity, but don't split into two top-level NestJS modules — the shared `AiChatService`, registry, capability interface, and entities should live together.
- **Removing direct `AiChatService` injection from app modules**: not a goal of #262 itself. App modules can keep direct access for low-level AI calls. The capability registry is for *user-facing* surfaces (chat, walkthrough, document drop) — not every internal AI helper.

## Open questions for Phase 1 kickoff

1. Should `NixCapability` be one interface or split into `IChatCapability`, `IExtractionCapability`, `IWalkthroughCapability`? The latter is more modular but multiplies registration boilerplate.
2. Is `NixGuideLoader` server-side or shared client/server? Walkthrough state is server-side (lives in chat session), but the client may want to render guide markdown directly. A shared `@annix/guide-parser` package in `packages/product-data/` is the candidate.
3. How does the registry handle conflicts when two apps register the same intent ("extract BOQ" — RFQ vs Stock Control)? Ranking by current app context is the default, but the routing rules need explicit definition.

These belong on issue #262 Phase 1 before code lands.
