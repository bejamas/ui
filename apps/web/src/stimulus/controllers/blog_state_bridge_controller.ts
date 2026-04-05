import { Controller } from "@hotwired/stimulus";

type PatternId = "local" | "shared" | "persisted";
type SelectChangeDetail = {
  value: string;
};

const PATTERN_COPY = {
  local: {
    label: "Local runtime state",
    badge: "local",
    summary:
      "The primitive owns open, selected, and active state. The controller only derives adjacent UI after the runtime commits a change.",
    checklistOne:
      "Keep the selected value inside the primitive when no other surface needs it.",
    checklistTwo:
      "Mirror only the summary or CTA text that depends on that selection.",
    nextStep: "If the rest of the page does not care, stop at the primitive.",
  },
  shared: {
    label: "Shared page state",
    badge: "shared",
    summary:
      "Use Stimulus when one primitive event needs to update multiple server-rendered surfaces in the same subtree.",
    checklistOne:
      "Listen to select:change, tabs:change, or toggle:change from the primitive.",
    checklistTwo:
      "Use a valueChanged callback to update sibling UI after the selection is committed.",
    nextStep:
      "Dispatch app-level events only after the primitive has already settled on the new value.",
  },
  persisted: {
    label: "Restored application state",
    badge: "persisted",
    summary:
      "URL params, saved preferences, and server data belong to the app layer. Restore the primitive, then let future changes flow back out through runtime events.",
    checklistOne:
      "Read the initial value from the URL, server payload, or saved preference on connect.",
    checklistTwo:
      "Restore the primitive with events like select:set, tabs:set, or toggle:set instead of mutating classes manually.",
    nextStep:
      "After restore, keep the primitive as the source of truth for its internal active state.",
  },
} satisfies Record<
  PatternId,
  {
    label: string;
    badge: string;
    summary: string;
    checklistOne: string;
    checklistTwo: string;
    nextStep: string;
  }
>;

export default class extends Controller<HTMLElement> {
  static targets = [
    "select",
    "title",
    "badge",
    "summary",
    "checklistOne",
    "checklistTwo",
    "nextStep",
    "logContainer",
  ];

  static values = {
    pattern: String,
  };

  declare readonly selectTarget: HTMLElement;
  declare readonly titleTarget: HTMLElement;
  declare readonly badgeTarget: HTMLElement;
  declare readonly summaryTarget: HTMLElement;
  declare readonly checklistOneTarget: HTMLElement;
  declare readonly checklistTwoTarget: HTMLElement;
  declare readonly nextStepTarget: HTMLElement;
  declare readonly hasLogContainerTarget: boolean;
  declare readonly logContainerTarget: HTMLElement;
  declare readonly hasPatternValue: boolean;
  declare patternValue: string;

  private isReady = false;

  connect() {
    this.isReady = true;
    this.renderPattern(this.currentPattern);
  }

  patternValueChanged(value: string) {
    if (!this.isReady) {
      return;
    }

    this.renderPattern(this.normalizePattern(value));
  }

  patternChanged(event: Event) {
    const { value } = (event as CustomEvent<SelectChangeDetail>).detail;
    const pattern = this.normalizePattern(value);

    this.patternValue = pattern;
    this.log(`select:change → value: "${pattern}"`);
  }

  restore(
    event: Event & {
      params: { pattern?: string };
    },
  ) {
    const pattern = this.normalizePattern(event.params.pattern);

    this.patternValue = pattern;
    this.selectTarget.dispatchEvent(
      new CustomEvent("select:set", {
        detail: { value: pattern },
      }),
    );
    this.log(`select:set → value: "${pattern}"`);
  }

  private get currentPattern(): PatternId {
    return this.normalizePattern(this.hasPatternValue ? this.patternValue : null);
  }

  private normalizePattern(value: string | null | undefined): PatternId {
    if (value && value in PATTERN_COPY) {
      return value as PatternId;
    }

    return "local";
  }

  private renderPattern(pattern: PatternId) {
    const copy = PATTERN_COPY[pattern];

    this.titleTarget.textContent = copy.label;
    this.badgeTarget.textContent = copy.badge;
    this.summaryTarget.textContent = copy.summary;
    this.checklistOneTarget.textContent = copy.checklistOne;
    this.checklistTwoTarget.textContent = copy.checklistTwo;
    this.nextStepTarget.textContent = copy.nextStep;
  }

  private log(message: string) {
    if (!this.hasLogContainerTarget) {
      return;
    }

    const panel = this.logContainerTarget.querySelector("[data-slot='event-log']") as
      | (HTMLPreElement & { _log?: (message: string) => void })
      | null;

    panel?._log?.(message);
  }
}
