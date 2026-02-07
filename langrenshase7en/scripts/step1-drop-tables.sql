-- 第一步：删除所有旧表
DROP TABLE IF EXISTS public.spectator_records CASCADE;
DROP TABLE IF EXISTS public.room_messages CASCADE;
DROP TABLE IF EXISTS public.ai_configs CASCADE;
DROP TABLE IF EXISTS public.game_records CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.board_roles CASCADE;
DROP TABLE IF EXISTS public.boards CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
