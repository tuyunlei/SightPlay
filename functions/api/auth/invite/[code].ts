import {
  handleGetInviteByCode,
  onRequestOptions,
} from '../../../../edge-functions/api/auth/invite';
import { createCloudflareContext } from '../../../../edge-functions/platform';
import type { PagesFunction } from '../../../_types';

export { onRequestOptions };

export const onRequestGet: PagesFunction = async (context) => {
  return handleGetInviteByCode(createCloudflareContext(context));
};
