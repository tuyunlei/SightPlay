import { createEdgeOneContext, type EdgeOneRequestContext } from '../../../platform';
import { handleGetInviteByCode, onRequestOptions } from '../invite';

export { onRequestOptions };

export async function onRequestGet(context: EdgeOneRequestContext): Promise<Response> {
  return handleGetInviteByCode(createEdgeOneContext(context));
}
