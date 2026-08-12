import { selectIdentityView, type IdentityView } from '../model/selectors';
import { resetIdentityState, transitionIdentity } from '../model/transition';
import type {
  IdentityAction,
  IdentityEffect,
  IdentityFailure,
  IdentityIntent,
  IdentityResultAction,
  IdentityState,
} from '../model/types';
import type { IdentityPorts, PortResult } from '../ports';

export interface IdentityRuntime {
  getState(): IdentityState;
  getView(): IdentityView;
  subscribe(listener: () => void): () => void;
  dispatch(intent: IdentityIntent): void;
  start(): void;
  dispose(): void;
}

const unknownFailure: IdentityFailure = { code: 'unknown', retryable: true };

class IdentityRuntimeImpl implements IdentityRuntime {
  private state = resetIdentityState();
  private active = false;
  private generation = 0;
  private readonly listeners = new Set<() => void>();
  private readonly controllers = new Set<AbortController>();

  constructor(private readonly ports: IdentityPorts) {}

  readonly getState = () => this.state;
  readonly getView = () => selectIdentityView(this.state);
  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  readonly dispatch = (intent: IdentityIntent) => this.dispatchAction(intent);

  start(): void {
    if (this.active) return;
    this.state = resetIdentityState();
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

  private isCurrent(effectGeneration: number): boolean {
    return this.active && this.generation === effectGeneration;
  }

  private dispatchAction(action: IdentityAction): void {
    if (!this.active) return;
    const transition = transitionIdentity(this.state, action);
    if (transition.state !== this.state) {
      this.state = transition.state;
      this.notify();
    }
    const effectGeneration = this.generation;
    transition.effects.forEach((effect) => this.runEffect(effect, effectGeneration));
  }

  private settle<T>(
    operationId: number,
    result: PortResult<T>,
    success: (value: T) => IdentityResultAction,
    effectGeneration: number
  ): void {
    if (!this.isCurrent(effectGeneration)) return;
    this.dispatchAction(
      result.ok
        ? success(result.value)
        : { kind: 'operationFailed', operationId, failure: result.failure }
    );
  }

  private async invoke<T>(
    operationId: number,
    call: (signal: AbortSignal) => Promise<PortResult<T>>,
    success: (value: T) => IdentityResultAction,
    effectGeneration: number
  ): Promise<void> {
    const controller = new AbortController();
    this.controllers.add(controller);
    try {
      this.settle(operationId, await call(controller.signal), success, effectGeneration);
    } catch {
      this.settle(operationId, { ok: false, failure: unknownFailure }, success, effectGeneration);
    } finally {
      this.controllers.delete(controller);
    }
  }

  private runApiEffect(effect: IdentityEffect, effectGeneration: number): boolean {
    if (effect.kind === 'loadSession') {
      void this.invoke(
        effect.operationId,
        (signal) => this.ports.api.loadSession(signal),
        (session) => ({ kind: 'sessionLoaded', operationId: effect.operationId, session }),
        effectGeneration
      );
      return true;
    }
    if (effect.kind === 'requestLoginOptions') {
      void this.invoke(
        effect.operationId,
        (signal) => this.ports.api.requestLoginOptions(signal),
        (options) => ({ kind: 'loginOptionsReceived', operationId: effect.operationId, options }),
        effectGeneration
      );
      return true;
    }
    if (effect.kind === 'requestRegistrationOptions') {
      void this.invoke(
        effect.operationId,
        (signal) => this.ports.api.requestRegistrationOptions(effect.inviteCode, signal),
        (options) => ({
          kind: 'registrationOptionsReceived',
          operationId: effect.operationId,
          options,
        }),
        effectGeneration
      );
      return true;
    }
    return false;
  }

  private runVerificationEffect(effect: IdentityEffect, effectGeneration: number): boolean {
    if (effect.kind === 'verifyLogin') {
      void this.invoke(
        effect.operationId,
        (signal) => this.ports.api.verifyLogin(effect.credential, signal),
        () => ({ kind: 'verificationAccepted', operationId: effect.operationId }),
        effectGeneration
      );
      return true;
    }
    if (effect.kind === 'verifyRegistration') {
      const input = {
        credential: effect.credential,
        inviteCode: effect.inviteCode,
        ...(effect.name ? { name: effect.name } : {}),
      };
      void this.invoke(
        effect.operationId,
        (signal) => this.ports.api.verifyRegistration(input, signal),
        () => ({ kind: 'verificationAccepted', operationId: effect.operationId }),
        effectGeneration
      );
      return true;
    }
    if (effect.kind === 'logout') {
      void this.invoke(
        effect.operationId,
        (signal) => this.ports.api.logout(signal),
        () => ({ kind: 'logoutCompleted', operationId: effect.operationId }),
        effectGeneration
      );
      return true;
    }
    return false;
  }

  private runPasskeyEffect(effect: IdentityEffect, effectGeneration: number): boolean {
    if (effect.kind === 'checkPasskeySupport') {
      this.resolvePasskeySupport(effect.operationId);
      return true;
    }
    if (effect.kind === 'authenticatePasskey') {
      void this.invoke(
        effect.operationId,
        () => this.ports.passkey.authenticate(effect.options),
        (credential) => ({
          kind: 'authenticationCreated',
          operationId: effect.operationId,
          credential,
        }),
        effectGeneration
      );
      return true;
    }
    if (effect.kind === 'createPasskey') {
      void this.invoke(
        effect.operationId,
        () => this.ports.passkey.register(effect.options),
        (credential) => ({
          kind: 'registrationCreated',
          operationId: effect.operationId,
          credential,
        }),
        effectGeneration
      );
      return true;
    }
    return false;
  }

  private resolvePasskeySupport(operationId: number): void {
    try {
      this.dispatchAction({
        kind: 'passkeySupportResolved',
        operationId,
        supported: this.ports.passkey.isSupported(),
      });
    } catch {
      this.dispatchAction({ kind: 'operationFailed', operationId, failure: unknownFailure });
    }
  }

  private runEffect(effect: IdentityEffect, effectGeneration: number): void {
    if (!this.isCurrent(effectGeneration)) return;
    switch (effect.kind) {
      case 'reportFailure':
        this.ports.telemetry.reportFailure(effect);
        return;
      case 'loadSession':
      case 'requestLoginOptions':
      case 'requestRegistrationOptions':
        this.runApiEffect(effect, effectGeneration);
        return;
      case 'verifyLogin':
      case 'verifyRegistration':
      case 'logout':
        this.runVerificationEffect(effect, effectGeneration);
        return;
      case 'checkPasskeySupport':
      case 'authenticatePasskey':
      case 'createPasskey':
        this.runPasskeyEffect(effect, effectGeneration);
        return;
      default: {
        const exhaustive: never = effect;
        throw new Error(`Unhandled Identity effect: ${JSON.stringify(exhaustive)}`);
      }
    }
  }
}

export function createIdentityRuntime(ports: IdentityPorts): IdentityRuntime {
  return new IdentityRuntimeImpl(ports);
}
