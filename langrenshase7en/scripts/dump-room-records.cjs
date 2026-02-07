/**
 * 导出指定名称房间的操作记录（房间、玩家、消息、对局、行动），用于分析问题。
 * 用法: node scripts/dump-room-records.cjs [房间名称]
 * 示例: node scripts/dump-room-records.cjs player333
 *
 * 需要环境变量 VITE_SUPABASE_URL 和 VITE_SUPABASE_PUBLISHABLE_KEY（或 .env 中配置）。
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://whkwnfuuzjamnrssvrha.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indoa3duZnV1emphbW5yc3N2cmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjkyMzIsImV4cCI6MjA4MjYwNTIzMn0.LD8-vqaE6v6oqftIVkrjTZqkKCvNXf3-cuQp4nnfAAc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const roomName = process.argv[2] || 'player333';
  console.error(`查询房间名称包含: "${roomName}"\n`);

  const { data: rooms, error: roomErr } = await supabase
    .from('rooms')
    .select('*')
    .ilike('name', `%${roomName}%`)
    .order('created_at', { ascending: false })
    .limit(5);

  if (roomErr) {
    console.error('查询房间失败:', roomErr.message);
    process.exit(1);
  }
  if (!rooms || rooms.length === 0) {
    console.error('未找到匹配的房间');
    process.exit(1);
  }

  const room = rooms[0];
  const roomId = room.id;
  console.error(`使用房间: id=${roomId} name=${room.name} status=${room.status}\n`);

  const [playersRes, messagesRes, recordsRes] = await Promise.all([
    supabase.from('room_players').select('*').eq('room_id', roomId).order('seat_number', { ascending: true, nullsFirst: false }),
    supabase.from('room_messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }).limit(200),
    supabase.from('game_records').select('*').eq('room_id', roomId).order('started_at', { ascending: false }).limit(20),
  ]);

  const players = playersRes.data || [];
  const messages = messagesRes.data || [];
  const gameRecords = recordsRes.data || [];

  const gameRecordIds = gameRecords.map((r) => r.id);
  let actions = [];
  if (gameRecordIds.length > 0) {
    const { data: actionsData } = await supabase
      .from('game_actions')
      .select('*')
      .in('game_record_id', gameRecordIds)
      .order('round', { ascending: true })
      .order('created_at', { ascending: true });
    actions = actionsData || [];
  }

  const out = {
    room,
    room_players: players,
    room_messages: messages,
    game_records: gameRecords,
    game_actions: actions,
    summary: {
      players_count: players.length,
      messages_count: messages.length,
      game_records_count: gameRecords.length,
      game_actions_count: actions.length,
    },
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
