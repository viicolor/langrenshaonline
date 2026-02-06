# 狼人杀游戏 UI 设计规范

## 1. 设计原则

### 1.1 核心原则
- **沉浸感**: 深色主题，营造夜晚神秘氛围
- **清晰性**: 信息层级分明，重要信息突出
- **一致性**: 统一的视觉语言和交互模式
- **可访问性**: 良好的对比度和可读性
- **响应式**: 支持多种屏幕尺寸

### 1.2 设计风格
- **主题**: 神秘、优雅、现代
- **色彩**: 深色背景 + 金色/紫色点缀
- **布局**: 圆桌布局为主，卡片式设计
- **动画**: 流畅的过渡动画，增强交互体验

---

## 2. 色彩系统

### 2.1 基础色彩
```css
--background: 222 47% 11%;      /* 深夜背景 */
--foreground: 210 40% 98%;      /* 主要文字 */
--card: 217 33% 17%;            /* 卡片背景 */
--card-foreground: 210 40% 98%; /* 卡片文字 */
--border: 217 33% 25%;          /* 边框 */
--input: 217 33% 25%;           /* 输入框 */
--ring: 212 95% 68%;            /* 焦点环 */
```

### 2.2 主题色彩
```css
--primary: 38 92% 50%;          /* 金色 - 主要操作 */
--primary-foreground: 210 40% 98%; /* 金色文字 */
--secondary: 217 33% 25%;       /* 次要背景 */
--secondary-foreground: 210 40% 98%; /* 次要文字 */
--muted: 217 33% 25%;           /* 静音背景 */
--muted-foreground: 215 16% 47%; /* 静音文字 */
--accent: 217 33% 25%;          /* 强调色 */
--accent-foreground: 210 40% 98%; /* 强调文字 */
```

### 2.3 角色色彩
```css
--wolf-red: 0 72% 35%;          /* 狼人 - 红色 */
--villager-blue: 210 60% 45%;   /* 村民 - 蓝色 */
--seer-purple: 270 50% 45%;     /* 预言家 - 紫色 */
--witch-green: 150 50% 35%;     /* 女巫 - 绿色 */
--hunter-orange: 25 85% 50%;     /* 猎人 - 橙色 */
--guard-cyan: 200 60% 45%;      /* 守卫 - 青色 */
--idiot-yellow: 45 70% 50%;      /* 白痴 - 黄色 */
```

### 2.4 特殊色彩
```css
--gold-glow: 38 92% 50%;        /* 金色光晕 */
--moon-silver: 210 20% 75%;     /* 月光银 */
--fire-orange: 25 90% 55%;      /* 火焰橙 */
--night-deep: 222 47% 11%;      /* 深夜色 */
```

### 2.5 状态色彩
```css
--destructive: 0 84% 60%;       /* 危险/删除 */
--destructive-foreground: 210 40% 98%;
--success: 142 76% 36%;         /* 成功 */
--warning: 38 92% 50%;          /* 警告 */
--info: 199 89% 48%;            /* 信息 */
```

---

## 3. 字体系统

### 3.1 字体家族
```css
--font-display: 'Cinzel', 'Noto Sans SC', serif;  /* 标题字体 */
--font-body: 'Noto Sans SC', sans-serif;           /* 正文字体 */
--font-mono: 'Fira Code', monospace;               /* 等宽字体 */
```

### 3.2 字体大小
```css
--text-xs: 0.75rem;    /* 12px - 辅助信息 */
--text-sm: 0.875rem;   /* 14px - 小号文字 */
--text-base: 1rem;     /* 16px - 正文 */
--text-lg: 1.125rem;   /* 18px - 大号文字 */
--text-xl: 1.25rem;    /* 20px - 小标题 */
--text-2xl: 1.5rem;    /* 24px - 标题 */
--text-3xl: 1.875rem;  /* 30px - 大标题 */
--text-4xl: 2.25rem;   /* 36px - 超大标题 */
```

