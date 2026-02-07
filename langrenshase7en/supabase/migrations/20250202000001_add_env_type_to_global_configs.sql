-- 全局配置表增加 env_type 字段（符合 adminconfig.pdf 文档 3.3 节）
-- env_type: 1-测试服 2-正式服 3-全局（默认值）

ALTER TABLE public.global_configs
ADD COLUMN IF NOT EXISTS env_type SMALLINT NOT NULL DEFAULT 3;

COMMENT ON COLUMN public.global_configs.env_type IS '1测试服 2正式服 3全局';

CREATE INDEX IF NOT EXISTS idx_global_configs_env_type ON public.global_configs(env_type);
