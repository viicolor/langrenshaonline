-- 创建房间玩家表
CREATE TABLE public.room_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  player_name TEXT NOT NULL,
  player_avatar TEXT,
  seat_number INTEGER,
  is_ready BOOLEAN DEFAULT FALSE,
  is_alive BOOLEAN DEFAULT TRUE,
  role TEXT,
  is_host BOOLEAN DEFAULT FALSE,
  is_ai BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- 启用RLS
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

-- 允许任何人读取房间玩家
CREATE POLICY "Anyone can read room players" 
ON public.room_players 
FOR SELECT 
USING (true);

-- 允许认证用户加入房间
CREATE POLICY "Authenticated users can join room" 
ON public.room_players 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text OR is_ai = true);

-- 允许玩家更新自己的状态
CREATE POLICY "Players can update own status" 
ON public.room_players 
FOR UPDATE 
USING (auth.uid()::text = user_id::text OR is_ai = true);

-- 启用房间玩家表的实时订阅
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;

-- 创建索引以提高查询性能
CREATE INDEX idx_room_players_room_id ON public.room_players(room_id);
CREATE INDEX idx_room_players_user_id ON public.room_players(user_id);
CREATE INDEX idx_room_players_seat ON public.room_players(room_id, seat_number);

-- 创建更新时间戳的触发器
CREATE TRIGGER update_room_players_updated_at
  BEFORE UPDATE ON public.room_players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
