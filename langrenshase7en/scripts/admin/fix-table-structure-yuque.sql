-- 修复数据库表结构以符合语雀文档规范
-- 执行此脚本前请备份数据库
-- 注意：此脚本使用BIGSERIAL作为主键类型

-- ============================================================================
-- 1. 修复 boards 表
-- ============================================================================

-- 创建新的 boards 表（符合语雀文档规范）
CREATE TABLE IF NOT EXISTS public.boards_new (
  id BIGSERIAL PRIMARY KEY,
  board_name VARCHAR(50) NOT NULL UNIQUE,
  board_alias VARCHAR(50),
  player_num INT NOT NULL,
  character_config JSONB,
  global_config_ids VARCHAR(200),
  process_ids VARCHAR(200),
  difficulty SMALLINT NOT NULL DEFAULT 1,
  status SMALLINT NOT NULL DEFAULT 2,
  recommend SMALLINT NOT NULL DEFAULT 0,
  desc TEXT,
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by VARCHAR(30) NOT NULL,
  update_by VARCHAR(30),
  is_delete SMALLINT NOT NULL DEFAULT 0
);

-- 迁移数据
INSERT INTO public.boards_new (
  board_name, board_alias, player_num, character_config,
  global_config_ids, process_ids, difficulty, status,
  recommend, desc, create_time, update_time,
  create_by, update_by, is_delete
)
SELECT
  name,
  board_alias,
  player_count,
  character_config,
  global_config_ids,
  process_ids,
  COALESCE(difficult, 1),
  COALESCE(status, 2),
  COALESCE(recommend, 0),
  description,
  created_at,
  updated_at,
  COALESCE(create_by, 'system'),
  update_by,
  COALESCE(is_delete::int, 0)
FROM public.boards;

-- 删除旧表
DROP TABLE public.boards CASCADE;

-- 重命名新表
ALTER TABLE public.boards_new RENAME TO boards;

-- 重建索引
CREATE INDEX idx_boards_status ON public.boards(status);
CREATE INDEX idx_boards_difficulty ON public.boards(difficulty);
CREATE INDEX idx_boards_recommend ON public.boards(recommend);
CREATE INDEX idx_boards_is_delete ON public.boards(is_delete);

-- ============================================================================
-- 2. 修复 cards 表
-- ============================================================================

-- 创建新的 cards 表（符合语雀文档规范）
CREATE TABLE IF NOT EXISTS public.cards_new (
  id BIGSERIAL PRIMARY KEY,
  card_name VARCHAR(50) NOT NULL,
  card_alias VARCHAR(50),
  card_type VARCHAR(50) NOT NULL,
  camp VARCHAR(20),
  role_type VARCHAR(50) NOT NULL,
  skill_id BIGINT,
  skill_icon VARCHAR(200),
  difficult SMALLINT DEFAULT 1,
  recommend SMALLINT DEFAULT 0,
  desc TEXT,
  character_config JSONB,
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by VARCHAR(30) NOT NULL,
  update_by VARCHAR(30),
  is_delete SMALLINT DEFAULT 0
);

-- 迁移数据
INSERT INTO public.cards_new (
  card_name, card_alias, card_type, camp, role_type,
  skill_id, skill_icon, difficult, recommend, desc,
  character_config, create_time, update_time,
  create_by, update_by, is_delete
)
SELECT
  card_name,
  card_alias,
  card_type,
  camp,
  role_type,
  skill_id,
  skill_icon,
  COALESCE(difficult, 1),
  COALESCE(recommend, 0),
  desc,
  character_config,
  create_time,
  update_time,
  COALESCE(create_by, 'system'),
  update_by,
  COALESCE(is_delete, 0)
FROM public.cards;

-- 删除旧表
DROP TABLE public.cards CASCADE;

-- 重命名新表
ALTER TABLE public.cards_new RENAME TO cards;

