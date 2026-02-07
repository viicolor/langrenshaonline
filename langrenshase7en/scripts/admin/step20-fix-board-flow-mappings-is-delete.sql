-- 修复脚本：为现有板子流程映射设置 is_delete = 0
-- 确保 step17 脚本创建的板子流程映射可以被查询到

UPDATE public.board_flow_mappings
SET is_delete = 0
WHERE is_delete IS NULL;

-- 验证更新结果
SELECT 
  bfm.id,
  b.name as board_name,
  gfn.node_name,
  gfn.node_code,
  bfm.execution_order,
  bfm.is_active,
  bfm.is_delete,
  bfm.create_time
FROM public.board_flow_mappings bfm
JOIN public.boards b ON bfm.board_id = b.id
JOIN public.game_flow_nodes gfn ON bfm.flow_node_id = gfn.id
ORDER BY b.name, bfm.execution_order;
