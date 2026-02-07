-- 脚本17：创建主流板子流程模板
-- 包含10人速推局、12人标准局、12人狼王守卫局等主流板子的完整流程配置

-- 清理现有流程节点（删除所有，重新创建）
DELETE FROM public.game_flow_nodes;

-- 清理现有板子流程关联
DELETE FROM public.board_flow_mappings;

-- ==================== 流程节点定义 ====================

-- 夜晚阶段节点
INSERT INTO public.game_flow_nodes (node_name, node_code, node_type, phase_config, operate_roles, next_node_rules, is_auto_advance, timeout_seconds, description, is_system, is_active, create_by) VALUES
-- 守卫睁眼
('守卫睁眼', 'guard_protect', 'night_phase',
'{"order": 1, "duration": 20, "actions": ["guard_protect"]}'::jsonb,
'{"type": "ALL"}'::jsonb,
'{"type": "FIXED", "next_node_id": "wolf_kill"}'::jsonb,
1, 20, '守卫选择一名玩家守护，不可连续两晚守护同一人', 1, 1, 'system'),
-- 狼人刀人
('狼人刀人', 'wolf_kill', 'night_phase',
'{"order": 2, "duration": 30, "actions": ["wolf_kill"]}'::jsonb,
'{"type": "ALL"}'::jsonb,
'{"type": "FIXED", "next_node_id": "seer_check"}'::jsonb,
1, 30, '狼人团队选择一名玩家击杀', 1, 1, 'system'),
-- 预言家查验
('预言家查验', 'seer_check', 'night_phase',
'{"order": 3, "duration": 15, "actions": ["seer_check"]}'::jsonb,
'{"type": "ALL"}'::jsonb,
'{"type": "FIXED", "next_node_id": "witch_action"}'::jsonb,
1, 15, '预言家选择一名玩家查验身份', 1, 1, 'system'),
-- 女巫行动
('女巫行动', 'witch_action', 'night_phase',
'{"order": 4, "duration": 25, "actions": ["witch_save", "witch_poison"]}'::jsonb,
'{"type": "ALL"}'::jsonb,
'{"type": "FIXED", "next_node_id": "night_end"}'::jsonb,
1, 25, '女巫查看狼刀目标，选择是否使用解药或毒药', 1, 1, 'system'),
-- 夜晚结束
('夜晚结束', 'night_end', 'action',
'{"order": 5, "duration": 5, "actions": []}'::jsonb,
'{"type": "ALL"}'::jsonb,
'{"type": "FIXED", "next_node_id": "day_announce"}'::jsonb,
1, 5, '结算夜晚行动结果', 1, 1, 'system');

-- 白天阶段节点
INSERT INTO public.game_flow_nodes (node_name, node_code, node_type, phase_config, operate_roles, next_node_rules, is_auto_advance, timeout_seconds, description, is_system, is_active, create_by) VALUES
-- 死讯公布
('死讯公布', 'day_announce', 'day_phase',
'{"order": 1, "duration": 10, "actions": []}'::jsonb,
'{"type": "ALL"}'::jsonb,
'{"type": "FIXED", "next_node_id": "sheriff_campaign"}'::jsonb,
1, 10, '公布昨夜死亡信息', 1, 1, 'system'),
-- 警长竞选（仅第一天）
('警长竞选', 'sheriff_campaign', 'day_phase',
'{"order": 2, "duration": 60, "actions": ["sheriff_sign_up", "sheriff_speech", "sheriff_vote"]}'::jsonb,
'{"type": "ALL"}'::jsonb,
'{"type": "BY_STATE", "round==1": "day_speech", "default": "day_speech"}'::jsonb,
1, 60, '警长竞选环节，仅第一天触发', 1, 1, 'system'),
-- 白天发言
('白天发言', 'day_speech', 'day_phase',
'{"order": 3, "duration": 120, "actions": ["speak"]}'::jsonb,
'{"type": "ALL"}'::jsonb,
'{"type": "FIXED", "next_node_id": "voting"}'::jsonb,
1, 120, '玩家轮流发言，警长最后发言', 1, 1, 'system'),
-- 投票
('投票', 'voting', 'day_phase',
'{"order": 4, "duration": 20, "actions": ["vote"]}'::jsonb,
'{"type": "ALL"}'::jsonb,
'{"type": "BY_STATE", "has_tie==true": "voting_pk", "default": "day_end"}'::jsonb,
1, 20, '公投放逐环节', 1, 1, 'system'),
-- 投票PK
('投票PK', 'voting_pk', 'day_phase',
'{"order": 5, "duration": 30, "actions": ["pk_speech", "pk_vote"]}'::jsonb,
'{"type": "ALL"}'::jsonb,
'{"type": "BY_STATE", "has_tie==true": "voting_pk", "default": "day_end"}'::jsonb,
1, 30, '平票玩家补充发言并重新投票', 1, 1, 'system'),
-- 白天结束
('白天结束', 'day_end', 'action',
'{"order": 6, "duration": 5, "actions": []}'::jsonb,
'{"type": "ALL"}'::jsonb,
'{"type": "FIXED", "next_node_id": "guard_protect"}'::jsonb,
1, 5, '结算白天行动结果，进入夜晚', 1, 1, 'system');

