-- 确保 Realtime 广播 room_messages 的完整行数据，其他玩家能即时收到发言
ALTER TABLE public.room_messages REPLICA IDENTITY FULL;
