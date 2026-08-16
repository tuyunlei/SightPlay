import type { IdentityFailureCode } from '@sightplay/identity-client';

import type { translations } from '../../i18n';

type Translation = (typeof translations)['en'];

export function identityFailureMessage(t: Translation, code: IdentityFailureCode): string {
  switch (code) {
    case 'userCanceled':
      return t.authErrorCanceled;
    case 'passkeysUnsupported':
      return t.authErrorPasskeysNotSupportedBrowser;
    case 'authenticatorUnavailable':
      return t.authErrorNotSupportedDevice;
    case 'connectionUnavailable':
      return t.authErrorConnectionTimeout;
    case 'loginOptionsRejected':
      return t.authErrorLoginOptionsFailed;
    case 'loginVerificationRejected':
      return t.authErrorLoginVerificationFailed;
    case 'registrationOptionsRejected':
      return t.authErrorRegisterOptionsFailed;
    case 'registrationVerificationRejected':
      return t.authErrorRegisterVerificationFailed;
    case 'sessionUnavailable':
    case 'logoutRejected':
    case 'invalidResponse':
    case 'unknown':
      return t.authErrorUnknown;
    default: {
      const exhaustive: never = code;
      return exhaustive;
    }
  }
}
