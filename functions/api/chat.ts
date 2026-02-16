import { handlePostChat, onRequestOptions } from '../../edge-functions/api/chat';
import { createCloudflareContext } from '../../edge-functions/platform';
import type { PagesFunction } from '../_types';

export { onRequestOptions };

export const onRequestPost: PagesFunction = async (context) => {
  return handlePostChat(createCloudflareContext(context));
};
