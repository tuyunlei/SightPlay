import {
  handlePostLoginOptions,
  onRequestOptions,
} from '../../../edge-functions/api/auth/login-options';
import { createCloudflareContext } from '../../../edge-functions/platform';
import type { PagesFunction } from '../../_types';

export { onRequestOptions };

export const onRequestPost: PagesFunction = async (context) => {
  return handlePostLoginOptions(createCloudflareContext(context));
};
