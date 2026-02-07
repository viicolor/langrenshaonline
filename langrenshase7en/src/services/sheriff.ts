import { supabase } from '@/lib/supabase';
import { gameService } from './game';
import { gameService as gameEngineService } from './gameEngine';

export type SheriffStage = 'signup' | 'speech' | 'vote' | 'pk_speech' | 'pk_vote' | 'done';

export interface SheriffState {
  stage: SheriffStage;
  signupSeats: number[];
  speechOrder: number[];
  speechIndex: number;
  currentSpeakerSeat: number | null;
  votes: Record<string, number | null>;
  pkRound: number;
  pkSeats: number[];
}

export const sheriffService = {
  /** 上警报名 */
  async registerSheriff(roomId: string, gameRecordId: string, userId: string): Promise<boolean> {
    try {
      const record = await gameService.getCurrentGameRecord(roomId);
      if (!record || record.id !== gameRecordId) return false;
      if (record.current_phase !== 'sheriff_campaign') return false;
      
      const sheriffState = (record as unknown as { sheriff_state?: SheriffState }).sheriff_state;
      if (!sheriffState || sheriffState.stage !== 'signup') return false;

      const { data: rp } = await supabase
        .from('room_players')
        .select('seat_number, is_alive')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle();
      
      const seat = rp?.seat_number ?? null;
      if (!seat || rp?.is_alive === false) return false;

      const nextSeats = Array.from(new Set([...(sheriffState.signupSeats || []), seat])).sort((a, b) => a - b);
      const nextState: SheriffState = { ...sheriffState, signupSeats: nextSeats };

      const { data, error } = await supabase
        .from('game_records')
        .update({ sheriff_state: nextState as unknown as Record<string, unknown> })
        .eq('id', gameRecordId)
        .eq('current_phase', 'sheriff_campaign')
        .select('id')
        .maybeSingle();
      
      if (error) throw error;
      return data != null;
    } catch (error) {
      console.error('Register sheriff error:', error);
      return false;
    }
  },

  /** 警下投票 */
  async submitSheriffVote(roomId: string, gameRecordId: string, userId: string, targetSeat: number | null): Promise<boolean> {
    try {
      const record = await gameService.getCurrentGameRecord(roomId);
      if (!record || record.id !== gameRecordId) return false;
      if (record.current_phase !== 'sheriff_campaign') return false;
      
      const sheriffState = (record as unknown as { sheriff_state?: SheriffState }).sheriff_state;
      if (!sheriffState || (sheriffState.stage !== 'vote' && sheriffState.stage !== 'pk_vote')) return false;

      const { data: rp } = await supabase
        .from('room_players')
        .select('seat_number, is_alive')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle();
      
      const voterSeat = rp?.seat_number ?? null;
      if (!voterSeat || rp?.is_alive === false) return false;

      // 参与竞选的玩家不能参与投票选警长；PK 轮仅非 PK 玩家可投票
      if (sheriffState.stage === 'vote' && (sheriffState.signupSeats || []).includes(voterSeat)) return false;
      if (sheriffState.stage === 'pk_vote' && (sheriffState.pkSeats || []).includes(voterSeat)) return false;

      const nextVotes = { ...(sheriffState.votes || {}) } as Record<string, number | null>;
      nextVotes[String(voterSeat)] = targetSeat;
      const nextState: SheriffState = { ...sheriffState, votes: nextVotes };

      const { data, error } = await supabase
        .from('game_records')
        .update({ sheriff_state: nextState as unknown as Record<string, unknown> })
        .eq('id', gameRecordId)
        .eq('current_phase', 'sheriff_campaign')
        .select('id')
        .maybeSingle();
      
      if (error) throw error;
      return data != null;
    } catch (error) {
      console.error('Submit sheriff vote error:', error);
      return false;
    }
  },

  /** 退水：从报名名单中移除 */
  async withdrawSheriff(roomId: string, gameRecordId: string, userId: string): Promise<boolean> {
    try {
      const record = await gameService.getCurrentGameRecord(roomId);
      if (!record || record.id !== gameRecordId) return false;
      if (record.current_phase !== 'sheriff_campaign') return false;
      
      const sheriffState = (record as unknown as { sheriff_state?: SheriffState }).sheriff_state;
      if (!sheriffState || sheriffState.stage !== 'speech') return false;

      const { data: rp } = await supabase
        .from('room_players')
        .select('seat_number')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle();
      
      const seat = rp?.seat_number ?? null;
      if (!seat) return false;

      const nextSeats = (sheriffState.signupSeats || []).filter((s) => s !== seat);
      const nextOrder = (sheriffState.speechOrder || []).filter((s) => s !== seat);
      const nextState: SheriffState = { ...sheriffState, signupSeats: nextSeats, speechOrder: nextOrder };

      const { data, error } = await supabase
        .from('game_records')
        .update({ sheriff_state: nextState as unknown as Record<string, unknown> })
        .eq('id', gameRecordId)
        .eq('current_phase', 'sheriff_campaign')
        .select('id')
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return false;

      await supabase.from('room_messages').insert({
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: `${seat}号玩家退水`,
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'sheriff_campaign',
        round_number: record.current_round ?? 1,
      });

      // 退水后仅剩一名警侯则自动当选警长，进入白天
      if (nextSeats.length === 1) {
        return await gameEngineService.finishSheriffCampaignWithOneWinner(roomId, gameRecordId, nextSeats[0]);
      }
      return true;
    } catch (error) {
      console.error('Withdraw sheriff error:', error);
      return false;
    }
  },
};
