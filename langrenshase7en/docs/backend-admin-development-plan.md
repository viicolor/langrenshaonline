# 狼人杀后台管理系统 - 完整开发计划

## 一、核心问题分析

### 1.1 当前实现的严重缺陷

#### ❌ 问题1：缺少阵营系统
**现状：** 卡牌表没有阵营字段
**影响：** 游戏无法判断胜负条件（狼人阵营 vs 好人阵营）
**必须补充：**
- `camp` 字段：'werewolf' | 'good' | 'neutral'
- 阵营是狼人杀的核心机制

#### ❌ 问题2：技能配置过于简单
**现状：** 只有 `skill_description` 文本字段
**影响：** 游戏引擎无法解析技能参数，无法执行技能逻辑
**必须补充：**
- 技能配置 JSON 结构，包含：
  - 技能类型（主动/被动/触发）
  - 触发条件
  - 效果参数（数量、目标、限制）
  - 冷却时间
  - 使用次数限制

#### ❌ 问题3：板子与卡牌无关联
**现状：** 板子的 `character_config` 是独立 JSON，不引用卡牌表
**影响：**
- 创建板子时无法选择卡牌
- 卡牌修改后板子不会自动更新
- 无法统计某个卡牌被多少板子使用

#### ❌ 问题4：缺少游戏流程配置
**现状：** `process_ids` 字段存在但没有对应的流程配置表
**影响：** 游戏无法按照配置的流程执行（夜晚阶段、白天阶段、投票阶段等）

#### ❌ 问题5：缺少全局规则配置
**现状：** `global_config_ids` 字段存在但没有对应的全局配置表
**影响：** 无法配置全局游戏规则（如投票规则、发言规则、死亡规则等）

---

## 二、完整的数据库表结构设计

### 2.1 核心表关系图

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   boards   │────────▶│ board_roles  │◀────────│    cards    │
│  (板子表)   │         │  (板子角色表)  │         │   (卡牌表)   │
└─────────────┘         └──────────────┘         └─────────────┘
       │                       │                        │
       │ global_config_ids    │ card_id              │ skill_id
       ▼                       ▼                        ▼
