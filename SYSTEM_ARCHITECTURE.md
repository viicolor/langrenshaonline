# 狼人杀游戏 系统架构设计文档

## 1. 系统概述

### 1.1 项目目标
构建一个功能完整的狼人杀游戏平台，包含前端游戏客户端和后台管理系统，支持AI玩家参与、多种观战视角、游戏记录保存等核心功能。

### 1.2 技术栈
- **前端**: React 18 + TypeScript + Vite
- **UI组件库**: shadcn-ui (Radix UI)
- **样式**: Tailwind CSS
- **状态管理**: TanStack Query + React Context
- **路由**: React Router DOM
- **数据库**: Supabase (PostgreSQL)
- **实时通信**: WebSocket (Supabase Realtime)
- **AI集成**: OpenAI API / 通义千问 / MCP协议

### 1.3 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     用户浏览器                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   前端应用 (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ 游戏大厅  │  │ 游戏房间  │  │ 观战模式  │           │
│  └──────────┘  └──────────┘  └──────────┘           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ 后台管理  │  │ 用户认证  │  │ 游戏记录  │           │
│  └──────────┘  └──────────┘  └──────────┘           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              API层 (Supabase Client)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ REST API  │  │ WebSocket│  │ Auth API  │           │
│  └──────────┘  └──────────┘  └──────────┘           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              后端服务 (Supabase)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ PostgreSQL│  │ Realtime  │  │ Storage  │           │
│  └──────────┘  └──────────┘  └──────────┘           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              外部服务                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ OpenAI API│  │通义千问API│  │ MCP服务   │           │
│  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 前端架构

### 2.1 目录结构

```
src/
├── components/              # 组件目录
│   ├── game/             # 游戏相关组件
│   │   ├── RoundTable.tsx
│   │   ├── RoleCard.tsx
│   │   ├── RoomCard.tsx
│   │   ├── RoomChat.tsx
│   │   ├── CountdownOverlay.tsx
│   │   └── ...
│   ├── spectator/        # 观战相关组件
│   │   ├── SpectatorView.tsx
│   │   ├── MessageList.tsx
│   │   ├── PerspectiveSelector.tsx
│   │   └── ...
│   ├── admin/           # 后台管理组件
│   │   ├── APIConfig.tsx
│   │   ├── BoardConfig.tsx
│   │   ├── RoleLibrary.tsx
│   │   └── ...
│   └── ui/              # 基础UI组件 (shadcn-ui)
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ...
├── pages/                # 页面组件
│   ├── Index.tsx         # 登录页
│   ├── Lobby.tsx        # 游戏大厅
│   ├── GameRoom.tsx      # 游戏房间
│   ├── Spectator.tsx     # 观战模式
│   ├── Admin.tsx        # 后台管理
│   └── NotFound.tsx
├── hooks/                # 自定义Hooks
│   ├── useAuth.ts
│   ├── useWebSocket.ts
│   ├── useGameState.ts
│   ├── useAIPlayer.ts
│   └── ...
├── services/             # 服务层
│   ├── api/             # API服务
│   │   ├── room.ts
│   │   ├── game.ts
│   │   ├── user.ts
│   │   └── ...
│   ├── ai/              # AI服务
│   │   ├── openai.ts
│   │   ├── qwen.ts
│   │   ├── mcp.ts
│   │   └── index.ts
│   ├── websocket/       # WebSocket服务
│   │   ├── room.ts
│   │   ├── game.ts
│   │   └── spectator.ts
│   └── storage/         # 存储服务
│       ├── gameRecord.ts
│       └── export.ts
├── store/               # 状态管理
│   ├── gameStore.ts
│   ├── roomStore.ts
│   ├── userStore.ts
│   └── ...
├── types/               # 类型定义
│   ├── game.ts
│   ├── room.ts
│   ├── user.ts
│   ├── ai.ts
│   └── ...
├── utils/               # 工具函数
│   ├── validators.ts
│   ├── formatters.ts
│   ├── constants.ts
│   └── ...
├── integrations/         # 第三方集成
│   └── supabase/
│       ├── client.ts
│       └── types.ts
├── App.tsx
├── main.tsx
└── index.css
```

### 2.2 状态管理策略

