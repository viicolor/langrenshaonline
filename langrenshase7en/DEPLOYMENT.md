# 狼人杀游戏部署文档

## 目录

- [环境要求](#环境要求)
- [本地开发](#本地开发)
- [生产部署](#生产部署)
- [配置说明](#配置说明)
- [故障排除](#故障排除)

## 环境要求

### 前端要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+, Edge 90+）

### 后端要求

- Supabase 账户
- OpenAI API 密钥（可选，用于AI玩家）
- 通义千问 API 密钥（可选，用于AI玩家）

## 本地开发

### 1. 克隆项目

```bash
git clone https://github.com/your-repo/langrensha.git
cd langrensha
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env.local` 文件：

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_OPENAI_API_KEY=your-openai-api-key
VITE_TONGYI_API_KEY=your-tongyi-api-key
```

### 4. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动

### 5. 运行测试

```bash
npm run test
```

### 6. 代码检查

```bash
npm run lint
npm run typecheck
```

## 生产部署

### Vercel 部署

1. **安装 Vercel CLI**

```bash
npm install -g vercel
```

2. **登录 Vercel**

```bash
vercel login
```

3. **部署项目**

```bash
vercel
```

4. **配置环境变量**

在 Vercel 控制台中添加以下环境变量：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_OPENAI_API_KEY`（可选）
- `VITE_TONGYI_API_KEY`（可选）

### Netlify 部署

1. **安装 Netlify CLI**

```bash
npm install -g netlify-cli
```

2. **登录 Netlify**

```bash
netlify login
```

3. **构建项目**

```bash
npm run build
```

4. **部署项目**

```bash
netlify deploy --prod --dir=dist
```

### Docker 部署

1. **创建 Dockerfile**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 80

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
```

2. **构建 Docker 镜像**

```bash
docker build -t langrensha .
```

3. **运行 Docker 容器**

```bash
docker run -p 80:80 langrensha
```

### Supabase 部署

1. **初始化 Supabase**

```bash
npx supabase init
```

2. **链接到 Supabase 项目**

```bash
npx supabase link
```

3. **推送数据库迁移**

```bash
npx supabase db push
```

4. **部署 Edge Functions**

```bash
npx supabase functions deploy
```

## 配置说明

### Supabase 配置

1. 创建 Supabase 项目
2. 在项目设置中获取 API URL 和 anon key
3. 配置环境变量：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### OpenAI 配置（可选）

1. 创建 OpenAI 账户
2. 生成 API 密钥
3. 配置环境变量：

```env
VITE_OPENAI_API_KEY=sk-...
```

### 通义千问配置（可选）

1. 创建阿里云账户
2. 开通通义千问服务
3. 生成 API 密钥
4. 配置环境变量：

```env
VITE_TONGYI_API_KEY=your-api-key
```

### 游戏配置

在应用设置中可以配置：

- 最大玩家数（默认：12）
- 最小玩家数（默认：6）
- 阶段持续时间
- AI 玩家设置
- 性能优化选项

## 故障排除

### 常见问题

#### 1. 构建失败

**问题**：`npm run build` 失败

**解决方案**：

```bash
# 清理缓存
rm -rf node_modules
rm -rf dist
npm install

# 重新构建
npm run build
```

#### 2. 环境变量未加载

**问题**：环境变量在应用中未定义

**解决方案**：

- 确保环境变量以 `VITE_` 开头
- 重启开发服务器
- 检查 `.env.local` 文件是否存在

#### 3. Supabase 连接失败

**问题**：无法连接到 Supabase

**解决方案**：

- 检查 Supabase URL 和密钥是否正确
- 确保 Supabase 项目处于活跃状态
- 检查网络连接
- 查看 Supabase 控制台中的日志

#### 4. AI 玩家不工作

**问题**：AI 玩家没有响应

**解决方案**：

- 检查 API 密钥是否正确
- 确保账户有足够的配额
- 检查 API 端点是否可访问
- 查看浏览器控制台中的错误日志

#### 5. 性能问题

**问题**：应用运行缓慢

**解决方案**：

- 启用虚拟滚动
- 启用懒加载
- 减少批量大小
- 清理浏览器缓存
- 检查网络连接

### 日志和调试

#### 启用调试日志

```javascript
// 在浏览器控制台中
localStorage.setItem('app_config', JSON.stringify({
  logging: {
    level: 'debug',
    enableConsole: true,
    enableStorage: true,
  }
}));

// 刷新页面
location.reload();
```

#### 导出日志

```javascript
// 在浏览器控制台中
logger.downloadLogs();
```

#### 查看错误

```javascript
// 在浏览器控制台中
const errors = logger.getLogsByLevel(LogLevel.ERROR);
console.table(errors);
```

### 监控

#### 性能监控

```javascript
// 使用浏览器性能 API
performance.mark('app-start');
// ... 应用代码 ...
performance.mark('app-end');
performance.measure('app', 'app-start', 'app-end');
```

#### 错误监控

```javascript
// 订阅错误事件
ErrorBoundary.subscribe('NetworkError', (error) => {
  console.error('Network error occurred:', error);
  // 发送到监控服务
});
```

## 更新和维护

### 更新应用

```bash
# 拉取最新代码
git pull origin main

# 安装新依赖
npm install

# 重新构建
npm run build

# 重新部署
vercel --prod
```

### 数据库迁移

```bash
# 创建新迁移
npx supabase migration new add_new_feature

# 应用迁移
npx supabase db push

# 回滚迁移
npx supabase db reset
```

## 安全建议

1. **保护 API 密钥**
   - 不要将 API 密钥提交到版本控制
   - 使用环境变量存储敏感信息
   - 定期轮换 API 密钥

2. **启用 HTTPS**
   - 在生产环境中使用 HTTPS
   - 配置 SSL 证书

3. **限制访问**
   - 配置 CORS 策略
   - 实现速率限制
   - 使用认证和授权

4. **定期备份**
   - 备份数据库
   - 备份配置文件
   - 备份日志文件

## 支持

如有问题，请联系：

- GitHub Issues: https://github.com/your-repo/langrensha/issues
- Email: support@langrensha.com
- Discord: https://discord.gg/langrensha
