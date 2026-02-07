import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { flowNodeService, boardFlowService } from '$lib/services/flowNode';

export const GET: RequestHandler = async () => {
  try {
    const { nodes } = await flowNodeService.getFlowNodes();
    return json({ success: true, nodes });
  } catch (error) {
    console.error('Get flow nodes error:', error);
    return json({ success: false, message: '获取流程节点失败' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { node_name, node_code, node_type, phase_config, operate_roles, next_node_rules, is_auto_advance, timeout_seconds, description, is_system, is_active } = body;

    if (!node_name || !node_code || !node_type) {
      return json({ success: false, message: '节点名称、代码和类型不能为空' }, { status: 400 });
    }

    const node = await flowNodeService.createFlowNode({
      node_name,
      node_code,
      node_type,
      phase_config: phase_config || {},
      operate_roles: operate_roles || {},
      next_node_rules: next_node_rules || {},
      is_auto_advance: is_auto_advance ?? 1,
      timeout_seconds: timeout_seconds || 30,
      description: description || null,
      is_system: is_system ?? 0,
      is_active: is_active ?? 1,
    }, 'system');

    return json({ success: true, node });
  } catch (error) {
    console.error('Create flow node error:', error);
    return json({ success: false, message: '创建流程节点失败' }, { status: 500 });
  }
};
