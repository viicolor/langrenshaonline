-- 脚本14：创建 board_flow_mappings 表（板子流程关联表）
-- 用于关联板子与流程节点，支持不同板子的不同流程

CREATE TABLE IF NOT EXISTS public.board_flow_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  flow_node_id UUID NOT NULL REFERENCES public.game_flow_nodes(id) ON DELETE CASCADE,
  execution_order INTEGER NOT NULL,
  is_active SMALLINT DEFAULT 1,
  create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  update_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  create_by VARCHAR(30),
  update_by VARCHAR(30),
  is_delete SMALLINT DEFAULT 0,
  CONSTRAINT unique_board_node_order UNIQUE (board_id, flow_node_id, is_delete)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_board_flow_mappings_board ON public.board_flow_mappings(board_id);
CREATE INDEX IF NOT EXISTS idx_board_flow_mappings_node ON public.board_flow_mappings(flow_node_id);
CREATE INDEX IF NOT EXISTS idx_board_flow_mappings_order ON public.board_flow_mappings(execution_order);
CREATE INDEX IF NOT EXISTS idx_board_flow_mappings_active ON public.board_flow_mappings(is_active);

-- 添加注释
COMMENT ON TABLE public.board_flow_mappings IS '板子流程关联表，关联板子与流程节点';
COMMENT ON COLUMN public.board_flow_mappings.board_id IS '板子ID';
COMMENT ON COLUMN public.board_flow_mappings.flow_node_id IS '流程节点ID';
COMMENT ON COLUMN public.board_flow_mappings.execution_order IS '执行顺序';
COMMENT ON COLUMN public.board_flow_mappings.is_active IS '是否启用：0否 1是';
