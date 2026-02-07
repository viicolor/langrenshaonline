-- 创建用户表
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 启用RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 允许任何人注册（插入）
CREATE POLICY "Anyone can register" 
ON public.users 
FOR INSERT 
WITH CHECK (true);

-- 用户只能查看自己的信息（管理员除外）
CREATE POLICY "Users can view own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid()::text = id::text OR is_admin = true);

-- 用户只能更新自己的信息
CREATE POLICY "Users can update own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid()::text = id::text);

-- 创建板子表
CREATE TABLE public.boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  player_count INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 启用RLS
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取板子配置
CREATE POLICY "Anyone can read boards" 
ON public.boards 
FOR SELECT 
USING (true);

-- 只有管理员可以创建、更新、删除板子
CREATE POLICY "Only admins can manage boards" 
ON public.boards 
FOR ALL 
USING (is_admin = true);

-- 创建板子角色配置表
CREATE TABLE public.board_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL,
  count INTEGER NOT NULL,
  UNIQUE(board_id, role_type)
);

-- 启用RLS
ALTER TABLE public.board_roles ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取板子角色配置
CREATE POLICY "Anyone can read board roles" 
ON public.board_roles 
FOR SELECT 
USING (true);

-- 只有管理员可以管理板子角色配置
CREATE POLICY "Only admins can manage board roles" 
ON public.board_roles 
FOR ALL 
USING (is_admin = true);

-- 创建房间表
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  host_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL,
  max_players INTEGER NOT NULL DEFAULT 12,
  ai_player_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 启用RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取房间
CREATE POLICY "Anyone can read rooms" 
ON public.rooms 
FOR SELECT 
USING (true);

-- 允许认证用户创建房间
CREATE POLICY "Authenticated users can create rooms" 
ON public.rooms 
FOR INSERT 
WITH CHECK (auth.uid()::text = host_id::text);

-- 房主可以更新房间
CREATE POLICY "Host can update room" 
ON public.rooms 
FOR UPDATE 
USING (auth.uid()::text = host_id::text);

-- 启用房间表的实时订阅
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;

-- 创建游戏记录表
CREATE TABLE public.game_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  board_id UUID REFERENCES public.boards(id),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  winner_team TEXT,
  duration_seconds INTEGER
);

-- 启用RLS
ALTER TABLE public.game_records ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取游戏记录
CREATE POLICY "Anyone can read game records" 
ON public.game_records 
FOR SELECT 
USING (true);

-- 创建游戏消息表（扩展原有的room_messages）
ALTER TABLE public.room_messages 
ADD COLUMN IF NOT EXISTS game_record_id UUID REFERENCES public.game_records(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS phase TEXT,
ADD COLUMN IF NOT EXISTS round_number INTEGER;

-- 启用实时订阅（如果之前没有启用）
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;

-- 创建AI配置表
CREATE TABLE public.ai_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  api_key TEXT,
  model TEXT,
  endpoint TEXT,
  config JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 启用RLS
ALTER TABLE public.ai_configs ENABLE ROW LEVEL SECURITY;

-- 只有管理员可以管理AI配置
CREATE POLICY "Only admins can manage AI configs" 
ON public.ai_configs 
FOR ALL 
USING (is_admin = true);

-- 创建观战记录表
CREATE TABLE public.spectator_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_record_id UUID NOT NULL REFERENCES public.game_records(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  perspective_type TEXT NOT NULL,
  target_id UUID,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 启用RLS
ALTER TABLE public.spectator_records ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取观战记录
CREATE POLICY "Anyone can read spectator records" 
ON public.spectator_records 
FOR SELECT 
USING (true);

-- 允许认证用户创建观战记录
CREATE POLICY "Authenticated users can create spectator records" 
ON public.spectator_records 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text);

-- 创建索引以提高查询性能
CREATE INDEX idx_rooms_status ON public.rooms(status);
CREATE INDEX idx_rooms_host ON public.rooms(host_id);
CREATE INDEX idx_room_messages_room_id ON public.room_messages(room_id);
CREATE INDEX idx_room_messages_game_record_id ON public.room_messages(game_record_id);
CREATE INDEX idx_room_messages_timestamp ON public.room_messages(created_at DESC);
CREATE INDEX idx_game_records_room_id ON public.game_records(room_id);
CREATE INDEX idx_users_username ON public.users(username);

-- 创建更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为users表创建触发器
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 为rooms表创建触发器
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 插入默认板子数据
INSERT INTO public.boards (name, description, player_count, is_default) VALUES
('12人标准局', '4狼4民4神，经典配置', 12, true),
('9人局', '3狼3民3神，快速游戏', 9, true),
('6人局', '2狼2民2神，新手友好', 6, true);

-- 为12人标准局配置角色
INSERT INTO public.board_roles (board_id, role_type, count)
SELECT 
  (SELECT id FROM public.boards WHERE name = '12人标准局' LIMIT 1),
  role_type,
  count
FROM (VALUES 
  ('werewolf', 4),
  ('villager', 4),
  ('seer', 1),
  ('witch', 1),
  ('hunter', 1),
  ('guard', 1)
) AS roles(role_type, count);

-- 为9人局配置角色
INSERT INTO public.board_roles (board_id, role_type, count)
SELECT 
  (SELECT id FROM public.boards WHERE name = '9人局' LIMIT 1),
  role_type,
  count
FROM (VALUES 
  ('werewolf', 3),
  ('villager', 3),
  ('seer', 1),
  ('witch', 1),
  ('hunter', 1)
) AS roles(role_type, count);

-- 为6人局配置角色
INSERT INTO public.board_roles (board_id, role_type, count)
SELECT 
  (SELECT id FROM public.boards WHERE name = '6人局' LIMIT 1),
  role_type,
  count
FROM (VALUES 
  ('werewolf', 2),
  ('villager', 2),
  ('seer', 1),
  ('witch', 1)
) AS roles(role_type, count);
