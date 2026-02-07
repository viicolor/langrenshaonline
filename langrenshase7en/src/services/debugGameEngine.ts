import { supabase } from '@/lib/supabase';
import { gameRecordService } from './game';
import { gameConfigService } from './gameConfig';

export async function debugGameState(roomName: string) {
  try {
    // 查找房间
    const { data: room } = await supabase
      .from('rooms')
      .select('id, name, board_id, status')
      .ilike('name', roomName)
      .maybeSingle();

    if (!room) {
      return { error: '房间不存在' };
    }

    // 查找游戏记录
    const { data: gameRecord } = await supabase
      .from('game_records')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!gameRecord) {
      return { error: '没有游戏记录', room };
    }

    // 获取夜步骤配置
    const nightSteps = await gameConfigService.getNightSteps('standard_flow', room.board_id ?? undefined);

    // 获取最近的行动
    const { data: actions } = await supabase
      .from('game_actions')
      .select('*')
      .eq('game_record_id', gameRecord.id)
      .eq('round', gameRecord.current_round ?? 1)
      .order('created_at', { ascending: false });

    // 获取房间消息
    const { data: messages } = await supabase
      .from('room_messages')
      .select('*')
      .eq('room_id', room.id)
      .eq('game_record_id', gameRecord.id)
      .order('created_at', { ascending: false })
      .limit(20);

    return {
      room: {
        id: room.id,
        name: room.name,
        status: room.status,
        board_id: room.board_id,
      },
      gameRecord: {
        id: gameRecord.id,
        current_phase: gameRecord.current_phase,
        current_round: gameRecord.current_round,
        night_step: gameRecord.night_step,
        phase_ends_at: gameRecord.phase_ends_at,
        phase_started_at: gameRecord.phase_started_at,
      },
      nightSteps: nightSteps.map((step, idx) => ({
        index: idx,
        name: step.step_name,
        skill_codes: step.skill_codes,
        duration: step.duration,
      })),
      currentNightStep: nightSteps[gameRecord.night_step ?? 0] || null,
      nextNightStep: nightSteps[(gameRecord.night_step ?? 0) + 1] || null,
      recentActions: actions,
      recentMessages: messages,
      now: new Date().toISOString(),
      nowTimestamp: Date.now(),
      phaseEndsAtTimestamp: gameRecord.phase_ends_at ? new Date(gameRecord.phase_ends_at).getTime() : null,
      timeRemaining: gameRecord.phase_ends_at 
        ? Math.max(0, Math.floor((new Date(gameRecord.phase_ends_at).getTime() - Date.now()) / 1000))
        : null,
    };
  } catch (error) {
    console.error('Debug game state error:', error);
    return { error: String(error) };
  }
}

export async function forceAdvanceNightStep(roomName: string) {
  try {
    const debugResult = await debugGameState(roomName);
    if (debugResult.error) {
      return debugResult;
    }

    const { gameRecord } = debugResult as { gameRecord: { id: string; current_phase: string; night_step: number } };
    
    if (gameRecord.current_phase !== 'night') {
      return { error: '当前不是夜晚阶段', currentPhase: gameRecord.current_phase };
    }

    // 强制更新时间戳并推进夜步骤
    const nowIso = new Date().toISOString();
    const nightStep = gameRecord.night_step ?? 0;
    const nextStep = nightStep + 1;

    const { data: updated } = await supabase
      .from('game_records')
      .update({ 
        phase_ends_at: nowIso,
        night_step: nextStep,
      })
      .eq('id', gameRecord.id)
      .select('id')
      .maybeSingle();

    return { 
      success: !!updated, 
      message: `已将夜步骤从 ${nightStep} 推进到 ${nextStep}`,
      debugResult,
    };
  } catch (error) {
    console.error('Force advance night step error:', error);
    return { error: String(error) };
  }
}
