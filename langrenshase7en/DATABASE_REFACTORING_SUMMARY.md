# 狼人杀游戏系统 - 数据库重构和后台管理功能开发

## 项目概述

本文档描述了狼人杀游戏系统的数据库重构和后台管理功能开发的完整实现。

---

## 阶段1：数据库表结构重构

### 1.1 扩展 cards 表添加 camp 和 skill_id 字段

**文件：** `scripts/admin/step7-extend-cards-camp-skill.sql`

**变更：**
- 添加 `camp` 字段（阵营：werewolf/good/neutral）
- 添加 `skill_id` 字段（关联技能表）
- 设置默认值：camp = 'good'

**验证：**
- 检查 cards 表结构是否包含新字段
- 验证字段类型和约束

---

### 1.2 创建 skills 表（技能配置表）

**文件：** `scripts/admin/step8-create-skills-table.sql`

**变更：**
- 创建 skills 表
- 字段：
  - id (UUID, 主键)
  - skill_name (技能名称)
  - skill_code (技能代码，唯一)
  - skill_type (技能类型：active/passive/trigger)
  - trigger_phase (触发阶段：night/day/death/vote)
  - trigger_conditions (触发条件，JSON)
  - effect_params (效果参数，JSON)
  - effect_description (效果描述)
  - cooldown (冷却回合数)
  - usage_limit (使用次数限制)
  - is_active (是否启用)
  - create_time, update_time, create_by, update_by
  - is_delete (软删除标记)

**默认数据：**
- werewolf_kill（狼人击杀）
- seer_check（预言家查验）
- witch_save（女巫救人）
- witch_poison（女巫毒人）
- guard_protect（守卫守护）
- hunter_shoot（猎人开枪）

---

### 1.3 重构 board_roles 表添加 card_id 外键

**文件：** `scripts/admin/step9-refactor-board-roles.sql`

**变更：**
- 添加 `card_id` 字段（关联 cards 表）
- 保留原有 `role_type` 字段用于向后兼容
- 添加外键约束：`board_roles.card_id` → `cards.id`

---

### 1.4 创建 global_configs 表（全局配置表）

**文件：** `scripts/admin/step10-create-global-configs.sql`

**变更：**
- 创建 global_configs 表
- 字段：
  - id (UUID, 主键)
  - config_name (配置名称)
  - config_code (配置代码，唯一)
  - config_type (配置类型：rule/setting/parameter)
  - config_value (配置值，JSON)
  - description (描述)
  - is_default (是否默认配置)
  - is_active (是否启用)
  - create_time, update_time, create_by, update_by
  - is_delete (软删除标记)

**默认数据：**
- vote_rule（投票规则）
- speak_rule（发言规则）
- death_rule（死亡规则）
- game_setting（游戏设置）

---

### 1.5 创建 processes 表（流程配置表）

**文件：** `scripts/admin/step11-create-processes.sql`

