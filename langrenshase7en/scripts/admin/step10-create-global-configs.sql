-- 脚本1.4：创建 global_configs 表（全局配置表）
-- 用于存储全局游戏规则配置

CREATE TABLE IF NOT EXISTS public.global_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_name VARCHAR(100) NOT NULL,
  config_code VARCHAR(50) NOT NULL,
  config_type VARCHAR(20) NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  is_default SMALLINT DEFAULT 1,
  is_active SMALLINT DEFAULT 1,
  create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  update_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  create_by VARCHAR(30),
  update_by VARCHAR(30),
  is_delete SMALLINT DEFAULT 0,
  CONSTRAINT unique_config_code UNIQUE (config_code, is_delete)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_global_configs_code ON public.global_configs(config_code);
CREATE INDEX IF NOT EXISTS idx_global_configs_type ON public.global_configs(config_type);
CREATE INDEX IF NOT EXISTS idx_global_configs_active ON public.global_configs(is_active);

-- 插入默认全局配置（移除 ON CONFLICT，改为先删除再插入）
-- 先删除可能存在的配置
DELETE FROM public.global_configs 
WHERE config_code IN ('vote_rule', 'speak_rule', 'death_rule', 'game_setting');

-- 然后插入默认配置
INSERT INTO public.global_configs (config_name, config_code, config_type, config_value, description, is_default, create_by)
VALUES
-- 投票规则
('投票规则', 'vote_rule', 'rule',
 '{"vote_type": "majority", "vote_duration": 60, "allow_abstain": true, "min_votes": 3}'::jsonb,
 '投票类型、时长、是否允许弃票、最少投票人数',
 1, 'system'),

-- 发言规则
('发言规则', 'speak_rule', 'rule',
 '{"speak_order": "random", "speak_duration": 30, "max_speak_times": 2}'::jsonb,
 '发言顺序、时长、每人最多发言次数',
 1, 'system'),

-- 死亡规则
('死亡规则', 'death_rule', 'rule',
 '{"can_speak_after_death": true, "can_vote_after_death": false, "reveal_identity": "immediate"}'::jsonb,
 '死亡后是否可以发言、死亡后是否可以投票、身份揭示时机',
 1, 'system'),

-- 游戏设置
('游戏设置', 'game_setting', 'setting',
 '{"night_duration": 60, "day_duration": 120, "max_players": 20, "min_players": 6}'::jsonb,
 '夜晚时长、白天时长、最大人数、最小人数',
 1, 'system');

-- 验证插入结果
SELECT 
  id,
  config_name,
  config_code,
  config_type,
  description
FROM public.global_configs
WHERE is_delete = 0
ORDER BY create_time DESC;
