// Game Core Edge Function - 游戏流程控制系统核心
// 实现服务端权威计时、流程自动推进、掉线检测等功能

import { createClient } from 'jsr:@supabase/supabase-js';
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const HEARTBEAT_TIMEOUT_SECONDS = 15;

interface FlowNode {
  id: string;
  node_name: string;
  node_code: string;
  node_type: string;
  phase_config: {
    order: number;
    duration: number;
    actions: string[];
  };
  operate_roles: {
    type: string;
    role_ids?: string[];
    player_id?: string;
  };
  next_node_rules: {
    type: 'FIXED' | 'BY_TRIGGER' | 'BY_STATE' | 'BY_OPERATE';
    next_node_id?: string;
    TIMEOUT?: string;
    DISCONNECT?: string;
    PLAYER_OPERATE?: string;
    default?: string;
    [key: string]: any;
  };
  is_auto_advance: number;
  timeout_seconds: number;
}

interface GameRecord {
  id: string;
  room_id: string;
  board_id: string;
  current_node_id: string | null;
  node_start_time: string | null;
  node_remaining_seconds: number;
  last_heartbeat_time: string | null;
}

interface RoomPlayer {
  id: string;
  room_id: string;
  user_id: string | null;
  player_name: string;
  player_state: {
    is_online: boolean;
    [key: string]: any;
  };
  last_heartbeat_time: string | null;
}

let timerController: () => Promise<void>;
let handlePlayerOperate: (req: Request) => Promise<Response>;
let handlePlayerHeartbeat: (req: Request) => Promise<Response>;
let autoAdvanceFlow: (gameId: string, triggerType: 'TIMEOUT' | 'DISCONNECT' | 'PLAYER_OPERATE') => Promise<void>;
let handlePlayerDisconnect: (gameId: string, operateRoles: any) => Promise<void>;
let parseNextNodeId: (game: GameRecord, nodeConfig: FlowNode, triggerType: string) => Promise<string | null>;

const getSupabaseClient = () => {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
};

timerController = async () => {
  const client = getSupabaseClient();
  const now = new Date();

  try {
    const { data: games, error: gamesError } = await client
      .from('game_records')
      .select('id, room_id, board_id, current_node_id, node_start_time, node_remaining_seconds, last_heartbeat_time')
      .not('current_node_id', 'is', null);

    if (gamesError || !games || games.length === 0) {
      return;
    }

    for (const game of games) {
      try {
        const { data: nodeConfig, error: nodeError } = await client
          .from('game_flow_nodes')
          .select('*')
          .eq('id', game.current_node_id)
          .single();

        if (nodeError || !nodeConfig) {
          console.error(`[计时控制器] 游戏局${game.id}的节点配置不存在`);
          continue;
        }

        const nodeStartTime = game.node_start_time ? new Date(game.node_start_time) : now;
        const elapsedSeconds = Math.floor((now.getTime() - nodeStartTime.getTime()) / 1000);
        const realRemainingSeconds = Math.max(nodeConfig.timeout_seconds - elapsedSeconds, 0);

        await client
          .from('game_records')
          .update({
            node_remaining_seconds: realRemainingSeconds,
            last_heartbeat_time: now.toISOString(),
          })
          .eq('id', game.id);

        if (realRemainingSeconds <= 0 && nodeConfig.is_auto_advance === 1) {
          console.log(`[计时控制器] 游戏局${game.id}超时，自动推进流程`);
          await autoAdvanceFlow(game.id, 'TIMEOUT');
        }

        await handlePlayerDisconnect(game.id, nodeConfig.operate_roles);
      } catch (err) {
        console.error(`[计时控制器] 处理游戏局${game.id}失败：`, err);
        continue;
      }
    }
  } catch (err) {
    console.error('[计时控制器] 执行失败：', err);
  }
};

