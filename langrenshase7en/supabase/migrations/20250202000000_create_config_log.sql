-- 配置生效日志表（符合 adminconfig.pdf 文档 3.5 节 wolf_kill_config_log）
-- 记录所有配置修改、板子上下线、角色启禁用等操作，便于问题追溯、版本回滚

CREATE TABLE IF NOT EXISTS public.config_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operate_type SMALLINT NOT NULL,
  operate_object VARCHAR(50) NOT NULL,
  operate_object_id TEXT NOT NULL,
  old_config TEXT,
  new_config TEXT NOT NULL,
  operate_result SMALLINT NOT NULL DEFAULT 1,
  operate_desc VARCHAR(200),
  operate_by VARCHAR(30) NOT NULL,
  operate_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip VARCHAR(50)
);

COMMENT ON TABLE public.config_log IS '配置生效日志：角色/板子/全局配置/流程配置的变更记录';
COMMENT ON COLUMN public.config_log.operate_type IS '1角色新增 2角色编辑 3板子新增 4板子编辑 5全局配置修改 6流程配置修改';
COMMENT ON COLUMN public.config_log.operate_result IS '0失败 1成功';

CREATE INDEX IF NOT EXISTS idx_config_log_operate_by ON public.config_log(operate_by);
CREATE INDEX IF NOT EXISTS idx_config_log_operate_type ON public.config_log(operate_type);
CREATE INDEX IF NOT EXISTS idx_config_log_operate_time ON public.config_log(operate_time DESC);

ALTER TABLE public.config_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read config log"
ON public.config_log FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert config log"
ON public.config_log FOR INSERT
WITH CHECK (true);