#### 2.2.1 全局状态 (Context + Zustand)
```typescript
// store/gameStore.ts
interface GameStore {
  // 游戏状态
  gameState: GameState;
  setGameState: (state: GameState) => void;
  
  // 玩家信息
  players: Player[];
  setPlayers: (players: Player[]) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  
  // AI玩家
  aiPlayers: AIPlayer[];
  setAIPlayers: (players: AIPlayer[]) => void;
  
  // 观战模式
  spectatorMode: SpectatorMode;
  setSpectatorMode: (mode: SpectatorMode) => void;
}
```

#### 2.2.2 服务器状态 (TanStack Query)
```typescript
// 使用React Query管理服务器状态
const { data: rooms } = useQuery({
  queryKey: ['rooms'],
  queryFn: () => api.rooms.list()
});

const { data: gameRecord } = useQuery({
  queryKey: ['gameRecord', gameId],
  queryFn: () => api.game.getRecord(gameId)
});
```

### 2.3 路由设计

```typescript
// App.tsx
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="/login" element={<Login />} />
  <Route path="/lobby" element={<Lobby />} />
  <Route path="/room/:roomId" element={<GameRoom />} />
  <Route path="/spectator/:roomId" element={<Spectator />} />
  <Route path="/admin" element={<Admin />}>
    <Route path="api-config" element={<APIConfig />} />
    <Route path="board-config" element={<BoardConfig />} />
    <Route path="role-library" element={<RoleLibrary />} />
    <Route path="game-rules" element={<GameRules />} />
  </Route>
  <Route path="*" element={<NotFound />} />
</Routes>
```

---

## 3. 数据库设计

### 3.1 数据表结构

#### 3.1.1 用户表 (users)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE
);
```

#### 3.1.2 房间表 (rooms)
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  host_id UUID REFERENCES users(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE SET NULL,
  max_players INTEGER NOT NULL,
  ai_player_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'waiting', -- waiting, playing, finished
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.1.3 板子表 (boards)
```sql
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  player_count INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.1.4 板子角色配置表 (board_roles)
```sql
CREATE TABLE board_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  role_type VARCHAR(20) NOT NULL, -- werewolf, villager, seer, witch, hunter, guard, idiot
  count INTEGER NOT NULL,
  UNIQUE(board_id, role_type)
);
```

#### 3.1.5 游戏记录表 (game_records)
```sql
CREATE TABLE game_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  winner_team VARCHAR(20), -- wolf, villager
  duration_seconds INTEGER
);
```

#### 3.1.6 游戏消息表 (game_messages)
```sql
CREATE TABLE game_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_record_id UUID REFERENCES game_records(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message_type VARCHAR(20) NOT NULL, -- chat, vote, skill, system
  content TEXT NOT NULL,
  phase VARCHAR(20), -- night, day, vote
  round_number INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.1.7 AI配置表 (ai_configs)
```sql
CREATE TABLE ai_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  provider VARCHAR(20) NOT NULL, -- openai, qwen, mcp
  api_key TEXT,
  model VARCHAR(100),
  endpoint TEXT,
  config JSONB, -- 额外配置
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.1.8 观战记录表 (spectator_records)
```sql
CREATE TABLE spectator_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_record_id UUID REFERENCES game_records(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  perspective_type VARCHAR(20) NOT NULL, -- follow_player, follow_role, god_view
  target_id UUID, -- 跟随的玩家ID或角色ID
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. 核心功能模块

### 4.1 游戏大厅模块

#### 功能列表
- 房间列表展示
- 创建房间（配置AI玩家数量、选择板子）
- 加入房间（上桌/观战）
- 房间状态实时更新

#### 核心组件
```typescript
// components/game/RoomCard.tsx
interface RoomCardProps {
  room: Room;
  onJoin: () => void;
  onSpectate: () => void;
}

// pages/Lobby.tsx
const Lobby = () => {
  const { data: rooms } = useQuery(['rooms'], api.rooms.list);
  const handleCreateRoom = () => {
    // 打开创建房间对话框
  };
  const handleJoinRoom = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };
};
```

### 4.2 游戏房间模块

#### 功能列表
- 圆桌布局展示玩家
- 游戏阶段管理（等待、倒计时、夜晚、白天、投票）
- 角色分配和展示
- 聊天和投票
- AI玩家自动操作

#### 核心组件
```typescript
// components/game/RoundTable.tsx
interface RoundTableProps {
  players: Player[];
  currentPlayerId: string;
  gamePhase: GamePhase;
  onPlayerClick: (playerId: string) => void;
}

