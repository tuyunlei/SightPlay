import { createEdgeOneContext, type EdgeOneRequestContext } from '../../../platform';
import { handlePostInviteAdmin, onRequestOptions } from '../invite';

export { onRequestOptions };

export async function onRequestPost(context: EdgeOneRequestContext): Promise<Response> {
  return handlePostInviteAdmin(createEdgeOneContext(context));
}
