import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { boardFlowService } from '$lib/services/flowNode';

export async function DELETE({ params }: { params: { boardId: string; mappingId: string } }) {
  try {
    await boardFlowService.removeFlowFromBoard(params.mappingId);
    return json({ success: true, message: '删除流程成功' });
  } catch (error) {
    console.error('Remove flow from board error:', error);
    return json({ success: false, message: '删除流程失败' }, { status: 500 });
  }
}

export async function PATCH({ params, request }: { params: { boardId: string; mappingId: string }; request: Request }) {
  try {
    const body = await request.json();
    const { execution_order, is_active } = body;

    const mapping = await boardFlowService.updateFlowMappingOrder(
      params.mappingId,
      execution_order,
      'system'
    );

    if (is_active !== undefined) {
      const updatedMapping = await boardFlowService.toggleFlowMappingActive(
        params.mappingId,
        is_active,
        'system'
      );
      return json({ success: true, mapping: updatedMapping });
    }

    return json({ success: true, mapping });
  } catch (error) {
    console.error('Update board flow error:', error);
    return json({ success: false, message: '更新板子流程失败' }, { status: 500 });
  }
}