**变更：**
- 创建 processes 表
- 字段：
  - id (UUID, 主键)
  - process_name (流程名称)
  - process_code (流程代码，唯一)
  - process_type (流程类型：game_flow/phase_config/action_config）
  - phase_config (阶段配置，JSON）
  - description (描述)
  - is_default (是否默认流程)
  - is_active (是否启用)
  - create_time, update_time, create_by, update_by
  - is_delete (软删除标记)

**默认数据：**
- standard_flow（标准流程）
- quick_flow（快速流程）

---

### 1.6 数据迁移和验证

**文件：** `scripts/admin/step12-migrate-and-validate.sql`

**变更：**
- 为现有卡牌关联技能（5个UPDATE语句）
- 验证 cards 表结构（检查 camp 和 skill_id 字段）
- 验证 skills 表结构（检查表存在和默认数据）
- 验证 global_configs 表结构（检查表存在和默认数据）
- 验证 processes 表结构（检查表存在和默认数据）
- 验证 board_roles 表结构（检查 card_id 字段）
- 数据完整性检查（检查卡牌是否都关联了技能）
- 统计信息（各表的记录数）

---

## 阶段2：后台管理功能开发

### 2.1 技能管理模块

**文件：**
- `src/components/admin/SkillList.tsx`
- `src/components/admin/SkillForm.tsx`

**功能：**
- 技能列表（SkillList）
  - 技能搜索功能
  - 按技能类型筛选（主动/被动/触发）
  - 按触发阶段筛选（夜晚/白天/死亡/投票）
  - 技能卡片展示（显示技能代码、类型、阶段、效果描述、冷却、使用限制）
  - 编辑和删除功能
  - Toast 通知

- 技能表单（SkillForm）
  - 创建/编辑技能表单
  - 表单验证（技能名称、代码、类型、效果参数）
  - 效果参数 JSON 编辑器
  - 冷却回合数和使用次数限制设置
  - 启用/禁用开关
  - Toast 通知

**API 方法：**
- `getSkillsWithAdmin()` - 获取技能列表
- `createSkillWithAdmin()` - 创建技能
- `updateSkillWithAdmin()` - 更新技能
- `deleteSkillWithAdmin()` - 删除技能

---

### 2.2 重构卡牌管理

**文件：**
- `src/components/admin/CardForm.tsx`（已更新）
- `src/components/admin/CardList.tsx`（已更新）

**功能：**
- 卡牌表单（CardForm）
  - 添加阵营选择器（狼人/好人/中立）
  - 添加技能关联选择器（从技能列表中选择）
  - 表单验证（添加阵营验证）
  - 初始化表单时包含 camp 和 skill_id

- 卡牌列表（CardList）
  - 添加阵营筛选（全部/狼人/好人/中立）
  - 添加 `getCampBadge()` 函数显示阵营徽章
  - 添加 `getSkillName()` 函数显示关联技能名称
  - 卡牌卡片显示阵营和关联技能

---

### 2.3 重构板子管理

**文件：**
- `src/components/admin/BoardForm.tsx`（已更新）

**功能：**
- 卡牌选择器（从卡牌库中选择卡牌）
- 数量设置（每个卡牌的数量）
- 实时统计（总人数和阵营分布）
- 板子预览（显示角色配置预览）
- 表单验证（角色总数必须等于玩家数量）

---

### 2.4 全局配置管理

**文件：**
- `src/components/admin/GlobalConfigList.tsx`
- `src/components/admin/GlobalConfigForm.tsx`

**功能：**
- 全局配置列表（GlobalConfigList）
  - 配置搜索功能
  - 按配置类型筛选（规则/设置/参数）
  - 按状态筛选（全部/启用/禁用）
  - 配置卡片展示（显示配置代码、类型、值预览、描述）
  - 编辑和删除功能
  - Toast 通知
  - 配置值预览（针对不同配置类型显示不同格式）

- 全局配置表单（GlobalConfigForm）
  - 创建/编辑配置表单
  - 表单验证（配置名称、代码、类型、值）
  - JSON 编辑器（支持配置值的 JSON 编辑）
  - 默认配置开关
  - 启用/禁用开关
  - Toast 通知
  - 配置值占位符（针对不同配置类型提供不同模板）

**API 方法：**
- `getGlobalConfigsWithAdmin()` - 获取全局配置列表
- `createGlobalConfigWithAdmin()` - 创建全局配置
- `updateGlobalConfigWithAdmin()` - 更新全局配置
- `deleteGlobalConfigWithAdmin()` - 删除全局配置

---

### 2.5 流程配置管理

**文件：**
- `src/components/admin/ProcessList.tsx`
- `src/components/admin/ProcessForm.tsx`

**功能：**
- 流程列表（ProcessList）
  - 流程搜索功能
  - 按流程类型筛选（游戏流程/阶段配置/动作配置）
  - 按状态筛选（全部/启用/禁用）
  - 流程卡片展示（显示流程代码、类型、阶段配置预览、描述）
  - 编辑和删除功能
  - Toast 通知
  - 阶段配置预览（显示所有阶段及其动作）

- 流程表单（ProcessForm）
  - 创建/编辑流程表单
  - 表单验证（流程名称、代码、类型、阶段配置）
  - 阶段管理（添加/删除阶段）
  - 动作管理（添加/删除动作）
  - 每个阶段可配置：名称、顺序、时长、下一阶段、动作列表
  - 默认流程开关
  - 启用/禁用开关
  - Toast 通知

**API 方法：**
- `getProcessesWithAdmin()` - 获取流程列表
- `createProcessWithAdmin()` - 创建流程
- `updateProcessWithAdmin()` - 更新流程
- `deleteProcessWithAdmin()` - 删除流程

---

## 阶段3：游戏端数据互通

### 3.1 更新游戏端数据模型

**文件：**
- `src/types/game.ts`（已更新）
- `src/services/gameConfig.ts`（新建）

**变更：**
- 添加阵营类型（CampType）
- 添加技能类型（SkillType）
- 添加触发阶段类型（TriggerPhase）
- 添加技能接口（Skill）
- 更新 Player 接口（添加 camp 和 skill 字段）
- 添加阵营信息常量（CAMP_INFO）
- 创建游戏配置服务（gameConfigService）
  - `getGameConfig()` - 获取游戏配置
  - `getBoardRoles()` - 获取板子角色配置
  - `getCardById()` - 根据ID获取卡牌
  - `getSkillById()` - 根据ID获取技能
  - `getGlobalConfigByCode()` - 根据代码获取全局配置
  - `getProcessByCode()` - 根据代码获取流程

---

### 3.2 更新游戏引擎

**文件：**
- `src/services/gameEngine.ts`（新建）

**变更：**
- 重构游戏引擎，使其能够从数据库加载配置
- 更新 `assignRoles()` 方法 - 从 board_roles 表加载角色配置
- 更新 `startNightPhase()` 方法 - 从 processes 表加载流程配置
- 更新 `startDayPhase()` 方法 - 从 processes 表加载流程配置
- 更新 `startVotingPhase()` 方法 - 从 global_configs 表加载投票规则
- 添加 `executeSkill()` 方法 - 执行技能效果
  - 从 skills 表加载技能配置
  - 记录技能使用到 game_actions 表
  - 检查技能冷却和使用限制

---

## AdminDashboard 集成

**文件：** `src/pages/admin/AdminDashboard.tsx`（已更新）

**变更：**
- 添加技能管理标签页
- 添加全局配置标签页
- 添加流程配置标签页
- 添加技能列表和表单的显示逻辑
- 添加全局配置列表和表单的显示逻辑
- 添加流程列表和表单的显示逻辑
- 添加技能相关的处理函数（创建、编辑、保存、取消）
- 添加全局配置相关的处理函数（创建、编辑、保存、取消）
- 添加流程相关的处理函数（创建、编辑、保存、取消）
- 更新统计信息（添加全局配置和流程配置统计）

---

## 数据库表结构总结

### 新增表
1. **skills** - 技能配置表
2. **global_configs** - 全局配置表
3. **processes** - 流程配置表

### 修改表
1. **cards** - 添加 camp 和 skill_id 字段
2. **board_roles** - 添加 card_id 外键

---

## API 方法总结

### admin.ts 新增方法
- `getSkillsWithAdmin()` - 获取技能列表
- `createSkillWithAdmin()` - 创建技能
- `updateSkillWithAdmin()` - 更新技能
- `deleteSkillWithAdmin()` - 删除技能
- `getGlobalConfigsWithAdmin()` - 获取全局配置列表
- `createGlobalConfigWithAdmin()` - 创建全局配置
- `updateGlobalConfigWithAdmin()` - 更新全局配置
- `deleteGlobalConfigWithAdmin()` - 删除全局配置
- `getProcessesWithAdmin()` - 获取流程列表
- `createProcessWithAdmin()` - 创建流程
- `updateProcessWithAdmin()` - 更新流程
- `deleteProcessWithAdmin()` - 删除流程

### gameConfig.ts 新增方法
- `getGameConfig()` - 获取游戏配置
- `getBoardRoles()` - 获取板子角色配置
- `getCardById()` - 根据ID获取卡牌
- `getSkillById()` - 根据ID获取技能
- `getGlobalConfigByCode()` - 根据代码获取全局配置
- `getProcessByCode()` - 根据代码获取流程

### gameEngine.ts 新增方法
- `executeSkill()` - 执行技能效果

---

## 组件总结

### 新增组件
1. **SkillList.tsx** - 技能列表组件
2. **SkillForm.tsx** - 技能表单组件
3. **GlobalConfigList.tsx** - 全局配置列表组件
4. **GlobalConfigForm.tsx** - 全局配置表单组件
5. **ProcessList.tsx** - 流程列表组件
6. **ProcessForm.tsx** - 流程表单组件
7. **gameConfig.ts** - 游戏配置服务
8. **gameEngine.ts** - 游戏引擎（重构）

### 修改组件
1. **CardForm.tsx** - 添加阵营选择器和技能关联选择器
2. **CardList.tsx** - 添加阵营筛选和技能显示
3. **BoardForm.tsx** - 添加卡牌选择器、数量设置、实时统计和板子预览
4. **AdminDashboard.tsx** - 集成所有新功能

---

## 使用说明

### 后台管理使用流程

1. **技能管理**
   - 访问 `/admin` 页面
   - 点击"技能管理"标签
   - 点击"创建技能"按钮创建新技能
   - 点击技能卡片上的编辑按钮编辑技能
   - 点击技能卡片上的删除按钮删除技能

2. **卡牌管理**
   - 访问 `/admin` 页面
   - 点击"牌库管理"标签
   - 点击"创建卡牌"按钮创建新卡牌
   - 选择阵营（狼人/好人/中立）
   - 选择关联技能（从技能列表中选择）
   - 点击卡牌卡片上的编辑按钮编辑卡牌
   - 点击卡牌卡片上的删除按钮删除卡牌

3. **板子管理**
   - 访问 `/admin` 页面
   - 点击"板子管理"标签
   - 点击"创建板子"按钮创建新板子
   - 选择卡牌（从卡牌库中选择）
   - 设置每个卡牌的数量
   - 查看实时统计（总人数和阵营分布）
   - 点击板子卡片上的编辑按钮编辑板子
   - 点击板子卡片上的删除按钮删除板子

4. **全局配置管理**
   - 访问 `/admin` 页面
   - 点击"全局配置"标签
   - 点击"创建配置"按钮创建新配置
   - 选择配置类型（规则/设置/参数）
   - 编辑配置值（JSON 格式）
   - 点击配置卡片上的编辑按钮编辑配置
   - 点击配置卡片上的删除按钮删除配置

5. **流程配置管理**
   - 访问 `/admin` 页面
   - 点击"流程配置"标签
   - 点击"创建流程"按钮创建新流程
   - 选择流程类型（游戏流程/阶段配置/动作配置）
   - 添加阶段（名称、顺序、时长、下一阶段）
   - 为每个阶段添加动作
   - 点击流程卡片上的编辑按钮编辑流程
   - 点击流程卡片上的删除按钮删除流程

### 游戏端使用流程

1. **创建游戏**
   - 选择板子（从板子列表中选择）
   - 系统自动从 board_roles 表加载角色配置
   - 系统自动分配角色给玩家
   - 系统自动从 processes 表加载流程配置
   - 系统自动从 global_configs 表加载全局配置

2. **游戏进行中**
   - 系统根据流程配置进行阶段切换
   - 系统根据全局配置执行规则
   - 玩家可以使用技能（从 skills 表加载技能配置）
   - 系统记录技能使用到 game_actions 表

3. **游戏结束**
   - 系统检查胜利条件
   - 系统记录游戏结果到 game_records 表

---

## 数据流图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         后台管理系统                              │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  技能管理  │  卡牌管理  │  板子管理  │  │
│  │  SkillList  │  CardList  │  BoardList  │  │
│  │  SkillForm  │  CardForm  │  BoardForm  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  全局配置管理  │  流程配置管理  │              │
│  │  GlobalConfigList  │  ProcessList  │              │
│  │  GlobalConfigForm  │  ProcessForm  │              │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                            │
┌─────────────────────────────────────────────────────────────────────┐
│                         Supabase 数据库                           │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  skills  │  cards  │  board_roles  │  │
│  │  global_configs  │  processes  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                            │
┌─────────────────────────────────────────────────────────────────────┐
│                         游戏配置服务                           │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  gameConfigService                              │  │
│  │  - getGameConfig()                              │  │
│  │  - getBoardRoles()                              │  │
│  │  - getCardById()                               │  │
│  │  - getSkillById()                              │  │
│  │  - getGlobalConfigByCode()                      │  │
│  │  - getProcessByCode()                           │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                            │
┌─────────────────────────────────────────────────────────────────────┐
│                         游戏引擎                                 │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  gameEngine                                     │  │
│  │  - assignRoles() - 从 board_roles 加载角色       │  │
│  │  - startNightPhase() - 从 processes 加载流程     │  │
│  │  - startDayPhase() - 从 processes 加载流程       │  │
│  │  - startVotingPhase() - 从 global_configs 加载规则 │  │
│  │  - executeSkill() - 从 skills 加载技能配置       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                            │
┌─────────────────────────────────────────────────────────────────────┐
│                         游戏前端                                 │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  游戏房间  │  游戏大厅  │  游戏界面         │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 技术栈

- **前端框架：** React 18 + TypeScript
- **UI 组件库：** shadcn/ui
- **状态管理：** React Query (TanStack Query)
- **通知：** Sonner
- **数据库：** Supabase (PostgreSQL)
- **路由：** React Router

---

## 完成状态

### 阶段1：数据库表结构重构
- ✅ 扩展 cards 表添加 camp 和 skill_id 字段
- ✅ 创建 skills 表（技能配置表）
- ✅ 重构 board_roles 表添加 card_id 外键
- ✅ 创建 global_configs 表（全局配置表）
- ✅ 创建 processes 表（流程配置表）
- ✅ 数据迁移和验证

### 阶段2：后台管理功能开发
- ✅ 技能管理模块（SkillList + SkillForm）
- ✅ 重构卡牌管理（CardForm + CardList 支持阵营和技能关联）
- ✅ 重构板子管理（BoardForm 支持卡牌选择器、数量设置、实时统计和板子预览）
- ✅ 全局配置管理（GlobalConfigList + GlobalConfigForm）
- ✅ 流程配置管理（ProcessList + ProcessForm）

### 阶段3：游戏端数据互通
- ✅ 更新游戏端数据模型（添加技能、阵营相关类型）
- ✅ 创建游戏配置服务（gameConfigService）
- ✅ 重构游戏引擎（gameEngine，支持从数据库加载配置）

---

## 下一步建议

1. **测试现有功能**
   - 启动开发服务器
   - 测试所有已开发的功能
   - 修复发现的问题

2. **完善游戏引擎**
   - 实现技能冷却和使用限制检查
   - 实现技能触发条件检查
   - 实现技能效果执行逻辑

3. **添加更多功能**
   - AI 玩家管理
   - 游戏记录查看
   - 数据统计和分析

4. **优化性能**
   - 添加数据缓存
   - 优化数据库查询
   - 添加分页功能

---

## 注意事项

1. **数据库迁移**
   - 执行数据库迁移脚本前请备份数据库
   - 按照正确的顺序执行迁移脚本

2. **数据完整性**
   - 确保所有卡牌都关联了技能
   - 确保所有板子都关联了角色配置
   - 确保所有配置都是有效的 JSON 格式

3. **错误处理**
   - 所有 API 调用都有错误处理
   - 所有操作都有 Toast 通知
   - 所有表单都有验证

4. **用户体验**
   - 所有列表都有搜索和筛选功能
   - 所有表单都有实时验证
   - 所有操作都有加载状态提示

---

## 联系方式

如有问题或建议，请联系开发团队。

---

**文档版本：** 1.0.0
**最后更新：** 2026-02-01
**作者：** AI Assistant
