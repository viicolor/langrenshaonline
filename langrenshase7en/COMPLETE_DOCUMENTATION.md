# 狼人杀游戏系统 - 完整说明文档

## 项目概述

本文档包含了狼人杀游戏系统的所有规范要求、开发文档、进度跟踪、已完成的工作、当前存在的问题和建议的解决方案。

---

## 目录

1. [规范要求](#规范要求)
2. [开发文档](#开发文档)
3. [进度跟踪](#进度跟踪)
4. [已完成的工作](#已完成的工作)
5. [当前存在的问题](#当前存在的问题)
6. [建议的解决方案](#建议的解决方案)
7. [技术栈](#技术栈)
8. [注意事项](#注意事项)

---

## 规范要求

### 1. 数据库表结构规范

#### 1.1 cards 表（卡牌表）

| 字段名 | 类型 | 说明 | 必填 |
|---------|------|------|------|
| id | UUID | 主键 | 是 |
| card_name | VARCHAR(100) | 卡牌名称 | 是 |
| card_alias | VARCHAR(100) | 卡牌别名 | 否 |
| card_type | VARCHAR(50) | 卡牌类型 | 是 |
| camp | VARCHAR(20) | 阵营（werewolf/good/neutral） | 否 |
| role_type | VARCHAR(50) | 角色类型 | 是 |
| skill_id | UUID | 关联技能ID | 否 |
| skill_description | TEXT | 技能描述 | 否 |
| skill_icon | VARCHAR(100) | 技能图标 | 否 |
| is_active | INT | 是否启用（0/1） | 否 |
| difficult | INT | 难度（1-3） | 否 |
| recommend | INT | 是否推荐（0/1） | 否 |
| desc | TEXT | 描述 | 否 |
| character_config | JSON | 角色配置 | 否 |
| create_time | TIMESTAMP | 创建时间 | 是 |
| update_time | TIMESTAMP | 更新时间 | 否 |
| create_by | VARCHAR(100) | 创建人 | 否 |
| update_by | VARCHAR(100) | 更新人 | 否 |
| is_delete | INT | 是否删除（0/1） | 否 |

#### 1.2 skills 表（技能表）

| 字段名 | 类型 | 说明 | 必填 |
|---------|------|------|------|
| id | UUID | 主键 | 是 |
| skill_name | VARCHAR(100) | 技能名称 | 是 |
| skill_code | VARCHAR(50) | 技能代码（唯一） | 是 |
| skill_type | VARCHAR(20) | 技能类型（active/passive/trigger） | 是 |
| trigger_phase | VARCHAR(20) | 触发阶段（night/day/death/vote） | 否 |
| trigger_conditions | JSON | 触发条件 | 否 |
| effect_params | JSON | 效果参数 | 否 |
| effect_description | TEXT | 效果描述 | 否 |
| cooldown | INT | 冷却回合数 | 否 |
| usage_limit | INT | 使用次数限制 | 否 |
| is_active | INT | 是否启用（0/1） | 否 |
| create_time | TIMESTAMP | 创建时间 | 是 |
| update_time | TIMESTAMP | 更新时间 | 否 |
| create_by | VARCHAR(100) | 创建人 | 否 |
| update_by | VARCHAR(100) | 更新人 | 否 |
| is_delete | INT | 是否删除（0/1） | 否 |

#### 1.3 boards 表（板子表）

| 字段名 | 类型 | 说明 | 必填 |
|---------|------|------|------|
| id | UUID | 主键 | 是 |
| name | VARCHAR(100) | 板子名称 | 是 |
| description | TEXT | 板子描述 | 否 |
| player_count | INT | 玩家数量 | 否 |
| board_alias | VARCHAR(100) | 板子别名 | 否 |
| character_config | JSON | 角色配置 | 否 |
| global_config_ids | VARCHAR(500) | 全局配置ID列表 | 否 |
| process_ids | VARCHAR(500) | 流程ID列表 | 否 |
| difficult | INT | 难度（1-3） | 否 |
| status | INT | 状态（0/1/2） | 否 |
| recommend | INT | 是否推荐（0/1） | 否 |
| create_time | TIMESTAMP | 创建时间 | 是 |
| update_time | TIMESTAMP | 更新时间 | 否 |
| create_by | VARCHAR(100) | 创建人 | 否 |
| update_by | VARCHAR(100) | 更新人 | 否 |
| is_delete | INT | 是否删除（0/1） | 否 |

#### 1.4 board_roles 表（板子角色表）

| 字段名 | 类型 | 说明 | 必填 |
|---------|------|------|------|
| id | UUID | 主键 | 是 |
| board_id | UUID | 板子ID（外键） | 是 |
| card_id | UUID | 卡牌ID（外键） | 否 |
| role_type | VARCHAR(50) | 角色类型 | 否 |
| count | INT | 数量 | 是 |
| create_time | TIMESTAMP | 创建时间 | 是 |
| update_time | TIMESTAMP | 更新时间 | 否 |
| create_by | VARCHAR(100) | 创建人 | 否 |
| update_by | VARCHAR(100) | 更新人 | 否 |
| is_delete | INT | 是否删除（0/1） | 否 |

#### 1.5 global_configs 表（全局配置表）

| 字段名 | 类型 | 说明 | 必填 |
|---------|------|------|------|
| id | UUID | 主键 | 是 |
| config_name | VARCHAR(100) | 配置名称 | 是 |
| config_code | VARCHAR(50) | 配置代码（唯一） | 是 |
| config_type | VARCHAR(20) | 配置类型（rule/setting/parameter） | 是 |
| config_value | JSON | 配置值 | 是 |
| description | TEXT | 描述 | 否 |
| is_default | INT | 是否默认配置（0/1） | 否 |
| is_active | INT | 是否启用（0/1） | 否 |
| create_time | TIMESTAMP | 创建时间 | 是 |
| update_time | TIMESTAMP | 更新时间 | 否 |
| create_by | VARCHAR(100) | 创建人 | 否 |
| update_by | VARCHAR(100) | 更新人 | 否 |
| is_delete | INT | 是否删除（0/1） | 否 |

#### 1.6 processes 表（流程配置表）

| 字段名 | 类型 | 说明 | 必填 |
|---------|------|------|------|
| id | UUID | 主键 | 是 |
| process_name | VARCHAR(100) | 流程名称 | 是 |
| process_code | VARCHAR(50) | 流程代码（唯一） | 是 |
| process_type | VARCHAR(20) | 流程类型（game_flow/phase_config/action_config） | 是 |
| phase_config | JSON | 阶段配置 | 是 |
| description | TEXT | 描述 | 否 |
| is_default | INT | 是否默认流程（0/1） | 否 |
| is_active | INT | 是否启用（0/1） | 否 |
| create_time | TIMESTAMP | 创建时间 | 是 |
| update_time | TIMESTAMP | 更新时间 | 否 |
| create_by | VARCHAR(100) | 创建人 | 否 |
| update_by | VARCHAR(100) | 更新人 | 否 |
| is_delete | INT | 是否删除（0/1） | 否 |

---

### 2. 前端组件规范

#### 2.1 组件命名规范

- **组件文件名：** PascalCase（如 `BoardForm.tsx`）
- **组件函数名：** PascalCase（如 `BoardForm`）
- **接口名：** PascalCase + Props（如 `BoardFormProps`）

#### 2.2 组件结构规范

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Save, Plus, Minus } from 'lucide-react';
import { adminService } from '@/services/admin';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ComponentProps {
  // props 定义
}

const Component = ({ prop1, prop2, onSave, onCancel }: ComponentProps) => {
  // 状态定义
  const [formData, setFormData] = useState<FormData>({});

  // 查询定义
  const { data: items } = useQuery({
    queryKey: ['admin-items'],
    queryFn: () => adminService.getItemsWithAdmin(),
  });

  // 变更定义
  const createMutation = useMutation({
    mutationFn: (params: CreateParams) => adminService.createItemWithAdmin(params, 'admin'),
    onSuccess: (data) => {
      toast.success('创建成功', {
        description: '项目已成功创建',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-items'] });
      if (onSave && data) {
        onSave(data);
      }
    },
    onError: (error) => {
      toast.error('创建失败', {
        description: error.message || '创建项目失败，请稍后重试',
      });
    },
  });

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '名称不能为空';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交处理
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (mode === 'create') {
      createMutation.mutate(formData);
    } else if (mode === 'edit' && item) {
      updateMutation.mutate({ itemId: item.id, updates: formData });
    }
  };

  // 取消处理
  const handleCancel = () => {
    setFormData(initialData);
    setErrors({});
    onCancel();
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle>{mode === 'create' ? '创建项目' : '编辑项目'}</CardTitle>
        <CardDescription>
          {mode === 'create' ? '创建新的项目配置' : '编辑现有的项目配置'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 表单内容 */}
        </form>
      </CardContent>
    </Card>
  );
};

export default Component;
```

#### 2.3 表单验证规范

- **必填字段验证：** 检查字段是否为空
- **长度验证：** 检查字段长度是否符合要求
- **格式验证：** 检查字段格式是否正确
- **业务逻辑验证：** 检查业务逻辑是否正确（如角色总数必须等于玩家数量）

#### 2.4 Toast 通知规范

- **成功通知：** 使用 `toast.success()`
- **错误通知：** 使用 `toast.error()`
- **通知内容：** 包含标题和描述

---

### 3. 服务层规范

#### 3.1 服务文件结构

```typescript
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export interface ItemWithAdmin extends Tables<'items'> {
  // 扩展字段
}

export interface CreateItemParams {
  // 创建参数
}

export const adminService = {
  async getItemsWithAdmin(): Promise<ItemWithAdmin[]> {
    try {
      const { data: items, error } = await supabase
        .from('items')
        .select('*')
        .eq('is_delete', 0)
        .order('create_time', { ascending: false });
      
      if (error) throw error;
      return (items || []) as ItemWithAdmin[];
    } catch (error) {
      console.error('Get items with admin error:', error);
      return [];
    }
  },

  async createItemWithAdmin(params: CreateItemParams, createBy: string): Promise<ItemWithAdmin | null> {
    try {
      const itemData = {
        // 数据映射
      };

      const { data: item, error } = await supabase
        .from('items')
        .insert(itemData as any)
        .select()
        .single();

      if (error) {
        console.error('[adminService] Create item error:', error);
        throw error;
      }
      return item as ItemWithAdmin | null;
    } catch (error) {
      console.error('[adminService] Create item with admin error:', error);
      return null;
    }
  },

  async updateItemWithAdmin(itemId: string, updates: Partial<ItemWithAdmin>, updateBy: string): Promise<ItemWithAdmin | null> {
    try {
      const updateData = {
        ...updates,
        update_by,
      };

      const { data: item, error } = await supabase
        .from('items')
        .update(updateData as any)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return item as ItemWithAdmin | null;
    } catch (error) {
      console.error('Update item with admin error:', error);
      return null;
    }
  },

  async deleteItemWithAdmin(itemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('items')
        .update({ is_delete: 1, update_by: 'admin' })
        .eq('id', itemId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete item with admin error:', error);
      return false;
    }
  },
};
```

#### 3.2 服务方法命名规范

- **获取列表：** `getItemsWithAdmin()`
- **创建项目：** `createItemWithAdmin(params, createBy)`
- **更新项目：** `updateItemWithAdmin(itemId, updates, updateBy)`
- **删除项目：** `deleteItemWithAdmin(itemId)`

---

## 开发文档

### 1. 阶段1：数据库表结构重构

#### 1.1 扩展 cards 表添加 camp 和 skill_id 字段

**文件：** `scripts/admin/step7-extend-cards-camp-skill.sql`

**SQL 语句：**
```sql
ALTER TABLE cards ADD COLUMN camp VARCHAR(20) DEFAULT 'good';
ALTER TABLE cards ADD COLUMN skill_id UUID REFERENCES skills(id);
```

**验证：**
```sql
-- 检查 cards 表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cards' 
  AND column_name IN ('camp', 'skill_id');
```

#### 1.2 创建 skills 表（技能配置表）

**文件：** `scripts/admin/step8-create-skills-table.sql`

**SQL 语句：**
```sql
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name VARCHAR(100) NOT NULL,
  skill_code VARCHAR(50) UNIQUE NOT NULL,
  skill_type VARCHAR(20) NOT NULL,
  trigger_phase VARCHAR(20),
  trigger_conditions JSON,
  effect_params JSON,
  effect_description TEXT,
  cooldown INT DEFAULT 0,
  usage_limit INT DEFAULT 0,
  is_active INT DEFAULT 1,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP,
  create_by VARCHAR(100),
  update_by VARCHAR(100),
  is_delete INT DEFAULT 0
);

-- 插入默认数据
INSERT INTO skills (skill_name, skill_code, skill_type, trigger_phase, effect_params, effect_description, cooldown, usage_limit) VALUES
('狼人击杀', 'werewolf_kill', 'active', 'night', '{"damage": 1}', '夜晚可以选择一名玩家击杀', 0, 0),
('预言家查验', 'seer_check', 'active', 'night', '{"reveal": true}', '夜晚可以查验一名玩家的身份', 0, 0),
('女巫救人', 'witch_save', 'active', 'night', '{"save": true}', '夜晚可以救活一名玩家', 1, 1),
('女巫毒人', 'witch_poison', 'active', 'night', '{"poison": true}', '夜晚可以毒杀一名玩家', 1, 1),
('守卫守护', 'guard_protect', 'active', 'night', '{"protect": true}', '夜晚可以守护一名玩家', 0, 0),
('猎人开枪', 'hunter_shoot', 'passive', 'death', '{"shoot": true}', '死亡时可以开枪带走一名玩家', 0, 0);
```

**验证：**
```sql
-- 检查 skills 表是否存在
SELECT table_name FROM information_schema.tables WHERE table_name = 'skills';

-- 检查默认数据
SELECT * FROM skills WHERE is_delete = 0;
```

#### 1.3 重构 board_roles 表添加 card_id 外键

**文件：** `scripts/admin/step9-refactor-board-roles.sql`

**SQL 语句：**
```sql
ALTER TABLE board_roles ADD COLUMN card_id UUID REFERENCES cards(id);
```

**验证：**
```sql
-- 检查 board_roles 表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'board_roles' 
  AND column_name = 'card_id';
```

#### 1.4 创建 global_configs 表（全局配置表）

**文件：** `scripts/admin/step10-create-global-configs.sql`

**SQL 语句：**
```sql
CREATE TABLE global_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name VARCHAR(100) NOT NULL,
  config_code VARCHAR(50) UNIQUE NOT NULL,
  config_type VARCHAR(20) NOT NULL,
  config_value JSON NOT NULL,
  description TEXT,
  is_default INT DEFAULT 0,
  is_active INT DEFAULT 1,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP,
  create_by VARCHAR(100),
  update_by VARCHAR(100),
  is_delete INT DEFAULT 0
);

-- 插入默认数据
INSERT INTO global_configs (config_name, config_code, config_type, config_value, description, is_default, is_active) VALUES
('投票规则', 'vote_rule', 'rule', '{"vote_type": "majority", "vote_time": 60}', '投票规则配置', 1, 1),
('发言规则', 'speak_rule', 'rule', '{"speak_time": 120, "speak_order": "random"}', '发言规则配置', 1, 1),
('死亡规则', 'death_rule', 'rule', '{"death_reveal": true, "death_action": "leave"}', '死亡规则配置', 1, 1),
('游戏设置', 'game_setting', 'parameter', '{"max_players": 20, "min_players": 6}', '游戏设置配置', 1, 1);
```

**验证：**
```sql
-- 检查 global_configs 表是否存在
SELECT table_name FROM information_schema.tables WHERE table_name = 'global_configs';

-- 检查默认数据
SELECT * FROM global_configs WHERE is_delete = 0;
```

#### 1.5 创建 processes 表（流程配置表）

**文件：** `scripts/admin/step11-create-processes.sql`

**SQL 语句：**
```sql
CREATE TABLE processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_name VARCHAR(100) NOT NULL,
  process_code VARCHAR(50) UNIQUE NOT NULL,
  process_type VARCHAR(20) NOT NULL,
  phase_config JSON NOT NULL,
  description TEXT,
  is_default INT DEFAULT 0,
  is_active INT DEFAULT 1,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP,
  create_by VARCHAR(100),
  update_by VARCHAR(100),
  is_delete INT DEFAULT 0
);

-- 插入默认数据
INSERT INTO processes (process_name, process_code, process_type, phase_config, description, is_default, is_active) VALUES
('标准流程', 'standard_flow', 'game_flow', '{"phases": [{"name": "night", "order": 1, "duration": 300}, {"name": "day", "order": 2, "duration": 600}, {"name": "voting", "order": 3, "duration": 180}]}', '标准游戏流程', 1, 1),
('快速流程', 'quick_flow', 'game_flow', '{"phases": [{"name": "night", "order": 1, "duration": 180}, {"name": "day", "order": 2, "duration": 300}, {"name": "voting", "order": 3, "duration": 90}]}', '快速游戏流程', 0, 1);
```

**验证：**
```sql
-- 检查 processes 表是否存在
SELECT table_name FROM information_schema.tables WHERE table_name = 'processes';

-- 检查默认数据
SELECT * FROM processes WHERE is_delete = 0;
```

#### 1.6 数据迁移和验证

**文件：** `scripts/admin/step12-migrate-and-validate.sql`

**SQL 语句：**
```sql
-- 为现有卡牌关联技能
UPDATE cards SET skill_id = (SELECT id FROM skills WHERE skill_code = 'werewolf_kill' LIMIT 1) WHERE role_type = 'werewolf';
UPDATE cards SET skill_id = (SELECT id FROM skills WHERE skill_code = 'seer_check' LIMIT 1) WHERE role_type = 'seer';
UPDATE cards SET skill_id = (SELECT id FROM skills WHERE skill_code = 'witch_save' LIMIT 1) WHERE role_type = 'witch';
UPDATE cards SET skill_id = (SELECT id FROM skills WHERE skill_code = 'hunter_shoot' LIMIT 1) WHERE role_type = 'hunter';
UPDATE cards SET skill_id = (SELECT id FROM skills WHERE skill_code = 'guard_protect' LIMIT 1) WHERE role_type = 'guard';

-- 验证 cards 表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cards' 
  AND column_name IN ('camp', 'skill_id');

-- 验证 skills 表结构
SELECT table_name FROM information_schema.tables WHERE table_name = 'skills';

-- 验证 global_configs 表结构
SELECT table_name FROM information_schema.tables WHERE table_name = 'global_configs';

-- 验证 processes 表结构
SELECT table_name FROM information_schema.tables WHERE table_name = 'processes';

-- 验证 board_roles 表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'board_roles' 
  AND column_name = 'card_id';

-- 数据完整性检查
SELECT c.id, c.card_name, c.skill_id, s.skill_name 
FROM cards c 
LEFT JOIN skills s ON c.skill_id = s.id 
WHERE c.is_delete = 0 
  AND c.skill_id IS NULL;

-- 统计信息
SELECT 'cards' as table_name, COUNT(*) as total_count FROM cards WHERE is_delete = 0;
SELECT 'skills' as table_name, COUNT(*) as total_count FROM skills WHERE is_delete = 0;
SELECT 'global_configs' as table_name, COUNT(*) as total_count FROM global_configs WHERE is_delete = 0;
SELECT 'processes' as table_name, COUNT(*) as total_count FROM processes WHERE is_delete = 0;
SELECT 'board_roles' as table_name, COUNT(*) as total_count FROM board_roles WHERE is_delete = 0;
```

---

### 2. 阶段2：后台管理功能开发

#### 2.1 技能管理模块

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

#### 2.2 重构卡牌管理

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

#### 2.3 重构板子管理

**文件：**
- `src/components/admin/BoardForm.tsx`（已更新）

**功能：**
- 卡牌选择器（从卡牌库中选择卡牌）
- 数量设置（每个卡牌的数量）
- 实时统计（总人数和阵营分布）
- 板子预览（显示角色配置预览）
- 表单验证（角色总数必须等于玩家数量）

#### 2.4 全局配置管理

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

#### 2.5 流程配置管理

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

### 3. 阶段3：游戏端数据互通

#### 3.1 更新游戏端数据模型

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

#### 3.2 更新游戏引擎

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

## 进度跟踪

### 阶段1：数据库表结构重构

| 任务 | 状态 | 完成日期 | 文件 |
|------|--------|----------|------|
| 扩展 cards 表添加 camp 和 skill_id 字段 | ✅ | 2026-02-01 | step7-extend-cards-camp-skill.sql |
| 创建 skills 表（技能配置表） | ✅ | 2026-02-01 | step8-create-skills-table.sql |
| 重构 board_roles 表添加 card_id 外键 | ✅ | 2026-02-01 | step9-refactor-board-roles.sql |
| 创建 global_configs 表（全局配置表） | ✅ | 2026-02-01 | step10-create-global-configs.sql |
| 创建 processes 表（流程配置表） | ✅ | 2026-02-01 | step11-create-processes.sql |
| 数据迁移和验证 | ✅ | 2026-02-01 | step12-migrate-and-validate.sql |

### 阶段2：后台管理功能开发

| 任务 | 状态 | 完成日期 | 文件 |
|------|--------|----------|------|
| 技能管理模块（SkillList + SkillForm） | ✅ | 2026-02-01 | SkillList.tsx, SkillForm.tsx |
| 重构卡牌管理（CardForm + CardList） | ✅ | 2026-02-01 | CardForm.tsx, CardList.tsx |
| 重构板子管理（BoardForm） | ⚠️ | 2026-02-01 | BoardForm.tsx（有语法错误） |
| 全局配置管理（GlobalConfigList + GlobalConfigForm） | ✅ | 2026-02-01 | GlobalConfigList.tsx, GlobalConfigForm.tsx |
| 流程配置管理（ProcessList + ProcessForm） | ✅ | 2026-02-01 | ProcessList.tsx, ProcessForm.tsx |

### 阶段3：游戏端数据互通

| 任务 | 状态 | 完成日期 | 文件 |
|------|--------|----------|------|
| 更新游戏端数据模型 | ✅ | 2026-02-01 | game.ts, gameConfig.ts |
| 更新游戏引擎 | ✅ | 2026-02-01 | gameEngine.ts |
| 集成到 AdminDashboard | ✅ | 2026-02-01 | AdminDashboard.tsx |

---

## 已完成的工作

### 新增文件清单

#### 数据库迁移脚本（7个）
1. `scripts/admin/step7-extend-cards-camp-skill.sql` - 扩展 cards 表添加 camp 和 skill_id 字段
2. `scripts/admin/step8-create-skills-table.sql` - 创建 skills 表（技能配置表）
3. `scripts/admin/step9-refactor-board-roles.sql` - 重构 board_roles 表添加 card_id 外键
4. `scripts/admin/step10-create-global-configs.sql` - 创建 global_configs 表（全局配置表）
5. `scripts/admin/step11-create-processes.sql` - 创建 processes 表（流程配置表）
6. `scripts/admin/step12-migrate-and-validate.sql` - 数据迁移和验证
7. `scripts/admin/execute-all-migrations.sql` - 执行所有迁移脚本

#### 后台管理组件（8个）
1. `src/components/admin/SkillList.tsx` - 技能列表组件
2. `src/components/admin/SkillForm.tsx` - 技能表单组件
3. `src/components/admin/CardForm.tsx` - 卡牌表单组件（已更新）
4. `src/components/admin/CardList.tsx` - 卡牌列表组件（已更新）
5. `src/components/admin/BoardForm.tsx` - 板子表单组件（已更新，有语法错误）
6. `src/components/admin/GlobalConfigList.tsx` - 全局配置列表组件
7. `src/components/admin/GlobalConfigForm.tsx` - 全局配置表单组件
8. `src/components/admin/ProcessList.tsx` - 流程列表组件
9. `src/components/admin/ProcessForm.tsx` - 流程表单组件

#### 服务层文件（3个）
1. `src/services/admin.ts` - 管理服务（已重新生成）
2. `src/services/gameConfig.ts` - 游戏配置服务（新建）
3. `src/services/gameEngine.ts` - 游戏引擎（新建）

#### 类型定义文件（1个）
1. `src/types/game.ts` - 游戏类型定义（已更新）

#### 文档文件（2个）
1. `DATABASE_REFACTORING_SUMMARY.md` - 数据库重构总结文档
2. `DEVELOPMENT_SUMMARY.md` - 开发总结文档

---

## 当前存在的问题

### 问题1：BoardForm.tsx 文件语法错误 ❌ 未修复

**错误信息：**
```
× Unexpected token. Did you mean `{'}'}` or `&rbrace;`?
╭─[L:/workshop/langrensha/langrenshase7en/src/components/admin/BoardForm.tsx:420:1]
 417 │                             </Button>
 418 │                           </div>
 419 │                         </div>
 420 │                       ))}
     ·                         ▲
 421 │                   </div>
 422 │                 )}
     ·                  ─
 423 │               </div>
     ╰────
