-- 脚本16：扩展 room_players 表（增加在线状态字段）
-- 用于支持心跳机制和掉线检测

-- 添加在线状态相关字段
ALTER TABLE public.room_players
ADD COLUMN IF NOT EXISTS player_state JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_heartbeat_time TIMESTAMP WITH TIME ZONE;

-- 添加注释
COMMENT ON COLUMN public.room_players.player_state IS '玩家状态（JSONB）：is_online, skills, hp等';
COMMENT ON COLUMN public.room_players.last_heartbeat_time IS '最后心跳时间，用于掉线检测';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_room_players_last_heartbeat ON public.room_players(last_heartbeat_time);
