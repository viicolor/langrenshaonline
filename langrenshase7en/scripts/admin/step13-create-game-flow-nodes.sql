-- 脚本13：创建 game_flow_nodes 表（流程节点配置表）
-- 用于存储游戏流程节点的完整配置，支持动态流程控制

CREATE TABLE IF NOT EXISTS public.game_flow_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  node_name VARCHAR(100) NOT NULL,
  node_code VARCHAR(50) NOT NULL,
  node_type VARCHAR(20) NOT NULL,
  phase_config JSONB NOT NULL,
  operate_roles JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_node_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_auto_advance SMALLINT DEFAULT 1,
  timeout_seconds INTEGER DEFAULT 30,
  description TEXT,
  is_system SMALLINT DEFAULT 0,
  is_active SMALLINT DEFAULT 1,
  create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  update_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  create_by VARCHAR(30),
  update_by VARCHAR(30),
  is_delete SMALLINT DEFAULT 0,
  CONSTRAINT unique_node_code UNIQUE (node_code, is_delete)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_game_flow_nodes_code ON public.game_flow_nodes(node_code);
CREATE INDEX IF NOT EXISTS idx_game_flow_nodes_type ON public.game_flow_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_game_flow_nodes_active ON public.game_flow_nodes(is_active);
CREATE INDEX IF NOT EXISTS idx_game_flow_nodes_system ON public.game_flow_nodes(is_system);

-- 添加注释
COMMENT ON TABLE public.game_flow_nodes IS '游戏流程节点配置表，存储每个流程节点的完整配置';
COMMENT ON COLUMN public.game_flow_nodes.node_name IS '节点名称，如"守卫睁眼"、"狼人刀人"';
COMMENT ON COLUMN public.game_flow_nodes.node_code IS '节点代码，唯一标识';
COMMENT ON COLUMN public.game_flow_nodes.node_type IS '节点类型：night_phase/day_phase/action';
COMMENT ON COLUMN public.game_flow_nodes.phase_config IS '阶段配置（JSONB）：order, duration, actions';
COMMENT ON COLUMN public.game_flow_nodes.operate_roles IS '可操作玩家规则（JSONB）：type, role_ids, player_id';
COMMENT ON COLUMN public.game_flow_nodes.next_node_rules IS '下一节点规则（JSONB）：type, rules';
COMMENT ON COLUMN public.game_flow_nodes.is_auto_advance IS '超时是否自动推进：0否 1是';
COMMENT ON COLUMN public.game_flow_nodes.timeout_seconds IS '超时时长（秒）';
COMMENT ON COLUMN public.game_flow_nodes.is_system IS '是否系统内置节点：0否 1是';
