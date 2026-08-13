import { createRandomExercise } from '../model/exercise';
import { selectPracticeView, type PracticeView } from '../model/selectors';
import { createPracticeState, transitionPractice } from '../model/transition';
import {
  type ExercisePlan,
  type InstrumentObservation,
  type PracticeAction,
  type PracticeEffect,
  type PracticeState,
  type RandomExerciseConfig,
} from '../model/types';
import type { MidiInputSignal, PracticePorts } from '../ports';

import type { PracticeIntent, PracticeOutput, PracticeRuntime } from './contracts';

export class PracticeRuntimeImpl implements PracticeRuntime {
  private state: PracticeState;
  private view: PracticeView;
  private active = false;
  private generation = 0;
  private readonly listeners = new Set<() => void>();
  private readonly outputListeners = new Set<(output: PracticeOutput) => void>();
  private readonly cancellations = new Set<() => void>();

  constructor(
    private readonly ports: PracticePorts,
    private readonly initialPlan: ExercisePlan
  ) {
    this.state = createPracticeState(initialPlan, 0);
    this.view = selectPracticeView(this.state);
  }

  readonly getState = () => this.state;
  readonly getView = () => this.view;
  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  readonly onOutput = (listener: (output: PracticeOutput) => void) => {
    this.outputListeners.add(listener);
    return () => this.outputListeners.delete(listener);
  };
  readonly dispatch = (intent: PracticeIntent) => this.dispatchIntent(intent);

  start(): void {
    if (this.active) return;
    this.active = true;
    this.generation += 1;
    this.state = createPracticeState(this.initialPlan, this.ports.clock.now(), this.state.epoch);
    this.view = selectPracticeView(this.state);
    this.notify();
    const generation = this.generation;
    void this.ports.midi
      .start((signal) => this.receiveMidi(signal, generation))
      .catch(() => this.receiveMidi({ kind: 'connectionChanged', connected: false }, generation));
  }

  dispose(): void {
    if (!this.active) return;
    this.active = false;
    this.generation += 1;
    this.cancelScheduledEffects();
    this.ports.microphone.dispose();
    this.ports.midi.dispose();
  }

  private dispatchIntent(intent: PracticeIntent): void {
    if (!this.active) return;
    if (intent.kind === 'startExercise') {
      this.replaceExercise(intent.plan);
      return;
    }
    if (intent.kind === 'restartExercise') {
      this.replaceExercise(this.state.plan);
      return;
    }
    if (intent.kind === 'configureRandom') {
      this.replaceRandomExercise(intent.config);
      return;
    }
    if (intent.kind === 'selectClef') {
      this.updateRandomConfig({ clef: intent.clef });
      return;
    }
    if (intent.kind === 'selectPracticeRange') {
      this.updateRandomConfig({ practiceRange: intent.practiceRange });
      return;
    }
    if (intent.kind === 'selectHandMode') {
      this.updateRandomConfig({ handMode: intent.handMode });
      return;
    }
    if (intent.kind === 'toggleMicrophone') {
      this.dispatchAction({ kind: 'microphoneStartRequested' });
      return;
    }
    if (intent.kind === 'resetStats') {
      this.dispatchAction({ kind: 'statsReset', now: this.ports.clock.now() });
    }
  }

  private replaceExercise(plan: ExercisePlan): void {
    this.cancelScheduledEffects();
    this.ports.microphone.stop();
    this.dispatchAction({ kind: 'exerciseStarted', plan, now: this.ports.clock.now() });
  }

  private updateRandomConfig(change: Partial<RandomExerciseConfig>): void {
    if (this.state.plan.kind !== 'generated') return;
    this.replaceRandomExercise({ ...this.state.plan.config, ...change });
  }

  private replaceRandomExercise(config: RandomExerciseConfig): void {
    const plan = createRandomExercise({ seed: this.ports.seed.nextSeed(), config });
    if (plan.ok) this.replaceExercise(plan.value);
  }

