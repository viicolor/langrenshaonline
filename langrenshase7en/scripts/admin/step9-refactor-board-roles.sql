-- 脚本1.3：重构 board_roles 表，添加 card_id 外键
-- 将 board_roles 表从直接存储 role_type 改为关联 cards 表

-- 先备份现有数据（以防万一）
CREATE TABLE IF NOT EXISTS public.board_roles_backup AS 
SELECT * FROM public.board_roles;

-- 添加 card_id 字段
ALTER TABLE public.board_roles ADD COLUMN IF NOT EXISTS card_id UUID;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_board_roles_board_id ON public.board_roles(board_id);
CREATE INDEX IF NOT EXISTS idx_board_roles_card_id ON public.board_roles(card_id);

-- 验证表结构
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'board_roles'
  AND table_schema = 'public'
ORDER BY ordinal_position;