// pages/GameRoom.tsx
const GameRoom = () => {
  const { gameState, players } = useGameStore();
  const { mutate: sendMessage } = useMutation(api.game.sendMessage);
  const { mutate: vote } = useMutation(api.game.vote);
  
  // AI玩家逻辑
  const aiPlayers = players.filter(p => p.isAI);
  useEffect(() => {
    aiPlayers.forEach(ai => {
      aiService.processTurn(ai, gameState);
    });
  }, [gameState.phase]);
};
```

### 4.3 观战系统模块

#### 功能列表
- 视角选择（一次性选择，不可切换）
  - 跟随指定玩家视角
  - 跟随指定身份牌视角
  - 上帝视角
- 实时消息过滤和展示
- 游戏记录保存

#### 核心组件
```typescript
// components/spectator/PerspectiveSelector.tsx
interface PerspectiveSelectorProps {
  onSelect: (perspective: Perspective) => void;
}

// services/spectator/filter.ts
export const filterMessagesByPerspective = (
  messages: GameMessage[],
  perspective: Perspective
): GameMessage[] => {
  switch (perspective.type) {
    case 'follow_player':
      return messages.filter(m => 
        m.playerId === perspective.targetId || 
        m.type === 'system'
      );
    case 'follow_role':
      return messages.filter(m => 
        m.playerRole === perspective.targetRole || 
        m.type === 'system'
      );
    case 'god_view':
      return messages; // 显示所有消息
    default:
      return [];
  }
};

// services/storage/export.ts
export const exportGameRecord = async (
  gameId: string,
  format: 'markdown' | 'json'
) => {
  const messages = await api.game.getMessages(gameId);
  const content = formatMessages(messages, format);
  downloadFile(content, `game-record-${gameId}.${format}`);
};
```

### 4.4 AI玩家系统模块

#### 功能列表
- 多模型支持（OpenAI、通义千问、MCP）
- AI玩家自动分配用户名
- 角色扮演（根据身份生成发言和决策）
- 投票和技能使用

#### 核心服务
```typescript
// services/ai/index.ts
interface AIPlayerService {
  generateMessage(player: AIPlayer, context: GameContext): Promise<string>;
  makeDecision(player: AIPlayer, context: GameContext): Promise<GameAction>;
  useSkill(player: AIPlayer, skill: Skill): Promise<boolean>;
}

// services/ai/openai.ts
export class OpenAIService implements AIPlayerService {
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async generateMessage(player: AIPlayer, context: GameContext): Promise<string> {
    const prompt = this.buildPrompt(player, context);
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }]
    });
    return response.choices[0].message.content;
  }
  
  private buildPrompt(player: AIPlayer, context: GameContext): string {
    return `你是狼人杀游戏中的${player.role}角色。
当前游戏状态：${JSON.stringify(context)}
请根据你的角色身份和当前游戏情况，生成一段符合角色特点的发言。`;
  }
}

// services/ai/qwen.ts
export class QwenService implements AIPlayerService {
  // 类似OpenAI的实现，使用通义千问API
}

// services/ai/mcp.ts
export class MCPService implements AIPlayerService {
  // 使用MCP协议连接AI服务
}

