-- 脚本3：扩展rooms表，添加AI玩家配置
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS allow_ai_players BOOLEAN DEFAULT TRUE;