  private receiveMidi(signal: MidiInputSignal, generation: number): void {
    if (!this.isCurrent(generation)) return;
    const at = this.ports.clock.now();
    const observation: InstrumentObservation =
      signal.kind === 'connectionChanged'
        ? { kind: 'midiConnectionChanged', connected: signal.connected, at }
        : {
            kind: signal.kind === 'pressed' ? 'midiPressed' : 'midiReleased',
            pitch: signal.pitch,
            at,
          };
    this.dispatchAction({ kind: 'instrumentObserved', observation });
  }

  private dispatchAction(action: PracticeAction): void {
    if (!this.active) return;
    const transition = transitionPractice(this.state, action);
    if (transition.state !== this.state) {
      this.state = transition.state;
      this.view = selectPracticeView(this.state);
      this.notify();
    }
    const generation = this.generation;
    transition.effects.forEach((effect) => this.runEffect(effect, generation));
  }

  private runEffect(effect: PracticeEffect, generation: number): void {
    if (!this.isCurrent(generation)) return;
    if (effect.kind === 'attemptAccepted') {
      this.outputListeners.forEach((listener) =>
        listener({
          kind: 'attemptAccepted',
          epoch: effect.epoch,
          plan: effect.plan,
          hadMistake: effect.hadMistake,
          score: effect.score,
          streak: effect.streak,
          stats: effect.stats,
          acceptedAt: effect.acceptedAt,
        })
      );
      return;
    }
    if (effect.kind === 'schedule') {
      this.scheduleEffect(effect, generation);
      return;
    }
    if (effect.kind === 'startMicrophone') {
      void this.startMicrophone(effect.epoch, generation);
      return;
    }
    if (effect.kind === 'stopMicrophone') {
      this.ports.microphone.stop();
      return;
    }
    if (effect.kind === 'microphoneFailed') {
      this.outputListeners.forEach((listener) => listener({ kind: 'microphoneFailed' }));
      return;
    }
    this.outputListeners.forEach((listener) =>
      listener({
        kind: 'exerciseCompleted',
        epoch: effect.epoch,
        plan: effect.plan,
        score: effect.score,
        streak: effect.streak,
        stats: effect.stats,
        completedAt: effect.completedAt,
      })
    );
  }

  private scheduleEffect(
    effect: Extract<PracticeEffect, { kind: 'schedule' }>,
    generation: number
  ): void {
    let cancel = () => {};
    cancel = this.ports.scheduler.schedule(effect.delayMs, () => {
      this.cancellations.delete(cancel);
      if (!this.isCurrent(generation)) return;
      this.dispatchAction({
        kind: 'effectElapsed',
        epoch: effect.epoch,
        token: effect.token,
        effect: effect.effect,
        ...(effect.frameId ? { frameId: effect.frameId } : {}),
        now: this.ports.clock.now(),
      });
    });
    this.cancellations.add(cancel);
  }

  private async startMicrophone(epoch: PracticeState['epoch'], generation: number): Promise<void> {
    try {
      await this.ports.microphone.start((pitch) => {
        if (!this.isCurrentEpoch(epoch, generation)) return;
        this.dispatchAction({
          kind: 'instrumentObserved',
          observation: { kind: 'microphonePitch', pitch, at: this.ports.clock.now() },
        });
      });
      if (this.isCurrentEpoch(epoch, generation)) {
        this.dispatchAction({ kind: 'microphoneStarted' });
      }
    } catch {
      if (this.isCurrentEpoch(epoch, generation)) {
        this.dispatchAction({ kind: 'microphoneStartFailed' });
      }
    }
  }

  private cancelScheduledEffects(): void {
    this.cancellations.forEach((cancel) => cancel());
    this.cancellations.clear();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  private isCurrent(generation: number): boolean {
    return this.active && this.generation === generation;
  }

  private isCurrentEpoch(epoch: PracticeState['epoch'], generation: number): boolean {
    return this.isCurrent(generation) && this.state.epoch === epoch;
  }
}

export function createPracticeRuntime(
  ports: PracticePorts,
  initialPlan: ExercisePlan
): PracticeRuntime {
  return new PracticeRuntimeImpl(ports, initialPlan);
}

export type { PracticeIntent, PracticeOutput, PracticeRuntime } from './contracts';
