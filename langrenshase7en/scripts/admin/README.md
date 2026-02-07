# 数据库扩展SQL脚本执行指南

## 📋 脚本列表

### 0. step0-create-room-players.sql
**功能**：创建room_players表（如果不存在）
**操作**：创建新表，包含10个字段
**执行顺序**：第0个执行（优先执行，因为step4依赖此表）

### 1. step1-extend-boards.sql
**功能**：扩展boards表，添加后台管理字段
**操作**：添加8个新字段（board_alias、player_num、character_config等）
**执行顺序**：第1个执行

### 2. step2-create-cards.sql
**功能**：创建角色卡牌表（cards表）
**操作**：创建新表，包含13个字段
**执行顺序**：第2个执行

### 3. step3-extend-rooms.sql
**功能**：扩展rooms表，添加AI玩家配置
**操作**：添加allow_ai_players字段
**执行顺序**：第3个执行

### 4. step4-extend-room-players.sql
**功能**：扩展room_players表，添加AI玩家标识
**操作**：添加2个新字段（is_ai、ai_config_id）
**执行顺序**：第4个执行

### 5. step5-create-rules.sql
**功能**：创建规则配置表（rules表）
**操作**：创建新表，包含9个字段
**执行顺序**：第5个执行

### 6. step6-insert-default-cards.sql
**功能**：插入默认角色卡牌
**操作**：先删除已存在的角色卡牌，再插入6种基础角色（狼人、村民、预言家、女巫、猎人、守卫）
**执行顺序**：第6个执行
**注意**：使用DELETE + INSERT避免唯一约束冲突

### 7. step7-insert-default-rules.sql
**功能**：插入默认规则配置
**操作**：插入6个基础规则（发言时长、字数限制、投票时长、游戏超时、允许观战、允许AI玩家）
**执行顺序**：第7个执行

---

## 🚀 执行步骤

### 步骤1：打开Supabase控制台
1. 访问：https://supabase.com/dashboard
2. 登录你的Supabase账户
3. 找到项目：URL为 `https://ioquklhxeisulnagkauo.supabase.co` 的项目

### 步骤2：进入SQL编辑器
1. 在左侧菜单选择 **"SQL Editor"**

### 步骤3：按顺序执行SQL脚本
**重要**：按顺序执行（step0 → step1 → step2 → step3 → step4 → step5 → step6 → step7）

### 步骤4：验证执行结果
每个脚本执行后，检查是否显示"Success. No rows returned"或"Success"

---

## ✅ 执行后的效果

### 数据库表将包含：
- ✅ `room_players`表 - 房间玩家管理（如果不存在则创建）
- ✅ `boards`表 - 新增8个后台管理字段
- ✅ `cards`表 - 角色卡牌库（6种基础角色）
- ✅ `rooms`表 - 支持AI玩家
- ✅ `room_players`表 - AI玩家标识
- ✅ `rules`表 - 规则配置（6个基础规则）

### 默认数据：
- ✅ 6种角色卡牌（狼人、村民、预言家、女巫、猎人、守卫）
- ✅ 6个基础规则（发言60秒、字数100字、投票30秒、游戏超时10分钟、允许观战、允许AI玩家）

---

## ⚠️ 注意事项

1. **不要重复执行**：每个脚本只执行一次
2. **按顺序执行**：step0 → step1 → step2 → step3 → step4 → step5 → step6 → step7
3. **检查错误**：如果某个脚本执行失败，先解决再执行下一个
4. **不要修改现有数据**：脚本只添加新字段，不删除现有数据
5. **step6特殊处理**：先DELETE再INSERT，避免唯一约束冲突

---

## 🎯 执行完成后

**所有SQL脚本执行成功后**：
1. 我将创建后台管理页面和组件
2. 实现板子动态管理功能
3. 实现牌库动态管理功能
4. 实现规则设置功能
5. 实现AI玩家加入功能
6. 实现智能AI行为

---

**请按顺序执行8个SQL脚本，然后告诉我结果！** 🚀