handlePlayerDisconnect = async (gameId: string, operateRoles: any) => {
  if (operateRoles?.type !== 'CURRENT_PLAYER' || !operateRoles.player_id) {
    return;
  }

  const client = getSupabaseClient();
  const targetPlayerId = operateRoles.player_id;

  // 先获取游戏记录，找到对应的room_id
  const { data: game, error: gameError } = await client
    .from('game_records')
    .select('room_id')
    .eq('id', gameId)
    .single();

  if (gameError || !game) {
    return;
  }

  const { data: player, error: playerError } = await client
    .from('room_players')
    .select('player_state->>is_online as is_online')
    .eq('room_id', game.room_id)
    .eq('user_id', targetPlayerId)
    .single();

  if (playerError || !player) {
    return;
  }

  if (player.is_online === false) {
    console.log(`[计时控制器] 游戏局${gameId}玩家${targetPlayerId}掉线，自动推进流程`);
    await autoAdvanceFlow(gameId, 'DISCONNECT');
  }
};

autoAdvanceFlow = async (gameId: string, triggerType: 'TIMEOUT' | 'DISCONNECT' | 'PLAYER_OPERATE') => {
  const client = getSupabaseClient();
  const now = new Date();

  try {
    const { data: game, error: gameError } = await client
      .from('game_records')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      console.error(`[流程推进] 游戏局${gameId}不存在`);
      return;
    }

    if (!game.current_node_id) {
      console.error(`[流程推进] 游戏局${gameId}没有当前节点`);
      return;
    }

    const { data: nodeConfig, error: nodeConfigError } = await client
      .from('game_flow_nodes')
      .select('*')
      .eq('id', game.current_node_id)
      .single();

    if (nodeConfigError || !nodeConfig) {
      console.error(`[流程推进] 节点${game.current_node_id}不存在`);
      return;
    }

    const nextNodeId = await parseNextNodeId(game, nodeConfig, triggerType);

    if (!nextNodeId) {
      await client
        .from('game_records')
        .update({
          ended_at: now.toISOString(),
          last_heartbeat_time: now.toISOString(),
        })
        .eq('id', gameId);
      console.log(`[流程推进] 游戏局${gameId}结束`);
      return;
    }

    const { data: nextNodeConfig, error: nextNodeError } = await client
      .from('game_flow_nodes')
      .select('timeout_seconds')
      .eq('id', nextNodeId)
      .single();

    const nextTimeoutSeconds = nextNodeError || !nextNodeConfig ? 30 : nextNodeConfig.timeout_seconds;

    await client
      .from('game_records')
      .update({
        current_node_id: nextNodeId,
        node_start_time: now.toISOString(),
        node_remaining_seconds: nextTimeoutSeconds,
        last_heartbeat_time: now.toISOString(),
      })
      .eq('id', gameId);

    console.log(`[流程推进] 游戏局${gameId}从${game.current_node_id}推进到${nextNodeId}`);
  } catch (err) {
    console.error(`[流程推进] 推进游戏局${gameId}失败：`, err);
  }
};

parseNextNodeId = async (game: GameRecord, nodeConfig: FlowNode, triggerType: string): Promise<string | null> => {
  const rules = nodeConfig.next_node_rules;

  switch (rules.type) {
    case 'FIXED':
      return rules.next_node_id || null;

    case 'BY_TRIGGER':
      return rules[triggerType] || rules.default || null;

    case 'BY_STATE':
      const gameState = game as any;
      for (const [condition, nodeId] of Object.entries(rules)) {
        if (condition === 'type' || condition === 'default') continue;
        if (checkCondition(gameState, condition)) {
          return nodeId as string;
        }
      }
      return rules.default || null;

    case 'BY_OPERATE':
      const client = getSupabaseClient();
      const { data: lastOperate } = await client
        .from('game_actions')
        .select('*')
        .eq('game_record_id', game.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastOperate) {
        return rules[lastOperate.action_type] || rules.default || null;
      }
      return rules.default || null;

    default:
      return null;
  }
};