### 3.3 字重
```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

## 4. 间距系统

### 4.1 间距单位
```css
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
```

### 4.2 间距使用规范
- **组件内间距**: 4px - 8px
- **组件间间距**: 16px - 24px
- **区块间间距**: 32px - 48px
- **页面边距**: 24px - 32px

---

## 5. 圆角系统

```css
--radius-sm: 0.25rem;   /* 4px - 小圆角 */
--radius-md: 0.375rem;  /* 6px - 中圆角 */
--radius-lg: 0.5rem;    /* 8px - 大圆角 */
--radius-xl: 0.75rem;   /* 12px - 超大圆角 */
--radius-2xl: 1rem;     /* 16px - 超超大圆角 */
--radius-full: 9999px;  /* 完全圆角 */
```

---

## 6. 阴影系统

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
--shadow-gold: 0 0 20px hsl(38 92% 50% / 0.3);  /* 金色光晕 */
```

---

## 7. 动画系统

### 7.1 动画时长
```css
--duration-fast: 150ms;     /* 快速动画 */
--duration-normal: 300ms;   /* 正常动画 */
--duration-slow: 500ms;     /* 慢速动画 */
--duration-slower: 1000ms;  /* 超慢动画 */
```

### 7.2 缓动函数
```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### 7.3 关键动画
```css
/* 脉冲光晕 */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px hsl(38 92% 50% / 0.3); }
  50% { box-shadow: 0 0 40px hsl(38 92% 50% / 0.6); }
}

/* 淡入上升 */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 缩放进入 */
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

/* 倒计时 */
@keyframes countdown {
  0% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0; }
}

/* 旋转 */
@keyframes rotate-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## 8. 组件设计规范

### 8.1 按钮组件

#### 主要按钮
- **用途**: 主要操作（创建房间、开始游戏等）
- **样式**: 金色背景，白色文字
- **尺寸**: sm(32px), md(40px), lg(48px)
- **状态**: default, hover, active, disabled

#### 次要按钮
- **用途**: 次要操作（刷新、返回等）
- **样式**: 深色背景，金色边框
- **尺寸**: sm, md, lg

#### 幽灵按钮
- **用途**: 辅助操作（静音、设置等）
- **样式**: 透明背景，金色文字
- **尺寸**: sm, md

#### 图标按钮
- **用途**: 仅图标操作
- **样式**: 方形，图标居中
- **尺寸**: sm(32px), md(40px), lg(48px)

### 8.2 卡片组件

#### 房间卡片
- **尺寸**: 宽度自适应，高度固定
- **内容**: 房间名称、人数、状态、房主
- **交互**: hover时轻微上浮，点击进入

#### 角色卡片
- **尺寸**: 320x480px
- **内容**: 角色名称、角色描述、角色图标
- **动画**: 翻转效果

#### 玩家卡片
- **尺寸**: 64x64px (头像)
- **内容**: 头像、名称、状态标记
- **状态**: 准备、死亡、房主、当前玩家

### 8.3 输入组件

#### 文本输入框
- **样式**: 深色背景，金色边框（focus时）
- **尺寸**: sm(32px), md(40px), lg(48px)
- **状态**: default, focus, error, disabled

#### 下拉选择框
- **样式**: 与输入框一致
- **内容**: 选项列表、选中项显示

#### 复选框/单选框
- **样式**: 方形/圆形，选中时金色
- **尺寸**: 16x16px, 20x20px

### 8.4 对话框组件

#### 模态对话框
- **样式**: 深色背景，金色边框
- **尺寸**: sm(400px), md(600px), lg(800px)
- **内容**: 标题、内容、操作按钮

#### 确认对话框
- **样式**: 警告色边框
- **内容**: 警告信息、确认/取消按钮

#### 观战视角选择对话框
- **样式**: 大尺寸，三个选项卡片
- **内容**: 视角描述、选择按钮

### 8.5 通知组件

#### Toast通知
- **样式**: 右上角浮动，自动消失
- **类型**: success, error, warning, info
- **时长**: 3000ms

#### 通知中心
- **样式**: 右侧抽屉
- **内容**: 通知列表，可点击查看

---

## 9. 页面布局规范

### 9.1 登录页面
- **布局**: 居中卡片式
- **内容**: Logo、登录表单、注册链接
- **背景**: 深色渐变 + 装饰元素

### 9.2 游戏大厅
- **布局**: 顶部导航 + 主内容区
- **顶部导航**: Logo、刷新按钮、用户信息
- **主内容区**: 创建房间按钮 + 房间列表网格

### 9.3 游戏房间
- **布局**: 顶部导航 + 游戏状态栏 + 圆桌区域 + 底部操作区
- **顶部导航**: 返回按钮、房间信息、设置
- **游戏状态栏**: 玩家数量、游戏阶段、倒计时
- **圆桌区域**: 12个座位围绕圆桌
- **底部操作区**: 聊天框、操作按钮

