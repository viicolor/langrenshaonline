-- 狼队夜聊需要：room_messages 支持 message_type、player_name、player_avatar 以便筛选与展示
-- 若表为 create-database.sql 结构则缺这些列，插入会失败。此处按需补齐。

ALTER TABLE public.room_messages
  ADD COLUMN IF NOT EXISTS player_name TEXT,
  ADD COLUMN IF NOT EXISTS player_avatar TEXT,
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

COMMENT ON COLUMN public.room_messages.message_type IS 'text|system|vote|werewolf 等，狼队夜聊用 werewolf';