-- 重建索引
CREATE INDEX idx_cards_camp ON public.cards(camp);
CREATE INDEX idx_cards_role_type ON public.cards(role_type);
CREATE INDEX idx_cards_is_delete ON public.cards(is_delete);

-- ============================================================================
-- 3. 修复 skills 表
-- ============================================================================

-- 创建新的 skills 表（符合语雀文档规范）
CREATE TABLE IF NOT EXISTS public.skills_new (
  id BIGSERIAL PRIMARY KEY,
  skill_name VARCHAR(100) NOT NULL,
  skill_code VARCHAR(50) UNIQUE NOT NULL,
  skill_type VARCHAR(20) NOT NULL,
  trigger_phase VARCHAR(20),
  trigger_conditions JSONB,
  effect_params JSONB,
  effect_description TEXT,
  cooldown SMALLINT DEFAULT 0,
  usage_limit SMALLINT DEFAULT 0,
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by VARCHAR(30) NOT NULL,
  update_by VARCHAR(30),
  is_delete SMALLINT DEFAULT 0
);

-- 迁移数据
INSERT INTO public.skills_new (
  skill_name, skill_code, skill_type, trigger_phase,
  trigger_conditions, effect_params, effect_description,
  cooldown, usage_limit, create_time, update_time,
  create_by, update_by, is_delete
)
SELECT
  skill_name,
  skill_code,
  skill_type,
  trigger_phase,
  trigger_conditions,
  effect_params,
  effect_description,
  COALESCE(cooldown, 0),
  COALESCE(usage_limit, 0),
  create_time,
  update_time,
  COALESCE(create_by, 'system'),
  update_by,
  COALESCE(is_delete, 0)
FROM public.skills;

-- 删除旧表
DROP TABLE public.skills CASCADE;

-- 重命名新表
ALTER TABLE public.skills_new RENAME TO skills;

-- 重建索引
CREATE INDEX idx_skills_code ON public.skills(skill_code);
CREATE INDEX idx_skills_type ON public.skills(skill_type);
CREATE INDEX idx_skills_is_delete ON public.skills(is_delete);

-- ============================================================================
-- 4. 修复 global_configs 表
-- ============================================================================

-- 创建新的 global_configs 表（符合语雀文档规范）
CREATE TABLE IF NOT EXISTS public.global_configs_new (
  id BIGSERIAL PRIMARY KEY,
  config_name VARCHAR(100) NOT NULL,
  config_code VARCHAR(50) UNIQUE NOT NULL,
  config_type VARCHAR(20) NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  is_default SMALLINT DEFAULT 0,
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by VARCHAR(30) NOT NULL,
  update_by VARCHAR(30),
  is_delete SMALLINT DEFAULT 0
);

-- 迁移数据
INSERT INTO public.global_configs_new (
  config_name, config_code, config_type, config_value,
  description, is_default, create_time, update_time,
  create_by, update_by, is_delete
)
SELECT
  config_name,
  config_code,
  config_type,
  config_value,
  description,
  COALESCE(is_default, 0),
  create_time,
  update_time,
  COALESCE(create_by, 'system'),
  update_by,
  COALESCE(is_delete, 0)
FROM public.global_configs;

-- 删除旧表
DROP TABLE public.global_configs CASCADE;

-- 重命名新表
ALTER TABLE public.global_configs_new RENAME TO global_configs;

-- 重建索引
CREATE INDEX idx_global_configs_code ON public.global_configs(config_code);
CREATE INDEX idx_global_configs_type ON public.global_configs(config_type);
CREATE INDEX idx_global_configs_is_delete ON public.global_configs(is_delete);

-- ============================================================================
-- 5. 修复 processes 表
-- ============================================================================