### 9.4 观战模式
- **布局**: 顶部导航 + 观战信息区 + 圆桌区域 + 观战记录区
- **观战信息区**: 当前视角、观战人数
- **观战记录区**: 实时滚动消息列表

### 9.5 后台管理
- **布局**: 侧边栏 + 主内容区
- **侧边栏**: 导航菜单
- **主内容区**: 配置表单、数据表格

---

## 10. 响应式设计

### 10.1 断点
```css
--breakpoint-sm: 640px;   /* 手机横屏 */
--breakpoint-md: 768px;   /* 平板 */
--breakpoint-lg: 1024px;  /* 小型笔记本 */
--breakpoint-xl: 1280px;  /* 桌面 */
--breakpoint-2xl: 1536px; /* 大屏 */
```

### 10.2 响应式策略
- **移动端优先**: 从小屏幕开始设计
- **弹性布局**: 使用flex和grid
- **相对单位**: 使用rem和百分比
- **图片响应**: 使用srcset和picture

---

## 11. 可访问性

### 11.1 对比度
- **文字对比度**: 至少 4.5:1
- **大文字对比度**: 至少 3:1
- **交互元素对比度**: 至少 3:1

### 11.2 键盘导航
- **Tab顺序**: 逻辑清晰
- **焦点样式**: 明显可见
- **快捷键**: 常用操作支持

### 11.3 屏幕阅读器
- **ARIA标签**: 完整的语义标签
- **alt文本**: 图片描述
- **标题层级**: 清晰的标题结构

---

## 12. 图标系统

### 12.1 图标库
- **主图标库**: Lucide React
- **自定义图标**: SVG格式

### 12.2 图标尺寸
```css
--icon-xs: 12px;
--icon-sm: 16px;
--icon-md: 20px;
--icon-lg: 24px;
--icon-xl: 32px;
--icon-2xl: 48px;
```

### 12.3 常用图标
- **导航**: ArrowLeft, ArrowRight, Home, Settings
- **游戏**: Crown, Skull, Moon, Users
- **操作**: Plus, RefreshCw, Check, X
- **状态**: Volume2, VolumeX, Bell, BellOff

---

## 13. 特殊效果

### 13.1 光晕效果
```css
.glow-gold {
  box-shadow: 0 0 20px hsl(38 92% 50% / 0.3);
  animation: pulse-glow 2s ease-in-out infinite;
}
```

### 13.2 渐变效果
```css
.text-gradient-gold {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### 13.3 模糊效果
```css
.backdrop-blur {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

---

## 14. 组件库使用

### 14.1 shadcn-ui组件
- **基础组件**: Button, Input, Card, Dialog, Toast
- **表单组件**: Form, Select, Checkbox, Radio
- **导航组件**: Tabs, Breadcrumb, Navigation Menu
- **反馈组件**: Alert, Progress, Skeleton

### 14.2 自定义组件
- **游戏组件**: RoundTable, RoleCard, RoomCard, RoomChat
- **观战组件**: SpectatorView, MessageList, PerspectiveSelector
- **管理组件**: APIConfig, BoardConfig, RoleLibrary

---

## 15. 版本控制

- **当前版本**: v1.0.0
- **更新日期**: 2026-01-31
- **维护者**: 开发团队

---

## 16. 设计资源

### 16.1 字体
- **Cinzel**: https://fonts.google.com/specimen/Cinzel
- **Noto Sans SC**: https://fonts.google.com/specimen/Noto+Sans+SC

### 16.2 图标
- **Lucide**: https://lucide.dev/

### 16.3 配色工具
- **Coolors**: https://coolors.co/
- **Adobe Color**: https://color.adobe.com/

---

## 附录：Tailwind配置示例

```typescript
export default {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        wolf: {
          red: "hsl(var(--wolf-red))",
        },
        role: {
          villager: "hsl(var(--villager-blue))",
          seer: "hsl(var(--seer-purple))",
          witch: "hsl(var(--witch-green))",
          hunter: "hsl(var(--hunter-orange))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold-glow))",
          glow: "hsl(var(--gold-glow))",
        },
        night: "hsl(var(--night-deep))",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(38 92% 50% / 0.3)" },
          "50%": { boxShadow: "0 0 40px hsl(38 92% 50% / 0.6)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
      },
    },
  },
};
```
