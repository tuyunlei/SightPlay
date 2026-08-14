import { handleServerRequest } from '@sightplay/server-application';

import { createCloudflareContext } from '../edge-functions/platform';

import type { PagesFunction } from './_types';

export const handlePagesRequest: PagesFunction = async (context) =>
  handleServerRequest(createCloudflareContext(context));
