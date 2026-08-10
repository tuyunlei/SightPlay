import { handlePostLogout, onRequestOptions } from '../../../edge-functions/api/auth/logout';
import { createCloudflareContext } from '../../../edge-functions/platform';
import type { PagesFunction } from '../../_types';

export { onRequestOptions };

export const onRequestPost: PagesFunction = async (context) => {
  return handlePostLogout(createCloudflareContext(context));
};
