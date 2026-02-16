import {
  handleGetInvite,
  handlePostInvite,
  onRequestOptions,
} from '../../../edge-functions/api/auth/invite';
import { createCloudflareContext } from '../../../edge-functions/platform';
import type { PagesFunction } from '../../_types';

export { onRequestOptions };

export const onRequestGet: PagesFunction = async (context) => {
  return handleGetInvite(createCloudflareContext(context));
};

export const onRequestPost: PagesFunction = async (context) => {
  return handlePostInvite(createCloudflareContext(context));
};
