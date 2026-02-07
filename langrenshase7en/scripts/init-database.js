import Database from 'better-sqlite3';
import path from 'path';
import { mkdirSync, existsSync, unlinkSync } from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'langrensha.db');

console.log('🚀 初始化SQLite数据库...\n');

const dataDir = path.join(process.cwd(), 'data');

if (!existsSync(dataDir)) {
  console.log('📁 创建data目录...');
  mkdirSync(dataDir, { recursive: true });
  console.log('✅ data目录创建成功！\n');
}

if (existsSync(dbPath)) {
  console.log('🗑️ 删除旧数据库文件...');
  unlinkSync(dbPath);
  console.log('✅ 旧数据库文件删除成功！\n');
}

const db = new Database(dbPath);

db.exec(`
  -- 创建用户表
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT UNIQUE,
    avatar_url TEXT,
    is_admin INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- 创建板子表
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    player_count INTEGER NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 创建板子角色配置表
  CREATE TABLE IF NOT EXISTS board_roles (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL,
    count INTEGER NOT NULL,
    UNIQUE(board_id, role_type)
  );

  -- 创建房间表
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    board_id TEXT REFERENCES boards(id) ON DELETE SET NULL,
    max_players INTEGER DEFAULT 12,
    ai_player_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'waiting',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- 创建游戏记录表
  CREATE TABLE IF NOT EXISTS game_records (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    board_id TEXT REFERENCES boards(id),
    started_at TEXT,
    ended_at TEXT,
    winner_team TEXT,
    duration_seconds INTEGER
  );

  -- 创建房间消息表
  CREATE TABLE IF NOT EXISTS room_messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    game_record_id TEXT REFERENCES game_records(id) ON DELETE CASCADE,
    phase TEXT,
    round_number INTEGER
  );

  -- 创建AI配置表
  CREATE TABLE IF NOT EXISTS ai_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    api_key TEXT,
    model TEXT,
    endpoint TEXT,
    config TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 创建观战记录表
  CREATE TABLE IF NOT EXISTS spectator_records (
    id TEXT PRIMARY KEY,
    game_record_id TEXT NOT NULL REFERENCES game_records(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    perspective_type TEXT NOT NULL,
    target_id TEXT,
    joined_at TEXT DEFAULT (datetime('now'))
  );
`);

console.log('✅ 数据库表创建成功！\n');

console.log('📋 插入默认板子数据...\n');

const boards = db.prepare('INSERT INTO boards (id, name, description, player_count, is_default) VALUES (?, ?, ?, ?, ?)');

boards.run(
  crypto.randomUUID(),
  '12人标准局',
  '4狼4民4神，经典配置',
  12,
  1
);

boards.run(
  crypto.randomUUID(),
  '9人局',
  '3狼3民3神，快速游戏',
  9,
  1
);

boards.run(
  crypto.randomUUID(),
  '6人局',
  '2狼2民2神，新手友好',
  6,
  1
);

console.log('✅ 默认板子数据插入成功！\n');

console.log('📋 插入默认板子角色配置...\n');

const boardRoles = db.prepare('INSERT INTO board_roles (id, board_id, role_type, count) VALUES (?, ?, ?, ?)');

const boardIds = db.prepare('SELECT id, name FROM boards').all();

boardIds.forEach(board => {
  if (board.name === '12人标准局') {
    const roles = [
      { role: 'werewolf', count: 4 },
      { role: 'villager', count: 4 },
      { role: 'seer', count: 1 },
      { role: 'witch', count: 1 },
      { role: 'hunter', count: 1 },
      { role: 'guard', count: 1 }
    ];
    roles.forEach(r => {
      boardRoles.run(crypto.randomUUID(), board.id, r.role, r.count);
    });
  } else if (board.name === '9人局') {
    const roles = [
      { role: 'werewolf', count: 3 },
      { role: 'villager', count: 3 },
      { role: 'seer', count: 1 },
      { role: 'witch', count: 1 },
      { role: 'hunter', count: 1 }
    ];
    roles.forEach(r => {
      boardRoles.run(crypto.randomUUID(), board.id, r.role, r.count);
    });
  } else if (board.name === '6人局') {
    const roles = [
      { role: 'werewolf', count: 2 },
      { role: 'villager', count: 2 },
      { role: 'seer', count: 1 },
      { role: 'witch', count: 1 }
    ];
    roles.forEach(r => {
      boardRoles.run(crypto.randomUUID(), board.id, r.role, r.count);
    });
  }
});

console.log('✅ 默认板子角色配置插入成功！\n');

console.log('📋 插入测试用户...\n');

const testUsers = db.prepare('INSERT INTO users (id, username, password_hash, email, avatar_url) VALUES (?, ?, ?, ?, ?)');

testUsers.run(
  crypto.randomUUID(),
  'viicolor',
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  'viicolor@test.com',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=viicolor'
);

console.log('✅ 测试用户插入成功！\n');

console.log('🎉 数据库初始化完成！\n');
console.log(`📁 数据库文件: ${dbPath}\n`);
console.log('📊 表列表：');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => {
  console.log(`  - ${t.name}`);
});

console.log('\n✅ 现在可以使用数据库了！\n');
console.log('👤 测试用户信息：');
console.log('  用户名: viicolor');
console.log('  密码: 123456');
console.log('  邮箱: viicolor@test.com');
