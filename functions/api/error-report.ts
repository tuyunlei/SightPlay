import {
  handleGetErrorReport,
  handlePostErrorReport,
  onRequestOptions,
} from '../../edge-functions/api/error-report';
import { createCloudflareContext } from '../../edge-functions/platform';
import type { PagesFunction } from '../_types';

export { onRequestOptions };

export const onRequestGet: PagesFunction = async (context) => {
  return handleGetErrorReport(createCloudflareContext(context));
};

export const onRequestPost: PagesFunction = async (context) => {
  return handlePostErrorReport(createCloudflareContext(context));
};
