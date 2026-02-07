-- 脚本2：创建角色卡牌表（cards表）
-- 用于后台管理板子配置

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
  "desc" TEXT,
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