┌──────────────────┐   ┌──────────────┐   ┌──────────────┐
│ global_configs │   │   skills    │   │  processes   │
│  (全局配置表)   │   │  (技能配置表)  │   │  (流程配置表)  │
└──────────────────┘   └──────────────┘   └──────────────┘
```

### 2.2 详细表结构

#### 2.2.1 cards 表（角色卡牌表）- 已存在，需要扩展

```sql
CREATE TABLE IF NOT EXISTS public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_name VARCHAR(100) NOT NULL,
  card_alias VARCHAR(50),
  card_type VARCHAR(50) NOT NULL,  -- 'role' | 'skill'
  camp VARCHAR(20) NOT NULL,           -- 新增：阵营 'werewolf' | 'good' | 'neutral'
  role_type VARCHAR(50) NOT NULL,     -- 'werewolf' | 'villager' | 'seer' | 'witch' | 'hunter' | 'guard'
  skill_id UUID REFERENCES skills(id),    -- 新增：关联技能配置表
  skill_icon VARCHAR(200),
  is_active SMALLINT DEFAULT 1,
  difficult SMALLINT DEFAULT 1,
  recommend SMALLINT DEFAULT 0,
  desc TEXT,
  create_time TIMESTAMP DEFAULT now(),
  update_time TIMESTAMP DEFAULT now(),
  create_by VARCHAR(30),
  update_by VARCHAR(30),
  is_delete SMALLINT DEFAULT 0
);
```

**关键字段说明：**
- `camp`: 阵营，必须字段，用于判断胜负
- `skill_id`: 关联技能配置表，存储详细的技能参数

#### 2.2.2 skills 表（技能配置表）- 新建

```sql
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name VARCHAR(100) NOT NULL,
  skill_code VARCHAR(50) NOT NULL UNIQUE,  -- 技能唯一标识，如 'kill', 'check', 'save', 'poison'
  skill_type VARCHAR(20) NOT NULL,       -- 'active' | 'passive' | 'trigger'
  trigger_phase VARCHAR(20),              -- 触发阶段：'night' | 'day' | 'death' | 'vote'
  trigger_conditions JSONB,               -- 触发条件：["can_target_anyone", "cannot_target_self"]
  effect_params JSONB NOT NULL,            -- 效果参数：核心配置
  effect_description TEXT,                 -- 效果描述（用于前端展示）
  cooldown SMALLINT DEFAULT 0,              -- 冷却回合数
  usage_limit SMALLINT DEFAULT 0,          -- 使用次数限制（0=无限制）
  is_active SMALLINT DEFAULT 1,
  create_time TIMESTAMP DEFAULT now(),
  update_time TIMESTAMP DEFAULT now(),
  create_by VARCHAR(30),
  update_by VARCHAR(30),
  is_delete SMALLINT DEFAULT 0
);
```

**effect_params JSONB 结构示例：**

```json
{
  "werewolf_kill": {
    "target_type": "any",           -- 'any' | 'not_self' | 'same_camp' | 'enemy_camp'
    "max_targets": 1,              -- 每次最多选择的目标数
    "min_targets": 1,              -- 每次最少选择的目标数
    "can_target_self": false,       -- 是否可以选自己
    "can_target_dead": false,       -- 是否可以选已死亡玩家
    "effect": "kill",              -- 实际效果
    "duration": "instant"          -- 'instant' | 'permanent' | 'temporary'
  },
  "seer_check": {
    "target_type": "any",
    "max_targets": 1,
    "min_targets": 1,
    "can_target_self": false,
    "can_target_dead": false,
    "effect": "check_camp",        -- 'check_camp' | 'check_role' | 'check_exact'
    "check_type": "camp",          -- 'camp' | 'role' | 'exact'
    "reveal_to": "self"            -- 'self' | 'all' | 'team'
  },
  "witch_save": {
    "target_type": "any",
    "max_targets": 1,
    "min_targets": 1,
    "can_target_self": true,
    "can_target_dead": true,         -- 可以救死人
    "effect": "save",
    "save_type": "prevent_death",   -- 'prevent_death' | 'revive'
    "duration": "permanent"
  },
  "witch_poison": {
    "target_type": "any",
    "max_targets": 1,
    "min_targets": 1,
    "can_target_self": false,
    "can_target_dead": false,
    "effect": "kill",
    "kill_type": "poison",        -- 'poison' | 'normal'
    "duration": "instant"
  },
  "guard_protect": {
    "target_type": "any",
    "max_targets": 1,
    "min_targets": 1,
    "can_target_self": true,
    "can_target_dead": false,
    "effect": "protect",
    "protect_type": "prevent_kill", -- 'prevent_kill' | 'prevent_vote' | 'prevent_all'
    "duration": "1_night",        -- '1_night' | 'permanent' | 'until_day'
    "can_protect_same": false     -- 是否可以连续守护同一人
  },
  "hunter_shoot": {
    "target_type": "any",
    "max_targets": 1,
    "min_targets": 1,
    "can_target_self": false,
    "can_target_dead": false,
    "effect": "kill",
    "kill_type": "shoot",
    "duration": "instant",
    "trigger_condition": "on_death"  -- 触发条件
  }
}
```

#### 2.2.3 board_roles 表（板子角色表）- 已存在，需要规范

```sql
CREATE TABLE IF NOT EXISTS public.board_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id),  -- 关联卡牌表
  count INTEGER NOT NULL,                   -- 该卡牌的数量
  create_time TIMESTAMP DEFAULT now(),
  update_time TIMESTAMP DEFAULT now(),
  is_delete SMALLINT DEFAULT 0
);
```

**关键改进：**
- 使用 `card_id` 关联卡牌表，而不是直接存储角色信息
- 支持级联删除（删除板子时自动删除角色配置）

#### 2.2.4 global_configs 表（全局配置表）- 新建

```sql
CREATE TABLE IF NOT EXISTS public.global_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name VARCHAR(100) NOT NULL UNIQUE,
  config_code VARCHAR(50) NOT NULL UNIQUE,
  config_type VARCHAR(20) NOT NULL,      -- 'rule' | 'setting' | 'parameter'
  config_value JSONB NOT NULL,            -- 配置值（JSON格式）
  description TEXT,
  is_default SMALLINT DEFAULT 1,       -- 是否为默认配置
  is_active SMALLINT DEFAULT 1,
  create_time TIMESTAMP DEFAULT now(),
  update_time TIMESTAMP DEFAULT now(),
  create_by VARCHAR(30),
  update_by VARCHAR(30),
  is_delete SMALLINT DEFAULT 0
);
```

**配置示例：**
```json
{
  "vote_rule": {
    "vote_type": "majority",           -- 'majority' | 'simple' | 'pk'
    "vote_duration": 60,              -- 投票时长（秒）
    "allow_abstain": true,            -- 是否允许弃票
    "min_votes": 3                    -- 最少投票人数
  },
  "speak_rule": {
    "speak_order": "random",           -- 'random' | 'clockwise' | 'anticlockwise'
    "speak_duration": 30,             -- 发言时长（秒）
    "max_speak_times": 2              -- 每人最多发言次数
  },
  "death_rule": {
    "can_speak_after_death": true,     -- 死亡后是否可以发言
    "can_vote_after_death": false,     -- 死亡后是否可以投票
    "reveal_identity": "immediate"      -- 'immediate' | 'end_of_game' | 'never'
  }
}
```

#### 2.2.5 processes 表（流程配置表）- 新建

```sql
CREATE TABLE IF NOT EXISTS public.processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_name VARCHAR(100) NOT NULL,
  process_code VARCHAR(50) NOT NULL UNIQUE,
  process_type VARCHAR(20) NOT NULL,      -- 'game_flow' | 'phase_flow'
  phase_config JSONB NOT NULL,            -- 阶段配置
  description TEXT,
  is_default SMALLINT DEFAULT 1,        -- 是否为默认流程
  is_active SMALLINT DEFAULT 1,
  create_time TIMESTAMP DEFAULT now(),
  update_time TIMESTAMP DEFAULT now(),
  create_by VARCHAR(30),
  update_by VARCHAR(30),
  is_delete SMALLINT DEFAULT 0
);
```

**phase_config JSONB 结构示例：**
```json
{
  "standard_flow": {
    "phases": [
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
    ]
  }
}
```

---

## 三、开发计划

### 阶段1：数据库表结构重构（优先级：最高）

#### 任务1.1：扩展 cards 表
- [ ] 添加 `camp` 字段（阵营）
- [ ] 添加 `skill_id` 字段（关联技能表）
- [ ] 创建索引：`idx_cards_camp`, `idx_cards_skill_id`

#### 任务1.2：创建 skills 表
- [ ] 创建 `skills` 表结构
- [ ] 创建索引：`idx_skills_code`, `idx_skills_type`
- [ ] 插入默认技能数据（狼人杀人、预言家查验、女巫救/毒、守卫保护、猎人开枪）

#### 任务1.3：重构 board_roles 表
- [ ] 添加 `card_id` 字段（关联卡牌表）
- [ ] 添加外键约束：`board_id` → `boards(id)`, `card_id` → `cards(id)`
- [ ] 添加级联删除配置
- [ ] 创建索引：`idx_board_roles_board_id`, `idx_board_roles_card_id`

#### 任务1.4：创建 global_configs 表
- [ ] 创建 `global_configs` 表结构
- [ ] 创建索引：`idx_global_configs_code`, `idx_global_configs_type`
- [ ] 插入默认全局配置（投票规则、发言规则、死亡规则）

#### 任务1.5：创建 processes 表
- [ ] 创建 `processes` 表结构
- [ ] 创建索引：`idx_processes_code`, `idx_processes_type`
- [ ] 插入默认流程配置（标准流程、快速流程）

#### 任务1.6：数据迁移
- [ ] 将现有卡牌数据迁移到新结构
- [ ] 为现有卡牌创建对应的技能配置
- [ ] 将现有板子的 `character_config` 转换为 `board_roles` 记录

---

### 阶段2：后台管理功能开发（优先级：高）

#### 任务2.1：技能管理模块
- [ ] 创建 `SkillList` 组件（技能列表）
- [ ] 创建 `SkillForm` 组件（技能创建/编辑）
- [ ] 在 `admin.ts` 中添加技能相关 API 方法
  - `getSkillsWithAdmin()`
  - `createSkillWithAdmin()`
  - `updateSkillWithAdmin()`
  - `deleteSkillWithAdmin()`
- [ ] 在 `AdminDashboard` 中集成技能管理功能
- [ ] 实现技能参数配置表单（effect_params JSON 编辑器）

#### 任务2.2：重构卡牌管理模块
- [ ] 更新 `CardForm` 组件，添加阵营选择
- [ ] 更新 `CardForm` 组件，添加技能关联选择器
- [ ] 更新 `CardList` 组件，显示阵营和关联技能
- [ ] 更新 `admin.ts` 中的卡牌 API，支持新字段

#### 任务2.3：重构板子管理模块
- [ ] 更新 `BoardForm` 组件，添加卡牌选择器
- [ ] 实现 `BoardRoleSelector` 组件（板子角色配置）
  - 支持从卡牌库中选择卡牌
  - 支持设置每个卡牌的数量
  - 支持拖拽排序
  - 实时显示总人数和阵营统计
- [ ] 更新 `admin.ts` 中的板子 API，使用 `board_roles` 表
- [ ] 实现板子预览功能（显示角色分布）

#### 任务2.4：全局配置管理模块
- [ ] 创建 `GlobalConfigList` 组件（全局配置列表）
- [ ] 创建 `GlobalConfigForm` 组件（配置创建/编辑）
- [ ] 实现 `ConfigEditor` 组件（JSON 配置编辑器）
  - 支持表单化编辑（投票规则、发言规则等）
  - 支持 JSON 直接编辑
  - 配置验证
- [ ] 在 `admin.ts` 中添加全局配置 API 方法
- [ ] 在 `AdminDashboard` 中集成全局配置管理

#### 任务2.5：流程配置管理模块
- [ ] 创建 `ProcessList` 组件（流程列表）
- [ ] 创建 `ProcessForm` 组件（流程创建/编辑）
- [ ] 实现 `PhaseEditor` 组件（阶段配置编辑器）
  - 可视化阶段流程图
  - 支持添加/删除/编辑阶段
  - 支持配置阶段时长和动作
- [ ] 在 `admin.ts` 中添加流程配置 API 方法
- [ ] 在 `AdminDashboard` 中集成流程配置管理

---

### 阶段3：游戏端数据互通（优先级：高）

#### 任务3.1：游戏端数据模型更新
- [ ] 更新 `GameState` 类型，使用新的数据库结构
- [ ] 更新 `Player` 类型，关联卡牌和技能配置
- [ ] 更新 `Role` 类型，使用 `cards` 表数据
- [ ] 更新 `Skill` 类型，使用 `skills` 表配置

#### 任务3.2：游戏引擎适配
- [ ] 修改 `NightActionResolver`，使用技能配置表
- [ ] 修改 `VoteResolver`，使用全局配置表
- [ ] 修改 `WinConditionChecker`，使用阵营字段
- [ ] 修改 `RuleEngine`，使用流程配置表

#### 任务3.3：API 接口更新
- [ ] 更新 `board.ts` 服务，从数据库加载板子配置
- [ ] 更新 `game.ts` 服务，使用新的配置结构
- [ ] 更新 `AIService`，使用技能配置

---

### 阶段4：测试和优化（优先级：中）

#### 任务4.1：单元测试
- [ ] 测试技能配置的加载和解析
- [ ] 测试板子配置的创建和更新
- [ ] 测试全局配置的加载和应用
- [ ] 测试流程配置的加载和执行

#### 任务4.2：集成测试
- [ ] 测试完整的游戏流程（使用配置的板子）
- [ ] 测试技能执行（使用配置的技能）
- [ ] 测试胜负判断（使用阵营配置）
- [ ] 测试异常情况（配置错误、数据不一致等）

#### 任务4.3：性能优化
- [ ] 优化数据库查询（添加必要的索引）
- [ ] 优化配置加载（使用缓存）
- [ ] 优化前端渲染（虚拟列表、懒加载）

---

## 四、与游戏端的呼应

### 4.1 数据结构对应关系

| 后台管理表 | 游戏端类型 | 对应关系 |
|-----------|-----------|---------|
| `cards` | `Role` | 卡牌表 → 游戏角色 |
| `skills` | `Skill` | 技能配置表 → 游戏技能 |
| `boards` | `Board` | 板子表 → 游戏板子 |
| `board_roles` | `BoardConfig` | 板子角色表 → 游戏板子配置 |
| `global_configs` | `GameRules` | 全局配置表 → 游戏规则 |
| `processes` | `GameFlow` | 流程配置表 → 游戏流程 |

### 4.2 配置加载流程

```
游戏开始
  ↓
