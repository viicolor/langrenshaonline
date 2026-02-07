-- 脚本5：创建规则配置表（rules表）

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