-- ==================== 特殊角色节点 ====================

-- 丘比特连情侣（爱神板子）
INSERT INTO public.game_flow_nodes (node_name, node_code, node_type, phase_config, operate_roles, next_node_rules, is_auto_advance, timeout_seconds, description, is_system, is_active, create_by) VALUES
('丘比特连情侣', 'cupid_link', 'night_phase',
'{"order": 0, "duration": 20, "actions": ["cupid_link"]}'::jsonb,
'{"type": "ALL"}'::jsonb,
'{"type": "FIXED", "next_node_id": "guard_protect"}'::jsonb,
1, 20, '丘比特选择两名玩家成为情侣', 0, 1, 'system');

-- 狼美人魅惑（狼美人板子）
INSERT INTO public.game_flow_nodes (node_name, node_code, node_type, phase_config, operate_roles, next_node_rules, is_auto_advance, timeout_seconds, description, is_system, is_active, create_by) VALUES
('狼美人魅惑', 'wolf_charm', 'night_phase',
'{"order": 2.5, "duration": 15, "actions": ["wolf_charm"]}'::jsonb,
'{"type": "ALL"}'::jsonb,
'{"type": "FIXED", "next_node_id": "seer_check"}'::jsonb,
1, 15, '狼美人选择一名玩家魅惑', 0, 1, 'system');

-- 骑士决斗（骑士板子）
INSERT INTO public.game_flow_nodes (node_name, node_code, node_type, phase_config, operate_roles, next_node_rules, is_auto_advance, timeout_seconds, description, is_system, is_active, create_by) VALUES
('骑士决斗', 'knight_duel', 'day_phase',
'{"order": 2.5, "duration": 10, "actions": ["knight_duel"]}'::jsonb,
'{"type": "ALL"}'::jsonb,
'{"type": "BY_TRIGGER", "knight_win": "night_end", "knight_lose": "day_speech", "default": "day_speech"}'::jsonb,
1, 10, '骑士亮牌与任意玩家决斗', 0, 1, 'system');

-- ==================== 板子流程关联 ====================

-- 10人速推局流程
-- 先获取板子ID（假设板子已存在）
DO $$
DECLARE
  board_10_id UUID;
  guard_node_id UUID;
  wolf_kill_node_id UUID;
  seer_check_node_id UUID;
  witch_action_node_id UUID;
  night_end_node_id UUID;
  day_announce_node_id UUID;
  sheriff_campaign_node_id UUID;
  day_speech_node_id UUID;
  voting_node_id UUID;
  voting_pk_node_id UUID;
  day_end_node_id UUID;
