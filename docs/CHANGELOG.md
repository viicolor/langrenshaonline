# 狼人杀项目变更日志

## 2026-02-07

### 修复
- **CardForm.tsx**: 修复创建卡牌时的 `Select.Item` value 属性错误
  - 问题: `A <Select.Item /> must have a value prop that is not an empty string`
  - 解决方案: 将空字符串改为 `'none'`，并在提交时转换回空字符串
  - 文件: `src/components/admin/CardForm.tsx`

### 功能改进
- **AdminDashboard.tsx**: 优化后台管理界面布局
  - 调整快速导航按钮布局，使图标和文字在同一行
  - 移除容器限制，让内容左对齐到最左边
  - 修复标题对齐问题，确保与系统概览保持一致
  - 文件: `src/pages/admin/AdminDashboard.tsx`

### 修复
- **BoardFlowConfig.tsx**: 修复 JSX 语法错误
  - 问题: 缺少正确的 Card 组件包装
  - 解决方案: 添加适当的 Card 组件结构
  - 文件: `src/components/admin/BoardFlowConfig.tsx`

### 修复
- **SpectatorRecord.tsx**: 修复类型定义问题
  - 问题: 可选链和默认值处理不当
  - 解决方案: 添加安全检查和默认值
  - 文件: `src/components/game/SpectatorRecord.tsx`

### 技术改进
- **版本控制**: 实现 Git 分支管理
  - 创建开发分支 `dev-feature`
  - 合并到 `main` 分支保持稳定版本
  - 记录重要修改和决策

### 布局调整
- **LayoutDashboardComponents.tsx**: 优化布局组件
  - 移除 `container mx-auto` 限制，让内容充满整个宽度
  - 保持必要的内边距，确保界面美观
  - 文件: `src/components/ui/layout/LayoutDashboardComponents.tsx`

## 注意事项
- 所有修改均已测试并确保功能正常
- 保持与后端 API 的兼容性
- 优化用户界面体验
- 确保代码质量和可维护性
