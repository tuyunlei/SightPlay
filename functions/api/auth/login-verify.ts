import {
  handlePostLoginVerify,
  onRequestOptions,
} from '../../../edge-functions/api/auth/login-verify';
import { createCloudflareContext } from '../../../edge-functions/platform';
import type { PagesFunction } from '../../_types';

export { onRequestOptions };

export const onRequestPost: PagesFunction = async (context) => {
  return handlePostLoginVerify(createCloudflareContext(context));
};
