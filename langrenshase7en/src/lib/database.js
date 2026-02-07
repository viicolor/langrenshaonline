import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'langrensha.db');

let db = null;

export function getDatabase() {
  if (!db) {
    db = new Database(dbPath);
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

export function getUserByUsername(username) {
  const database = getDatabase();
  const user = database.prepare('SELECT * FROM users WHERE username = ?').get(username);
  return user;
}

export function getUserByEmail(email) {
  const database = getDatabase();
  const user = database.prepare('SELECT * FROM users WHERE email = ?').get(email);
  return user;
}

export function createUser(username, passwordHash, email, avatarUrl) {
  const database = getDatabase();
  const stmt = database.prepare('INSERT INTO users (id, username, password_hash, email, avatar_url) VALUES (?, ?, ?, ?, ?)');
  stmt.run(crypto.randomUUID(), username, passwordHash, email, avatarUrl);
  return stmt.lastInsertRowid;
}

export function getAllBoards() {
  const database = getDatabase();
  return database.prepare('SELECT * FROM boards ORDER BY player_count').all();
}

export function getBoardById(boardId) {
  const database = getDatabase();
  return database.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
}

export function getBoardRoles(boardId) {
  const database = getDatabase();
  return database.prepare('SELECT * FROM board_roles WHERE board_id = ?').all(boardId);
}

export function createRoom(name, hostId, boardId, maxPlayers) {
  const database = getDatabase();
  const stmt = database.prepare('INSERT INTO rooms (id, name, host_id, board_id, max_players, status) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run(crypto.randomUUID(), name, hostId, boardId, maxPlayers, 'waiting');
  return stmt.lastInsertRowid;
}

export function getAllRooms() {
  const database = getDatabase();
  return database.prepare('SELECT * FROM rooms ORDER BY created_at DESC').all();
}

export function getRoomById(roomId) {
  const database = getDatabase();
  return database.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
}

export function updateRoomStatus(roomId, status) {
  const database = getDatabase();
  const stmt = database.prepare('UPDATE rooms SET status = ? WHERE id = ?');
  stmt.run(status, roomId);
}

export function createGameRecord(roomId, boardId) {
  const database = getDatabase();
  const stmt = database.prepare('INSERT INTO game_records (id, room_id, board_id, started_at) VALUES (?, ?, ?, datetime("now"))');
  stmt.run(crypto.randomUUID(), roomId, boardId);
  return stmt.lastInsertRowid;
}

export function getGameRecordsByRoomId(roomId) {
  const database = getDatabase();
  return database.prepare('SELECT * FROM game_records WHERE room_id = ? ORDER BY started_at DESC').all(roomId);
}

export function createRoomMessage(roomId, userId, message, phase, roundNumber) {
  const database = getDatabase();
  const stmt = database.prepare('INSERT INTO room_messages (id, room_id, user_id, message, phase, round_number, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))');
  stmt.run(crypto.randomUUID(), roomId, userId, message, phase, roundNumber);
  return stmt.lastInsertRowid;
}

export function getRoomMessagesByRoomId(roomId) {
  const database = getDatabase();
  return database.prepare('SELECT * FROM room_messages WHERE room_id = ? ORDER BY created_at ASC').all(roomId);
}

export function createSpectatorRecord(gameRecordId, userId, perspectiveType, targetId) {
  const database = getDatabase();
  const stmt = database.prepare('INSERT INTO spectator_records (id, game_record_id, user_id, perspective_type, target_id, joined_at) VALUES (?, ?, ?, ?, ?, datetime("now"))');
  stmt.run(crypto.randomUUID(), gameRecordId, userId, perspectiveType, targetId);
  return stmt.lastInsertRowid;
}

export function getSpectatorRecordsByGameId(gameRecordId) {
  const database = getDatabase();
  return database.prepare('SELECT * FROM spectator_records WHERE game_record_id = ? ORDER BY joined_at ASC').all(gameRecordId);
}

export function getAllAIConfigs() {
  const database = getDatabase();
  return database.prepare('SELECT * FROM ai_configs WHERE is_active = 1').all();
}

export function createAIConfig(name, provider, apiKey, model, endpoint, config) {
  const database = getDatabase();
  const stmt = database.prepare('INSERT INTO ai_configs (id, name, provider, api_key, model, endpoint, config) VALUES (?, ?, ?, ?, ?, ?, ?)');
  stmt.run(crypto.randomUUID(), name, provider, apiKey, model, endpoint, JSON.stringify(config));
  return stmt.lastInsertRowid;
}

export function updateGameRecord(gameRecordId, endedAt, winnerTeam, durationSeconds) {
  const database = getDatabase();
  const stmt = database.prepare('UPDATE game_records SET ended_at = ?, winner_team = ?, duration_seconds = ? WHERE id = ?');
  stmt.run(endedAt, winnerTeam, durationSeconds, gameRecordId);
}

export function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

console.log('📦 数据库工具函数已加载！');
console.log(`📁 数据库文件: ${dbPath}`);
