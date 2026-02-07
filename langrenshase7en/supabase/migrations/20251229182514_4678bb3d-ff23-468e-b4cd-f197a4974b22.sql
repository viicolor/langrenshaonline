-- 创建房间消息表
CREATE TABLE public.room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  player_avatar TEXT,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'system', 'voice'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 启用RLS
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取和插入消息（游戏房间公开聊天）
CREATE POLICY "Anyone can read room messages" 
ON public.room_messages 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can send messages" 
ON public.room_messages 
FOR INSERT 
WITH CHECK (true);

-- 启用实时订阅
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;