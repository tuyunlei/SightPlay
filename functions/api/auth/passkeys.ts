import {
  handleDeletePasskey,
  handleGetPasskeys,
  onRequestOptions,
} from '../../../edge-functions/api/auth/passkeys';
import { createCloudflareContext } from '../../../edge-functions/platform';
import type { PagesFunction } from '../../_types';

export { onRequestOptions };

export const onRequestGet: PagesFunction = async (context) => {
  return handleGetPasskeys(createCloudflareContext(context));
};

export const onRequestDelete: PagesFunction = async (context) => {
  return handleDeletePasskey(createCloudflareContext(context));
};
