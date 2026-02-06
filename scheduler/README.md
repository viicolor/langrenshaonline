# 游戏流程调度器

## 解决的问题

当前游戏流程依赖前端触发，如果玩家网络问题或页面卡住，会导致整个游戏流程停滞。

本调度器通过**定时检查数据库**的方式，自动推进超时的游戏阶段，确保游戏流程不受单个玩家影响。

## 工作原理

```
┌─────────────────────────────────────────────────┐
│  scheduler (每分钟运行一次)                      │
│                                                 │
│  1. 查询 phase_ends_at < NOW() 的游戏记录       │
│  2. 根据当前阶段执行对应的推进逻辑               │
│  3. 更新 phase_ends_at，触发前端刷新            │
└─────────────────────────────────────────────────┘
```

## 快速开始

### 1. 配置环境变量

需要设置以下环境变量：

```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Windows

```bat
start.bat
```

### 3. Linux/macOS

```bash
cd scheduler
npm install
npm run build
npm start
```

## 定时运行

### 方案 1: Windows 任务计划程序

1. 打开"任务计划程序"
2. 创建基本任务
3. 触发器: 每 1 分钟
4. 操作: 启动程序
5. 程序: `node.exe` (scheduler 的全路径)
6. 参数: `dist/index.js`
7. 起始于: `scheduler` 目录

### 方案 2: pm2 (推荐用于生产环境)

```bash
cd scheduler
npm install -g pm2
pm start src/index.ts --name werewolf-scheduler
pm startup  # 设置开机自启动
pm save
```

### 方案 3: Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
CMD ["node", "dist/index.js"]
```

### 方案 4: GitHub Actions (免费定时)

在项目根目录创建 `.github/workflows/scheduler.yml`:

```yaml
name: Game Scheduler

on:
  schedule:
    - cron: '* * * * *'  # 每分钟运行
  workflow_dispatch:

jobs:
  run-scheduler:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: |
          cd scheduler
          npm install
          npm run build
      - name: Run Scheduler
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          cd scheduler
          node dist/index.js
```

## 支持的游戏阶段

- `night` - 夜晚阶段 (守卫→狼人→预言家→女巫→猎人)
- `day` - 白天发言阶段
- `sheriff_campaign` - 警长竞选阶段
- `voting` - 投票阶段
- `sheriff_transfer` - 警长移交阶段
- `hunter_shot` - 猎人射击阶段

## 故障排除

### Q: 提示 "需要设置环境变量"

A: 在运行前设置环境变量:
```bash
# Windows PowerShell
$env:SUPABASE_URL = "https://xxx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "xxx"

# Windows CMD
set SUPABASE_URL=https://xxx.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Q: 推进失败

A: 检查:
1. Service Role Key 是否有权限更新 `game_records` 表
2. 数据库连接是否正常
3. 查看控制台错误信息

### Q: 前端没有更新

A: 前端通过 `queryClient.invalidateQueries` 监听变化，可能需要刷新页面。

## 安全提示

- **不要**在前端暴露 `SUPABASE_SERVICE_ROLE_KEY`
- Service Role Key 有完整数据库权限，仅用于后端服务
- 建议为调度器创建单独的数据库角色
