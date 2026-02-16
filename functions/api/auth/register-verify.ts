import {
  handlePostRegisterVerify,
  onRequestOptions,
} from '../../../edge-functions/api/auth/register-verify';
import { createCloudflareContext } from '../../../edge-functions/platform';
import type { PagesFunction } from '../../_types';

export { onRequestOptions };

export const onRequestPost: PagesFunction = async (context) => {
  return handlePostRegisterVerify(createCloudflareContext(context));
};
