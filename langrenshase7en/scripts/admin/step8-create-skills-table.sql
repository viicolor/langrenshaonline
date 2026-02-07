-- 脚本1.2：创建 skills 表（技能配置表）
-- 这是数据库重构的第二步，创建技能配置表

CREATE TABLE IF NOT EXISTS public.skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_name VARCHAR(100) NOT NULL,
  skill_code VARCHAR(50) NOT NULL,
  skill_type VARCHAR(20) NOT NULL,
  trigger_phase VARCHAR(20),
  trigger_conditions JSONB,
  effect_params JSONB NOT NULL,
  effect_description TEXT,
  cooldown SMALLINT DEFAULT 0,
  usage_limit SMALLINT DEFAULT 0,
  is_active SMALLINT DEFAULT 1,
  create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  update_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  create_by VARCHAR(30),
  update_by VARCHAR(30),
  is_delete SMALLINT DEFAULT 0
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_skills_code ON public.skills(skill_code);
CREATE INDEX IF NOT EXISTS idx_skills_type ON public.skills(skill_type);
CREATE INDEX IF NOT EXISTS idx_skills_active ON public.skills(is_active);

-- 插入默认技能数据（移除 ON CONFLICT，改为先删除再插入）
-- 先删除可能存在的技能
DELETE FROM public.skills 
WHERE skill_code IN ('werewolf_kill', 'seer_check', 'witch_save', 'witch_poison', 'guard_protect', 'hunter_shoot');

-- 然后插入默认技能
INSERT INTO public.skills (skill_name, skill_code, skill_type, trigger_phase, trigger_conditions, effect_params, effect_description, cooldown, usage_limit, create_by)
VALUES
-- 狼人杀人技能
('狼人杀人', 'werewolf_kill', 'active', 'night', 
 '["can_target_anyone_except_self", "cannot_target_dead"]'::jsonb,
 '{"target_type": "any_except_self", "max_targets": 1, "min_targets": 1, "can_target_dead": false, "effect": "kill", "kill_type": "normal", "duration": "instant"}'::jsonb,
 '夜晚可以选择一名玩家进行击杀',
 0, 0, 'system'),

-- 预言家查验技能
('预言家查验', 'seer_check', 'active', 'night',
 '["can_target_anyone_except_self", "cannot_target_dead"]'::jsonb,
 '{"target_type": "any_except_self", "max_targets": 1, "min_targets": 1, "can_target_dead": false, "effect": "check_camp", "check_type": "camp", "reveal_to": "self"}'::jsonb,
 '夜晚可以查验一名玩家的阵营',
 0, 0, 'system'),

-- 女巫解药技能
('女巫解药', 'witch_save', 'active', 'night',
 '["can_target_anyone", "can_target_dead"]'::jsonb,
 '{"target_type": "any", "max_targets": 1, "min_targets": 1, "can_target_self": true, "can_target_dead": true, "effect": "save", "save_type": "prevent_death", "duration": "permanent"}'::jsonb,
 '使用解药可以救活一名玩家',
 0, 1, 'system'),

-- 女巫毒药技能
('女巫毒药', 'witch_poison', 'active', 'night',
 '["can_target_anyone_except_self", "cannot_target_dead"]'::jsonb,
 '{"target_type": "any_except_self", "max_targets": 1, "min_targets": 1, "can_target_self": false, "can_target_dead": false, "effect": "kill", "kill_type": "poison", "duration": "instant"}'::jsonb,
 '使用毒药可以毒死一名玩家',
 0, 1, 'system'),

-- 守卫保护技能
('守卫保护', 'guard_protect', 'active', 'night',
 '["can_target_anyone_except_self", "cannot_target_dead"]'::jsonb,
 '{"target_type": "any_except_self", "max_targets": 1, "min_targets": 1, "can_target_self": true, "can_target_dead": false, "effect": "protect", "protect_type": "prevent_kill", "duration": "1_night", "can_protect_same": false}'::jsonb,
 '夜晚可以保护一名玩家不被狼人杀死',
 0, 0, 'system'),

-- 猎人开枪技能
('猎人开枪', 'hunter_shoot', 'trigger', 'death',
 '["can_target_anyone_except_self", "cannot_target_dead"]'::jsonb,
 '{"target_type": "any_except_self", "max_targets": 1, "min_targets": 1, "can_target_self": false, "can_target_dead": false, "effect": "kill", "kill_type": "shoot", "duration": "instant", "trigger_condition": "on_death"}'::jsonb,
 '死亡时可以开枪带走一名玩家',
 0, 1, 'system');

-- 验证插入结果
SELECT 
  id,
  skill_name,
  skill_code,
  skill_type,
  effect_description
FROM public.skills
WHERE is_delete = 0
ORDER BY create_time DESC;
