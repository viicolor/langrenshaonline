-- 第三步：插入默认板子数据
INSERT INTO public.boards (name, description, player_count, is_default) 
VALUES
('12人标准局', '4狼4民4神，经典配置', 12, true),
('9人局', '3狼3民3神，快速游戏', 9, true),
('6人局', '2狼2民2神，新手友好', 6, true);
