-- 脚本1：扩展boards表，添加后台管理字段
-- 只添加新字段，不修改现有数据

ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS board_alias VARCHAR(50);
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS player_num INTEGER;
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS character_config JSONB;
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS global_config_ids VARCHAR(200);
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS process_ids VARCHAR(200);
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS difficult SMALLINT DEFAULT 1;
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS status SMALLINT DEFAULT 1;
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS recommend SMALLINT DEFAULT 0;
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS create_by VARCHAR(30);
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS update_by VARCHAR(30);
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS is_delete SMALLINT DEFAULT 0;

-- 更新现有板子，添加后台管理字段默认值
UPDATE public.boards 
SET 
  player_num = player_count,
  board_alias = name,
  difficult = 1,
  status = 1,
  recommend = 1
WHERE player_num IS NULL;