const checkCondition = (state: any, condition: string): boolean => {
  const [key, op, value] = condition.split(/([<>]=?|=)/);
  const stateValue = state[key];

  switch (op) {
    case '>':
      return stateValue > Number(value);
    case '<':
      return stateValue < Number(value);
    case '==':
      return stateValue === value || stateValue === Number(value);
    case '>=':
      return stateValue >= Number(value);
    case '<=':
      return stateValue <= Number(value);
    default:
      return false;
  }
};

handlePlayerOperate = async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const { gameId, playerId, operateType, operateContent } = await req.json();

    if (!gameId || !playerId || !operateType) {
      return new Response(JSON.stringify({ success: false, msg: '参数缺失' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const isValid = await checkOperateValid(gameId, playerId, operateType, operateContent);
    if (!isValid) {
      return new Response(JSON.stringify({ success: false, msg: '操作不合法' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const client = getSupabaseClient();

    await client.from('game_actions').insert({
      game_record_id: gameId,
      player_id: playerId,
      action_type: operateType,
      action_content: operateContent || {},
      created_at: new Date().toISOString(),
    });

    await autoAdvanceFlow(gameId, 'PLAYER_OPERATE');

    return new Response(JSON.stringify({ success: true, msg: '操作成功' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

handlePlayerHeartbeat = async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const { gameId, playerId } = await req.json();

    if (!gameId || !playerId) {
      return new Response(JSON.stringify({ success: false, msg: '参数缺失' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const client = getSupabaseClient();
    const now = new Date();

    // 先获取游戏记录，找到对应的room_id
    const { data: game, error: gameError } = await client
      .from('game_records')
      .select('room_id')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return new Response(JSON.stringify({ success: false, msg: '游戏记录不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    await client
      .from('room_players')
      .update({
        player_state: { is_online: true },
        last_heartbeat_time: now.toISOString(),
      })
      .eq('room_id', game.room_id)
      .eq('user_id', playerId);

    return new Response(JSON.stringify({ success: true, msg: '心跳上报成功' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

const checkOperateValid = async (gameId: string, playerId: string, operateType: string, operateContent: any): Promise<boolean> => {
  const client = getSupabaseClient();

  const { data: game, error: gameError } = await client
    .from('game_records')
    .select('current_node_id')
    .eq('id', gameId)
    .single();

  if (gameError || !game) return false;

  const { data: nodeConfig, error: nodeError } = await client
    .from('game_flow_nodes')
    .select('operate_roles, phase_config')
    .eq('id', game.current_node_id)
    .single();

  if (nodeError || !nodeConfig) return false;

  const isOperatePlayer = nodeConfig.operate_roles.type === 'ALL'
    ? true
    : nodeConfig.operate_roles.player_id === playerId;

  if (!isOperatePlayer) return false;

  const allowedActions = nodeConfig.phase_config?.actions || [];
  if (!allowedActions.includes(operateType)) return false;

  return true;
};

setInterval(async () => {
  await timerController();
}, 1000);

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const authHeader = req.headers.get('Authorization');

  console.log('[Edge Function] 请求路径:', pathname, '方法:', req.method);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, X-Request-ID',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response('OK', {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (pathname === '/health' || pathname.endsWith('/health')) {
      return new Response(JSON.stringify({ ok: true, time: new Date().toISOString() }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    if (pathname === '/api/player-operate') {
      if (req.method !== 'POST') {
        return new Response('Method Not Allowed', {
          status: 405,
          headers: corsHeaders,
        });
      }
      return await handlePlayerOperate(req);
    }

    if (pathname === '/api/heartbeat') {
      if (req.method !== 'POST') {
        return new Response('Method Not Allowed', {
          status: 405,
          headers: corsHeaders,
        });
      }
      return await handlePlayerHeartbeat(req);
    }

    if (pathname === '/api/advance-flow') {
      if (req.method !== 'POST') {
        return new Response('Method Not Allowed', {
          status: 405,
          headers: corsHeaders,
        });
      }
      const { gameId, triggerType } = await req.json();
      await autoAdvanceFlow(gameId, triggerType);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders,
    });
  } catch (error: any) {
    console.error('[Edge Function] 处理请求失败：', error);
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
});
