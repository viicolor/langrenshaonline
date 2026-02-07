-- 第四步：插入板子角色配置

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