-- 创建新的 processes 表（符合语雀文档规范）
CREATE TABLE IF NOT EXISTS public.processes_new (
  id BIGSERIAL PRIMARY KEY,
  process_name VARCHAR(100) NOT NULL,
  process_code VARCHAR(50) UNIQUE NOT NULL,
  process_type VARCHAR(20) NOT NULL,
  phase_config JSONB NOT NULL,
  description TEXT,
  is_default SMALLINT DEFAULT 0,
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by VARCHAR(30) NOT NULL,
  update_by VARCHAR(30),
  is_delete SMALLINT DEFAULT 0
);

-- 迁移数据
INSERT INTO public.processes_new (
  process_name, process_code, process_type, phase_config,
  description, is_default, create_time, update_time,
  create_by, update_by, is_delete
)
SELECT
  process_name,
  process_code,
  process_type,
  phase_config,
  description,
  COALESCE(is_default, 0),
  create_time,
  update_time,
  COALESCE(create_by, 'system'),
  update_by,
  COALESCE(is_delete, 0)
FROM public.processes;

-- 删除旧表
DROP TABLE public.processes CASCADE;

-- 重命名新表
ALTER TABLE public.processes_new RENAME TO processes;

-- 重建索引
CREATE INDEX idx_processes_code ON public.processes(process_code);
CREATE INDEX idx_processes_type ON public.processes(process_type);
CREATE INDEX idx_processes_is_delete ON public.processes(is_delete);

-- ============================================================================
-- 6. 修复 board_roles 表
-- ============================================================================

-- 创建新的 board_roles 表（符合语雀文档规范）
CREATE TABLE IF NOT EXISTS public.board_roles_new (
  id BIGSERIAL PRIMARY KEY,
  board_id BIGINT NOT NULL,
  card_id BIGINT NOT NULL,
  role_type VARCHAR(50),
  count INT NOT NULL,
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by VARCHAR(30) NOT NULL,
  update_by VARCHAR(30),
  is_delete SMALLINT DEFAULT 0
);

-- 迁移数据
INSERT INTO public.board_roles_new (
  board_id, card_id, role_type, count,
  create_time, update_time, create_by, update_by, is_delete
)
SELECT
  board_id,
  card_id,
  role_type,
  count,
  create_time,
  update_time,
  COALESCE(create_by, 'system'),
  update_by,
  COALESCE(is_delete, 0)
FROM public.board_roles;

-- 删除旧表
DROP TABLE public.board_roles CASCADE;

-- 重命名新表
ALTER TABLE public.board_roles_new RENAME TO board_roles;

-- 重建索引
CREATE INDEX idx_board_roles_board_id ON public.board_roles(board_id);
CREATE INDEX idx_board_roles_card_id ON public.board_roles(card_id);
CREATE INDEX idx_board_roles_is_delete ON public.board_roles(is_delete);

-- ============================================================================
-- 7. 添加外键约束
-- ============================================================================

-- board_roles 表的外键
ALTER TABLE public.board_roles
  ADD CONSTRAINT fk_board_roles_board_id
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE;

ALTER TABLE public.board_roles
  ADD CONSTRAINT fk_board_roles_card_id
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE;

-- cards 表的外键
ALTER TABLE public.cards
  ADD CONSTRAINT fk_cards_skill_id
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL;

-- ============================================================================
-- 8. 验证数据
-- ============================================================================

-- 检查 boards 表
SELECT 'boards' as table_name, COUNT(*) as count FROM public.boards WHERE is_delete = 0;

-- 检查 cards 表
SELECT 'cards' as table_name, COUNT(*) as count FROM public.cards WHERE is_delete = 0;

-- 检查 skills 表
SELECT 'skills' as table_name, COUNT(*) as count FROM public.skills WHERE is_delete = 0;

-- 检查 global_configs 表
SELECT 'global_configs' as table_name, COUNT(*) as count FROM public.global_configs WHERE is_delete = 0;

-- 检查 processes 表
SELECT 'processes' as table_name, COUNT(*) as count FROM public.processes WHERE is_delete = 0;

-- 检查 board_roles 表
SELECT 'board_roles' as table_name, COUNT(*) as count FROM public.board_roles WHERE is_delete = 0;
