import { selectGuidanceView, type GuidanceView } from '../model/selectors';
import { createGuidanceState, transitionGuidance } from '../model/transition';
import type {
  GuidanceAction,
  GuidanceContext,
  GuidanceEffect,
  GuidanceOutput,
  GuidanceRecommendationAction,
  GuidanceState,
  PracticeGuidanceObservation,
} from '../model/types';
import type { GuidancePorts } from '../ports';

export type GuidanceIntent =
  | { readonly kind: 'changeContext'; readonly context: GuidanceContext }
  | { readonly kind: 'sendMessage'; readonly text: string }
  | { readonly kind: 'observePractice'; readonly observation: PracticeGuidanceObservation }
  | { readonly kind: 'dismissHint' }
  | { readonly kind: 'dismissRecommendation'; readonly id: string }
  | { readonly kind: 'applyRecommendation'; readonly id: string };

export interface GuidanceRuntime {
  getState(): GuidanceState;
  getView(): GuidanceView;
  subscribe(listener: () => void): () => void;
  onOutput(listener: (output: GuidanceOutput) => void): () => void;
  dispatch(intent: GuidanceIntent): void;
  start(): void;
  dispose(): void;
}

export class GuidanceRuntimeImpl implements GuidanceRuntime {
  private state: GuidanceState;
  private view: GuidanceView;
  private active = false;
  private generation = 0;
  private readonly listeners = new Set<() => void>();
  private readonly outputListeners = new Set<(output: GuidanceOutput) => void>();
  private readonly requests = new Map<number, AbortController>();
  private readonly timers = new Map<number, () => void>();

  constructor(
    private readonly ports: GuidancePorts,
    private readonly initialContext: GuidanceContext
  ) {
    this.state = createGuidanceState(initialContext);
    this.view = selectGuidanceView(this.state);
  }

  readonly getState = () => this.state;
  readonly getView = () => this.view;
  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  readonly onOutput = (listener: (output: GuidanceOutput) => void) => {
    this.outputListeners.add(listener);
    return () => this.outputListeners.delete(listener);
  };
  readonly dispatch = (intent: GuidanceIntent) => this.dispatchIntent(intent);

  start(): void {
    if (this.active) return;
    this.active = true;
    this.generation += 1;
    this.state = createGuidanceState(this.state.context);
    this.commitView();
  }

  dispose(): void {
    if (!this.active) return;
    this.active = false;
    this.generation += 1;
    this.requests.forEach((controller) => controller.abort());
    this.requests.clear();
    this.timers.forEach((cancel) => cancel());
    this.timers.clear();
  }

  private dispatchIntent(intent: GuidanceIntent): void {
    if (!this.active) return;
    const action: GuidanceAction =
      intent.kind === 'changeContext'
        ? { kind: 'contextChanged', context: intent.context }
        : intent.kind === 'sendMessage'
          ? { kind: 'messageSubmitted', text: intent.text }
          : intent.kind === 'observePractice'
            ? { kind: 'practiceObserved', observation: intent.observation }
            : intent.kind === 'dismissHint'
              ? { kind: 'hintDismissed' }
              : intent.kind === 'dismissRecommendation'
                ? { kind: 'recommendationDismissed', id: intent.id }
                : { kind: 'recommendationApplied', id: intent.id };
    this.dispatchAction(action);
  }

  private dispatchAction(action: GuidanceAction): void {
    if (!this.active) return;
    const transition = transitionGuidance(this.state, action);
    if (transition.state !== this.state) {
      this.state = transition.state;
      this.commitView();
    }
    const generation = this.generation;
    transition.effects.forEach((effect) => this.runEffect(effect, generation));
  }

  private runEffect(effect: GuidanceEffect, generation: number): void {
    if (!this.isCurrent(generation)) return;
    if (effect.kind === 'requestChat') {
      void this.requestChat(effect, generation);
      return;
    }
    if (effect.kind === 'scheduleHintDismiss') {
      this.cancelTimer(effect.token);
      const cancel = this.ports.scheduler.schedule(effect.delayMs, () => {
        this.timers.delete(effect.token);
        if (this.isCurrent(generation)) {
          this.dispatchAction({ kind: 'hintTimerElapsed', token: effect.token });
        }
      });
      this.timers.set(effect.token, cancel);
      return;
    }
    if (effect.kind === 'cancelHintDismiss') {
      this.cancelTimer(effect.token);
      return;
    }
    this.outputListeners.forEach((listener) => listener(effect.output));
  }

  private async requestChat(
    effect: Extract<GuidanceEffect, { kind: 'requestChat' }>,
    generation: number
  ): Promise<void> {
    const controller = new AbortController();
    this.requests.set(effect.operation, controller);
    const result = await this.ports.chat
      .request({ message: effect.message, context: effect.context }, controller.signal)
      .catch(() => ({ ok: false as const, failure: 'internal' as const }));
    this.requests.delete(effect.operation);
    if (!this.isCurrent(generation)) return;
    this.dispatchAction(
      effect.purpose === 'conversation'
        ? { kind: 'chatResolved', operation: effect.operation, result }
        : {
            kind: 'hintResolved',
            operation: effect.operation,
            type: effect.purpose,
            result,
            now: this.ports.clock.now(),
          }
    );
  }

  private cancelTimer(token: number): void {
    this.timers.get(token)?.();
    this.timers.delete(token);
  }

  private commitView(): void {
    this.view = selectGuidanceView(this.state);
    this.listeners.forEach((listener) => listener());
  }

  private isCurrent(generation: number): boolean {
    return this.active && this.generation === generation;
  }
}

export function createGuidanceRuntime(
  ports: GuidancePorts,
  initialContext: GuidanceContext
): GuidanceRuntime {
  return new GuidanceRuntimeImpl(ports, initialContext);
}

export type { GuidanceOutput, GuidanceRecommendationAction };