加载板子配置 (boards + board_roles)
  ↓
加载卡牌配置 (cards + skills)
  ↓
加载全局配置 (global_configs)
  ↓
加载流程配置 (processes)
  ↓
初始化游戏状态 (GameState)
  ↓
开始游戏循环
```

### 4.3 技能执行流程

```
玩家使用技能
  ↓
查询技能配置 (skills 表)
  ↓
验证触发条件 (trigger_conditions)
  ↓
验证目标限制 (effect_params)
  ↓
验证使用次数 (usage_limit)
  ↓
验证冷却时间 (cooldown)
  ↓
执行技能效果 (effect)
  ↓
更新游戏状态 (GameState)
  ↓
通知其他玩家
```

---

## 五、开发规范

### 5.1 命名规范
- 表名：小写，下划线分隔（如 `board_roles`）
- 字段名：小写，下划线分隔（如 `skill_id`）
- API 方法：驼峰命名（如 `getSkillsWithAdmin`）
- 组件名：大驼峰命名（如 `SkillForm`）

### 5.2 数据验证
- 所有 API 请求必须验证数据格式
- JSON 字段必须验证结构
- 外键关联必须验证存在性
- 业务规则必须验证（如板子总人数必须等于角色数量之和）

### 5.3 错误处理
- 所有数据库操作必须有错误处理
- 错误信息必须清晰明确
- 前端必须友好提示错误

### 5.4 日志记录
- 所有后台操作必须记录操作人
- 关键操作必须记录时间戳
- 敏感操作必须记录详细日志

---

## 六、里程碑

### 里程碑1：数据库重构完成
- ✅ 所有表结构创建完成
- ✅ 所有数据迁移完成
- ✅ 所有索引创建完成

### 里程碑2：后台管理基础功能完成
- ✅ 技能管理功能完成
- ✅ 卡牌管理功能完成（重构版）
- ✅ 板子管理功能完成（重构版）

### 里程碑3：高级配置功能完成
- ✅ 全局配置管理完成
- ✅ 流程配置管理完成

### 里程碑4：游戏端适配完成
- ✅ 游戏端使用新数据结构
- ✅ 游戏引擎使用新配置
- ✅ 端到端测试通过

### 里程碑5：系统上线
- ✅ 所有功能测试通过
- ✅ 性能优化完成
- ✅ 文档完善
- ✅ 正式上线

---

## 七、风险评估

### 风险1：数据迁移失败
- **风险等级：** 高
- **影响：** 现有数据丢失
- **缓解措施：**
  - 迁移前完整备份数据
  - 分批迁移，逐步验证
  - 保留旧表结构，确保可以回滚

### 风险2：游戏端适配困难
- **风险等级：** 中
- **影响：** 游戏端需要大量修改
- **缓解措施：**
  - 提前与游戏端开发沟通
  - 提供详细的接口文档
  - 分阶段适配，逐步测试

### 风险3：性能问题
- **风险等级：** 中
- **影响：** 大量数据时响应慢
- **缓解措施：**
  - 合理设计索引
  - 使用缓存机制
  - 分页查询

---

## 八、下一步行动

### 立即行动（今天）
1. 创建数据库迁移脚本（阶段1的所有任务）
2. 执行数据库迁移
3. 验证数据迁移结果

### 短期行动（本周）
1. 开发技能管理模块（任务2.1）
2. 重构卡牌管理模块（任务2.2）
3. 重构板子管理模块（任务2.3）

### 中期行动（本月）
1. 开发全局配置管理模块（任务2.4）
2. 开发流程配置管理模块（任务2.5）
3. 游戏端数据模型更新（任务3.1）

### 长期行动（下月）
1. 游戏引擎适配（任务3.2）
2. API 接口更新（任务3.3）
3. 测试和优化（阶段4）

---

## 九、成功标准

### 功能完整性
- ✅ 所有后台管理功能可用
- ✅ 所有配置可动态修改
- ✅ 游戏端可加载所有配置
- ✅ 配置修改实时生效

### 数据一致性
- ✅ 后台数据与游戏端数据一致
- ✅ 配置修改后游戏端正确应用
- ✅ 数据迁移无丢失

### 性能指标
- ✅ 页面加载时间 < 2秒
- ✅ API 响应时间 < 500ms
- ✅ 支持并发操作

### 用户体验
- ✅ 操作流程清晰
- ✅ 错误提示友好
- ✅ 配置可视化直观
