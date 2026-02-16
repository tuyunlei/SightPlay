import {
  handlePostRegisterOptions,
  onRequestOptions,
} from '../../../edge-functions/api/auth/register-options';
import { createCloudflareContext } from '../../../edge-functions/platform';
import type { PagesFunction } from '../../_types';

export { onRequestOptions };

export const onRequestPost: PagesFunction = async (context) => {
  return handlePostRegisterOptions(createCloudflareContext(context));
};
