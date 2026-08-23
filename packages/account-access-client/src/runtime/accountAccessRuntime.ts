import { resetAccountAccessState, transitionAccountAccess } from '../model/transition';
import type {
  AccountAccessAction,
  AccountAccessEffect,
  AccountAccessFailure,
  AccountAccessIntent,
  AccountAccessOutput,
  AccountAccessResultAction,
  AccountAccessState,
} from '../model/types';
import type { AccountAccessPorts, AccountAccessResult } from '../ports';

export interface AccountAccessRuntime {
  getState(): AccountAccessState;
  subscribe(listener: () => void): () => void;
  onOutput(listener: (output: AccountAccessOutput) => void): () => void;
  dispatch(intent: AccountAccessIntent): void;
  start(): void;
  dispose(): void;
}

const unknownFailure: AccountAccessFailure = { code: 'unknown', retryable: true };

class AccountAccessRuntimeImpl implements AccountAccessRuntime {
  private state = resetAccountAccessState();
  private active = false;
  private generation = 0;
  private readonly listeners = new Set<() => void>();
  private readonly outputListeners = new Set<(output: AccountAccessOutput) => void>();
  private readonly controllers = new Set<AbortController>();

  constructor(private readonly ports: AccountAccessPorts) {}

  readonly getState = () => this.state;
  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  readonly onOutput = (listener: (output: AccountAccessOutput) => void) => {
    this.outputListeners.add(listener);
    return () => this.outputListeners.delete(listener);
  };
  readonly dispatch = (intent: AccountAccessIntent) => this.dispatchAction(intent);

  start(): void {
    if (this.active) return;
    this.state = resetAccountAccessState();
    this.active = true;
    this.generation += 1;
    this.notify();
    this.dispatchAction({ kind: 'started' });
  }

  dispose(): void {
    if (!this.active) return;
    this.active = false;
    this.generation += 1;
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  private dispatchAction(action: AccountAccessAction): void {
    if (!this.active) return;
    const transition = transitionAccountAccess(this.state, action);
    if (transition.state !== this.state) {
      this.state = transition.state;
      this.notify();
    }
    transition.outputs.forEach((output) =>
      this.outputListeners.forEach((listener) => listener(output))
    );
    const effectGeneration = this.generation;
    transition.effects.forEach((effect) => this.runEffect(effect, effectGeneration));
  }

  private async invoke<T>(
    effect: AccountAccessEffect,
    call: (signal: AbortSignal) => Promise<AccountAccessResult<T>>,
    success: (value: T) => AccountAccessResultAction,
    effectGeneration: number
  ): Promise<void> {
    const controller = new AbortController();
    this.controllers.add(controller);
    try {
      const result = await call(controller.signal);
      if (!this.active || this.generation !== effectGeneration) return;
      this.dispatchAction(
        result.ok
          ? success(result.value)
          : { kind: 'operationFailed', operationId: effect.operationId, failure: result.failure }
      );
    } catch {
      if (this.active && this.generation === effectGeneration) {
        this.dispatchAction({
          kind: 'operationFailed',
          operationId: effect.operationId,
          failure: unknownFailure,
        });
      }
    } finally {
      this.controllers.delete(controller);
    }
  }

  private runEffect(effect: AccountAccessEffect, generation: number): void {
    if (effect.kind === 'loadAccountAccess') {
      void this.invoke(
        effect,
        (signal) => this.ports.api.loadAccountAccess(signal),
        (snapshot) => ({
          kind: 'accountAccessLoaded',
          operationId: effect.operationId,
          snapshot,
        }),
        generation
      );
      return;
    }
    if (effect.kind === 'createInvitationAccess') {
      void this.invoke(
        effect,
        (signal) => this.ports.api.createInvitationAccess(signal),
        ({ token, credential }) => ({
          kind: 'invitationAccessCreated',
          operationId: effect.operationId,
          token,
          credential,
        }),
        generation
      );
      return;
    }
    if (effect.kind === 'revokeInvitationAccess') {
      void this.invoke(
        effect,
        (signal) => this.ports.api.revokeInvitationAccess(signal),
        () => ({ kind: 'invitationAccessRevoked', operationId: effect.operationId }),
        generation
      );
      return;
    }
    if (effect.kind === 'createInvitation') {
      void this.invoke(
        effect,
        (signal) => this.ports.api.createInvitation(signal),
        (code) => ({ kind: 'invitationCreated', operationId: effect.operationId, code }),
        generation
      );
      return;
    }
    void this.invoke(
      effect,
      (signal) => this.ports.api.revokeCredential(effect.credentialId, signal),
      () => ({ kind: 'credentialRevoked', operationId: effect.operationId }),
      generation
    );
  }
}

export function createAccountAccessRuntime(ports: AccountAccessPorts): AccountAccessRuntime {
  return new AccountAccessRuntimeImpl(ports);
}