// hooks/useAIPlayer.ts
export const useAIPlayer = (player: AIPlayer) => {
  const { gameState } = useGameStore();
  const aiService = getAIService(player.aiConfig);
  
  useEffect(() => {
    if (player.isAI && gameState.phase === 'day') {
      aiService.generateMessage(player, gameState).then(message => {
        api.game.sendMessage({ playerId: player.id, content: message });
      });
    }
  }, [gameState.phase, gameState.round]);
};
```

### 4.5 后台管理模块

#### 功能列表
- AI接口API管理
- 游戏规则维护
- 角色牌库管理
- 板子设计维护

#### 核心组件
```typescript
// components/admin/APIConfig.tsx
const APIConfig = () => {
  const { data: configs } = useQuery(['ai-configs'], api.ai.listConfigs);
  const { mutate: createConfig } = useMutation(api.ai.createConfig);
  const { mutate: updateConfig } = useMutation(api.ai.updateConfig);
  const { mutate: deleteConfig } = useMutation(api.ai.deleteConfig);
  
  return (
    <div>
      <h2>AI接口配置</h2>
      <Button onClick={() => setShowCreateDialog(true)}>
        添加新接口
      </Button>
      <Table>
        {configs?.map(config => (
          <TableRow key={config.id}>
            <TableCell>{config.name}</TableCell>
            <TableCell>{config.provider}</TableCell>
            <TableCell>{config.model}</TableCell>
            <TableCell>
              <Button onClick={() => handleEdit(config)}>编辑</Button>
              <Button onClick={() => handleDelete(config.id)}>删除</Button>
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </div>
  );
};

// components/admin/BoardConfig.tsx
const BoardConfig = () => {
  const { data: boards } = useQuery(['boards'], api.boards.list);
  const { mutate: createBoard } = useMutation(api.boards.create);
  
  return (
    <div>
      <h2>板子配置</h2>
      <BoardEditor onSave={createBoard} />
      <BoardList boards={boards} />
    </div>
  );
};
```

---

## 5. 实时通信设计

### 5.1 WebSocket连接管理

```typescript
// services/websocket/room.ts
export class RoomWebSocket {
  private ws: WebSocket | null = null;
  private roomId: string;
  private userId: string;
  
  constructor(roomId: string, userId: string) {
    this.roomId = roomId;
    this.userId = userId;
  }
  
  connect() {
    this.ws = new WebSocket(`wss://your-domain.com/room/${this.roomId}`);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      setTimeout(() => this.connect(), 3000); // 重连
    };
  }
  
  private handleMessage(message: WSMessage) {
    switch (message.type) {
      case 'player_joined':
        store.updatePlayers(message.data);
        break;
      case 'player_left':
        store.removePlayer(message.data.id);
        break;
      case 'game_started':
        store.setGameState(message.data);
        break;
      case 'new_message':
        store.addMessage(message.data);
        break;
      case 'game_phase_changed':
        store.setPhase(message.data.phase);
        break;
    }
  }
  
  send(type: string, data: any) {
    this.ws?.send(JSON.stringify({ type, data }));
  }
  
  disconnect() {
    this.ws?.close();
  }
}
```

### 5.2 Supabase Realtime集成

```typescript
// services/websocket/supabase.ts
export class SupabaseRealtime {
  private supabase: SupabaseClient;
  private channel: RealtimeChannel;
  
  constructor(supabase: SupabaseClient, roomId: string) {
    this.supabase = supabase;
    this.channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        this.handlePlayerChange(payload);
      })
      .on('broadcast', { event: 'game_message' }, (payload) => {
        this.handleGameMessage(payload);
      })
      .subscribe();
  }
  
  disconnect() {
    this.supabase.removeChannel(this.channel);
  }
}
```

---

## 6. 安全设计

### 6.1 认证与授权

```typescript
// services/auth.ts
export const authService = {
  async login(username: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: username,
      password
    });
    if (error) throw error;
    return data;
  },
  
  async register(username: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email: username,
      password
    });
    if (error) throw error;
    return data;
  },
  
  async logout() {
    await supabase.auth.signOut();
  },
  
  getCurrentUser() {
    return supabase.auth.getUser();
  }
};
```

### 6.2 权限控制

```typescript
// utils/permissions.ts
export const canAccessAdmin = (user: User): boolean => {
  return user.is_admin;
};

export const canManageRoom = (user: User, room: Room): boolean => {
  return room.host_id === user.id || user.is_admin;
};

