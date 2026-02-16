import { handleGetSession, onRequestOptions } from '../../../edge-functions/api/auth/session';
import { createCloudflareContext } from '../../../edge-functions/platform';
import type { PagesFunction } from '../../_types';

export { onRequestOptions };

export const onRequestGet: PagesFunction = async (context) => {
  return handleGetSession(createCloudflareContext(context));
};
