import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { flowNodeService } from '$lib/services/flowNode';

export async function GET({ params }: { params: { id: string } }) {
  try {
    const node = await flowNodeService.getFlowNodeById(params.id);
    if (!node) {
      return json({ success: false, message: '流程节点不存在' }, { status: 404 });
    }
    return json({ success: true, node });
  } catch (error) {
    console.error('Get flow node error:', error);
    return json({ success: false, message: '获取流程节点失败' }, { status: 500 });
  }
}

export async function PUT({ params, request }: { params: { id: string }; request: Request }) {
  try {
    const body = await request.json();
    const { node_name, node_type, phase_config, operate_roles, next_node_rules, is_auto_advance, timeout_seconds, description, is_active } = body;

    const node = await flowNodeService.updateFlowNode(params.id, {
      node_name,
      node_type,
      phase_config,
      operate_roles,
      next_node_rules,
      is_auto_advance,
      timeout_seconds,
      description,
      is_active,
    }, 'system');

    return json({ success: true, node });
  } catch (error) {
    console.error('Update flow node error:', error);
    return json({ success: false, message: '更新流程节点失败' }, { status: 500 });
  }
}

export async function DELETE({ params }: { params: { id: string } }) {
  try {
    await flowNodeService.deleteFlowNode(params.id);
    return json({ success: true, message: '删除流程节点成功' });
  } catch (error) {
    console.error('Delete flow node error:', error);
    return json({ success: false, message: '删除流程节点失败' }, { status: 500 });
  }
}

export async function PATCH({ params, request }: { params: { id: string }; request: Request }) {
  try {
    const body = await request.json();
    const { is_active } = body;

    if (typeof is_active !== 'number') {
      return json({ success: false, message: 'is_active 必须是数字' }, { status: 400 });
    }

    const node = await flowNodeService.toggleFlowNodeActive(params.id, is_active, 'system');
    return json({ success: true, node });
  } catch (error) {
    console.error('Toggle flow node active error:', error);
    return json({ success: false, message: '更新流程节点状态失败' }, { status: 500 });
  }
}
