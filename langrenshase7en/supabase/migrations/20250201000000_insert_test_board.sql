-- 插入测试板子
INSERT INTO boards (
  name,
  description,
  player_count,
  board_alias,
  character_config,
  global_config_ids,
  process_ids,
  difficult,
  status,
  recommend,
  desc,
  create_by,
  is_delete
) VALUES (
  '测试板子-手动插入',
  '这是一个手动插入的测试板子，用于验证列表显示功能',
  12,
  'test_board_manual',
  '{"roles": [{"role": "werewolf", "count": 3}, {"role": "villager", "count": 4}, {"role": "seer", "count": 1}, {"role": "witch", "count": 1}, {"role": "hunter", "count": 1}, {"role": "guard", "count": 1}, {"role": "idiot", "count": 1}]}',
  '[]',
  '[]',
  1,
  1,
  0,
  '手动测试板子，用于验证列表显示功能',
  'admin',
  0
);

-- 查询验证
SELECT id, name, description, player_count, difficult, status, recommend, create_by, is_delete, created_at
FROM boards
WHERE is_delete = 0
ORDER BY created_at DESC;
