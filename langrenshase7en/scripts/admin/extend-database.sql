-- 扩展boards表，添加后台管理字段
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS board_alias VARCHAR(50);
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS player_num INTEGER;
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS character_config JSONB;
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS global_config_ids VARCHAR(200);
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS process_ids VARCHAR(200);
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS difficult SMALLINT DEFAULT 1;
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS status SMALLINT DEFAULT 1;
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS recommend SMALLINT DEFAULT 0;
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS desc TEXT;
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS create_by VARCHAR(30);
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS update_by VARCHAR(30);
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS is_delete SMALLINT DEFAULT 0;

-- 创建角色卡牌表（用于板子配置）
CREATE TABLE IF NOT EXISTS public.cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_name VARCHAR(100) NOT NULL,
  card_alias VARCHAR(100),
  card_type VARCHAR(50) NOT NULL,
  role_type VARCHAR(50) NOT NULL,
  skill_description TEXT,
  skill_icon VARCHAR(200),
  is_active SMALLINT DEFAULT 1,
  difficult SMALLINT DEFAULT 1,
  recommend SMALLINT DEFAULT 0,
  desc TEXT,
  character_config JSONB,
  create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  update_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  create_by VARCHAR(30),
  update_by VARCHAR(30),
  is_delete SMALLINT DEFAULT 0
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_cards_type ON public.cards(card_type);
CREATE INDEX IF NOT EXISTS idx_cards_role ON public.cards(role_type);
CREATE INDEX IF NOT EXISTS idx_cards_active ON public.cards(is_active);

-- 扩展rooms表，添加AI玩家配置
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS allow_ai_players BOOLEAN DEFAULT FALSE;

-- 扩展room_players表，添加AI玩家标识
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT FALSE;
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS ai_config_id UUID REFERENCES public.ai_configs(id);

-- 创建规则配置表
CREATE TABLE IF NOT EXISTS public.rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_key VARCHAR(100) NOT NULL UNIQUE,
  rule_value JSONB NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  description TEXT,
  create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  update_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  create_by VARCHAR(30),
  update_by VARCHAR(30)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_rules_key ON public.rules(rule_key);
CREATE INDEX IF NOT EXISTS idx_rules_type ON public.rules(rule_type);

-- 插入默认规则
INSERT INTO public.rules (rule_key, rule_value, rule_type, description)
VALUES
('speak_time_limit', '60', 'time_limit', '发言时长限制（秒）'),
('speak_char_limit', '100', 'char_limit', '发言字数限制'),
('vote_time_limit', '30', 'time_limit', '投票时长限制（秒）'),
('game_timeout', '600', 'time_limit', '游戏超时设置（秒）'),
('allow_spectator', 'true', 'boolean', '允许观战'),
('allow_ai_players', 'true', 'boolean', '允许AI玩家')
ON CONFLICT (rule_key) DO NOTHING;

-- 插入默认角色卡牌
INSERT INTO public.cards (card_name, card_alias, card_type, role_type, skill_description, skill_icon, is_active, difficult, recommend, desc)
VALUES
('狼人', '狼', 'role', 'werewolf', '夜晚可以杀死一名玩家', '🐺', 1, 1, 1, '狼人阵营，夜晚可以杀死一名玩家'),
('村民', '民', 'role', 'villager', '无特殊技能', '👨', 1, 1, 1, '平民阵营，无特殊技能'),
('预言家', '预言', 'role', 'seer', '夜晚可以查验一名玩家的身份', '🔮', 1, 1, 1, '神职阵营，夜晚可以查验一名玩家的身份'),
('女巫', '女巫', 'role', 'witch', '拥有一瓶解药和一瓶毒药', '🧪', 1, 1, 1, '神职阵营，拥有一瓶解药和一瓶毒药'),
('猎人', '猎人', 'role', 'hunter', '死亡时可以带走一名玩家', '🏹', 1, 1, 1, '神职阵营，死亡时可以带走一名玩家'),
('守卫', '守卫', 'role', 'guard', '夜晚可以保护一名玩家不被狼人杀死', '🛡️', 1, 1, 1, '神职阵营，夜晚可以保护一名玩家不被狼人杀死')
ON CONFLICT (card_name) DO NOTHING;

-- 更新现有板子，添加后台管理字段默认值
UPDATE public.boards 
SET 
  player_num = player_count,
  board_alias = name,
  difficult = 1,
  status = 1,
  recommend = 1,
  desc = description
WHERE player_num IS NULL;