× Expected '</', got '}'
```

**原因分析：**
- 错误信息说"Expected '</', got '}'"，这通常表示 JSX 标签没有正确关闭
- 可能是某个 JSX 标签没有正确关闭，或者有语法错误

**可能的问题位置：**
1. 第376-425行的条件渲染部分
2. 第378-420行的 map 循环部分
3. 某个 JSX 标签没有正确关闭

**尝试过的解决方案：**
- ❌ 重新生成整个 BoardForm.tsx 文件
- ❌ 检查第268行的清空按钮
- ❌ 检查第376-425行的条件渲染和 map 循环
- ❌ 尝试修复第371行的闭合标签

**当前状态：**
- ❌ 问题仍然存在
- ❌ 编译器仍然报错

**建议的解决方案：**
1. **手动修复 BoardForm.tsx（推荐）**
   - 打开 `L:\workshop\langrensha\langrenshase7en\src\components\admin\BoardForm.tsx` 文件
   - 检查第376-425行的代码
   - 查找是否有 JSX 标签没有正确关闭
   - 修复语法错误
   - 保存文件

2. **回滚到之前的工作版本**
   - 使用 Git 回滚到之前的工作版本
   - 重新开始开发

3. **删除 BoardForm.tsx，重新创建**
   - 删除 `L:\workshop\langrensha\langrenshase7en\src\components\admin\BoardForm.tsx` 文件
   - 从其他类似的组件（如 CardForm.tsx）复制代码结构
   - 重新实现 BoardForm.tsx

4. **使用其他工具（如 VS Code）修复**
   - 打开 VS Code
   - 打开 `L:\workshop\langrensha\langrenshase7en\src\components\admin\BoardForm.tsx` 文件
   - 使用 VS Code 的语法检查功能
   - 修复语法错误

---

## 建议的解决方案

### 方案1：手动修复 BoardForm.tsx（推荐）

**步骤：**
1. 打开 `L:\workshop\langrensha\langrenshase7en\src\components\admin\BoardForm.tsx` 文件
2. 检查第376-425行的代码
3. 查找是否有 JSX 标签没有正确关闭
4. 修复语法错误
5. 保存文件

**优点：**
- 可以直接看到问题所在
- 可以精确修复
- 不会引入新的问题

**缺点：**
- 需要手动操作

---

### 方案2：回滚到之前的工作版本

**步骤：**
1. 使用 Git 回滚到之前的工作版本
2. 重新开始开发

**优点：**
- 可以回到稳定的状态
- 可以避免引入新的问题

**缺点：**
- 可能会丢失一些工作进度

---

### 方案3：删除 BoardForm.tsx，重新创建

**步骤：**
1. 删除 `L:\workshop\langrensha\langrenshase7en\src\components\admin\BoardForm.tsx` 文件
2. 从其他类似的组件（如 CardForm.tsx）复制代码结构
3. 重新实现 BoardForm.tsx

**优点：**
- 可以确保文件是干净的
- 可以避免语法错误

**缺点：**
- 需要重新实现所有功能
- 可能会引入新的问题

---

### 方案4：使用其他工具（如 VS Code）修复

**步骤：**
1. 打开 VS Code
2. 打开 `L:\workshop\langrensha\langrenshase7en\src\components\admin\BoardForm.tsx` 文件
3. 使用 VS Code 的语法检查功能
4. 修复语法错误

**优点：**
- 可以使用强大的 IDE 功能
- 可以看到实时的语法检查
- 可以使用自动修复功能

**缺点：**
- 需要使用其他工具

---

## 技术栈

- **前端框架：** React 18 + TypeScript
- **UI 组件库：** shadcn/ui
- **状态管理：** React Query (TanStack Query)
- **通知：** Sonner
- **数据库：** Supabase (PostgreSQL)
- **路由：** React Router
- **构建工具：** Vite

---

## 注意事项

### 1. AI 编程能力限制

- AI 在处理复杂语法错误时可能会陷入循环
- AI 可能会反复尝试修复，但无法解决问题
- 建议在遇到复杂语法错误时，使用其他工具

### 2. 开发流程建议

- 在开发过程中，建议使用 Git 进行版本控制
- 在遇到问题时，可以快速回滚到稳定版本
- 建议使用强大的 IDE（如 VS Code）进行开发

### 3. 测试建议

- 在开发过程中，建议频繁测试
- 在遇到问题时，可以快速定位问题
- 建议使用浏览器的开发者工具查看错误信息

### 4. 代码规范建议

- 遵循组件命名规范（PascalCase）
- 遵循接口命名规范（PascalCase + Props）
- 遵循服务方法命名规范（getItemsWithAdmin, createItemWithAdmin 等）
- 遵循表单验证规范（必填字段验证、长度验证、格式验证、业务逻辑验证）
- 遵循 Toast 通知规范（成功通知、错误通知）

---

## 总结

### 已完成的工作

- ✅ 阶段1：数据库表结构重构（6个任务）
- ✅ 阶段2：后台管理功能开发（4个模块，1个模块有语法错误）
- ✅ 阶段3：游戏端数据互通（2个任务）
- ✅ 文档：DATABASE_REFACTORING_SUMMARY.md, DEVELOPMENT_SUMMARY.md

### 当前存在的问题

- ❌ BoardForm.tsx 文件语法错误（未修复）

### 建议的解决方案

1. **方案1：手动修复 BoardForm.tsx（推荐）**
2. 方案2：回滚到之前的工作版本
3. 方案3：删除 BoardForm.tsx，重新创建
4. 方案4：使用其他工具（如 VS Code）修复

---

**文档版本：** 1.0.0
**最后更新：** 2026-02-01
**作者：** AI Assistant
