-- 脚本4：扩展room_players表，添加AI玩家标识
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT FALSE;
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS ai_config_id UUID REFERENCES public.ai_configs(id);
