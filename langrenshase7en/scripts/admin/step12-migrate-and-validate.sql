-- 脚本1.6：数据迁移和验证
-- 将现有卡牌关联到对应的技能，并验证所有表结构

-- 步骤1：为现有卡牌关联技能
UPDATE public.cards c
SET skill_id = s.id
FROM public.skills s
WHERE c.role_type = 'werewolf' AND s.skill_code = 'werewolf_kill' AND c.skill_id IS NULL;

UPDATE public.cards c
SET skill_id = s.id
FROM public.skills s
WHERE c.role_type = 'seer' AND s.skill_code = 'seer_check' AND c.skill_id IS NULL;

UPDATE public.cards c
SET skill_id = s.id
FROM public.skills s
WHERE c.role_type = 'witch' AND s.skill_code = 'witch_save' AND c.skill_id IS NULL;

UPDATE public.cards c
SET skill_id = s.id
FROM public.skills s
WHERE c.role_type = 'witch' AND c.card_name LIKE '%毒药%' AND s.skill_code = 'witch_poison' AND c.skill_id IS NULL;

UPDATE public.cards c
SET skill_id = s.id
FROM public.skills s
WHERE c.role_type = 'guard' AND s.skill_code = 'guard_protect' AND c.skill_id IS NULL;

UPDATE public.cards c
SET skill_id = s.id
FROM public.skills s
WHERE c.role_type = 'hunter' AND s.skill_code = 'hunter_shoot' AND c.skill_id IS NULL;

-- 步骤2：验证 cards 表结构
SELECT 
  'cards 表验证' as check_type,
  'camp 字段存在' as check_item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'camp') THEN '✅ 通过'
    ELSE '❌ 失败'
  END as result
UNION ALL
SELECT 
  'cards 表验证' as check_type,
  'skill_id 字段存在' as check_item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'skill_id') THEN '✅ 通过'
    ELSE '❌ 失败'
  END as result;

-- 步骤3：验证 skills 表结构
SELECT 
  'skills 表验证' as check_type,
  '表存在' as check_item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skills') THEN '✅ 通过'
    ELSE '❌ 失败'
  END as result
UNION ALL
SELECT 
  'skills 表验证' as check_type,
  '默认技能数据' as check_item,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.skills WHERE is_delete = 0) >= 6 THEN '✅ 通过'
    ELSE '❌ 失败'
  END as result;

-- 步骤4：验证 global_configs 表结构
SELECT 
  'global_configs 表验证' as check_type,
  '表存在' as check_item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'global_configs') THEN '✅ 通过'
    ELSE '❌ 失败'
  END as result
UNION ALL
SELECT 
  'global_configs 表验证' as check_type,
  '默认配置数据' as check_item,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.global_configs WHERE is_delete = 0) >= 4 THEN '✅ 通过'
    ELSE '❌ 失败'
  END as result;

-- 步骤5：验证 processes 表结构
SELECT 
  'processes 表验证' as check_type,
  '表存在' as check_item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'processes') THEN '✅ 通过'
    ELSE '❌ 失败'
  END as result
UNION ALL
SELECT 
  'processes 表验证' as check_type,
  '默认流程数据' as check_item,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.processes WHERE is_delete = 0) >= 2 THEN '✅ 通过'
    ELSE '❌ 失败'
  END as result;

-- 步骤6：验证 board_roles 表结构
SELECT 
  'board_roles 表验证' as check_type,
  'card_id 字段存在' as check_item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'board_roles' AND column_name = 'card_id') THEN '✅ 通过'
    ELSE '❌ 失败'
  END as result;

-- 步骤7：数据完整性检查
SELECT 
  '数据完整性检查' as check_type,
  '卡牌关联技能' as check_item,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.cards WHERE is_delete = 0 AND skill_id IS NULL) = 0 THEN '✅ 通过'
    ELSE '❌ 失败'
  END as result;

-- 步骤8：统计信息
SELECT 
  '表统计' as check_type,
  'cards 表记录数' as check_item,
  (SELECT COUNT(*)::text FROM public.cards WHERE is_delete = 0) as result
UNION ALL
SELECT 
  '表统计' as check_type,
  'skills 表记录数' as check_item,
  (SELECT COUNT(*)::text FROM public.skills WHERE is_delete = 0) as result
UNION ALL
SELECT 
  '表统计' as check_type,
  'global_configs 表记录数' as check_item,
  (SELECT COUNT(*)::text FROM public.global_configs WHERE is_delete = 0) as result
UNION ALL
SELECT 
  '表统计' as check_type,
  'processes 表记录数' as check_item,
  (SELECT COUNT(*)::text FROM public.processes WHERE is_delete = 0) as result;
