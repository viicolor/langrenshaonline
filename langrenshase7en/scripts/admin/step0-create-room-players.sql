-- 脚本0：创建room_players表（如果不存在）
-- 用于房间玩家管理

CREATE TABLE IF NOT EXISTS public.room_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  player_name VARCHAR(100) NOT NULL,
  player_avatar TEXT,
  seat_number INTEGER,
  is_host BOOLEAN DEFAULT FALSE,
  is_ai BOOLEAN DEFAULT FALSE,
  ai_config_id UUID REFERENCES public.ai_configs(id) ON DELETE SET NULL,
  is_ready BOOLEAN DEFAULT FALSE,
  is_alive BOOLEAN DEFAULT TRUE,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_room_players_room ON public.room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_user ON public.room_players(user_id);
CREATE INDEX IF NOT EXISTS idx_room_players_seat ON public.room_players(room_id, seat_number);
