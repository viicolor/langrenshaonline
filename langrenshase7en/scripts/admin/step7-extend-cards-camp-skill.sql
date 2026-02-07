-- 脚本1.1：扩展 cards 表，添加阵营和技能关联字段
-- 这是数据库重构的第一步，为卡牌添加阵营和技能关联

-- 添加阵营字段
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS camp VARCHAR(20);

-- 添加技能关联字段
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS skill_id UUID;

-- 为现有卡牌设置默认阵营（根据 role_type 推断）
UPDATE public.cards 
SET camp = 
  CASE 
    WHEN role_type IN ('werewolf', 'black_werewolf', 'white_werewolf') THEN 'werewolf'
    WHEN role_type IN ('seer', 'witch', 'hunter', 'guard', 'magician', 'idiot') THEN 'good'
    WHEN role_type = 'villager' THEN 'good'
    ELSE 'neutral'
  END
WHERE camp IS NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_cards_camp ON public.cards(camp);
CREATE INDEX IF NOT EXISTS idx_cards_skill_id ON public.cards(skill_id);

-- 验证更新结果
SELECT 
  id,
  card_name,
  role_type,
  camp,
  skill_id
FROM public.cards
WHERE is_delete = 0
ORDER BY create_time DESC;