BEGIN
  SELECT id INTO board_10_id FROM public.boards WHERE name = '10人速推局' LIMIT 1;
  
  IF board_10_id IS NULL THEN
    RAISE NOTICE '板子"10人速推局"不存在，请先创建板子';
    RETURN;
  END IF;
  
  SELECT id INTO guard_node_id FROM public.game_flow_nodes WHERE node_code = 'guard_protect' LIMIT 1;
  SELECT id INTO wolf_kill_node_id FROM public.game_flow_nodes WHERE node_code = 'wolf_kill' LIMIT 1;
  SELECT id INTO seer_check_node_id FROM public.game_flow_nodes WHERE node_code = 'seer_check' LIMIT 1;
  SELECT id INTO witch_action_node_id FROM public.game_flow_nodes WHERE node_code = 'witch_action' LIMIT 1;
  SELECT id INTO night_end_node_id FROM public.game_flow_nodes WHERE node_code = 'night_end' LIMIT 1;
  SELECT id INTO day_announce_node_id FROM public.game_flow_nodes WHERE node_code = 'day_announce' LIMIT 1;
  SELECT id INTO sheriff_campaign_node_id FROM public.game_flow_nodes WHERE node_code = 'sheriff_campaign' LIMIT 1;
  SELECT id INTO day_speech_node_id FROM public.game_flow_nodes WHERE node_code = 'day_speech' LIMIT 1;
  SELECT id INTO voting_node_id FROM public.game_flow_nodes WHERE node_code = 'voting' LIMIT 1;
  SELECT id INTO voting_pk_node_id FROM public.game_flow_nodes WHERE node_code = 'voting_pk' LIMIT 1;
  SELECT id INTO day_end_node_id FROM public.game_flow_nodes WHERE node_code = 'day_end' LIMIT 1;
  
  INSERT INTO public.board_flow_mappings (board_id, flow_node_id, execution_order, is_active, create_by) VALUES
  (board_10_id, guard_node_id, 1, 1, 'system'),
  (board_10_id, wolf_kill_node_id, 2, 1, 'system'),
  (board_10_id, seer_check_node_id, 3, 1, 'system'),
  (board_10_id, witch_action_node_id, 4, 1, 'system'),
  (board_10_id, night_end_node_id, 5, 1, 'system'),
  (board_10_id, day_announce_node_id, 6, 1, 'system'),
  (board_10_id, sheriff_campaign_node_id, 7, 1, 'system'),
  (board_10_id, day_speech_node_id, 8, 1, 'system'),
  (board_10_id, voting_node_id, 9, 1, 'system'),
  (board_10_id, voting_pk_node_id, 10, 1, 'system'),
  (board_10_id, day_end_node_id, 11, 1, 'system');
  
  RAISE NOTICE '10人速推局流程配置完成';
END $$;

-- 12人标准局流程（与10人速推局相同）
DO $$
DECLARE
  board_12_id UUID;
BEGIN
  SELECT id INTO board_12_id FROM public.boards WHERE name = '12人标准局' LIMIT 1;
  
  IF board_12_id IS NULL THEN
    RAISE NOTICE '板子"12人标准局"不存在，请先创建板子';
    RETURN;
  END IF;
  
  INSERT INTO public.board_flow_mappings (board_id, flow_node_id, execution_order, is_active, create_by)
  SELECT board_12_id, flow_node_id, execution_order, 1, 'system'
  FROM public.board_flow_mappings
  WHERE board_id = (SELECT id FROM public.boards WHERE name = '10人速推局' LIMIT 1);
  
  RAISE NOTICE '12人标准局流程配置完成';
END $$;

-- 验证插入结果
SELECT 
  fn.node_name,
  fn.node_code,
  fn.node_type,
  fn.timeout_seconds,
  fn.is_system,
  fn.is_active
FROM public.game_flow_nodes fn
ORDER BY fn.node_type, fn.phase_config->>'order';

SELECT 
  b.name as board_name,
  fn.node_name,
  bfm.execution_order,
  bfm.is_active
FROM public.board_flow_mappings bfm
JOIN public.boards b ON bfm.board_id = b.id
JOIN public.game_flow_nodes fn ON bfm.flow_node_id = fn.id
ORDER BY b.name, bfm.execution_order;
