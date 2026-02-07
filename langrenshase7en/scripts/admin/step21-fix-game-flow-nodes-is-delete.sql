-- 修复脚本：为现有流程节点设置 is_delete = 0
-- 确保 step17 脚本创建的流程节点可以被查询到

UPDATE public.game_flow_nodes
SET is_delete = 0
WHERE is_delete IS NULL;

-- 验证更新结果
SELECT 
  id,
  node_name,
  node_code,
  node_type,
  is_system,
  is_active,
  is_delete,
  create_time
FROM public.game_flow_nodes
ORDER BY create_time DESC;
