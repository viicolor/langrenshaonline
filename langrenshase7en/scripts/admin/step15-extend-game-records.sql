-- 脚本15：扩展 game_records 表（增加流程控制字段）
-- 用于支持流程节点控制和精确进度管理

-- 添加流程控制相关字段
ALTER TABLE public.game_records
ADD COLUMN IF NOT EXISTS current_node_id UUID REFERENCES public.game_flow_nodes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS node_start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS node_remaining_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_heartbeat_time TIMESTAMP WITH TIME ZONE;

-- 添加注释
COMMENT ON COLUMN public.game_records.current_node_id IS '当前流程节点ID';
COMMENT ON COLUMN public.game_records.node_start_time IS '当前节点开始时间';
COMMENT ON COLUMN public.game_records.node_remaining_seconds IS '剩余时间（秒），服务端计算';
COMMENT ON COLUMN public.game_records.last_heartbeat_time IS '最后心跳时间';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_game_records_current_node ON public.game_records(current_node_id);
CREATE INDEX IF NOT EXISTS idx_game_records_node_start_time ON public.game_records(node_start_time);
