-- 脚本1.5：创建 processes 表（流程配置表）
-- 用于存储游戏流程配置（夜晚阶段、白天阶段等）

CREATE TABLE IF NOT EXISTS public.processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_name VARCHAR(100) NOT NULL,
  process_code VARCHAR(50) NOT NULL,
  process_type VARCHAR(20) NOT NULL,
  phase_config JSONB NOT NULL,
  description TEXT,
  is_default SMALLINT DEFAULT 1,
  is_active SMALLINT DEFAULT 1,
  create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  update_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  create_by VARCHAR(30),
  update_by VARCHAR(30),
  is_delete SMALLINT DEFAULT 0,
  CONSTRAINT unique_process_code UNIQUE (process_code, is_delete)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_processes_code ON public.processes(process_code);
CREATE INDEX IF NOT EXISTS idx_processes_type ON public.processes(process_type);
CREATE INDEX IF NOT EXISTS idx_processes_active ON public.processes(is_active);

-- 插入默认流程配置（移除 ON CONFLICT，改为先删除再插入）
-- 先删除可能存在的流程
DELETE FROM public.processes 
WHERE process_code IN ('standard_flow', 'quick_flow');

-- 然后插入默认流程
INSERT INTO public.processes (process_name, process_code, process_type, phase_config, description, is_default, create_by)
VALUES
-- 标准流程
('标准流程', 'standard_flow', 'game_flow',
 '{"phases": [
  {
    "name": "night",
    "order": 1,
    "duration": 0,
    "actions": ["werewolf_kill", "seer_check", "witch_action", "guard_protect"],
    "next_phase": "day"
  },
  {
    "name": "day",
    "order": 2,
    "duration": 120,
    "actions": ["announce_deaths", "discuss", "vote"],
    "next_phase": "night"
  }
]}'::jsonb,
 '标准游戏流程：夜晚 → 白天 → 夜晚...',
  1, 'system'),

-- 快速流程
('快速流程', 'quick_flow', 'game_flow',
 '{"phases": [
  {
    "name": "night",
    "order": 1,
    "duration": 0,
    "actions": ["werewolf_kill", "seer_check", "witch_action"],
    "next_phase": "day"
  },
  {
    "name": "day",
    "order": 2,
    "duration": 60,
    "actions": ["announce_deaths", "discuss", "vote"],
    "next_phase": "night"
  }
]}'::jsonb,
 '快速游戏流程：缩短时长，加快节奏',
  1, 'system');

-- 验证插入结果
SELECT 
  id,
  process_name,
  process_code,
  process_type,
  description
FROM public.processes
WHERE is_delete = 0
ORDER BY create_time DESC;
