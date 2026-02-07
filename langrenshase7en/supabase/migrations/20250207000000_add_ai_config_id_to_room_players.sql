-- 添加AI配置ID字段到房间玩家表
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS ai_config_id UUID REFERENCES public.ai_configs(id) ON DELETE SET NULL;