export const canViewGameRecord = (user: User, record: GameRecord): boolean => {
  return record.room.host_id === user.id || 
         record.participants.includes(user.id) ||
         user.is_admin;
};
```

### 6.3 数据验证

```typescript
// utils/validators.ts
export const validateRoomConfig = (config: RoomConfig): ValidationResult => {
  const errors: string[] = [];
  
  if (config.playerCount < 6) {
    errors.push('玩家数量不能少于6人');
  }
  
  if (config.playerCount > 12) {
    errors.push('玩家数量不能超过12人');
  }
  
  if (config.aiPlayerCount > config.playerCount - 1) {
    errors.push('AI玩家数量不能超过总玩家数减1');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

---

## 7. 性能优化

### 7.1 前端优化

- **代码分割**: 使用React.lazy和Suspense
- **图片优化**: 使用WebP格式和懒加载
- **缓存策略**: React Query缓存配置
- **虚拟滚动**: 长列表使用react-window

```typescript
// 代码分割示例
const Admin = lazy(() => import('./pages/Admin'));
const GameRoom = lazy(() => import('./pages/GameRoom'));

// React Query缓存配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟
      cacheTime: 10 * 60 * 1000, // 10分钟
    }
  }
});
```

### 7.2 数据库优化

- **索引优化**: 为常用查询字段添加索引
- **查询优化**: 使用JOIN减少查询次数
- **连接池**: 配置Supabase连接池

```sql
-- 添加索引
CREATE INDEX idx_rooms_host ON rooms(host_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_game_messages_game ON game_messages(game_record_id);
CREATE INDEX idx_game_messages_timestamp ON game_messages(timestamp DESC);
```

---

## 8. 部署架构

### 8.1 前端部署

```yaml
# Vercel配置 (vercel.json)
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

### 8.2 后端部署

- **数据库**: Supabase Cloud
- **实时通信**: Supabase Realtime
- **文件存储**: Supabase Storage

---

## 9. 监控与日志

### 9.1 错误监控

```typescript
// utils/errorTracking.ts
export const trackError = (error: Error, context?: any) => {
  console.error('Error:', error, context);
  // 可以集成Sentry等错误监控服务
};

// 全局错误边界
export const ErrorBoundary = ({ children }: { children: ReactNode }) => {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={trackError}
    >
      {children}
    </ReactErrorBoundary>
  );
};
```

### 9.2 性能监控

```typescript
// utils/performance.ts
export const trackPerformance = (metric: string, value: number) => {
  console.log(`Performance: ${metric} = ${value}ms`);
  // 可以集成Web Vitals监控
};

// 使用示例
useEffect(() => {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    trackPerformance('component_render', duration);
  };
}, []);
```

---

## 10. 开发规范

### 10.1 代码风格

- **TypeScript**: 严格模式，所有类型定义完整
- **ESLint**: 使用项目配置的规则
- **Prettier**: 统一代码格式
- **Git Hooks**: 使用Husky进行代码检查

### 10.2 命名规范

- **组件**: PascalCase (如: `RoomCard.tsx`)
- **函数**: camelCase (如: `handleCreateRoom`)
- **常量**: UPPER_SNAKE_CASE (如: `MAX_PLAYERS`)
- **类型**: PascalCase (如: `GameState`)

### 10.3 注释规范

```typescript
/**
 * 创建游戏房间
 * @param config - 房间配置
 * @returns 创建的房间信息
 */
export const createRoom = async (config: RoomConfig): Promise<Room> => {
  // 实现代码
};
```

---

## 11. 测试策略

### 11.1 单元测试

```typescript
// __tests__/services/ai/openai.test.ts
describe('OpenAIService', () => {
  it('should generate message based on player role', async () => {
    const service = new OpenAIService('test-key');
    const player = { id: '1', role: 'werewolf', name: 'AI狼人' };
    const context = { phase: 'day', round: 1 };
    
    const message = await service.generateMessage(player, context);
    
    expect(message).toBeDefined();
    expect(message.length).toBeGreaterThan(0);
  });
});
```

### 11.2 集成测试

```typescript
// __tests__/pages/Lobby.test.tsx
describe('Lobby Page', () => {
  it('should display room list', async () => {
    render(<Lobby />);
    
    await waitFor(() => {
      expect(screen.getByText('游戏大厅')).toBeInTheDocument();
    });
  });
});
```

---

## 12. 版本控制

- **Git**: 使用Git进行版本控制
- **分支策略**: 
  - `main`: 主分支，稳定版本
  - `develop`: 开发分支
  - `feature/*`: 功能分支
- **提交规范**: 使用Conventional Commits

---

## 13. 文档

- **API文档**: 使用Swagger/OpenAPI
- **组件文档**: 使用Storybook
- **用户文档**: 使用Markdown
- **开发文档**: 本文档

---

## 附录：技术选型说明

### 为什么选择这些技术？

| 技术 | 选择原因 |
|------|---------|
| React | 生态成熟，组件化开发 |
| TypeScript | 类型安全，减少运行时错误 |
| Vite | 快速构建，开发体验好 |
| shadcn-ui | 美观现代，可定制性强 |
| Supabase | 全栈后端服务，快速开发 |
| WebSocket | 实时通信，游戏状态同步 |
| OpenAI API | 强大的AI能力，角色扮演 |

---

**文档版本**: v1.0.0
**更新日期**: 2026-01-31
**维护者**: 开发团队
