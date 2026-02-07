-- 修复脚本：为现有板子设置 is_delete = 0
-- 确保 step18 脚本创建的板子可以被查询到

UPDATE public.boards
SET is_delete = 0
WHERE is_delete IS NULL;

-- 验证更新结果
SELECT 
  id,
  name,
  description,
  player_count,
  is_delete,
  is_default,
  created_at
FROM public.boards
ORDER BY created_at DESC;
