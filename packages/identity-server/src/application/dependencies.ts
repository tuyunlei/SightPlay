import type { IdentityPolicy } from '../model/policy';
import type { IdentityServerPorts } from '../ports';

export interface IdentityUseCaseDependencies extends IdentityServerPorts {
  readonly policy: IdentityPolicy;
}
