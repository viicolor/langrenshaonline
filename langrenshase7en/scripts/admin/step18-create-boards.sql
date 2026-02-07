-- 脚本18：创建默认板子
-- 创建10人速推局和12人标准局板子

-- 创建10人速推局板子
INSERT INTO public.boards (name, description, player_count, character_config, is_default) VALUES
('10人速推局', '10人速推局，适合快速游戏', 10,
'{"roles": ["werewolf", "werewolf", "werewolf", "villager", "villager", "villager", "villager", "seer", "witch", "guard"]}'::jsonb,
false);

-- 创建12人标准局板子
INSERT INTO public.boards (name, description, player_count, character_config, is_default) VALUES
('12人标准局', '12人标准局，经典狼人杀玩法', 12,
'{"roles": ["werewolf", "werewolf", "werewolf", "werewolf", "villager", "villager", "villager", "villager", "seer", "witch", "guard", "hunter"]}'::jsonb,
false);

-- 验证插入结果
SELECT 
  id,
  name,
  description,
  player_count,
  is_default,
  created_at
FROM public.boards
ORDER BY created_at DESC;
