import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { boardFlowService } from '$lib/services/flowNode';

export async function GET({ params }: { params: { boardId: string } }) {
  try {
    const { flows } = await boardFlowService.getBoardFlows(params.boardId);
    return json({ success: true, flows });
  } catch (error) {
    console.error('Get board flows error:', error);
    return json({ success: false, message: '获取板子流程失败' }, { status: 500 });
  }
}

export async function POST({ params, request }: { params: { boardId: string }; request: Request }) {
  try {
    const body = await request.json();
    const { flow_node_id, execution_order, is_active } = body;

    if (!flow_node_id || !execution_order) {
      return json({ success: false, message: '流程节点ID和执行顺序不能为空' }, { status: 400 });
    }

    const mapping = await boardFlowService.addFlowToBoard({
      board_id: params.boardId,
      flow_node_id,
      execution_order,
      is_active: is_active ?? 1,
    }, 'system');

    return json({ success: true, mapping });
  } catch (error) {
    console.error('Add flow to board error:', error);
    return json({ success: false, message: '添加流程到板子失败' }, { status: 500 });
  }
}
